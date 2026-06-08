"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import LoanStatusBadge from "@/components/loan/LoanStatusBadge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { ArrowLeft, DollarSign, Activity, CheckSquare } from "lucide-react";
import toast from "react-hot-toast";

interface ApprovedApplication {
  _id: string;
  applicationNumber: string;
  offeredAmount: number;
  tenureMonths: number;
  purpose: string;
  status: string;
  createdAt: string;
  borrower: {
    fullName: string;
    email: string;
    phone: string;
  };
}

export default function DisbursementPage() {
  const [apps, setApps] = useState<ApprovedApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Disbursement Form states
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [method, setMethod] = useState<"bank_transfer" | "mobile_wallet" | "cheque">("bank_transfer");
  const [reference, setReference] = useState("");
  const [isDisbursing, setIsDisbursing] = useState(false);

  const fetchApproved = async () => {
    try {
      const res = await fetch("/api/admin/applications?status=approved&limit=50");
      const json = await res.json();
      if (json.success) {
        setApps(json.applications);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load approved applications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApproved();
  }, []);

  const handleDisburse = async (appId: string) => {
    setSelectedAppId(appId);
    setIsDisbursing(true);
    try {
      const res = await fetch("/api/admin/disburse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: appId,
          disbursementMethod: method,
          disbursementReference: reference || undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Funds disbursed! Loan Number: ${data.loanNumber}`);
        setReference("");
        fetchApproved(); // Refresh
      } else {
        toast.error(data.error || "Failed to disburse funds");
      }
    } catch (err) {
      console.error(err);
      toast.error("Disbursement request failed");
    } finally {
      setIsDisbursing(false);
      setSelectedAppId(null);
    }
  };

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Activity className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-blue-600" /> Loan Disbursement Office
          </h1>
          <p className="text-xs text-slate-400">Release approved loan funds and generate active billing repayment profiles</p>
        </div>
        <Link href="/admin/dashboard">
          <Button variant="outline" size="sm" className="h-9 text-xs flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Disbursal checklist */}
      <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="text-base font-bold">Approved Loans Dispatch Queue</CardTitle>
          <CardDescription>Select payout methods and execute direct payouts</CardDescription>
        </CardHeader>
        <CardContent>
          {apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-2xl dark:border-slate-800">
              <span className="text-xs text-slate-400">No approved applications awaiting disbursement</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application #</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Approved Principal</TableHead>
                  <TableHead>Repayment Term</TableHead>
                  <TableHead>Disbursement Parameters</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((app) => {
                  const isPendingPayout = selectedAppId === app._id && isDisbursing;
                  return (
                    <TableRow key={app._id}>
                      <TableCell className="font-bold text-xs">{app.applicationNumber}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{app.borrower?.fullName}</p>
                          <p className="text-[10px] text-slate-400">{app.borrower?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                        {currency} {app.offeredAmount?.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{app.tenureMonths} Months</TableCell>
                      
                      {/* Interactive payout methods selectors */}
                      <TableCell>
                        <div className="flex gap-2 max-w-[340px]">
                          <Select
                            className="h-9 text-xs"
                            value={method}
                            onChange={(e: any) => setMethod(e.target.value)}
                          >
                            <option value="bank_transfer">Bank Transfer (RazorpayX)</option>
                            <option value="mobile_wallet">Mobile Wallet</option>
                            <option value="cheque">Manual Cheque</option>
                          </Select>
                          <Input
                            type="text"
                            placeholder="Ref ID (Optional)"
                            className="h-9 text-xs max-w-[120px]"
                            value={reference}
                            onChange={(e) => setReference(e.target.value)}
                          />
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="h-9 text-xs bg-green-600 hover:bg-green-700 text-white font-bold"
                          onClick={() => handleDisburse(app._id)}
                          isLoading={isPendingPayout}
                        >
                          Disburse Funds
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
