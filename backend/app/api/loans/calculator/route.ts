import { NextResponse } from "next/server";
import { calculateEMI } from "@/lib/emi-calculator";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const principal = Number(searchParams.get("principal"));
    const annualRate = Number(searchParams.get("annualRate"));
    const tenureMonths = Number(searchParams.get("tenureMonths"));
    const interestType = (searchParams.get("interestType") || "reducing_balance") as
      | "flat"
      | "reducing_balance"
      | "compound";

    if (!principal || !annualRate || !tenureMonths) {
      return NextResponse.json(
        { error: "Missing required query parameters: principal, annualRate, tenureMonths" },
        { status: 400 }
      );
    }

    const results = calculateEMI(principal, annualRate, tenureMonths, interestType);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("[EMI-CALCULATOR API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to calculate EMI" },
      { status: 500 }
    );
  }
}
