import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { KYCRecord } from "@/models/KYCRecord";
import { LoanApplication } from "@/models/LoanApplication";
import { AuditLog } from "@/models/AuditLog";
import { sendNotification } from "@/lib/notifications";
import { User } from "@/models/User";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (!["agent", "admin", "superadmin"].includes(userRole)) {
      return NextResponse.json({ error: "Access denied. Agent/Admin role required." }, { status: 403 });
    }

    await connectToDatabase();

    const kyc = await KYCRecord.findById(id);
    if (!kyc) {
      return NextResponse.json({ error: "KYC record not found" }, { status: 404 });
    }

    const application = await LoanApplication.findById(kyc.application);
    if (!application) {
      return NextResponse.json({ error: "Loan application not found" }, { status: 404 });
    }

    const prevKycStatus = kyc.verificationStatus;
    const prevAppStatus = application.status;

    // Update KYC Record
    kyc.verificationStatus = "verified";
    kyc.verifiedBy = userId;
    kyc.verifiedAt = new Date();
    
    const body = await req.json().catch(() => ({}));
    kyc.verificationNotes = body.notes || "Verified by agent";
    await kyc.save();

    // Transition Loan Application status: kyc_pending -> kyc_verified
    application.status = "kyc_verified";
    application.reviewedBy = userId;
    application.reviewedAt = new Date();
    await application.save();

    // Retrieve borrower details to send notification
    const borrower = await User.findById(kyc.borrower);
    if (borrower) {
      await sendNotification({
        email: borrower.email,
        phone: borrower.phone,
        fullName: borrower.fullName,
        eventName: "kyc_approved",
      });
    }

    // Audit logs
    await AuditLog.create({
      actor: userId,
      actorRole: userRole,
      action: "KYC_VERIFIED",
      entityType: "kyc",
      entityId: kyc._id,
      previousState: { verificationStatus: prevKycStatus },
      newState: { verificationStatus: kyc.verificationStatus },
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
      message: "KYC verification approved successfully.",
      kycStatus: kyc.verificationStatus,
      applicationStatus: application.status,
    });
  } catch (error: any) {
    console.error("[KYC-VERIFY API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify KYC" },
      { status: 500 }
    );
  }
}
