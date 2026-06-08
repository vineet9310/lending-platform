import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { Payment } from "@/models/Payment";
import { EMISchedule } from "@/models/EMISchedule";
import { Loan } from "@/models/Loan";
import { AuditLog } from "@/models/AuditLog";
import { sendNotification } from "@/lib/notifications";
import { User } from "@/models/User";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        console.warn("[WEBHOOK WARNING] Webhook signature mismatch.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const eventData = JSON.parse(rawBody);
    console.log(`[RAZORPAY WEBHOOK] Received event: ${eventData.event}`);

    // We look for payment.captured or order.paid
    if (eventData.event === "payment.captured" || eventData.event === "order.paid") {
      await connectToDatabase();

      const paymentEntity = eventData.payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;
      const razorpaySignature = signature || "";

      // Find pending payment
      const payment = await Payment.findOne({ razorpayOrderId });
      if (payment && payment.status !== "success") {
        const prevPaymentState = payment.toJSON();

        // Update payment to success
        payment.status = "success";
        payment.razorpayPaymentId = razorpayPaymentId;
        payment.razorpaySignature = razorpaySignature;
        payment.processedAt = new Date();
        await payment.save();

        // Update EMI Schedule
        const emi = await EMISchedule.findById(payment.emiSchedule);
        if (emi && emi.status !== "paid") {
          const prevEmiState = emi.toJSON();
          emi.status = "paid";
          emi.paidAmount = payment.amount;
          emi.paidAt = new Date();
          await emi.save();

          // Audit Log
          await AuditLog.create({
            action: "EMI_PAID_WEBHOOK",
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
            const loan = await Loan.findById(emi.loan);
            if (loan && loan.status !== "closed") {
              const prevLoanState = loan.toJSON();
              loan.status = "closed";
              loan.closedAt = new Date();
              await loan.save();

              await AuditLog.create({
                action: "LOAN_CLOSED_WEBHOOK",
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

        // Audit Log for Payment success
        await AuditLog.create({
          action: "PAYMENT_PROCESSED_WEBHOOK",
          entityType: "payment",
          entityId: payment._id,
          previousState: prevPaymentState,
          newState: payment.toJSON(),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[RAZORPAY WEBHOOK ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Webhook handling failed" },
      { status: 500 }
    );
  }
}
export const dynamic = "force-dynamic";
