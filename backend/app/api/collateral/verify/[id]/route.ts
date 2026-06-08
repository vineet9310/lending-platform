import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Collateral } from "@/models/Collateral";
import { LoanApplication } from "@/models/LoanApplication";
import { AuditLog } from "@/models/AuditLog";

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

    const collateral = await Collateral.findById(id);
    if (!collateral) {
      return NextResponse.json({ error: "Collateral not found" }, { status: 404 });
    }

    const application = await LoanApplication.findById(collateral.application);
    if (!application) {
      return NextResponse.json({ error: "Loan application not found" }, { status: 404 });
    }

    const prevCollateralStatus = collateral.verificationStatus;
    const prevAppStatus = application.status;

    // Update Collateral verification status
    collateral.verificationStatus = "verified";
    collateral.verifiedBy = userId;
    
    const body = await req.json().catch(() => ({}));
    if (body.notes) {
      collateral.description = `${collateral.description} (Agent Notes: ${body.notes})`;
    }
    await collateral.save();

    // Transition Loan Application status: collateral_verified -> under_review
    application.status = "under_review";
    await application.save();

    // Audit logs
    await AuditLog.create({
      actor: userId,
      actorRole: userRole,
      action: "COLLATERAL_VERIFIED",
      entityType: "collateral",
      entityId: collateral._id,
      previousState: { verificationStatus: prevCollateralStatus },
      newState: { verificationStatus: collateral.verificationStatus },
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
      message: "Collateral verified successfully. Loan application transitioned to Under Review.",
      collateralStatus: collateral.verificationStatus,
      applicationStatus: application.status,
    });
  } catch (error: any) {
    console.error("[COLLATERAL-VERIFY API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify collateral" },
      { status: 500 }
    );
  }
}
