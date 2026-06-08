"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import LoanStatusBadge from "@/components/loan/LoanStatusBadge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { ArrowLeft, CheckSquare, Search, Activity } from "lucide-react";
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

export default function AgentApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const endpoint = statusFilter === "all" 
        ? "/api/admin/applications?limit=50" 
        : `/api/admin/applications?status=${statusFilter}&limit=50`;

      const res = await fetch(endpoint);
      const json = await res.json();
      if (json.success) {
        setApps(json.applications);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load pipeline queue");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-blue-600" /> Verification Assigned Pipeline
          </h1>
          <p className="text-xs text-slate-400">Review, verify and finalize borrower credentials or collateral assets</p>
        </div>
        <Link href="/agent/dashboard">
          <Button variant="outline" size="sm" className="h-9 text-xs flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-2 flex-1 w-full">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter by Status:</span>
            <Select
              className="max-w-[240px]"
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Assigned Queue</option>
              <option value="kyc_pending">KYC Pending Review</option>
              <option value="collateral_pending">Collateral Pending Review</option>
              <option value="kyc_verified">KYC Verified Accounts</option>
              <option value="collateral_verified">Collateral Verified Accounts</option>
              <option value="under_review">Under Review Accounts</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline list */}
      <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex h-36 items-center justify-center">
              <Activity className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-2xl dark:border-slate-800">
              <span className="text-xs text-slate-400">No applications matching filter found</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Application #</TableHead>
                  <TableHead>Borrower Name</TableHead>
                  <TableHead>Requested Loan</TableHead>
                  <TableHead>Loan Purpose</TableHead>
                  <TableHead>Date Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.map((app) => (
                  <TableRow key={app._id}>
                    <TableCell className="font-bold text-xs">{app.applicationNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{app.borrower?.fullName}</p>
                        <p className="text-[10px] text-slate-400">{app.borrower?.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {currency} {app.amountRequested?.toLocaleString()}
                      <span className="block text-[9px] font-normal text-slate-400">{app.tenureMonths} Months</span>
                    </TableCell>
                    <TableCell className="text-xs capitalize">{app.purpose}</TableCell>
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
                        <Link href={`/borrower/my-loans` /* proxy view or view details */}>
                          <Button variant="outline" size="sm" className="h-8 text-[11px]">
                            View details
                          </Button>
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
    </div>
  );
}
