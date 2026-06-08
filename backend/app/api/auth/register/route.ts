import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { encrypt } from "@/lib/encryption";
import { setOTP } from "@/lib/otp-store";
import { sendMail } from "@/lib/nodemailer";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { fullName, email, phone, password, role, cnic, address } = body;

    // Basic validation
    if (!fullName || !email || !phone || !password) {
      return NextResponse.json(
        { error: "Missing required fields: fullName, email, phone, password" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase();

    // Check if email already exists
    const existingEmail = await User.findOne({ email: emailLower });
    if (existingEmail) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Check if phone already exists
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return NextResponse.json(
        { error: "A user with this phone number already exists" },
        { status: 400 }
      );
    }

    // Hashing password
    const passwordHash = await bcrypt.hash(password, 12);

    // CNIC Encryption (if provided)
    const encryptedCnic = cnic ? encrypt(cnic) : undefined;

    // Create User
    const newUser = await User.create({
      fullName,
      email: emailLower,
      phone,
      passwordHash,
      role: role || "borrower",
      status: "pending_verification",
      cnic: encryptedCnic,
      address: address || {},
      isEmailVerified: false,
      isPhoneVerified: false,
    });

    // Generate 6-digit email verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `register:${emailLower}`;
    await setOTP(key, otp, 300); // 5 minutes expiry

    // Send Email
    const appName = process.env.NEXT_PUBLIC_APP_NAME || "LendEasy";
    await sendMail({
      to: emailLower,
      subject: `Welcome to ${appName} - Verify your Email`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #1e40af;">Welcome to ${appName}!</h2>
          <p>Thank you for registering. Please verify your email address using the 6-digit OTP below:</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 4px; text-align: center; margin: 20px 0; color: #1e40af;">
            ${otp}
          </div>
          <p>This OTP is valid for 5 minutes and can only be used once.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6b7280;">If you did not register for an account, you can safely ignore this email.</p>
        </div>
      `,
    });

    return NextResponse.json(
      {
        message: "User registered successfully. Verification OTP sent to email.",
        userId: newUser._id,
        email: newUser.email,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[REGISTER API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong during registration" },
      { status: 500 }
    );
  }
}
