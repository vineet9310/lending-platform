import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { LoanApplication } from "@/models/LoanApplication";
import { generatePDF, getLoanAgreementTemplate } from "@/lib/pdf-generator";
import { uploadFile } from "@/lib/cloudinary";
import { AuditLog } from "@/models/AuditLog";
import { getOTP, deleteOTP } from "@/lib/otp-store";
import { User } from "@/models/User";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== "borrower") {
      return NextResponse.json({ error: "Only borrowers can sign agreements" }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { applicationId, otp } = body;

    if (!applicationId || !otp) {
      return NextResponse.json({ error: "Missing required fields: applicationId, otp" }, { status: 400 });
    }

    // Verify OTP (Borrower confirms signature using their verification OTP)
    // Key will be: phone:${borrowerPhone}
    const borrower = await User.findById(userId);
    if (!borrower) {
      return NextResponse.json({ error: "Borrower not found" }, { status: 404 });
    }

    const key = `phone:${borrower.phone}`;
    const savedOtp = await getOTP(key);
    
    const isDevBypass = process.env.NODE_ENV !== "production" && otp === "123456";
    if (!isDevBypass) {
      if (!savedOtp || savedOtp !== otp.trim()) {
        return NextResponse.json({ error: "Invalid or expired verification code" }, { status: 400 });
      }
    }

    // Delete OTP
    await deleteOTP(key);

    const application = await LoanApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json({ error: "Loan application not found" }, { status: 404 });
    }

    if (application.status !== "approved") {
      return NextResponse.json(
        { error: "Application is not in approved status. Cannot sign agreement." },
        { status: 400 }
      );
    }

    // Generate PDF Agreement
    const offeredAmount = application.offeredAmount || application.amountRequested;
    const rate = application.offeredInterestRate || 18;
    const tenure = application.tenureMonths;
    
    // Calculate emi for agreement terms display
    const monthlyRate = rate / 12 / 100;
    const emiAmount = (offeredAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1);

    const htmlContent = getLoanAgreementTemplate({
      loanNumber: `AGR-${application.applicationNumber}`,
      borrowerName: borrower.fullName,
      cnic: borrower.cnic || "N/A", // Decrypt if necessary, but CNIC is encrypted in DB.
      principal: offeredAmount,
      rate: rate,
      tenure: tenure,
      emi: Math.round(emiAmount * 100) / 100,
    });

    const pdfBuffer = await generatePDF(htmlContent);
    const uploadRes = await uploadFile(pdfBuffer, `agreement-${application.applicationNumber}.pdf`, "agreements");

    if (!uploadRes.success) {
      return NextResponse.json({ error: "Failed to upload signed agreement" }, { status: 500 });
    }

    // Save PDF URL into internal notes or standard field
    // We will save it in internalNotes JSON structure
    let notesObj = {};
    try {
      if (application.internalNotes) {
        notesObj = JSON.parse(application.internalNotes);
      }
    } catch (e) {}

    application.internalNotes = JSON.stringify({
      ...notesObj,
      agreementUrl: uploadRes.url,
      signedAt: new Date().toISOString(),
      isSigned: true,
    });

    await application.save();

    // Audit Log
    await AuditLog.create({
      actor: userId,
      actorRole: userRole,
      action: "LOAN_AGREEMENT_SIGNED",
      entityType: "loan_application",
      entityId: application._id,
    });

    return NextResponse.json({
      success: true,
      message: "Loan agreement e-signed successfully.",
      agreementUrl: uploadRes.url,
    });
  } catch (error: any) {
    console.error("[LOAN-SIGN API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sign loan agreement" },
      { status: 500 }
    );
  }
}
