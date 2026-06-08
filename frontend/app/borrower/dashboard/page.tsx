"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import StatsCard from "@/components/dashboard/StatsCard";
import LoanStatusBadge from "@/components/loan/LoanStatusBadge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import {
  DollarSign,
  Briefcase,
  Calendar,
  CreditCard,
  PlusCircle,
  FileCheck,
  Upload,
  Activity,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import LoanAgreementModal from "@/components/loan/LoanAgreementModal";

interface LoanApp {
  _id: string;
  applicationNumber: string;
  amountRequested: number;
  offeredAmount?: number;
  offeredInterestRate?: number;
  tenureMonths: number;
  purpose: string;
  status: string;
  createdAt: string;
}

interface Loan {
  _id: string;
  loanNumber: string;
  principal: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  status: string;
  createdAt: string;
}

export default function BorrowerDashboard() {
  const { data: session } = useSession();
  const [apps, setApps] = useState<LoanApp[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // States for signing agreement
  const [signingApp, setSigningApp] = useState<LoanApp | null>(null);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/loans/my-loans");
      const json = await res.json();
      if (json.success) {
        setApps(json.applications || []);
        setLoans(json.loans || []);
      }
    } catch (error) {
      console.error("Failed to load borrower dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";
  const defaultRate = 18;

  // Calculations for stats
  const activeLoans = loans.filter((l) => l.status === "active");
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.principal, 0); // simplifed
  const nextEmiAmount = activeLoans.reduce((sum, l) => sum + l.emiAmount, 0);
  
  // Next EMI date (dummy date 30 days out for active, or we fetch the next schedule item in a real app)
  const nextEmiDate = activeLoans.length > 0 
    ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("en-PK", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "N/A";

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Activity className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs text-slate-400">Loading your profile dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-900 to-indigo-900 p-6 md:p-8 text-white shadow-xl shadow-blue-950/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Hello, {session?.user?.name}!</h2>
          <p className="text-xs text-blue-200 mt-1">Manage your active loans, submit collateral, and pay your EMIs on time.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/borrower/apply">
            <Button className="bg-white text-blue-900 hover:bg-slate-50 border-none font-bold text-xs h-10 shadow-lg shadow-white/5">
              <PlusCircle className="mr-1.5 h-4 w-4 text-blue-600" /> Apply New Loan
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Summary Row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Loans"
          value={activeLoans.length}
          description="Approved & Disbursed"
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatsCard
          title="Total Outstanding"
          value={`${currency} ${totalOutstanding.toLocaleString()}`}
          description="Total unpaid principal"
          icon={<DollarSign className="h-5 w-5" />}
          trend={{ value: "+PKR 0/mo", type: "neutral" }}
        />
        <StatsCard
          title="Next EMI Amount"
          value={nextEmiAmount > 0 ? `${currency} ${nextEmiAmount.toLocaleString()}` : "N/A"}
          description="Due for active loans"
          icon={<CreditCard className="h-5 w-5" />}
        />
        <StatsCard
          title="Next EMI Due Date"
          value={nextEmiDate}
          description="Scheduled date"
          icon={<Calendar className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Active Application / Loan Listings */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Loan Pipeline & Review</CardTitle>
                <CardDescription>Status of your recent loan requests</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {apps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-2xl dark:border-slate-800">
                  <Briefcase className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No applications found</p>
                  <p className="text-[10px] text-slate-400">You haven't requested any loan yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Application #</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apps.map((app) => (
                      <TableRow key={app._id}>
                        <TableCell className="font-bold text-xs">{app.applicationNumber}</TableCell>
                        <TableCell className="text-xs">
                          {currency} {(app.offeredAmount || app.amountRequested)?.toLocaleString()}
                          <span className="block text-[9px] text-slate-400">{app.tenureMonths} months</span>
                        </TableCell>
                        <TableCell className="text-xs capitalize">{app.purpose}</TableCell>
                        <TableCell>
                          <LoanStatusBadge status={app.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          {app.status === "approved" && (
                            <Button
                              size="sm"
                              className="h-7 text-[10px] bg-green-600 hover:bg-green-700 text-white font-bold"
                              onClick={() => setSigningApp(app)}
                            >
                              Sign Offer
                            </Button>
                          )}
                          {app.status === "draft" && (
                            <Link href={`/borrower/apply`}>
                              <Button size="sm" variant="outline" className="h-7 text-[10px]">
                                Resume
                              </Button>
                            </Link>
                          )}
                          {!["approved", "draft"].includes(app.status) && (
                            <Link href={`/borrower/my-loans`} className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline dark:text-blue-400">
                              View <ChevronRight className="h-3 w-3" />
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Active Repayments Loans */}
          {loans.length > 0 && (
            <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="text-base font-bold">Active Repayment Accounts</CardTitle>
                <CardDescription>Loans currently active and undergoing repayment</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loan No.</TableHead>
                      <TableHead>Principal</TableHead>
                      <TableHead>EMI Amount</TableHead>
                      <TableHead>Interest Rate</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((loan) => (
                      <TableRow key={loan._id}>
                        <TableCell className="font-bold text-xs">{loan.loanNumber}</TableCell>
                        <TableCell className="text-xs">
                          {currency} {loan.principal?.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {currency} {loan.emiAmount?.toLocaleString()}
                          <span className="block text-[9px] font-normal text-slate-400">Monthly</span>
                        </TableCell>
                        <TableCell className="text-xs">{loan.interestRate}% p.a.</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/borrower/emi-schedule/${loan._id}`}>
                            <Button size="sm" className="h-8 text-[11px]">
                              Pay EMI / View Schedule
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions & Guidelines */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="text-base font-bold">Quick Actions</CardTitle>
              <CardDescription>Shortcut triggers for platform options</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              <Link href="/borrower/apply" className="w-full">
                <Button className="w-full justify-start text-xs h-11" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4 text-blue-600" /> Apply for Collateral Loan
                </Button>
              </Link>
              <Link href="/borrower/documents" className="w-full">
                <Button className="w-full justify-start text-xs h-11" variant="outline">
                  <Upload className="mr-2 h-4 w-4 text-amber-600" /> Upload KYC Documents
                </Button>
              </Link>
              {activeLoans.length > 0 && (
                <Link href={`/borrower/emi-schedule/${activeLoans[0]._id}`} className="w-full">
                  <Button className="w-full justify-start text-xs h-11 animate-pulse" variant="outline">
                    <CreditCard className="mr-2 h-4 w-4 text-green-600" /> Make Repayments (Pay EMI)
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Platform Stats / Instructions */}
          <Card className="border-slate-200/80 bg-gradient-to-tr from-slate-50 to-slate-100/60 p-4 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900/40">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-blue-600" /> Loan Onboarding Guidelines
            </h4>
            <ul className="mt-3 space-y-2 text-[11px] text-slate-500 leading-normal list-decimal pl-4">
              <li>Fill details & request amount using the wizard.</li>
              <li>Submit KYC identity proofs (CNIC/Passport) and selfie.</li>
              <li>Pledge collateral details (vehicle or gold receipts).</li>
              <li>Wait for verification team (KYC verification approval).</li>
              <li>Admin approves offer with custom interest configurations.</li>
              <li>e-Sign the loan agreement using your OTP code.</li>
              <li>Receive bank transfer/mobile wallet payout!</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Loan Agreement modal trigger */}
      {signingApp && (
        <LoanAgreementModal
          isOpen={!!signingApp}
          onClose={() => setSigningApp(null)}
          applicationId={signingApp._id}
          amount={signingApp.offeredAmount || signingApp.amountRequested}
          rate={signingApp.offeredInterestRate || defaultRate}
          tenure={signingApp.tenureMonths}
          phone={(session?.user as any)?.phone || ""}
          onSignSuccess={() => {
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}
