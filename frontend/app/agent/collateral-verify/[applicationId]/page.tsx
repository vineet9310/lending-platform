"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Check, ClipboardCheck, Activity, ShieldAlert, ExternalLink, Calculator } from "lucide-react";

interface Application {
  _id: string;
  applicationNumber: string;
  amountRequested: number;
  tenureMonths: number;
  purpose: string;
  status: string;
  borrower: {
    fullName: string;
    email: string;
    phone: string;
  };
}

interface Collateral {
  _id: string;
  type: string;
  description: string;
  estimatedValue: number;
  location?: string;
  registrationNumber?: string;
  ltvRatio?: number;
  verificationStatus: string;
  documents: Array<{
    docType: string;
    fileUrl: string;
  }>;
  valuationReport?: {
    valuedBy?: string;
    marketValue?: number;
    forcedSaleValue?: number;
  };
}

export default function CollateralVerifyPage({ params }: { params: { applicationId: string } }) {
  const { applicationId } = params;
  const router = useRouter();

  const [application, setApplication] = useState<Application | null>(null);
  const [collateral, setCollateral] = useState<Collateral | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Valuation Report State
  const [marketValue, setMarketValue] = useState("");
  const [forcedSaleValue, setForcedSaleValue] = useState("");
  const [isUpdatingValuation, setIsUpdatingValuation] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchCollateralDetails = async () => {
    try {
      const res = await fetch(`/api/loans/${applicationId}`);
      const json = await res.json();
      
      if (json.success) {
        setApplication(json.application);
        setCollateral(json.collateral);
        
        if (json.collateral) {
          setMarketValue(json.collateral.valuationReport?.marketValue?.toString() || json.collateral.estimatedValue.toString());
          setForcedSaleValue(json.collateral.valuationReport?.forcedSaleValue?.toString() || (json.collateral.estimatedValue * 0.8).toString());
        }
      } else {
        toast.error("Failed to load collateral details");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error loading collateral");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollateralDetails();
  }, [applicationId]);

  const handleUpdateValuation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collateral) return;

    setIsUpdatingValuation(true);
    try {
      const res = await fetch(`/api/collateral/${collateral._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketValue: Number(marketValue),
          forcedSaleValue: Number(forcedSaleValue),
          valuedBy: "Verification Agent",
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Valuation report updated successfully!");
        setCollateral(data.collateral);
      } else {
        toast.error(data.error || "Failed to update valuation");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating valuation report");
    } finally {
      setIsUpdatingValuation(false);
    }
  };

  const handleVerifyCollateral = async () => {
    if (!collateral) return;

    setIsVerifying(true);
    try {
      const res = await fetch(`/api/collateral/verify/${collateral._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: `Verified at market value PKR ${marketValue}` }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Collateral verified! Application transitioned to Under Review.");
        router.push("/agent/applications");
      } else {
        toast.error(data.error || "Failed to verify collateral");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error verifying collateral");
    } finally {
      setIsVerifying(false);
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

  if (!application || !collateral) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">Collateral details not found for this application.</p>
        <Link href="/agent/applications" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
          Go back to pipeline list
        </Link>
      </div>
    );
  }

  // Live Loan-To-Value LTV calculation based on current form input
  const currentLtv = marketValue ? (application.amountRequested / Number(marketValue)) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-amber-600" /> Collateral Asset Verification
          </h1>
          <p className="text-xs text-slate-400">Reviewing pledged security asset for application: {application.applicationNumber} ({application.borrower?.fullName})</p>
        </div>
        <Link href="/agent/applications">
          <Button variant="outline" size="sm" className="h-9 text-xs flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Queue
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Columns: Collateral info and files */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="text-base font-bold">Pledged Asset Details</CardTitle>
              <CardDescription>Verify the details and registry document links of the pledged security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 border-b pb-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Asset Type</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize">{collateral.type?.replace("_", " ")}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Estimated Market Value (Borrower declared)</span>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{currency} {collateral.estimatedValue?.toLocaleString()}</p>
                </div>
              </div>

              {collateral.location && (
                <div className="border-b pb-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Real Estate Location Address</span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{collateral.location}</p>
                </div>
              )}

              {collateral.registrationNumber && (
                <div className="border-b pb-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Vehicle Registration / Chassis Number</span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{collateral.registrationNumber}</p>
                </div>
              )}

              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Asset Description & Specifications</span>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 mt-1 bg-slate-50 p-3 rounded-xl dark:bg-slate-900/40">
                  {collateral.description}
                </p>
              </div>

              {/* Document attachment links */}
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Supporting Deed & Registry Documents</span>
                <div className="flex flex-wrap gap-2">
                  {collateral.documents?.map((doc, idx) => (
                    <a key={idx} href={doc.fileUrl} target="_blank" rel="noreferrer" className="bg-white border text-blue-600 px-3 py-1.5 rounded-lg hover:underline text-[10px] font-semibold dark:bg-slate-950 dark:border-slate-800 flex items-center gap-1.5 shadow-sm">
                      {doc.docType?.replace("_", " ")?.toUpperCase()} <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valuation Subform */}
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-1.5">
                <Calculator className="h-5 w-5 text-blue-600" /> Valuation Officer Report
              </CardTitle>
              <CardDescription>Adjust and stamp the verified market valuation and liquidation values</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateValuation} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Official Market Value (PKR)</label>
                    <Input
                      type="number"
                      value={marketValue}
                      onChange={(e) => {
                        setMarketValue(e.target.value);
                        setForcedSaleValue((Number(e.target.value) * 0.8).toString()); // auto fill 80% forced sale
                      }}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Forced Sale Value (80% Default)</label>
                    <Input
                      type="number"
                      value={forcedSaleValue}
                      onChange={(e) => setForcedSaleValue(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" variant="outline" className="h-9 text-xs" isLoading={isUpdatingValuation}>
                    Save Valuation Update
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Decisions & review data */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="text-base font-bold">LTV Ratio Calculations</CardTitle>
              <CardDescription>Borrower leverage risk estimation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="space-y-2 border-b pb-3">
                <p className="flex justify-between">
                  <span className="text-slate-400">Borrower:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{application.borrower?.fullName}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-400">Requested Loan:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100">{currency} {application.amountRequested?.toLocaleString()}</span>
                </p>
              </div>

              {/* LTV metrics */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border space-y-3 dark:bg-slate-900/20">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Loan-To-Value (LTV):</span>
                  <span className={`text-base font-extrabold px-2.5 py-0.5 rounded-full ${
                    currentLtv > 80 
                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" 
                      : currentLtv > 65 
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" 
                      : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                  }`}>
                    {currentLtv.toFixed(1)}%
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        currentLtv > 80 ? "bg-red-500" : currentLtv > 65 ? "bg-amber-500" : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(100, currentLtv)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 italic text-center">Standard risk cap: 70% LTV</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2">
                <Button
                  className="w-full text-xs h-11 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold"
                  onClick={handleVerifyCollateral}
                  isLoading={isVerifying}
                >
                  <Check className="h-4 w-4" /> Verify & Approve Collateral
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
