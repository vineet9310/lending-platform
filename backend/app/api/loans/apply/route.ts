import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { LoanApplication } from "@/models/LoanApplication";
import { LoanApplicationSchema } from "@/lib/validators/loan.schema";
import { AuditLog } from "@/models/AuditLog";
import { sendNotification } from "@/lib/notifications";
import { decrypt } from "@/lib/encryption";
import { KYCRecord } from "@/models/KYCRecord";
import { Collateral } from "@/models/Collateral";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== "borrower") {
      return NextResponse.json({ error: "Only borrowers can apply" }, { status: 403 });
    }

    await connectToDatabase();

    // Find the latest in-progress application for the borrower
    const application = await LoanApplication.findOne({
      borrower: userId,
      status: { $in: ["draft", "kyc_pending", "collateral_pending"] },
    }).sort({ updatedAt: -1 });

    if (!application) {
      return NextResponse.json({ hasDraft: false });
    }

    // Check associated KYC and Collateral records to determine the correct wizardStep
    const kyc = await KYCRecord.findOne({ application: application._id });
    const collateral = await Collateral.findOne({ application: application._id });

    let wizardStep = 1;
    if (application.status === "draft") {
      wizardStep = 3;
    } else if (application.status === "kyc_pending") {
      if (collateral) {
        wizardStep = 5;
      } else {
        wizardStep = 4;
      }
    } else if (application.status === "collateral_pending") {
      wizardStep = 5;
    }

    let internalNotes = {};
    try {
      if (application.internalNotes) {
        internalNotes = JSON.parse(application.internalNotes);
      }
    } catch (e) {}

    const kycObj = kyc ? kyc.toObject() : null;
    if (kycObj && kycObj.identityDoc && kycObj.identityDoc.number) {
      kycObj.identityDoc.number = decrypt(kycObj.identityDoc.number);
    }

    const collateralDocsUrls: Record<string, string> = {};
    if (collateral && collateral.documents) {
      collateral.documents.forEach((doc: any) => {
        collateralDocsUrls[`${doc.docType}Url`] = doc.fileUrl;
      });
    }

    return NextResponse.json({
      hasDraft: true,
      wizardStep,
      wizardData: {
        applicationId: application._id,
        amountRequested: application.amountRequested,
        tenureMonths: application.tenureMonths,
        purpose: application.purpose,
        purposeDetail: application.purposeDetail,
        employmentType: application.employmentType,
        monthlyIncome: application.monthlyIncome,
        existingLoans: application.existingLoans,
        interestType: (internalNotes as any).interestType || "reducing_balance",
        
        // KYC Metadata
        identityDocType: kycObj?.identityDoc?.type || "",
        identityDocNumber: kycObj?.identityDoc?.number || "",
        identityDocExpiryDate: kycObj?.identityDoc?.expiryDate ? new Date(kycObj.identityDoc.expiryDate).toISOString().split('T')[0] : "",
        addressDocType: kycObj?.addressProof?.type || "",
        addressDocIssuedDate: kycObj?.addressProof?.issuedDate ? new Date(kycObj.addressProof.issuedDate).toISOString().split('T')[0] : "",
        incomeDocType: kycObj?.incomeProof?.type || "",
        selfieUrl: kycObj?.selfieUrl || "",
        identityFrontUrl: kycObj?.identityDoc?.frontImageUrl || "",
        identityBackUrl: kycObj?.identityDoc?.backImageUrl || "",
        addressProofUrl: kycObj?.addressProof?.imageUrl || "",
        incomeProofUrl: kycObj?.incomeProof?.documentUrls?.[0] || "",
        bankStatementUrl: kycObj?.bankStatements?.[0] || "",
        employerLetterUrl: kycObj?.employerLetter || "",
        
        // Collateral Metadata
        collateralType: collateral?.type || "",
        collateralDescription: collateral?.description || "",
        collateralValue: collateral?.estimatedValue || 0,
        collateralLocation: collateral?.location || "",
        collateralRegistrationNumber: collateral?.registrationNumber || "",
        ownership_deedUrl: collateralDocsUrls.ownership_deedUrl || "",
        valuation_reportUrl: collateralDocsUrls.valuation_reportUrl || "",
        registrationUrl: collateralDocsUrls.registrationUrl || "",
        insuranceUrl: collateralDocsUrls.insuranceUrl || "",
        otherUrl: collateralDocsUrls.otherUrl || "",
      }
    });
  } catch (error: any) {
    console.error("[GET-DRAFT-LOAN API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch draft loan" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== "borrower") {
      return NextResponse.json({ error: "Only borrowers can apply for a loan" }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json();
    const action = body.action || "create"; // "create", "draft", "submit"
    const applicationId = body.applicationId;

    if (action === "submit") {
      if (!applicationId) {
        return NextResponse.json({ error: "Application ID is required to submit" }, { status: 400 });
      }
      const application = await LoanApplication.findOne({ _id: applicationId, borrower: userId });
      if (!application) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }

      application.status = "submitted";
      application.submittedAt = new Date();
      await application.save();

      // Audit Log
      await AuditLog.create({
        actor: userId,
        actorRole: userRole,
        action: "LOAN_APPLICATION_SUBMITTED",
        entityType: "loan_application",
        entityId: application._id,
        newState: application.toJSON(),
      });

      // Send Notification
      await sendNotification({
        email: session.user.email || "",
        phone: (session.user as any).phone || "",
        fullName: session.user.name || "Valued Customer",
        eventName: "application_submitted",
        details: {
          applicationNumber: application.applicationNumber,
          amount: application.amountRequested,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Loan application submitted successfully.",
        applicationId: application._id,
        applicationNumber: application.applicationNumber,
      });
    }

    // Validate request body for create/draft
    const validationResult = LoanApplicationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      amountRequested,
      tenureMonths,
      purpose,
      purposeDetail,
      employmentType,
      monthlyIncome,
      existingLoans,
      interestType,
    } = validationResult.data;

    let application;
    if (applicationId) {
      application = await LoanApplication.findOne({ _id: applicationId, borrower: userId });
    }

    if (application) {
      // Update existing application
      application.amountRequested = amountRequested;
      application.tenureMonths = tenureMonths;
      application.purpose = purpose;
      application.purposeDetail = purposeDetail;
      application.employmentType = employmentType;
      application.monthlyIncome = monthlyIncome;
      application.existingLoans = existingLoans;
      if (action !== "draft") {
        application.status = "submitted";
        application.submittedAt = new Date();
      }
      application.internalNotes = JSON.stringify({ interestType, adminNotes: "" });
      await application.save();
    } else {
      // Create new application
      application = new LoanApplication({
        borrower: userId,
        amountRequested,
        tenureMonths,
        purpose,
        purposeDetail,
        employmentType,
        monthlyIncome,
        existingLoans,
        status: action === "draft" ? "draft" : "submitted",
        submittedAt: action === "draft" ? undefined : new Date(),
        internalNotes: JSON.stringify({ interestType, adminNotes: "" }),
      });
      await application.save();
    }

    if (action !== "draft") {
      // Audit Log for final submission
      await AuditLog.create({
        actor: userId,
        actorRole: userRole,
        action: "LOAN_APPLICATION_SUBMITTED",
        entityType: "loan_application",
        entityId: application._id,
        newState: application.toJSON(),
      });

      // Send Notification
      await sendNotification({
        email: session.user.email || "",
        phone: (session.user as any).phone || "",
        fullName: session.user.name || "Valued Customer",
        eventName: "application_submitted",
        details: {
          applicationNumber: application.applicationNumber,
          amount: amountRequested,
        },
      });
    }

    return NextResponse.json(
      {
        message: action === "draft" ? "Draft saved successfully." : "Loan application submitted successfully.",
        applicationId: application._id,
        applicationNumber: application.applicationNumber,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[LOAN-APPLY API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit loan application" },
      { status: 500 }
    );
  }
}
