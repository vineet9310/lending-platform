import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { setOTP } from "@/lib/otp-store";
import { sendSMS } from "@/lib/twilio";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const user = await User.findOne({ phone });
    if (!user) {
      return NextResponse.json({ error: "No user found with this phone number" }, { status: 404 });
    }

    // Generate 6-digit SMS OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `phone:${phone}`;
    await setOTP(key, otp, 300); // 5 minutes expiry

    // Send SMS
    const appName = process.env.NEXT_PUBLIC_APP_NAME || "LendEasy";
    await sendSMS({
      to: phone,
      body: `Your ${appName} verification code is ${otp}. Valid for 5 minutes.`,
    });

    return NextResponse.json({
      message: "Verification OTP sent successfully via SMS.",
      success: true,
    });
  } catch (error: any) {
    console.error("[SEND-OTP API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send OTP" },
      { status: 500 }
    );
  }
}
