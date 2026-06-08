import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { LoanApplication } from "@/models/LoanApplication";
import { Loan } from "@/models/Loan";
import { KYCRecord } from "@/models/KYCRecord";
import { Collateral } from "@/models/Collateral";

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

    // Check if there is an application with this ID
    const application = await LoanApplication.findById(id)
      .populate("borrower", "fullName email phone status cnic address")
      .populate("assignedAgent", "fullName email phone")
      .populate("reviewedBy", "fullName email")
      .populate("approvedBy", "fullName email");

    if (!application) {
      return NextResponse.json({ error: "Loan application not found" }, { status: 404 });
    }

    // Role-based protection: borrower can only view their own
    const borrowerId = (application.borrower as any)._id || application.borrower;
    if (userRole === "borrower" && borrowerId.toString() !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch related records: KYC, Collateral, Loan
    const kyc = await KYCRecord.findOne({ application: id });
    const collateral = await Collateral.findOne({ application: id });
    const loan = await Loan.findOne({ application: id });

    return NextResponse.json({
      success: true,
      application,
      kyc,
      collateral,
      loan,
    });
  } catch (error: any) {
    console.error("[GET-LOAN API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve loan details" },
      { status: 500 }
    );
  }
}
