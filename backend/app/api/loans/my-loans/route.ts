import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { LoanApplication } from "@/models/LoanApplication";
import { Loan } from "@/models/Loan";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    await connectToDatabase();

    // Fetch loan applications
    const applications = await LoanApplication.find({ borrower: userId }).sort({ createdAt: -1 });

    // Fetch active loans (repayments phase)
    const loans = await Loan.find({ borrower: userId }).populate("collateral").sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      applications,
      loans,
    });
  } catch (error: any) {
    console.error("[MY-LOANS API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve loans" },
      { status: 500 }
    );
  }
}
