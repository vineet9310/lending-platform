import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { getOTP, deleteOTP } from "@/lib/otp-store";
import { AuditLog } from "@/models/AuditLog";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { email, token, password } = body;

    if (!email || !token || !password) {
      return NextResponse.json(
        { error: "Email, token, and new password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();
    const key = `reset-password:${emailLower}`;

    const savedToken = await getOTP(key);
    if (!savedToken) {
      return NextResponse.json(
        { error: "Reset link has expired or is invalid. Please request a new one." },
        { status: 400 }
      );
    }

    if (savedToken !== token.trim()) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // Success! Update password
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    user.passwordHash = passwordHash;
    await user.save();

    // Delete token
    await deleteOTP(key);

    // Write Audit Log
    await AuditLog.create({
      actor: user._id,
      actorRole: user.role,
      action: "PASSWORD_RESET",
      entityType: "user",
      entityId: user._id,
    });

    return NextResponse.json({
      message: "Password reset successfully. You can now log in with your new password.",
      success: true,
    });
  } catch (error: any) {
    console.error("[RESET-PASSWORD API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}
