import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { Loan } from "@/models/Loan";

export async function GET(req: Request, { params }: { params: Promise<{ loanId: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { loanId } = await params;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    await connectToDatabase();

    // Verify loan exists and permissions
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    if (userRole === "borrower" && loan.borrower.toString() !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Retrieve all successful/failed payments for this loan
    const payments = await Payment.find({ loan: loanId }).sort({ processedAt: -1, createdAt: -1 });

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error: any) {
    console.error("[PAYMENTS-HISTORY API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve payment history" },
      { status: 500 }
    );
  }
}
