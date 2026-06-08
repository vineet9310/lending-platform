import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Loan } from "@/models/Loan";
import { EMISchedule } from "@/models/EMISchedule";
import { LoanApplication } from "@/models/LoanApplication";

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

    // Portfolio metrics
    const loans = await Loan.find({});
    
    let totalPortfolioSize = 0; // sum of principal on active/restructured loans
    let activeLoansCount = 0;
    let closedLoansCount = 0;
    let defaultedLoansCount = 0;

    loans.forEach((loan) => {
      if (loan.status === "active" || loan.status === "restructured") {
        totalPortfolioSize += loan.principal;
        activeLoansCount++;
      } else if (loan.status === "closed") {
        closedLoansCount++;
      } else if (loan.status === "defaulted") {
        defaultedLoansCount++;
      }
    });

    // Total interest and penalties from EMIs
    const emiStats = await EMISchedule.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalScheduled: { $sum: "$totalEMI" },
          totalPaid: { $sum: "$paidAmount" },
          totalPenalty: { $sum: "$penaltyAmount" },
        },
      },
    ]);

    let totalInterestEarned = 0;
    let totalPenaltiesCollected = 0;
    let totalScheduledEmi = 0;
    let totalPaidEmi = 0;

    emiStats.forEach((stat) => {
      totalScheduledEmi += stat.totalScheduled || 0;
      totalPaidEmi += stat.totalPaid || 0;
      if (stat._id === "paid") {
        totalInterestEarned += stat.totalPaid - (stat.totalPaid * 0.9); // mock calculation or direct summation of interest components
      }
      totalPenaltiesCollected += stat.totalPenalty || 0;
    });

    // Calculate actual collection rate
    // Collection rate = (total payments collected / total scheduled EMIs up to today) * 100
    const today = new Date();
    const scheduledUpToToday = await EMISchedule.aggregate([
      {
        $match: {
          dueDate: { $lte: today },
        },
      },
      {
        $group: {
          _id: null,
          totalScheduled: { $sum: "$totalEMI" },
          totalPaid: { $sum: "$paidAmount" },
        },
      },
    ]);

    const schedTotal = scheduledUpToToday[0]?.totalScheduled || 0;
    const paidTotal = scheduledUpToToday[0]?.totalPaid || 0;
    const collectionRate = schedTotal > 0 ? (paidTotal / schedTotal) * 100 : 100;

    // Breakdown by loan purpose
    // Group active loans by their application's purpose
    const purposeBreakdown = await Loan.aggregate([
      { $match: { status: "active" } },
      {
        $lookup: {
          from: "loanapplications",
          localField: "application",
          foreignField: "_id",
          as: "app",
        },
      },
      { $unwind: "$app" },
      {
        $group: {
          _id: "$app.purpose",
          value: { $sum: "$principal" },
        },
      },
    ]);

    // Format breakdown for pie chart compatibility
    const formattedBreakdown = purposeBreakdown.map((item) => ({
      name: item._id ? item._id.charAt(0).toUpperCase() + item._id.slice(1) : "Other",
      value: item.value || 0,
    }));

    return NextResponse.json({
      success: true,
      portfolio: {
        totalPortfolioSize,
        activeLoansCount,
        closedLoansCount,
        defaultedLoansCount,
        totalPenaltiesCollected,
        collectionRate: Math.round(collectionRate * 100) / 100,
        purposeBreakdown: formattedBreakdown.length > 0 ? formattedBreakdown : [{ name: "General", value: 1 }],
      },
    });
  } catch (error: any) {
    console.error("[ADMIN-REPORTS-PORTFOLIO API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve portfolio report" },
      { status: 500 }
    );
  }
}
