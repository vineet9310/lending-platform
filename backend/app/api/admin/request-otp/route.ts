import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { setOTP } from "@/lib/otp-store";
import { sendMail } from "@/lib/nodemailer";
import { sendSMS } from "@/lib/twilio";
import { User } from "@/models/User";

export async function POST() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = (session.user as any).id;
    const adminRole = (session.user as any).role;
    const adminEmail = session.user.email || "";

    if (!["admin", "superadmin"].includes(adminRole)) {
      return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 });
    }

    await connectToDatabase();

    const admin = await User.findById(adminId);
    if (!admin) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `admin-approve:${adminEmail}`;
    await setOTP(key, otp, 300); // 5 minutes expiry

    const appName = process.env.NEXT_PUBLIC_APP_NAME || "LendEasy";

    // Dispatch to email and phone
    await Promise.all([
      sendMail({
        to: adminEmail,
        subject: `Authorization Code - ${appName}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #1e40af;">Security Authorization</h2>
            <p>You are performing a sensitive loan action (Approve/Reject) on the admin panel.</p>
            <p>Please enter the following 6-digit verification code to confirm this action:</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 20px 0; color: #1e40af;">
              ${otp}
            </div>
            <p>This code is valid for 5 minutes and can only be used once.</p>
          </div>
        `,
      }),
      sendSMS({
        to: admin.phone,
        body: `LendEasy: Admin authorization code is ${otp}. Valid for 5 minutes.`,
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Authorization OTP sent to your email and phone.",
    });
  } catch (error: any) {
    console.error("[ADMIN-REQUEST-OTP API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send authorization OTP" },
      { status: 500 }
    );
  }
}
