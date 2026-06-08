"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import LoanStatusBadge from "@/components/loan/LoanStatusBadge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { FileText, Briefcase, Download, ArrowLeft, ArrowUpRight, Activity } from "lucide-react";
import toast from "react-hot-toast";

interface Application {
  _id: string;
  applicationNumber: string;
  amountRequested: number;
  offeredAmount?: number;
  offeredInterestRate?: number;
  tenureMonths: number;
  purpose: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
}

interface Loan {
  _id: string;
  loanNumber: string;
  principal: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  totalPayable: number;
  disbursedAt?: string;
  status: string;
}

export default function MyLoansPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLoans = async () => {
    try {
      const res = await fetch("/api/loans/my-loans");
      const json = await res.json();
      if (json.success) {
        setApps(json.applications || []);
        setLoans(json.loans || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load loan list");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Activity className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">My Loan Accounts</h1>
          <p className="text-xs text-slate-400">View and track all your loan requests, agreements, and active contracts</p>
        </div>
        <Link href="/borrower/dashboard">
          <Button variant="outline" size="sm" className="h-9 text-xs flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Active Loans Section */}
      <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-blue-600" /> Active Repayment Accounts
          </CardTitle>
          <CardDescription>Approved loans currently disbursed and active</CardDescription>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-2xl dark:border-slate-800">
              <span className="text-xs text-slate-400">No active loans found</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan Number</TableHead>
                  <TableHead>Principal Amount</TableHead>
                  <TableHead>Annual Rate</TableHead>
                  <TableHead>EMI Repayment</TableHead>
                  <TableHead>Disbursed Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan._id}>
                    <TableCell className="font-bold text-xs">{loan.loanNumber}</TableCell>
                    <TableCell className="text-xs font-semibold">{currency} {loan.principal?.toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{loan.interestRate}%</TableCell>
                    <TableCell className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {currency} {loan.emiAmount?.toLocaleString()}/mo
                      <span className="block text-[9px] font-normal text-slate-400">{loan.tenureMonths} Months term</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {loan.disbursedAt ? new Date(loan.disbursedAt).toLocaleDateString("en-PK") : "N/A"}
                    </TableCell>
                    <TableCell>
                      <LoanStatusBadge status={loan.status} />
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Link href={`/borrower/emi-schedule/${loan._id}`}>
                        <Button size="sm" className="h-8 text-[11px]">
                          Repayments Schedule
                        </Button>
                      </Link>
                      <a href={`/api/loans/${loan._id}/pdf`} download>
                        <Button variant="outline" size="sm" className="h-8 text-[11px] px-2.5">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Applications Section */}
      <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" /> Loan Application Pipeline
          </CardTitle>
          <CardDescription>Submitted loan proposals currently in KYC or Collateral review</CardDescription>
        </CardHeader>
        <CardContent>
          {apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-2xl dark:border-slate-800">
              <span className="text-xs text-slate-400">No applications found</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application #</TableHead>
                  <TableHead>Requested Amount</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Date Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rejection Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((app) => (
                  <TableRow key={app._id}>
                    <TableCell className="font-bold text-xs">{app.applicationNumber}</TableCell>
                    <TableCell className="text-xs font-semibold">
                      {currency} {app.amountRequested?.toLocaleString()}
                      <span className="block text-[9px] text-slate-400">{app.tenureMonths} Months term</span>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{app.purpose}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(app.createdAt).toLocaleDateString("en-PK")}
                    </TableCell>
                    <TableCell>
                      <LoanStatusBadge status={app.status} />
                    </TableCell>
                    <TableCell className="text-xs text-red-500 max-w-[200px] truncate">
                      {app.rejectionReason || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
