import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { LoanApplication } from "@/models/LoanApplication";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (!["admin", "superadmin", "agent"].includes(userRole)) {
      return NextResponse.json({ error: "Access denied. Agent/Admin role required." }, { status: 403 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const purpose = searchParams.get("purpose");
    const employmentType = searchParams.get("employmentType");
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;
    const skip = (page - 1) * limit;

    // Build filter query
    const filterQuery: any = {};
    if (status) filterQuery.status = status;
    if (purpose) filterQuery.purpose = purpose;
    if (employmentType) filterQuery.employmentType = employmentType;

    // Fetch records with pagination
    const total = await LoanApplication.countDocuments(filterQuery);
    const applications = await LoanApplication.find(filterQuery)
      .populate("borrower", "fullName email phone status")
      .populate("assignedAgent", "fullName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      applications,
    });
  } catch (error: any) {
    console.error("[ADMIN-GET-APPLICATIONS API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve loan applications" },
      { status: 500 }
    );
  }
}
