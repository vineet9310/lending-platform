import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { KYCRecord } from "@/models/KYCRecord";
import { LoanApplication } from "@/models/LoanApplication";
import { decrypt } from "@/lib/encryption";

export async function GET(req: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId } = await params;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    await connectToDatabase();

    // Verify application existence
    const application = await LoanApplication.findById(applicationId);
    if (!application) {
      return NextResponse.json({ error: "Loan application not found" }, { status: 404 });
    }

    // Authorization check: borrower can only fetch their own KYC record
    if (userRole === "borrower" && application.borrower.toString() !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch the KYC Record
    const kyc = await KYCRecord.findOne({ application: applicationId }).populate("verifiedBy", "fullName email");
    if (!kyc) {
      return NextResponse.json({ error: "KYC record not found" }, { status: 404 });
    }

    // Decrypt the identity number (e.g. CNIC) before sending to client
    const kycObj = kyc.toObject();
    if (kycObj.identityDoc && kycObj.identityDoc.number) {
      kycObj.identityDoc.number = decrypt(kycObj.identityDoc.number);
    }

    return NextResponse.json({
      success: true,
      kyc: kycObj,
    });
  } catch (error: any) {
    console.error("[GET-KYC API ERROR]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve KYC record" },
      { status: 500 }
    );
  }
}
