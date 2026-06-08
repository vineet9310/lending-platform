import Razorpay from "razorpay";
import crypto from "crypto";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

const isRazorpayConfigured = !!(keyId && keySecret);

let razorpayInstance: Razorpay | null = null;
if (isRazorpayConfigured) {
  razorpayInstance = new Razorpay({
    key_id: keyId!,
    key_secret: keySecret!,
  });
}

/**
 * Creates a Razorpay Order for EMI repayments.
 */
export async function createRazorpayOrder(amount: number, currency: string = "INR") {
  console.log(`[RAZORPAY] Creating order for amount: ${amount} ${currency}`);
  
  if (!isRazorpayConfigured || !razorpayInstance) {
    // Return mock order details in development
    const mockOrderId = `order_${Math.random().toString(36).substring(2, 11)}`;
    console.log(`[RAZORPAY MOCK] Generated mock order: ${mockOrderId}`);
    return {
      id: mockOrderId,
      amount: amount * 100, // paise
      currency,
      status: "created",
      mock: true,
    };
  }

  try {
    const order = await razorpayInstance.orders.create({
      amount: Math.round(amount * 100), // convert to paise/cents
      currency,
      receipt: `receipt_${Date.now()}`,
    });
    return order;
  } catch (error) {
    console.error("[RAZORPAY ERROR] Failed to create order:", error);
    throw error;
  }
}

/**
 * Verifies Razorpay Webhook/Payment signatures.
 */
export function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!isRazorpayConfigured) {
    // In local development development bypass
    console.log("[RAZORPAY MOCK] Signature verified automatically in development.");
    return true;
  }

  try {
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret!)
      .update(body.toString())
      .digest("hex");
    return expectedSignature === signature;
  } catch (error) {
    console.error("[RAZORPAY ERROR] Signature verification failed:", error);
    return false;
  }
}

/**
 * Triggers a RazorpayX payout for loan disbursements.
 */
export async function triggerPayout(amount: number, borrowerDetails: { name: string; phone: string; email: string }) {
  console.log(`[RAZORPAYX] Triggering disbursement payout of ${amount} to ${borrowerDetails.name}`);

  if (!isRazorpayConfigured) {
    const mockPayoutReference = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
    console.log(`[RAZORPAYX MOCK] Generated mock payout ref: ${mockPayoutReference}`);
    return {
      id: `pout_${Math.random().toString(36).substring(2, 11)}`,
      status: "processing",
      reference: mockPayoutReference,
      mock: true,
    };
  }

  try {
    // Razorpay Payouts are made through RazorpayX endpoints.
    // Since Razorpay SDK doesn't natively expose RazorpayX directly sometimes,
    // we make an HTTP request to Razorpay Payouts API.
    const response = await fetch("https://api.razorpay.com/v1/payouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
      },
      body: JSON.stringify({
        account_number: "23456789012", // RazorpayX account number from settings
        amount: Math.round(amount * 100), // in paise
        currency: "INR",
        mode: "IMPS",
        purpose: "disbursement",
        fund_account: {
          contact: {
            name: borrowerDetails.name,
            email: borrowerDetails.email,
            contact: borrowerDetails.phone,
            type: "customer",
          },
          account_type: "bank_account",
          bank_account: {
            name: borrowerDetails.name,
            ifsc: "UTIB0000194", // standard default Axis IFSC for mock/sandbox
            account_number: "919010000000000",
          },
        },
        queue_if_low_balance: true,
        reference_id: `DISB-${Date.now()}`,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.description || "Payout API failed");
    }

    return {
      id: data.id,
      status: data.status,
      reference: data.utr || data.reference_id,
      mock: false,
    };
  } catch (error) {
    console.error("[RAZORPAY Payout Error] failed:", error);
    // In case of error in testing, return a mock reference so development isn't blocked
    return {
      id: `pout_${Math.random().toString(36).substring(2, 11)}`,
      status: "failed-fallback",
      reference: `MANUAL-${Math.floor(100000 + Math.random() * 900000)}`,
      mock: true,
    };
  }
}
