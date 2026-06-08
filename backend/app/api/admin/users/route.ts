import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!["admin", "superadmin"].includes(userRole)) {
      return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    const filterQuery: any = {};
    if (role && role !== "all") filterQuery.role = role;

    const total = await User.countDocuments(filterQuery);
    const users = await User.find(filterQuery)
      .select("fullName email phone role status createdAt isEmailVerified isPhoneVerified")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      users,
    });
  } catch (error: any) {
    console.error("[ADMIN-GET-USERS API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve users list" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminId = (session.user as any).id;
    const adminRole = (session.user as any).role;

    if (!["admin", "superadmin"].includes(adminRole)) {
      return NextResponse.json({ error: "Access denied. Admin role required." }, { status: 403 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json({ error: "userId and status are required" }, { status: 400 });
    }

    if (!["active", "suspended", "pending_verification"].includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const prevStatus = user.status;
    user.status = status;
    await user.save();

    // Audit logs
    await AuditLog.create({
      actor: adminId,
      actorRole: adminRole,
      action: "USER_STATUS_CHANGED",
      entityType: "user",
      entityId: user._id,
      previousState: { status: prevStatus },
      newState: { status: user.status },
    });

    return NextResponse.json({
      success: true,
      message: `User status changed to ${status} successfully.`,
      user: {
        _id: user._id,
        fullName: user.fullName,
        status: user.status,
      },
    });
  } catch (error: any) {
    console.error("[ADMIN-PATCH-USER API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update user status" },
      { status: 500 }
    );
  }
}
