import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { EMISchedule } from "@/models/EMISchedule";
import { AuditLog } from "@/models/AuditLog";

export async function POST(req: Request, { params }: { params: Promise<{ emiId: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emiId } = await params;
    const adminId = (session.user as any).id;
    const adminRole = (session.user as any).role;

    if (!["admin", "superadmin"].includes(adminRole)) {
      return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json().catch(() => ({}));
    const { reason } = body;

    const emi = await EMISchedule.findById(emiId);
    if (!emi) {
      return NextResponse.json({ error: "EMI schedule not found" }, { status: 404 });
    }

    const prevPenaltyAmount = emi.penaltyAmount;
    const prevEmiState = emi.toJSON();

    // Waive the penalty
    emi.penaltyAmount = 0;
    emi.penaltyReason = `Waived by Admin: ${reason || "No reason provided"}`;
    await emi.save();

    // Audit logs
    await AuditLog.create({
      actor: adminId,
      actorRole: adminRole,
      action: "PENALTY_WAIVED",
      entityType: "emi",
      entityId: emi._id,
      previousState: prevEmiState,
      newState: emi.toJSON(),
    });

    return NextResponse.json({
      success: true,
      message: `Penalty of PKR ${prevPenaltyAmount} waived successfully for EMI #${emi.emiNumber}.`,
      emi,
    });
  } catch (error: any) {
    console.error("[ADMIN-WAIVE-PENALTY API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to waive penalty" },
      { status: 500 }
    );
  }
}
