import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { EMISchedule } from "@/models/EMISchedule";
import { Loan } from "@/models/Loan";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: loanId } = await params;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    await connectToDatabase();

    const loan = await Loan.findById(loanId);
    if (!loan) {
      // Try querying by application ID if it's the application ID passed in details
      const loanByApp = await Loan.findOne({ application: loanId });
      if (!loanByApp) {
        return NextResponse.json({ error: "Loan not found" }, { status: 404 });
      }
      
      if (userRole === "borrower" && loanByApp.borrower.toString() !== userId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }

      const schedule = await EMISchedule.find({ loan: loanByApp._id }).sort({ emiNumber: 1 });
      return NextResponse.json({
        success: true,
        loan: loanByApp,
        schedule,
      });
    }

    if (userRole === "borrower" && loan.borrower.toString() !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const schedule = await EMISchedule.find({ loan: loanId }).sort({ emiNumber: 1 });

    return NextResponse.json({
      success: true,
      loan,
      schedule,
    });
  } catch (error: any) {
    console.error("[LOAN-EMI-SCHEDULE API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve EMI schedule" },
      { status: 500 }
    );
  }
}
