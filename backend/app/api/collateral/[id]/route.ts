import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Collateral } from "@/models/Collateral";
import { LoanApplication } from "@/models/LoanApplication";
import { AuditLog } from "@/models/AuditLog";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    await connectToDatabase();

    const collateral = await Collateral.findById(id).populate("verifiedBy", "fullName email");
    if (!collateral) {
      return NextResponse.json({ error: "Collateral details not found" }, { status: 404 });
    }

    // Authorization
    if (userRole === "borrower" && collateral.borrower.toString() !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      collateral,
    });
  } catch (error: any) {
    console.error("[GET-COLLATERAL API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve collateral details" },
      { status: 500 }
    );
  }
}

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

    const body = await req.json();
    const { valuedBy, marketValue, forcedSaleValue, reportUrl } = body;

    const collateral = await Collateral.findById(id);
    if (!collateral) {
      return NextResponse.json({ error: "Collateral not found" }, { status: 404 });
    }

    const prevValuation = collateral.valuationReport || {};

    // Update valuation report
    collateral.valuationReport = {
      valuedBy: valuedBy || session.user.name,
      valuedAt: new Date(),
      marketValue: Number(marketValue) || collateral.estimatedValue,
      forcedSaleValue: Number(forcedSaleValue) || Number(marketValue) * 0.8 || collateral.estimatedValue * 0.8,
      reportUrl: reportUrl || "",
    };

    // Recalculate LTV ratio using new market value if updated
    if (marketValue) {
      const application = await LoanApplication.findById(collateral.application);
      if (application) {
        collateral.ltvRatio = (application.amountRequested / Number(marketValue)) * 100;
      }
    }

    await collateral.save();

    // Audit log
    await AuditLog.create({
      actor: userId,
      actorRole: userRole,
      action: "COLLATERAL_VALUATION_UPDATED",
      entityType: "collateral",
      entityId: collateral._id,
      previousState: { valuationReport: prevValuation },
      newState: { valuationReport: collateral.valuationReport, ltvRatio: collateral.ltvRatio },
    });

    return NextResponse.json({
      success: true,
      message: "Valuation report updated successfully.",
      collateral,
    });
  } catch (error: any) {
    console.error("[PATCH-COLLATERAL-VALUATION API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update valuation report" },
      { status: 500 }
    );
  }
}
