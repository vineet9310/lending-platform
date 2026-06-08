import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { LoanApplication } from "@/models/LoanApplication";
import { Collateral } from "@/models/Collateral";
import { uploadFile } from "@/lib/cloudinary";
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
      return NextResponse.json({ error: "Only borrowers can submit collateral" }, { status: 403 });
    }

    await connectToDatabase();

    const formData = await req.formData();
    const applicationId = formData.get("applicationId") as string;
    const type = formData.get("type") as string;
    const description = formData.get("description") as string;
    const estimatedValue = Number(formData.get("estimatedValue"));
    const location = (formData.get("location") as string) || "";
    const registrationNumber = (formData.get("registrationNumber") as string) || "";

    if (!applicationId || !type || !description || isNaN(estimatedValue) || estimatedValue <= 0) {
      return NextResponse.json({ error: "Missing or invalid required fields" }, { status: 400 });
    }

    // Verify application
    const application = await LoanApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json({ error: "Loan application not found" }, { status: 404 });
    }
    if (application.borrower.toString() !== userId) {
      return NextResponse.json({ error: "Unauthorized access to this application" }, { status: 403 });
    }

    // Parse files
    const docTypes = ["ownership_deed", "valuation_report", "registration", "insurance", "other"];
    const documents: any[] = [];

    for (const docType of docTypes) {
      const file = formData.get(docType) as File | null;
      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploadRes = await uploadFile(buffer, file.name, "collateral");
        if (uploadRes.success) {
          documents.push({
            docType,
            fileUrl: uploadRes.url,
            uploadedAt: new Date(),
          });
        }
      }
    }

    // Calculate LTV Ratio = loan_amount / collateral_value * 100
    const ltvRatio = (application.amountRequested / estimatedValue) * 100;

    // Save or update Collateral
    let collateral = await Collateral.findOne({ application: applicationId });

    const collateralData = {
      application: new mongoose.Types.ObjectId(applicationId),
      borrower: new mongoose.Types.ObjectId(userId),
      type: type as any,
      description,
      estimatedValue,
      currency: "PKR",
      documents,
      location: location || undefined,
      registrationNumber: registrationNumber || undefined,
      ltvRatio,
      verificationStatus: "pending" as const,
    };

    const prevCollateralState = collateral ? collateral.toJSON() : null;

    if (collateral) {
      Object.assign(collateral, collateralData);
      await collateral.save();
    } else {
      collateral = await Collateral.create(collateralData);
    }

    // Update Loan Application status to 'collateral_pending' or 'under_review' if KYC is verified
    const prevAppStatus = application.status;
    
    // If the state was already 'kyc_verified', this transitions to 'collateral_pending' and then straight to 'under_review'
    // Let's transition to 'collateral_pending' as per the spec state machine:
    // draft → submitted → kyc_pending → kyc_verified → collateral_pending → collateral_verified → under_review
    application.status = "collateral_pending";
    await application.save();

    // Audit logs
    await AuditLog.create({
      actor: userId,
      actorRole: userRole,
      action: "COLLATERAL_SUBMITTED",
      entityType: "collateral",
      entityId: collateral._id,
      previousState: prevCollateralState,
      newState: collateral.toJSON(),
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
      message: "Collateral submitted successfully and application updated to collateral pending.",
      collateralId: collateral._id,
      ltvRatio,
    });
  } catch (error: any) {
    console.error("[COLLATERAL-SUBMIT API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit collateral" },
      { status: 500 }
    );
  }
}
