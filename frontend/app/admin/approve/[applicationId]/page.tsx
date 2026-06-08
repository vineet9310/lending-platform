"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import LoanStatusBadge from "@/components/loan/LoanStatusBadge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ArrowLeft, ShieldAlert, Check, X, Send, Activity, ExternalLink } from "lucide-react";

interface Application {
  _id: string;
  applicationNumber: string;
  amountRequested: number;
  tenureMonths: number;
  purpose: string;
  employmentType: string;
  monthlyIncome: number;
  existingLoans: number;
  status: string;
  internalNotes?: string;
  createdAt: string;
  borrower: {
    fullName: string;
    email: string;
    phone: string;
    cnic?: string;
    address?: {
      street?: string;
      city?: string;
      province?: string;
      country?: string;
    };
  };
}

interface KYCRecord {
  identityDoc: {
    type: string;
    number: string;
    expiryDate: string;
  };
  selfieUrl: string;
  addressProof: {
    type: string;
  };
  verificationStatus: string;
}

interface Collateral {
  type: string;
  description: string;
  estimatedValue: number;
  ltvRatio?: number;
  verificationStatus: string;
  valuationReport?: {
    marketValue?: number;
    forcedSaleValue?: number;
  };
}

export default function LoanApprovalPage({ params }: { params: { applicationId: string } }) {
  const { applicationId } = params;
  const router = useRouter();

  const [app, setApp] = useState<Application | null>(null);
  const [kyc, setKyc] = useState<KYCRecord | null>(null);
  const [collateral, setCollateral] = useState<Collateral | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Decision States
  const [offeredAmount, setOfferedAmount] = useState("");
  const [offeredRate, setOfferedRate] = useState("18"); // default 18
  const [interestType, setInterestType] = useState<"reducing_balance" | "flat" | "interest_only">("reducing_balance");
  const [internalNotes, setInternalNotes] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/loans/${applicationId}`);
      const json = await res.json();
      if (json.success) {
        setApp(json.application);
        setKyc(json.kyc);
        setCollateral(json.collateral);
        
        setOfferedAmount(json.application.offeredAmount?.toString() || json.application.amountRequested.toString());
        setOfferedRate(json.application.offeredInterestRate?.toString() || "18");
        
        // Parse interestType from notes if already set
        try {
          if (json.application.internalNotes) {
            const parsed = JSON.parse(json.application.internalNotes);
            if (parsed.interestType) setInterestType(parsed.interestType);
            if (parsed.adminNotes) setInternalNotes(parsed.adminNotes);
          }
        } catch (e) {}
      } else {
        toast.error("Failed to load details");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching application details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [applicationId]);

  const handleRequestOtp = async () => {
    setIsRequestingOtp(true);
    try {
      const res = await fetch("/api/admin/request-otp", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Security Authorization code sent to your email and phone!");
        setOtpSent(true);
      } else {
        toast.error(data.error || "Failed to dispatch OTP");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to dispatch code");
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleApprove = async () => {
    if (!otpCode) {
      toast.error("OTP verification code is required to authorize approval");
      return;
    }

    setIsApproving(true);
    try {
      const res = await fetch("/api/admin/approve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          offeredAmount: Number(offeredAmount),
          offeredInterestRate: Number(offeredRate),
          interestType,
          internalNotes,
          otp: otpCode,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Loan application approved successfully!");
        router.push("/admin/dashboard");
      } else {
        toast.error(data.error || "Failed to approve loan");
      }
    } catch (err) {
      console.error(err);
      toast.error("Approval action failed");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!otpCode) {
      toast.error("OTP verification code is required to authorize rejection");
      return;
    }
    const reason = window.prompt("Enter final rejection reason to borrower:");
    if (!reason) return;

    setIsRejecting(true);
    try {
      const res = await fetch("/api/admin/reject", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          rejectionReason: reason,
          otp: otpCode,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Loan application rejected.");
        router.push("/admin/dashboard");
      } else {
        toast.error(data.error || "Failed to reject loan");
      }
    } catch (err) {
      console.error(err);
      toast.error("Rejection action failed");
    } finally {
      setIsRejecting(false);
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

  if (!app) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">Loan application not found.</p>
        <Link href="/admin/all-applications" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
          Go back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-blue-600" /> Loan Decision Panel
          </h1>
          <p className="text-xs text-slate-400">Reviewing application: {app.applicationNumber} ({app.borrower?.fullName})</p>
        </div>
        <Link href="/admin/all-applications">
          <Button variant="outline" size="sm" className="h-9 text-xs flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to List
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Summary and credentials review */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Application Parameters */}
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="text-base font-bold">Proposal Parameters</CardTitle>
              <CardDescription>Borrower requested financial parameters</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Requested Amount</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{currency} {app.amountRequested?.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Requested Tenure</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{app.tenureMonths} Months</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Loan Purpose</span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 capitalize">{app.purpose}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Declared Net Monthly Income</span>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{currency} {app.monthlyIncome?.toLocaleString()}/mo ({app.employmentType})</p>
              </div>
            </CardContent>
          </Card>

          {/* Verification Status */}
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="text-base font-bold">Verification Checklist</CardTitle>
              <CardDescription>Verification reviews completed by agents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* KYC block */}
              <div className="flex items-start justify-between border-b pb-3">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">Identity & Income Verification (KYC)</h4>
                  <p className="text-[10px] text-slate-400">
                    Doc Type: {kyc?.identityDoc?.type?.toUpperCase() || "N/A"} | Doc No: {kyc?.identityDoc?.number || "Encrypted"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    kyc?.verificationStatus === "verified" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {kyc?.verificationStatus === "verified" ? "KYC Verified" : "KYC Pending"}
                  </span>
                  {kyc && (
                    <Link href={`/agent/kyc-review/${app._id}`} className="text-[10px] text-blue-600 hover:underline font-semibold flex items-center gap-0.5">
                      View files <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Collateral block */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">Asset Collateral Pledges</h4>
                  <p className="text-[10px] text-slate-400">
                    Type: {collateral?.type?.replace("_", " ") || "N/A"} | Declared Value: {currency} {collateral?.estimatedValue?.toLocaleString() || "0"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    collateral?.verificationStatus === "verified" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {collateral?.verificationStatus === "verified" ? "Collateral Verified" : "Collateral Pending"}
                  </span>
                  {collateral && (
                    <Link href={`/agent/collateral-verify/${app._id}`} className="text-[10px] text-blue-600 hover:underline font-semibold flex items-center gap-0.5">
                      View files <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Decision panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="text-base font-bold">LendEasy Decision Board</CardTitle>
              <CardDescription>Configure and approve final loan offer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Badge */}
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Current Status:</span>
                <LoanStatusBadge status={app.status} />
              </div>

              {/* Configure offered Amount */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Offered Principal Amount (INR)</label>
                <Input
                  type="number"
                  value={offeredAmount}
                  onChange={(e) => setOfferedAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  disabled={app.status !== "under_review"}
                />
              </div>

              {/* Configure Offered Interest Rate */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Interest Rate (% p.a.)</label>
                <Input
                  type="number"
                  value={offeredRate}
                  onChange={(e) => setOfferedRate(e.target.value)}
                  placeholder="e.g. 18"
                  disabled={app.status !== "under_review"}
                />
              </div>

              {/* Interest Type */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Interest Type</label>
                <Select
                  value={interestType}
                  onChange={(e: any) => setInterestType(e.target.value)}
                  disabled={app.status !== "under_review"}
                >
                  <option value="reducing_balance">Reducing Balance (Standard)</option>
                  <option value="flat">Flat Rate</option>
                  <option value="interest_only">Monthly Interest (Interest Only)</option>
                </Select>
              </div>

              {/* Internal Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Decision Notes (Internal)</label>
                <textarea
                  rows={3}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Record risk clearance comments..."
                  disabled={app.status !== "under_review"}
                  className="flex w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 transition-all duration-200 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {/* OTP authorization (required for approval actions) */}
              {app.status === "under_review" && (
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">2FA Authorization</span>
                    {!otpSent ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[11px] border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/40"
                        onClick={handleRequestOtp}
                        isLoading={isRequestingOtp}
                      >
                        Request OTP
                      </Button>
                    ) : (
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-400">OTP Code Sent</span>
                    )}
                  </div>
                  {otpSent && (
                    <Input
                      type="text"
                      placeholder="Enter 6-digit confirmation code"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="text-center font-bold tracking-widest text-sm"
                    />
                  )}
                </div>
              )}

              {/* Decision Actions */}
              {app.status === "under_review" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="destructive"
                    className="flex-1 text-xs h-10 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleReject}
                    isLoading={isRejecting}
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                  <Button
                    className="flex-1 text-xs h-10 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                    onClick={handleApprove}
                    isLoading={isApproving}
                  >
                    <Check className="h-4 w-4" /> Approve Offer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
