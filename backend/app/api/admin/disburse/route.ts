import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { LoanApplication } from "@/models/LoanApplication";
import { Loan } from "@/models/Loan";
import { EMISchedule } from "@/models/EMISchedule";
import { Payment } from "@/models/Payment";
import { AuditLog } from "@/models/AuditLog";
import { User } from "@/models/User";
import { calculateEMI } from "@/lib/emi-calculator";
import { triggerPayout } from "@/lib/razorpay";
import { sendNotification } from "@/lib/notifications";
import { Collateral } from "@/models/Collateral";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = (session.user as any).id;
    const adminRole = (session.user as any).role;

    if (!["admin", "superadmin"].includes(adminRole)) {
      return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { applicationId, disbursementMethod, disbursementReference } = body;

    if (!applicationId || !disbursementMethod) {
      return NextResponse.json(
        { error: "Missing required fields: applicationId, disbursementMethod" },
        { status: 400 }
      );
    }

    const application = await LoanApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json({ error: "Loan application not found" }, { status: 404 });
    }

    if (application.status !== "approved") {
      return NextResponse.json(
        { error: `Cannot disburse loan application in '${application.status}' status. Must be 'approved'.` },
        { status: 400 }
      );
    }

    // Retrieve borrower
    const borrower = await User.findById(application.borrower);
    if (!borrower) {
      return NextResponse.json({ error: "Borrower not found" }, { status: 404 });
    }

    // Retrieve collateral
    const collateral = await Collateral.findOne({ application: applicationId });

    // Parse offered interest configuration
    let interestType: 'flat' | 'reducing_balance' | 'compound' = 'reducing_balance';
    try {
      if (application.internalNotes) {
        const parsed = JSON.parse(application.internalNotes);
        if (parsed.interestType) interestType = parsed.interestType;
      }
    } catch (e) {
      // ignore parsing errors and use default
    }

    const principal = application.offeredAmount || application.amountRequested;
    const rate = application.offeredInterestRate || 18; // default to 18%
    const tenure = application.tenureMonths;

    // Calculate EMI schedule
    const emiResult = calculateEMI(principal, rate, tenure, interestType, new Date());

    // Trigger disbursement payout
    let finalReference = disbursementReference || `TXN-${Date.now()}`;
    let razorpayId = "";
    
    if (disbursementMethod === "bank_transfer" && !disbursementReference) {
      // Trigger automatic Razorpay payout
      const payoutRes = await triggerPayout(principal, {
        name: borrower.fullName,
        phone: borrower.phone,
        email: borrower.email,
      });
      finalReference = payoutRes.reference;
      razorpayId = payoutRes.id;
    }

    // Create Loan Document
    const loan = new Loan({
      application: application._id,
      borrower: borrower._id,
      collateral: collateral?._id || undefined,
      principal,
      interestRate: rate,
      interestType,
      tenureMonths: tenure,
      totalPayable: emiResult.totalPayable,
      totalInterest: emiResult.totalInterest,
      emiAmount: emiResult.emiAmount,
      disbursedAmount: principal,
      disbursedAt: new Date(),
      disbursementMethod,
      disbursementReference: finalReference,
      status: "active",
      nocGenerated: false,
    });

    await loan.save();

    // Create EMI Schedule documents in bulk
    const emiSchedules = emiResult.schedule.map((row) => ({
      loan: loan._id,
      borrower: borrower._id,
      emiNumber: row.emiNumber,
      dueDate: row.dueDate,
      principalComponent: row.principalComponent,
      interestComponent: row.interestComponent,
      totalEMI: row.totalEMI,
      outstandingPrincipal: row.outstandingPrincipal,
      status: "upcoming",
      paidAmount: 0,
      penaltyAmount: 0,
      reminderSentAt: [],
    }));

    await EMISchedule.insertMany(emiSchedules);

    // Create Payment Log (Disbursement is an Outflow)
    const payment = new Payment({
      loan: loan._id,
      borrower: borrower._id,
      amount: principal,
      type: "disbursement",
      direction: "outflow",
      method: disbursementMethod,
      razorpayPaymentId: razorpayId || undefined,
      status: "success",
      processedAt: new Date(),
    });
    await payment.save();

    // Update Loan Application Status to 'disbursed'
    const prevAppStatus = application.status;
    application.status = "disbursed";
    await application.save();

    // Update Collateral to mark lien marked if collateral exists
    if (collateral) {
      collateral.lienMarked = true;
      collateral.lienMarkedAt = new Date();
      await collateral.save();
    }

    // Send notifications to Borrower
    const firstEmi = emiResult.schedule[0];
    const formattedFirstDueDate = firstEmi ? firstEmi.dueDate.toLocaleDateString("en-PK", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
    
    await sendNotification({
      email: borrower.email,
      phone: borrower.phone,
      fullName: borrower.fullName,
      eventName: "disbursement_done",
      details: {
        loanNumber: loan.loanNumber,
        amount: principal,
        reference: finalReference,
        firstDueDate: formattedFirstDueDate,
      },
    });

    // Audit Logs
    await AuditLog.create({
      actor: adminId,
      actorRole: adminRole,
      action: "LOAN_DISBURSED",
      entityType: "loan",
      entityId: loan._id,
      newState: loan.toJSON(),
    });

    await AuditLog.create({
      actor: adminId,
      actorRole: adminRole,
      action: "LOAN_STATUS_CHANGED",
      entityType: "loan_application",
      entityId: application._id,
      previousState: { status: prevAppStatus },
      newState: { status: application.status },
    });

    return NextResponse.json({
      success: true,
      message: "Loan disbursed successfully. Loan account active, EMI schedule generated.",
      loanId: loan._id,
      loanNumber: loan.loanNumber,
      disbursedAmount: principal,
      reference: finalReference,
    });
  } catch (error: any) {
    console.error("[LOAN-DISBURSE API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to disburse loan" },
      { status: 500 }
    );
  }
}
