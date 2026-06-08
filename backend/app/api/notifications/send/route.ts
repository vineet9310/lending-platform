import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!["admin", "superadmin"].includes(userRole)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { userId, eventName, details } = body;

    if (!userId || !eventName) {
      return NextResponse.json({ error: "userId and eventName are required" }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await sendNotification({
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      eventName,
      details: details || {},
    });

    return NextResponse.json({
      success: true,
      message: "Notification sent successfully.",
    });
  } catch (error: any) {
    console.error("[NOTIFICATIONS-SEND API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send notification" },
      { status: 500 }
    );
  }
}
