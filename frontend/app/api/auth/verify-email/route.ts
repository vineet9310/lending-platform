import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getOTP, deleteOTP, getAttempts, incrementAttempts } from "@/lib/otp-store";
import { AuditLog } from "@/models/AuditLog";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();
    const key = `register:${emailLower}`;

    // Check attempts first (security: max 3 attempts)
    const attempts = await getAttempts(key);
    if (attempts >= 3) {
      await deleteOTP(key);
      return NextResponse.json(
        { error: "Too many failed attempts. Please register or request a new OTP." },
        { status: 400 }
      );
    }

    const savedOtp = await getOTP(key);

    if (!savedOtp) {
      return NextResponse.json(
        { error: "OTP expired or invalid. Please request a new verification code." },
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

    // Success! Verify user
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const prevState = { status: user.status, isEmailVerified: user.isEmailVerified };

    user.isEmailVerified = true;
    user.status = "active"; // activate user upon email verification
    await user.save();

    // Delete OTP
    await deleteOTP(key);

    // Write Audit Log
    await AuditLog.create({
      actor: user._id,
      actorRole: user.role,
      action: "EMAIL_VERIFIED",
      entityType: "user",
      entityId: user._id,
      previousState: prevState,
      newState: { status: user.status, isEmailVerified: user.isEmailVerified },
    });

    return NextResponse.json({
      message: "Email verified successfully. Account is now active.",
      success: true,
    });
  } catch (error: any) {
    console.error("[VERIFY-EMAIL API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
