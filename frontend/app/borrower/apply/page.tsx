"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Progress } from "@/components/ui/Progress";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import LoanApplicationForm from "@/components/forms/LoanApplicationForm";
import KYCForm from "@/components/forms/KYCForm";
import CollateralForm from "@/components/forms/CollateralForm";
import { ShieldCheck, FileCheck, Landmark, Check, AlertCircle } from "lucide-react";
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
                  {/* Loan Details summary */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/10 space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loan Details</h4>
                    <div className="text-xs space-y-1.5">
                      <p className="flex justify-between">
                        <span className="text-slate-400">Requested Amount:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{currency} {wizardData.amountRequested?.toLocaleString()}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Requested Tenure:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{wizardData.tenureMonths} Months</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Purpose:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 capitalize">{wizardData.purpose}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Income Status:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 capitalize">{wizardData.employmentType} ({currency} {wizardData.monthlyIncome?.toLocaleString()}/mo)</span>
                      </p>
                    </div>
                  </div>

                  {/* Collateral details summary */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/10 space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pledged Collateral</h4>
                    <div className="text-xs space-y-1.5">
                      <p className="flex justify-between">
                        <span className="text-slate-400">Asset Type:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 capitalize">{wizardData.collateralType}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Estimated Value:</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200">{currency} {wizardData.collateralValue?.toLocaleString()}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-slate-400">Estimated LTV:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {((wizardData.amountRequested / wizardData.collateralValue) * 100).toFixed(1)}%
                        </span>
                      </p>
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
