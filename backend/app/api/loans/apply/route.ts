import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { LoanApplication } from "@/models/LoanApplication";
import { LoanApplicationSchema } from "@/lib/validators/loan.schema";
import { AuditLog } from "@/models/AuditLog";
import { sendNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== "borrower") {
      return NextResponse.json({ error: "Only borrowers can apply for a loan" }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json();
    
    // Validate request body
    const validationResult = LoanApplicationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { amountRequested, tenureMonths, purpose, purposeDetail, employmentType, monthlyIncome, existingLoans } = validationResult.data;

    // Create the application in 'submitted' status
    const application = new LoanApplication({
      borrower: userId,
      amountRequested,
      tenureMonths,
      purpose,
      purposeDetail,
      employmentType,
      monthlyIncome,
      existingLoans,
      status: "submitted",
      submittedAt: new Date(),
    });

    await application.save();

    // Audit Log
    await AuditLog.create({
      actor: userId,
      actorRole: userRole,
      action: "LOAN_APPLICATION_SUBMITTED",
      entityType: "loan_application",
      entityId: application._id,
      newState: application.toJSON(),
    });

    // Send Notification
    await sendNotification({
      email: session.user.email || "",
      phone: (session.user as any).phone || "",
      fullName: session.user.name || "Valued Customer",
      eventName: "application_submitted",
      details: {
        applicationNumber: application.applicationNumber,
        amount: amountRequested,
      },
    });

    return NextResponse.json(
      {
        message: "Loan application submitted successfully.",
        applicationId: application._id,
        applicationNumber: application.applicationNumber,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[LOAN-APPLY API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit loan application" },
      { status: 500 }
    );
  }
}
