import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { LoanApplication } from "@/models/LoanApplication";

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!["admin", "superadmin", "agent"].includes(userRole)) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    await connectToDatabase();

    // Fetch all applications
    const applications = await LoanApplication.find({
      status: { $in: ["submitted", "kyc_pending", "kyc_verified", "collateral_pending", "collateral_verified", "under_review", "approved", "rejected", "disbursed"] }
    }).populate("borrower", "fullName email phone");

    // Group by key status categories for kanban columns
    const columns: Record<string, any[]> = {
      submitted: [],
      kyc_pending: [],
      under_review: [],
      approved: [],
      disbursed: [],
    };

    applications.forEach((app) => {
      let category = app.status;
      // map intermediate statuses to nearest Kanban column
      if (app.status === "kyc_verified" || app.status === "collateral_pending" || app.status === "collateral_verified") {
        category = "kyc_pending";
      } else if (app.status === "rejected" || app.status === "cancelled") {
        // We can ignore or append to respective columns
        return;
      }
      
      if (columns[category]) {
        columns[category].push(app);
      }
    });

    return NextResponse.json({
      success: true,
      columns,
    });
  } catch (error: any) {
    console.error("[ADMIN-PIPELINE API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve pipeline data" },
      { status: 500 }
    );
  }
}
