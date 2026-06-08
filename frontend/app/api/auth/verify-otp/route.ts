import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getOTP, deleteOTP, getAttempts, incrementAttempts } from "@/lib/otp-store";
import { AuditLog } from "@/models/AuditLog";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { phone, otp } = body;

    if (!phone || !otp) {
      return NextResponse.json({ error: "Phone number and OTP are required" }, { status: 400 });
    }

    const key = `phone:${phone}`;

    // Security: Limit to 3 attempts
    const attempts = await getAttempts(key);
    if (attempts >= 3) {
      await deleteOTP(key);
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new SMS OTP." },
        { status: 400 }
      );
    }

    const savedOtp = await getOTP(key);
    if (!savedOtp) {
      return NextResponse.json(
        { error: "OTP expired or invalid. Please request a new code." },
        { status: 400 }
      );
    }

    if (savedOtp !== otp.trim()) {
      await incrementAttempts(key);
      const remaining = 3 - (attempts + 1);
      return NextResponse.json(
        { error: `Invalid OTP. ${remaining} attempts remaining.` },
        { status: 400 }
      );
    }

    // OTP matches! Verify phone in db
    const user = await User.findOne({ phone });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const prevState = { isPhoneVerified: user.isPhoneVerified };
    user.isPhoneVerified = true;
    await user.save();

    await deleteOTP(key);

    // Audit log entry
    await AuditLog.create({
      actor: user._id,
      actorRole: user.role,
      action: "PHONE_VERIFIED",
      entityType: "user",
      entityId: user._id,
      previousState: prevState,
      newState: { isPhoneVerified: user.isPhoneVerified },
    });

    return NextResponse.json({
      message: "Phone number verified successfully.",
      success: true,
    });
  } catch (error: any) {
    console.error("[VERIFY-OTP API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}
