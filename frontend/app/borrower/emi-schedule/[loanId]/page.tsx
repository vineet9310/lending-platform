"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import EMIScheduleTable from "@/components/loan/EMIScheduleTable";
import LoanStatusBadge from "@/components/loan/LoanStatusBadge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Download, FileText, CheckCircle, Activity, Award } from "lucide-react";

interface EMIRow {
  _id: string;
  emiNumber: number;
  dueDate: string;
  principalComponent: number;
  interestComponent: number;
  totalEMI: number;
  status: string;
  paidAmount: number;
  paidAt?: string;
  penaltyAmount: number;
}

interface Loan {
  _id: string;
  loanNumber: string;
  principal: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  totalPayable: number;
  totalInterest: number;
  status: string;
  nocGenerated: boolean;
}

export default function EMISchedulePage({ params }: { params: Promise<{ loanId: string }> }) {
  const { loanId } = React.use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<EMIRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSchedule = async () => {
    try {
      const res = await fetch(`/api/emi/schedule/${loanId}`);
      const json = await res.json();
      if (json.success) {
        setLoan(json.loan);
        setSchedule(json.schedule);
      } else {
        toast.error(json.error || "Failed to load schedule");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load repayment schedule details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [loanId]);

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Activity className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="text-center py-12">
        <p className="text-sm font-semibold text-slate-500">Loan account not found.</p>
        <Link href="/borrower/dashboard" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
          Go back to dashboard
        </Link>
      </div>
    );
  }

  // Calculate totals
  const totalPaid = schedule.reduce((sum, item) => sum + item.paidAmount, 0);
  const totalPenalty = schedule.reduce((sum, item) => sum + item.penaltyAmount, 0);
  const remainingBalance = Math.max(0, loan.totalPayable - totalPaid);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
              Repayment Schedule
            </h1>
            <LoanStatusBadge status={loan.status} />
          </div>
          <p className="text-xs text-slate-400">Loan Account: {loan.loanNumber}</p>
        </div>

        <div className="flex gap-2">
          <Link href="/borrower/my-loans">
            <Button variant="outline" size="sm" className="h-9 text-xs flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Back to List
            </Button>
          </Link>
          <a href={`/api/loans/${loan._id}/pdf`} download>
            <Button size="sm" className="h-9 text-xs flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
              <Download className="h-4 w-4" /> {loan.status === "closed" ? "Download NOC PDF" : "Download Agreement PDF"}
            </Button>
          </a>
        </div>
      </div>

      {/* Loan Summary Grid Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white border-slate-200/80 dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="p-5 space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Loan Principal</p>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{currency} {loan.principal?.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400">Interest rate: {loan.interestRate}% p.a.</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200/80 dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="p-5 space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Repayable</p>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{currency} {loan.totalPayable?.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400">Interest component: {currency} {loan.totalInterest?.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50/20 border-green-100 dark:border-green-950/20 dark:bg-slate-950">
          <CardContent className="p-5 space-y-1">
            <p className="text-[10px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">Total Repaid</p>
            <h3 className="text-xl font-bold text-green-700 dark:text-green-400">{currency} {totalPaid?.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400">Penalties paid: {currency} {totalPenalty?.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50/20 border-blue-100 dark:border-blue-950/20 dark:bg-slate-950">
          <CardContent className="p-5 space-y-1">
            <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Remaining Balance</p>
            <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400">{currency} {remainingBalance?.toLocaleString()}</h3>
            <p className="text-[10px] text-slate-400">Scheduled over {loan.tenureMonths} months</p>
          </CardContent>
        </Card>
      </div>

      {/* Closed Loan NOC Banner */}
      {loan.status === "closed" && (
        <Card className="border-green-200 bg-green-50/20 dark:border-green-900/40 dark:bg-green-950/10">
          <CardContent className="p-6 flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400">
              <Award className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-bold text-green-800 dark:text-green-400">This loan is fully paid & closed!</h4>
              <p className="text-xs text-green-600 dark:text-green-500">Your No Objection Certificate (NOC) has been generated. You can download the PDF copy for your records.</p>
            </div>
            <a href={`/api/loans/${loan._id}/pdf`} download>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs h-10 shadow-md">
                Download NOC Document
              </Button>
            </a>
          </CardContent>
        </Card>
      )}

      {/* Repayments Schedule Table */}
      <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" /> Repayment Installments Amortization
          </CardTitle>
          <CardDescription>Track and pay upcoming/overdue EMI installments securely</CardDescription>
        </CardHeader>
        <CardContent>
          <EMIScheduleTable
            schedule={schedule}
            loanId={loan._id}
            borrowerName={session?.user?.name || ""}
            borrowerEmail={session?.user?.email || ""}
            borrowerPhone={(session?.user as any)?.phone || ""}
            onPaymentSuccess={fetchSchedule}
          />
        </CardContent>
      </Card>
    </div>
  );
}
