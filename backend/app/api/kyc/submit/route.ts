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

    if (!applicationId || !identityDocType || !identityDocNumber || !addressDocType || !addressDocIssuedDate || !incomeDocType) {
      return NextResponse.json({ error: "Missing required form fields" }, { status: 400 });
    }

    if (["driving_license", "passport"].includes(identityDocType) && !identityDocExpiryDate) {
      return NextResponse.json({ error: "Expiry date is required for Driving License and Passport" }, { status: 400 });
    }

    // Verify application ownership
    const application = await LoanApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json({ error: "Loan application not found" }, { status: 404 });
    }
    if (application.borrower.toString() !== userId) {
      return NextResponse.json({ error: "Unauthorized access to this application" }, { status: 403 });
    }

    // Save or update KYC Record
    let kycRecord = await KYCRecord.findOne({ application: applicationId });

    // Parse files
    const selfieFile = formData.get("selfie") as File | null;
    const identityFrontFile = formData.get("identityFront") as File | null;
    const identityBackFile = formData.get("identityBack") as File | null;
    const addressProofFile = formData.get("addressProof") as File | null;
    const employerLetterFile = formData.get("employerLetter") as File | null;

    // Helper to upload single file
    const uploadSingleHelper = async (file: File, folderName: string) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const res = await uploadFile(buffer, file.name, folderName);
      if (!res.success) throw new Error(`Failed to upload ${file.name}`);
      return res.url;
    };

    console.log("Starting KYC file uploads to Cloudinary/Local...");

    const selfieUrl = (selfieFile && selfieFile.size > 0)
      ? await uploadSingleHelper(selfieFile, "kyc/selfie")
      : kycRecord?.selfieUrl;

    const frontImageUrl = (identityFrontFile && identityFrontFile.size > 0)
      ? await uploadSingleHelper(identityFrontFile, "kyc/identity")
      : kycRecord?.identityDoc?.frontImageUrl;

    const addressImageUrl = (addressProofFile && addressProofFile.size > 0)
      ? await uploadSingleHelper(addressProofFile, "kyc/address")
      : kycRecord?.addressProof?.imageUrl;

    if (!selfieUrl || !frontImageUrl || !addressImageUrl) {
      return NextResponse.json({ error: "Missing required documents (Selfie, Identity Front, Address Proof)" }, { status: 400 });
    }

    let backImageUrl = kycRecord?.identityDoc?.backImageUrl || "";
    if (identityBackFile && identityBackFile.size > 0) {
      backImageUrl = await uploadSingleHelper(identityBackFile, "kyc/identity");
    }

    if (identityDocType !== "pan" && !backImageUrl) {
      return NextResponse.json({ error: "Missing identity document back photo" }, { status: 400 });
    }

    let employerLetterUrl = kycRecord?.employerLetter || "";
    if (employerLetterFile && employerLetterFile.size > 0) {
      employerLetterUrl = await uploadSingleHelper(employerLetterFile, "kyc/employer");
    }

    // Extract income documents
    const incomeFiles: File[] = [];
    for (let i = 0; i < 6; i++) {
      const f = formData.get(`incomeProof[${i}]`) as File | null;
      if (f) incomeFiles.push(f);
    }
    if (incomeFiles.length === 0) {
      const single = formData.get("incomeProof") as File | null;
      if (single) incomeFiles.push(single);
    }

    const incomeProofUrls: string[] = [];
    if (incomeFiles.length > 0) {
      for (const file of incomeFiles) {
        if (file && file.size > 0) {
          const url = await uploadSingleHelper(file, "kyc/income");
          incomeProofUrls.push(url);
        }
      }
    }

    const finalIncomeUrls = incomeProofUrls.length > 0 
      ? incomeProofUrls 
      : (kycRecord?.incomeProof?.documentUrls || []);

    if (finalIncomeUrls.length === 0) {
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

    const bankStatementUrls: string[] = [];
    if (bankFiles.length > 0) {
      for (const file of bankFiles) {
        if (file && file.size > 0) {
          const url = await uploadSingleHelper(file, "kyc/bank");
          bankStatementUrls.push(url);
        }
      }
    }

    const finalBankUrls = bankStatementUrls.length > 0
      ? bankStatementUrls
      : (kycRecord?.bankStatements || []);

    if (finalBankUrls.length === 0) {
      return NextResponse.json({ error: "At least one bank statement document is required" }, { status: 400 });
    }

    // Encrypt identity doc number (e.g. CNIC or Passport number)
    const encryptedIdentityNumber = encrypt(identityDocNumber);

    const kycData = {
      application: new mongoose.Types.ObjectId(applicationId),
      borrower: new mongoose.Types.ObjectId(userId),
      identityDoc: {
        type: identityDocType as any,
        number: encryptedIdentityNumber,
        frontImageUrl,
        backImageUrl: backImageUrl || undefined,
        expiryDate: identityDocExpiryDate ? new Date(identityDocExpiryDate) : undefined,
      },
      selfieUrl,
      addressProof: {
        type: addressDocType as any,
        imageUrl: addressImageUrl,
        issuedDate: new Date(addressDocIssuedDate),
      },
      incomeProof: {
        type: incomeDocType as any,
        documentUrls: finalIncomeUrls,
      },
      employerLetter: employerLetterUrl || undefined,
      bankStatements: finalBankUrls,
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
