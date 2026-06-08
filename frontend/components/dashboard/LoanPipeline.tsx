"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { User, FileText, ArrowRight, Activity } from "lucide-react";

interface ApplicationItem {
  _id: string;
  applicationNumber: string;
  borrower: {
    fullName: string;
    email: string;
    phone: string;
  };
  amountRequested: number;
  offeredAmount?: number;
  tenureMonths: number;
  status: string;
  purpose: string;
  createdAt: string;
}

export default function LoanPipeline() {
  const [columns, setColumns] = useState<Record<string, ApplicationItem[]>>({
    submitted: [],
    kyc_pending: [],
    under_review: [],
    approved: [],
    disbursed: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchPipeline = async () => {
    try {
      const res = await fetch("/api/admin/applications/pipeline");
      const data = await res.json();
      if (data.success) {
        setColumns(data.columns);
      } else {
        toast.error("Failed to load pipeline data");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch pipeline info");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const getColumnTitle = (key: string) => {
    switch (key) {
      case "submitted":
        return "Submitted";
      case "kyc_pending":
        return "Verification (KYC)";
      case "under_review":
        return "Under Review";
      case "approved":
        return "Approved Offer";
      case "disbursed":
        return "Disbursed";
      default:
        return key;
    }
  };

  const getColumnColor = (key: string) => {
    switch (key) {
      case "submitted":
        return "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800";
      case "kyc_pending":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40";
      case "under_review":
        return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40";
      case "approved":
        return "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/40";
      case "disbursed":
        return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-100 bg-white dark:border-slate-900 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <Activity className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-xs text-slate-400">Loading pipelines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1000px] h-[550px]">
        {Object.keys(columns).map((colKey) => {
          const items = columns[colKey] || [];
          return (
            <div
              key={colKey}
              className="flex flex-col w-1/5 min-w-[200px] bg-slate-100/50 rounded-2xl border border-slate-100 p-3 h-full dark:bg-slate-900/20 dark:border-slate-800/40"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize">
                  {getColumnTitle(colKey)}
                </span>
                <Badge className="rounded-full px-2 py-0.5 text-[10px]" variant="secondary">
                  {items.length}
                </Badge>
              </div>

              {/* Items List */}
              <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-24 border border-dashed border-slate-200 rounded-xl dark:border-slate-800">
                    <p className="text-[10px] text-slate-400">No applications</p>
                  </div>
                ) : (
                  items.map((app) => (
                    <Card
                      key={app._id}
                      className="border-slate-200/60 shadow-sm hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:hover:border-slate-700 transition-all duration-200 bg-white dark:bg-slate-950"
                    >
                      <CardContent className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            {app.applicationNumber}
                          </span>
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                            {app.purpose}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-bold text-slate-700 truncate dark:text-slate-200">
                            {app.borrower?.fullName}
                          </p>
                          <p className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
                            {currency} {(app.offeredAmount || app.amountRequested)?.toLocaleString()}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            Tenure: {app.tenureMonths}m
                          </p>
                        </div>

                        {/* Interactive Link depending on stage */}
                        <div className="flex justify-end pt-1 border-t border-slate-100 dark:border-slate-800/40">
                          {colKey === "submitted" && (
                            <Link
                              href={`/agent/applications`}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              Verify KYC <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                          {colKey === "kyc_pending" && (
                            <Link
                              href={`/agent/applications`}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                            >
                              Verify Collateral <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                          {colKey === "under_review" && (
                            <Link
                              href={`/admin/approve/${app._id}`}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                            >
                              Approve Offer <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                          {colKey === "approved" && (
                            <Link
                              href={`/admin/disbursement`}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 hover:text-green-700 dark:text-green-400"
                            >
                              Disburse <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                          {colKey === "disbursed" && (
                            <span className="text-[9px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                              Active Loan
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
