import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { LoanApplication } from "@/models/LoanApplication";
import { AuditLog } from "@/models/AuditLog";
import { sendNotification } from "@/lib/notifications";
import { User } from "@/models/User";
import { getOTP, deleteOTP } from "@/lib/otp-store";

export async function PATCH(req: Request) {
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

    const body = await req.json();
    const { applicationId, rejectionReason, otp } = body;

    if (!applicationId || !rejectionReason || !otp) {
      return NextResponse.json({ error: "Missing required fields: applicationId, rejectionReason, otp" }, { status: 400 });
    }

    // Verify Admin OTP
    const key = `admin-approve:${adminEmail}`; // share same key namespace for convenience
    const savedOtp = await getOTP(key);
    
    const isDevBypass = process.env.NODE_ENV !== "production" && otp === "123456";
    if (!isDevBypass) {
      if (!savedOtp || savedOtp !== otp.trim()) {
        return NextResponse.json({ error: "Invalid or expired OTP confirmation" }, { status: 400 });
      }
    }

    // Delete OTP
    await deleteOTP(key);

    const application = await LoanApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json({ error: "Loan application not found" }, { status: 404 });
    }

    const prevAppStatus = application.status;

    // Reject application
    application.status = "rejected";
    application.rejectionReason = rejectionReason;
    application.reviewedBy = adminId;
    application.reviewedAt = new Date();
    await application.save();

    // Get borrower details
    const borrower = await User.findById(application.borrower);
    if (borrower) {
      await sendNotification({
        email: borrower.email,
        phone: borrower.phone,
        fullName: borrower.fullName,
        eventName: "loan_rejected",
        details: { reason: rejectionReason },
      });
    }

    // Audit logs
    await AuditLog.create({
      actor: adminId,
      actorRole: adminRole,
      action: "LOAN_REJECTED",
      entityType: "loan_application",
      entityId: application._id,
      previousState: { status: prevAppStatus },
      newState: { status: application.status, rejectionReason },
    });

    return NextResponse.json({
      success: true,
      message: "Loan application rejected successfully.",
      applicationStatus: application.status,
    });
  } catch (error: any) {
    console.error("[ADMIN-REJECT API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reject loan application" },
      { status: 500 }
    );
  }
}
