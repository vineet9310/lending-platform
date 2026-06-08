import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { EMISchedule } from "@/models/EMISchedule";

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

    // Fetch all overdue EMIs
    const overdueEmis = await EMISchedule.find({ status: "overdue" })
      .populate("borrower", "fullName email phone")
      .populate("loan", "loanNumber principal interestRate emiAmount")
      .sort({ dueDate: 1 });

    return NextResponse.json({
      success: true,
      count: overdueEmis.length,
      overdueEmis,
    });
  } catch (error: any) {
    console.error("[ADMIN-OVERDUE API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve overdue EMIs" },
      { status: 500 }
    );
  }
}
