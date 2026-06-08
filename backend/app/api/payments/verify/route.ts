import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { EMISchedule } from "@/models/EMISchedule";
import { Loan } from "@/models/Loan";
import { verifySignature } from "@/lib/razorpay";
import { AuditLog } from "@/models/AuditLog";
import { sendNotification } from "@/lib/notifications";
import { User } from "@/models/User";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    await connectToDatabase();

    const body = await req.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Missing verification parameters: razorpayOrderId, razorpayPaymentId, razorpaySignature" },
        { status: 400 }
      );
    }

    // Verify signature
    const isValid = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    
    // Find payment record
    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) {
      return NextResponse.json({ error: "Payment transaction not found for this order" }, { status: 404 });
    }

    if (payment.status === "success") {
      return NextResponse.json({ success: true, message: "Payment already verified successfully" });
    }

    const prevPaymentState = payment.toJSON();

    if (!isValid) {
      payment.status = "failed";
      payment.failureReason = "Signature verification failed";
      await payment.save();

      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    // Success! Update payment
    payment.status = "success";
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.processedAt = new Date();
    await payment.save();

    // Update EMI Schedule
    const emi = await EMISchedule.findById(payment.emiSchedule);
    if (emi) {
      const prevEmiState = emi.toJSON();
      emi.status = "paid";
      emi.paidAmount = payment.amount;
      emi.paidAt = new Date();
      await emi.save();

      // Audit Log for EMI paid
      await AuditLog.create({
        actor: userId,
        actorRole: userRole,
        action: "EMI_PAID",
        entityType: "emi",
        entityId: emi._id,
        previousState: prevEmiState,
        newState: emi.toJSON(),
      });

      // Check if all EMIs for this loan are now paid
      const outstandingEmisCount = await EMISchedule.countDocuments({
        loan: emi.loan,
        status: { $ne: "paid" },
      });

      if (outstandingEmisCount === 0) {
        // Close the Loan!
        const loan = await Loan.findById(emi.loan);
        if (loan && loan.status !== "closed") {
          const prevLoanState = loan.toJSON();
          loan.status = "closed";
          loan.closedAt = new Date();
          await loan.save();

          // Audit Log for Loan closed
          await AuditLog.create({
            actor: userId,
            actorRole: userRole,
            action: "LOAN_CLOSED",
            entityType: "loan",
            entityId: loan._id,
            previousState: prevLoanState,
            newState: loan.toJSON(),
          });

          // Notify Borrower
          const borrower = await User.findById(loan.borrower);
          if (borrower) {
            await sendNotification({
              email: borrower.email,
              phone: borrower.phone,
              fullName: borrower.fullName,
              eventName: "loan_closed",
              details: { loanNumber: loan.loanNumber },
            });
          }
        }
      }
    }

    // Audit Log for payment transaction
    await AuditLog.create({
      actor: userId,
      actorRole: userRole,
      action: "PAYMENT_PROCESSED",
      entityType: "payment",
      entityId: payment._id,
      previousState: prevPaymentState,
      newState: payment.toJSON(),
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified and updated successfully.",
      paymentStatus: payment.status,
    });
  } catch (error: any) {
    console.error("[PAYMENTS-VERIFY API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify payment" },
      { status: 500 }
    );
  }
}
