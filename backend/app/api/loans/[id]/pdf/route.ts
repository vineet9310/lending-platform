import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Loan } from "@/models/Loan";
import { User } from "@/models/User";
import { generatePDF, getLoanAgreementTemplate, getNocTemplate } from "@/lib/pdf-generator";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id: loanId } = await params;
    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    await connectToDatabase();

    const loan = await Loan.findById(loanId).populate("borrower");
    if (!loan) {
      return new NextResponse("Loan not found", { status: 404 });
    }

    // Protection
    const borrower = loan.borrower as any;
    if (userRole === "borrower" && borrower._id.toString() !== userId) {
      return new NextResponse("Access denied", { status: 403 });
    }

    let pdfBuffer: Buffer;
    let fileName = "";

    if (loan.status === "closed") {
      // Generate NOC
      console.log(`[PDF DOWNLOAD] Compiling NOC for Loan: ${loan.loanNumber}`);
      const htmlContent = getNocTemplate({
        loanNumber: loan.loanNumber,
        borrowerName: borrower.fullName,
        cnic: borrower.cnic || "N/A",
        closedDate: loan.closedAt ? loan.closedAt.toLocaleDateString("en-PK") : new Date().toLocaleDateString("en-PK"),
      });
      pdfBuffer = await generatePDF(htmlContent);
      fileName = `NOC-${loan.loanNumber}.pdf`;
    } else {
      // Generate Agreement
      console.log(`[PDF DOWNLOAD] Compiling Agreement for Loan: ${loan.loanNumber}`);
      const htmlContent = getLoanAgreementTemplate({
        loanNumber: loan.loanNumber,
        borrowerName: borrower.fullName,
        cnic: borrower.cnic || "N/A",
        principal: loan.principal,
        rate: loan.interestRate,
        tenure: loan.tenureMonths,
        emi: loan.emiAmount,
      });
      pdfBuffer = await generatePDF(htmlContent);
      fileName = `Agreement-${loan.loanNumber}.pdf`;
    }

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("[PDF-DOWNLOAD API ERROR]:", error);
    return new NextResponse(error.message || "Failed to download PDF", { status: 500 });
  }
}
