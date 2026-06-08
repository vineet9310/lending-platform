import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { EMISchedule } from "@/models/EMISchedule";
import { Payment } from "@/models/Payment";
import { createRazorpayOrder } from "@/lib/razorpay";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    if (userRole !== "borrower") {
      return NextResponse.json({ error: "Only borrowers can make payments" }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { emiScheduleId } = body;

    if (!emiScheduleId) {
      return NextResponse.json({ error: "emiScheduleId is required" }, { status: 400 });
    }

    const emi = await EMISchedule.findById(emiScheduleId).populate("loan");
    if (!emi) {
      return NextResponse.json({ error: "EMI schedule not found" }, { status: 404 });
    }

    if (emi.borrower.toString() !== userId) {
      return NextResponse.json({ error: "Unauthorized access to this EMI schedule" }, { status: 403 });
    }

    if (emi.status === "paid") {
      return NextResponse.json({ error: "This EMI has already been paid" }, { status: 400 });
    }

    // Amount to pay = totalEMI + penaltyAmount
    const totalDue = emi.totalEMI + emi.penaltyAmount;

    // Create Razorpay order
    const order = await createRazorpayOrder(totalDue, "INR"); // Use INR for Razorpay standard Sandbox

    // Record pending payment in database
    const payment = new Payment({
      loan: (emi.loan as any)._id || emi.loan,
      borrower: userId,
      emiSchedule: emi._id,
      amount: totalDue,
      type: "emi",
      direction: "inflow",
      method: "razorpay",
      razorpayOrderId: order.id,
      status: "pending",
    });

    await payment.save();

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment._id,
    });
  } catch (error: any) {
    console.error("[PAYMENTS-CREATE-ORDER API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
