import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { LoanApplication } from "@/models/LoanApplication";
import { KYCRecord } from "@/models/KYCRecord";
import { uploadFile } from "@/lib/cloudinary";
import { encrypt } from "@/lib/encryption";
import { AuditLog } from "@/models/AuditLog";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== "borrower") {
      return NextResponse.json({ error: "Only borrowers can submit KYC" }, { status: 403 });
    }

    await connectToDatabase();

    const formData = await req.formData();
    const applicationId = formData.get("applicationId") as string;
    const identityDocType = formData.get("identityDocType") as string;
    const identityDocNumber = formData.get("identityDocNumber") as string;
    const identityDocExpiryDate = formData.get("identityDocExpiryDate") as string;
    const addressDocType = formData.get("addressDocType") as string;
    const addressDocIssuedDate = formData.get("addressDocIssuedDate") as string;
    const incomeDocType = formData.get("incomeDocType") as string;

    if (!applicationId || !identityDocType || !identityDocNumber || !identityDocExpiryDate || !addressDocType || !addressDocIssuedDate || !incomeDocType) {
      return NextResponse.json({ error: "Missing required form fields" }, { status: 400 });
    }

    // Verify application ownership
    const application = await LoanApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json({ error: "Loan application not found" }, { status: 404 });
    }
    if (application.borrower.toString() !== userId) {
      return NextResponse.json({ error: "Unauthorized access to this application" }, { status: 403 });
    }

    // Parse and upload files
    const selfieFile = formData.get("selfie") as File;
    const identityFrontFile = formData.get("identityFront") as File;
    const identityBackFile = formData.get("identityBack") as File;
    const addressProofFile = formData.get("addressProof") as File;
    const employerLetterFile = formData.get("employerLetter") as File | null;

    if (!selfieFile || !identityFrontFile || !identityBackFile || !addressProofFile) {
      return NextResponse.json({ error: "Missing required documents (Selfie, Identity Front/Back, Address Proof)" }, { status: 400 });
    }

    // Extract income documents
    const incomeFiles: File[] = [];
    for (let i = 0; i < 6; i++) {
      const f = formData.get(`incomeProof[${i}]`) as File | null;
      if (f) incomeFiles.push(f);
    }
    if (incomeFiles.length === 0) {
      // Try fetching plain 'incomeProof' if uploaded singly
      const single = formData.get("incomeProof") as File | null;
      if (single) incomeFiles.push(single);
    }
    if (incomeFiles.length === 0) {
      return NextResponse.json({ error: "At least one income proof document is required" }, { status: 400 });
    }

    // Extract bank statements
    const bankFiles: File[] = [];
    for (let i = 0; i < 6; i++) {
      const f = formData.get(`bankStatement[${i}]`) as File | null;
      if (f) bankFiles.push(f);
    }
    if (bankFiles.length === 0) {
      const single = formData.get("bankStatement") as File | null;
      if (single) bankFiles.push(single);
    }
    if (bankFiles.length === 0) {
      return NextResponse.json({ error: "At least one bank statement document is required" }, { status: 400 });
    }

    // Helper to upload single file
    const uploadSingleHelper = async (file: File, folderName: string) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const res = await uploadFile(buffer, file.name, folderName);
      if (!res.success) throw new Error(`Failed to upload ${file.name}`);
      return res.url;
    };

    console.log("Starting KYC file uploads to Cloudinary/Local...");

    const selfieUrl = await uploadSingleHelper(selfieFile, "kyc/selfie");
    const frontImageUrl = await uploadSingleHelper(identityFrontFile, "kyc/identity");
    const backImageUrl = await uploadSingleHelper(identityBackFile, "kyc/identity");
    const addressImageUrl = await uploadSingleHelper(addressProofFile, "kyc/address");

    let employerLetterUrl = "";
    if (employerLetterFile && employerLetterFile.size > 0) {
      employerLetterUrl = await uploadSingleHelper(employerLetterFile, "kyc/employer");
    }

    // Upload income proofs
    const incomeProofUrls: string[] = [];
    for (const file of incomeFiles) {
      const url = await uploadSingleHelper(file, "kyc/income");
      incomeProofUrls.push(url);
    }

    // Upload bank statements
    const bankStatementUrls: string[] = [];
    for (const file of bankFiles) {
      const url = await uploadSingleHelper(file, "kyc/bank");
      bankStatementUrls.push(url);
    }

    // Encrypt identity doc number (e.g. CNIC or Passport number)
    const encryptedIdentityNumber = encrypt(identityDocNumber);

    // Save or update KYC Record
    let kycRecord = await KYCRecord.findOne({ application: applicationId });

    const kycData = {
      application: new mongoose.Types.ObjectId(applicationId),
      borrower: new mongoose.Types.ObjectId(userId),
      identityDoc: {
        type: identityDocType as any,
        number: encryptedIdentityNumber,
        frontImageUrl,
        backImageUrl,
        expiryDate: new Date(identityDocExpiryDate),
      },
      selfieUrl,
      addressProof: {
        type: addressDocType as any,
        imageUrl: addressImageUrl,
        issuedDate: new Date(addressDocIssuedDate),
      },
      incomeProof: {
        type: incomeDocType as any,
        documentUrls: incomeProofUrls,
      },
      employerLetter: employerLetterUrl || undefined,
      bankStatements: bankStatementUrls,
      verificationStatus: "pending" as const,
    };

    const prevKycState = kycRecord ? kycRecord.toJSON() : null;

    if (kycRecord) {
      Object.assign(kycRecord, kycData);
      await kycRecord.save();
    } else {
      kycRecord = await KYCRecord.create(kycData);
    }

    // Update Loan Application status to 'kyc_pending'
    const prevAppStatus = application.status;
    application.status = "kyc_pending";
    await application.save();

    // Audit logs
    await AuditLog.create({
      actor: userId,
      actorRole: userRole,
      action: "KYC_SUBMITTED",
      entityType: "kyc",
      entityId: kycRecord._id,
      previousState: prevKycState,
      newState: kycRecord.toJSON(),
    });

    await AuditLog.create({
      actor: userId,
      actorRole: userRole,
      action: "LOAN_STATUS_CHANGED",
      entityType: "loan_application",
      entityId: application._id,
      previousState: { status: prevAppStatus },
      newState: { status: application.status },
    });

    return NextResponse.json({
      success: true,
      message: "KYC documents uploaded successfully and application updated to KYC pending.",
      kycId: kycRecord._id,
    });
  } catch (error: any) {
    console.error("[KYC-SUBMIT API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit KYC documents" },
      { status: 500 }
    );
  }
}
