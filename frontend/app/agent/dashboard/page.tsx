"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import StatsCard from "@/components/dashboard/StatsCard";
import LoanStatusBadge from "@/components/loan/LoanStatusBadge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { ShieldAlert, FileCheck, CheckSquare, Activity, ArrowRight, ClipboardCheck } from "lucide-react";
import toast from "react-hot-toast";

interface Application {
  _id: string;
  applicationNumber: string;
  amountRequested: number;
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

export default function AgentDashboard() {
  const [apps, setApps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApplications = async () => {
    try {
      // Agents fetch applications through the admin-shared endpoint, but can filter by status
      const res = await fetch("/api/admin/applications?limit=20");
      const json = await res.json();
      if (json.success) {
        setApps(json.applications);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load assigned reviews");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  // Calculations
  const kycPendingCount = apps.filter((a) => a.status === "kyc_pending").length;
  const collateralPendingCount = apps.filter((a) => a.status === "collateral_pending").length;
  const verifiedCount = apps.filter((a) => ["kyc_verified", "collateral_verified", "under_review", "approved", "disbursed"].includes(a.status)).length;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Activity className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-3xl bg-slate-900 p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold md:text-3xl">Agent Verification Desk</h1>
          <p className="text-xs text-slate-400">Perform KYC verification, verify collateral, and submit valuation reports.</p>
        </div>
        <Link href="/agent/applications">
          <Button className="h-10 text-xs">
            <CheckSquare className="mr-1.5 h-4 w-4" /> View All Assigned Reviews
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatsCard
          title="KYC Pending Reviews"
          value={kycPendingCount}
          description="Awaiting document verification"
          icon={<ShieldAlert className="h-5 w-5" />}
        />
        <StatsCard
          title="Collateral Pending Reviews"
          value={collateralPendingCount}
          description="Awaiting asset verification"
          icon={<ClipboardCheck className="h-5 w-5" />}
        />
        <StatsCard
          title="Completed Verification Accounts"
          value={verifiedCount}
          description="Passed onto final under-review"
          icon={<FileCheck className="h-5 w-5" />}
        />
      </div>

      {/* Applications list */}
      <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="text-base font-bold">Verification Pipeline Queue</CardTitle>
          <CardDescription>Review identity and collateral documents for incoming loan applicants</CardDescription>
        </CardHeader>
        <CardContent>
          {apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-2xl dark:border-slate-800">
              <span className="text-xs text-slate-400">No applications in review queue</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application #</TableHead>
                  <TableHead>Borrower Name</TableHead>
                  <TableHead>Amount Requested</TableHead>
                  <TableHead>Date Submitted</TableHead>
                  <TableHead>Verification Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((app) => (
                  <TableRow key={app._id}>
                    <TableCell className="font-bold text-xs">{app.applicationNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {app.borrower?.fullName}
                        </p>
                        <p className="text-[10px] text-slate-400">{app.borrower?.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-bold">
                      {currency} {app.amountRequested?.toLocaleString()}
                      <span className="block text-[9px] font-normal text-slate-400">{app.tenureMonths}m term</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(app.createdAt).toLocaleDateString("en-PK")}
                    </TableCell>
                    <TableCell>
                      <LoanStatusBadge status={app.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {app.status === "kyc_pending" && (
                        <Link href={`/agent/kyc-review/${app._id}`}>
                          <Button size="sm" className="h-8 text-[11px] bg-blue-600 hover:bg-blue-700 text-white">
                            Verify KYC
                          </Button>
                        </Link>
                      )}
                      {app.status === "collateral_pending" && (
                        <Link href={`/agent/collateral-verify/${app._id}`}>
                          <Button size="sm" className="h-8 text-[11px] bg-amber-600 hover:bg-amber-700 text-white">
                            Verify Collateral
                          </Button>
                        </Link>
                      )}
                      {!["kyc_pending", "collateral_pending"].includes(app.status) && (
                        <span className="text-[10px] font-semibold text-slate-400">Completed</span>
                      )}
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
