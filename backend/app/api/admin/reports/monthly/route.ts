import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!["admin", "superadmin"].includes(userRole)) {
      return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 });
    }

    await connectToDatabase();

    const reportData = [];
    const today = new Date();

    // Iterate over the last 12 months
    for (let i = 11; i >= 0; i--) {
      const targetMonthDate = subMonths(today, i);
      const start = startOfMonth(targetMonthDate);
      const end = endOfMonth(targetMonthDate);

      // Find disbursements (outflows) in this month
      const disbursements = await Payment.aggregate([
        {
          $match: {
            direction: "outflow",
            type: "disbursement",
            status: "success",
            processedAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      // Find collections (inflows) in this month
      const collections = await Payment.aggregate([
        {
          $match: {
            direction: "inflow",
            type: { $in: ["emi", "prepayment", "penalty"] },
            status: "success",
            processedAt: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
          },
        },
      ]);

      reportData.push({
        month: format(targetMonthDate, "MMM yyyy"),
        disbursements: disbursements[0]?.total || 0,
        collections: collections[0]?.total || 0,
      });
    }

    return NextResponse.json({
      success: true,
      report: reportData,
    });
  } catch (error: any) {
    console.error("[ADMIN-REPORTS-MONTHLY API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve monthly report" },
      { status: 500 }
    );
  }
}
