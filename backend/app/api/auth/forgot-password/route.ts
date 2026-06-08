import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { setOTP } from "@/lib/otp-store";
import { sendMail } from "@/lib/nodemailer";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailLower = email.toLowerCase();
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      // For security reasons, don't explicitly say "User not found"
      // return 200 to avoid email harvesting
      return NextResponse.json({
        message: "If a user with that email exists, a reset link has been sent.",
        success: true,
      });
    }

    // Generate secure random token
    const token = crypto.randomBytes(32).toString("hex");
    const key = `reset-password:${emailLower}`;
    
    // Store in Redis/memory with 1 hour (3600 seconds) expiry
    await setOTP(key, token, 3600);

    const appName = process.env.NEXT_PUBLIC_APP_NAME || "LendEasy";
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(emailLower)}`;

    await sendMail({
      to: emailLower,
      subject: `Reset your Password - ${appName}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1e40af;">Password Reset Request</h2>
          <p>We received a request to reset the password for your ${appName} account.</p>
          <p>Click the button below to set a new password:</p>
          <div style="margin: 30px 0;">
            <a href="${resetLink}" style="background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; font-size: 14px; color: #4b5563;">${resetLink}</p>
          <p>This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json({
      message: "If a user with that email exists, a reset link has been sent.",
      success: true,
    });
  } catch (error: any) {
    console.error("[FORGOT-PASSWORD API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process forgot password" },
      { status: 500 }
    );
  }
}
