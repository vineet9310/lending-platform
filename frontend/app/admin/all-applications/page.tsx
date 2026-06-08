"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import LoanStatusBadge from "@/components/loan/LoanStatusBadge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { ArrowLeft, FileCheck, Search, Activity, ChevronRight } from "lucide-react";
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

export default function AllApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const statusParam = statusFilter === "all" ? "" : `&status=${statusFilter}`;
      const res = await fetch(`/api/admin/applications?page=${page}&limit=10${statusParam}`);
      const json = await res.json();
      if (json.success) {
        setApps(json.applications);
        setTotalPages(json.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load loan applications");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter, page]);

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <FileCheck className="h-6 w-6 text-blue-600" /> Loan Application Registry
          </h1>
          <p className="text-xs text-slate-400">View and audit all loan submissions and review pipelines across the platform</p>
        </div>
        <Link href="/admin/dashboard">
          <Button variant="outline" size="sm" className="h-9 text-xs flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Filter and settings */}
      <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-2 flex-1 w-full">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
            <Select
              className="max-w-[240px]"
              value={statusFilter}
              onChange={(e: any) => {
                setStatusFilter(e.target.value);
                setPage(1); // reset to first page
              }}
            >
              <option value="all">All Applications</option>
              <option value="submitted">Submitted</option>
              <option value="kyc_pending">KYC Verification Pending</option>
              <option value="kyc_verified">KYC Verified</option>
              <option value="collateral_pending">Collateral Verification Pending</option>
              <option value="collateral_verified">Collateral Verified</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="disbursed">Disbursed</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex h-36 items-center justify-center">
              <Activity className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-2xl dark:border-slate-800">
              <span className="text-xs text-slate-400">No applications registered</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application #</TableHead>
                    <TableHead>Borrower Details</TableHead>
                    <TableHead>Amount Requested</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Date Created</TableHead>
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
                          <p className="text-[10px] text-slate-400">{app.borrower?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {currency} {app.amountRequested?.toLocaleString()}
                        <span className="block text-[9px] font-normal text-slate-400">{app.tenureMonths} months term</span>
                      </TableCell>
                      <TableCell className="text-xs capitalize">{app.purpose}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {new Date(app.createdAt).toLocaleDateString("en-PK")}
                      </TableCell>
                      <TableCell>
                        <LoanStatusBadge status={app.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {app.status === "under_review" ? (
                          <Link href={`/admin/approve/${app._id}`}>
                            <Button size="sm" className="h-8 text-[11px] bg-blue-600 hover:bg-blue-700 text-white">
                              Decision Board
                            </Button>
                          </Link>
                        ) : (
                          <Link href={`/admin/approve/${app._id}`} className="inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline dark:text-blue-400">
                            Details <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-slate-500 font-medium">Page {page} of {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
