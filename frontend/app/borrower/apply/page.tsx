"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Progress } from "@/components/ui/Progress";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import LoanApplicationForm from "@/components/forms/LoanApplicationForm";
import KYCForm from "@/components/forms/KYCForm";
import CollateralForm from "@/components/forms/CollateralForm";
import { ShieldCheck, FileCheck, Landmark, Check, AlertCircle, FileText, Image, UserCheck, MapPin, Hash, ExternalLink, Calendar, CreditCard, Banknote } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function ApplyPage() {
  const router = useRouter();
  const { wizardStep, setWizardStep, wizardData, resetWizard, updateWizardData } = useAppStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState("");

  const steps = [
    { num: 1, name: "Loan Details", desc: "Select amount & tenure", icon: Landmark },
    { num: 2, name: "Employment", desc: "Enter monthly income", icon: Landmark },
    { num: 3, name: "KYC Documents", desc: "Upload ID & selfie", icon: ShieldCheck },
    { num: 4, name: "Collateral", desc: "Pledge security assets", icon: FileCheck },
    { num: 5, name: "Final Review", desc: "Confirm submission", icon: ShieldCheck },
  ];

  // Map steps to visual progress
  const progressPercentage = wizardStep === 1 ? 20 : wizardStep === 3 ? 50 : wizardStep === 4 ? 75 : 100;

  // Load draft on mount if available
  useEffect(() => {
    const fetchDraft = async () => {
      try {
        const res = await fetch("/api/loans/apply");
        const data = await res.json();
        if (data.hasDraft) {
          updateWizardData(data.wizardData);
          setWizardStep(data.wizardStep);
          toast.success("Resumed your active application draft.");
        }
      } catch (e) {
        console.error("Failed to load draft:", e);
      }
    };
    fetchDraft();
  }, [updateWizardData, setWizardStep]);

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      setSubmissionProgress("Submitting loan application...");
      const applyRes = await fetch("/api/loans/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          applicationId: wizardData.applicationId,
        }),
      });
      const applyJson = await applyRes.json();

      if (!applyRes.ok) {
        throw new Error(applyJson.error || "Failed to submit loan application");
      }

      // Complete Success!
      toast.success("Loan application submitted successfully!");
      resetWizard();
      router.push("/borrower/dashboard");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to submit. Please check parameters.");
    } finally {
      setIsSubmitting(false);
      setSubmissionProgress("");
    }
  };

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
      {/* Sidebar Progress Steps Indicator */}
      <div className="lg:col-span-1 space-y-4">
        <div className="hidden lg:flex flex-col gap-4">
          {steps.map((st) => {
            const isCompleted = st.num < wizardStep;
            const isCurrent = st.num === wizardStep || (wizardStep === 1 && st.num === 2); // 1 covers both 1 and 2
            
            return (
              <div key={st.num} className="flex items-start gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                  isCompleted 
                    ? "border-green-600 bg-green-50 text-green-700 dark:bg-green-950/20" 
                    : isCurrent 
                    ? "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                    : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900"
                }`}>
                  {isCompleted ? <Check className="h-4.5 w-4.5" /> : st.num}
                </div>
                <div>
                  <h4 className={`text-xs font-bold ${isCurrent ? "text-slate-800 dark:text-white" : "text-slate-400"}`}>
                    {st.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-normal">{st.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Wizard Form Container */}
      <div className="lg:col-span-3 space-y-6">
        <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Step {wizardStep === 1 ? "1 & 2 of 4" : wizardStep === 3 ? "3 of 4" : wizardStep === 4 ? "4 of 4" : "Review"}
              </span>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {progressPercentage}% Completed
              </span>
            </div>
            <Progress value={progressPercentage} />
          </CardHeader>

          <CardContent className="pt-2">
            {/* Render subforms conditionally */}
            {wizardStep === 1 && <LoanApplicationForm />}
            {wizardStep === 3 && <KYCForm />}
            {wizardStep === 4 && <CollateralForm />}

            {/* Step 5: Final Review & Submit Panel */}
            {wizardStep === 5 && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Review Loan Details</h3>
                  <p className="text-xs text-slate-400">Confirm all entered details before submission. These cannot be altered during review.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Loan & Financial Summary */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800/60 dark:bg-slate-900/10 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2 dark:border-slate-800">
                      <Banknote className="h-4.5 w-4.5 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Loan & Financial Details</h4>
                    </div>
                    <div className="text-xs space-y-2">
                      <p className="flex justify-between">
                        <span className="text-slate-400">Requested Amount:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{currency} {wizardData.amountRequested?.toLocaleString()}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Tenure:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{wizardData.tenureMonths} Months</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Interest Repayment Type:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 uppercase">{wizardData.interestType || "Reducing"}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Purpose of Loan:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 capitalize">{wizardData.purpose}</span>
                      </p>
                      {wizardData.purposeDetail && (
                        <div className="flex flex-col gap-0.5 text-left border-t border-slate-200/40 pt-1.5 mt-1 dark:border-slate-850">
                          <span className="text-[10px] text-slate-400">Purpose Detail:</span>
                          <span className="text-slate-600 dark:text-slate-300 font-medium">{wizardData.purposeDetail}</span>
                        </div>
                      )}
                      <p className="flex justify-between border-t border-slate-200/40 pt-2 dark:border-slate-850">
                        <span className="text-slate-400">Employment Type:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 capitalize">{wizardData.employmentType}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Monthly Net Income:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{currency} {wizardData.monthlyIncome?.toLocaleString()}/mo</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Existing Loan Liabilities:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{wizardData.existingLoans ? `${currency} ${Number(wizardData.existingLoans).toLocaleString()}/mo` : "No Active Liabilities"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Collateral Details */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800/60 dark:bg-slate-900/10 space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2 dark:border-slate-800">
                      <FileCheck className="h-4.5 w-4.5 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Collateral Asset Details</h4>
                    </div>
                    <div className="text-xs space-y-2">
                      <p className="flex justify-between">
                        <span className="text-slate-400">Asset Type:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 capitalize">{wizardData.collateralType?.replace("_", " ")}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Estimated Market Value:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{currency} {wizardData.collateralValue?.toLocaleString()}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Estimated Loan-to-Value (LTV):</span>
                        <span className={`font-bold ${((wizardData.amountRequested / wizardData.collateralValue) * 100) > 80 ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                          {((wizardData.amountRequested / wizardData.collateralValue) * 100).toFixed(1)}%
                        </span>
                      </p>
                      {wizardData.collateralLocation && (
                        <p className="flex justify-between">
                          <span className="text-slate-400">Storage / Property Location:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-100 text-right max-w-[150px] truncate" title={wizardData.collateralLocation}>{wizardData.collateralLocation}</span>
                        </p>
                      )}
                      {wizardData.collateralRegistrationNumber && (
                        <p className="flex justify-between">
                          <span className="text-slate-400">Registration / Reference #:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{wizardData.collateralRegistrationNumber}</span>
                        </p>
                      )}
                      <div className="flex flex-col gap-0.5 text-left border-t border-slate-200/40 pt-1.5 dark:border-slate-850">
                        <span className="text-[10px] text-slate-400">Asset Description & Condition:</span>
                        <span className="text-slate-650 dark:text-slate-350 italic">"{wizardData.collateralDescription || "No description provided."}"</span>
                      </div>
                    </div>
                  </div>

                  {/* KYC Details */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800/60 dark:bg-slate-900/10 space-y-3 md:col-span-2">
                    <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2 dark:border-slate-800">
                      <ShieldCheck className="h-4.5 w-4.5 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">KYC Verification Details</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Identity Document Type:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100 uppercase">{wizardData.identityDocType?.replace("_", " ")}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Identity Document Number:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{wizardData.identityDocNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Document Expiry Date:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{wizardData.identityDocExpiryDate ? new Date(wizardData.identityDocExpiryDate).toLocaleDateString() : "N/A / Non-expiring"}</span>
                      </div>
                      <div className="border-t border-slate-200/40 pt-3 dark:border-slate-850 sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <span className="text-slate-400 block mb-0.5">Address Proof Type:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100 uppercase">{wizardData.addressDocType?.replace("_", " ")}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Address Proof Issued Date:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{wizardData.addressDocIssuedDate ? new Date(wizardData.addressDocIssuedDate).toLocaleDateString() : "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-0.5">Income Proof Doc Type:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-100 uppercase">{wizardData.incomeDocType?.replace("_", " ")}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Document Attachments Review Gallery */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800/60 dark:bg-slate-900/10 space-y-3 md:col-span-2">
                    <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2 dark:border-slate-800">
                      <FileText className="h-4.5 w-4.5 text-blue-600" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Uploaded Documents Checklist</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                      {/* Document item renderer */}
                      {[
                        { key: "selfie", label: "Selfie Image" },
                        { key: "identityFront", label: "Identity Proof (Front)" },
                        { key: "identityBack", label: "Identity Proof (Back)" },
                        { key: "addressProof", label: "Address Proof Doc" },
                        { key: "incomeProof", label: "Income Statement Proof" },
                        { key: "bankStatement", label: "Bank Account Statement" },
                        { key: "employerLetter", label: "Salary/Employment Letter" },
                        { key: "blank_cheque", label: "Blank Cheque Scan" },
                        { key: "asset_image", label: "Collateral Asset Photo" },
                        { key: "ownership_deed", label: "Asset Ownership Deed" },
                        { key: "valuation_report", label: "Valuation Officer Report" },
                        { key: "registration", label: "Registration / Shares Statement" },
                        { key: "insurance", label: "Insurance Policy Copy" },
                      ].map((item) => {
                        // Check if file is uploaded in this wizard session or previously uploaded URL
                        const fileObj = wizardData.collateralFiles?.[item.key] || wizardData[`${item.key}File`];
                        const url = wizardData[`${item.key}Url`] || (typeof wizardData[item.key] === "string" ? wizardData[item.key] : "");
                        const hasFile = !!fileObj || !!url;
                        const fileName = fileObj ? fileObj.name : url ? url.split("/").pop() || "view_file" : "";

                        if (hasFile) {
                          return (
                            <a
                              key={item.key}
                              href={url || "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-3 rounded-xl border border-blue-100 bg-white hover:bg-blue-50/20 hover:border-blue-300 transition-all text-[11px] font-semibold text-blue-600 dark:border-slate-850 dark:bg-slate-950 dark:text-blue-400 shadow-sm"
                            >
                              <div className="flex items-center gap-2 max-w-[80%]">
                                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                <div className="text-left truncate">
                                  <span className="block text-slate-700 dark:text-slate-350 font-medium leading-none">{item.label}</span>
                                  <span className="text-[9px] text-slate-400 truncate block mt-0.5">{fileName}</span>
                                </div>
                              </div>
                              <ExternalLink className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                            </a>
                          );
                        } else {
                          // Hide back document if PAN or other single sided documents
                          if (item.key === "identityBack" && wizardData.identityDocType === "pan") return null;
                          // Hide blank cheque if type is not blank cheque
                          if (item.key === "blank_cheque" && wizardData.collateralType !== "blank_cheque") return null;
                          // Hide asset photo if type is blank cheque
                          if (item.key === "asset_image" && wizardData.collateralType === "blank_cheque") return null;

                          return (
                            <div
                              key={item.key}
                              className="flex items-center justify-between p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/20 text-[11px] text-slate-400 dark:border-slate-800 dark:bg-slate-950/40"
                            >
                              <span className="font-medium text-slate-500">{item.label}</span>
                              <span className="text-[9px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Optional / N/A</span>
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>
                </div>

                {/* Submitting loader state */}
                {isSubmitting && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-950/20 dark:bg-slate-950 flex items-center gap-3">
                    <div className="flex h-10 w-10 animate-spin items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-900 dark:text-blue-400">Submitting Loan Application...</p>
                      <p className="text-[10px] text-blue-600 dark:text-blue-500">{submissionProgress}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <Button type="button" variant="outline" onClick={() => setWizardStep(4)} disabled={isSubmitting}>
                    Back: Collateral
                  </Button>
                  <Button onClick={handleFinalSubmit} isLoading={isSubmitting}>
                    Submit Loan Application
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
