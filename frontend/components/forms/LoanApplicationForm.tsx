"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoanApplicationSchema, LoanApplicationInput } from "@/lib/validators/loan.schema";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import toast from "react-hot-toast";


export default function LoanApplicationForm() {
  const { wizardData, updateWizardData, setWizardStep } = useAppStore();
  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoanApplicationInput>({
    resolver: zodResolver(LoanApplicationSchema) as any,
    defaultValues: {
      amountRequested: wizardData.amountRequested || "" as any,
      tenureMonths: wizardData.tenureMonths || "" as any,
      purpose: wizardData.purpose || "",
      purposeDetail: wizardData.purposeDetail || "",
      employmentType: wizardData.employmentType || "",
      monthlyIncome: wizardData.monthlyIncome || "" as any,
      existingLoans: wizardData.existingLoans !== undefined && wizardData.existingLoans !== "" ? wizardData.existingLoans : "" as any,
      interestType: wizardData.interestType || "",
    } as any,
  });

  const amountRequested = watch("amountRequested");
  const tenureMonths = watch("tenureMonths");
  const purpose = watch("purpose");
  const interestType = watch("interestType") || "";

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = async (data: LoanApplicationInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/loans/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          action: "draft",
          applicationId: wizardData.applicationId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save draft details");
      }
      updateWizardData({
        ...data,
        applicationId: json.applicationId,
      });
      toast.success("Draft saved successfully!");
      setWizardStep(3);
    } catch (e: any) {
      toast.error(e.message || "Failed to save draft. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        
        {/* Loan Amount Requested */}
        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Loan Amount Requested ({currency})
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-500">{currency}</span>
              <input
                type="number"
                min={10000}
                max={5000000}
                value={amountRequested || ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setValue("amountRequested", val, { shouldValidate: true });
                }}
                className="w-32 rounded-lg border border-slate-200 px-2.5 py-1 text-right text-sm font-bold text-blue-600 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-blue-400"
              />
            </div>
          </div>
          <Slider
            min={10000}
            max={5000000}
            step={5000}
            value={amountRequested}
            onChange={(val) => setValue("amountRequested", val)}
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>{currency} 10,000</span>
            <span>{currency} 5,000,000</span>
          </div>
          {errors.amountRequested && (
            <p className="text-xs text-red-500">{errors.amountRequested.message}</p>
          )}
        </div>

        {/* Tenure Months */}
        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Tenure duration (Months)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={3}
                max={60}
                value={tenureMonths || ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setValue("tenureMonths", val, { shouldValidate: true });
                }}
                className="w-20 rounded-lg border border-slate-200 px-2.5 py-1 text-right text-sm font-bold text-blue-600 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-blue-400"
              />
              <span className="text-sm font-semibold text-slate-500">Months</span>
            </div>
          </div>
          <Slider
            min={3}
            max={60}
            step={1}
            value={tenureMonths}
            onChange={(val) => setValue("tenureMonths", val)}
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>3 Months</span>
            <span>60 Months</span>
          </div>
          {errors.tenureMonths && (
            <p className="text-xs text-red-500">{errors.tenureMonths.message}</p>
          )}
        </div>

        {/* Interest Scheme / Type */}
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Interest Payment Scheme</label>
          <Select {...register("interestType")}>
            <option value="">Please select payment scheme</option>
            <option value="reducing_balance">Annually Interest (EMI bases par chukayein)</option>
            <option value="interest_only">Monthly Interest (Sirf monthly interest chukayein, Principal end me)</option>
          </Select>
          {errors.interestType && (
            <p className="text-xs text-red-500">{errors.interestType.message}</p>
          )}
        </div>

        {/* Purpose */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loan Purpose</label>
          <Select {...register("purpose")}>
            <option value="">Please select purpose</option>
            <option value="home">Home Purchase / Renovation</option>
            <option value="business">Business Expansion / Capital</option>
            <option value="personal">Personal / Wedding Costs</option>
            <option value="education">Education Expenses</option>
            <option value="vehicle">Vehicle Purchase</option>
            <option value="agriculture">Agricultural Expenses</option>
            <option value="other">Other</option>
          </Select>
          {errors.purpose && (
            <p className="text-xs text-red-500">{errors.purpose.message}</p>
          )}
        </div>

        {/* Employment Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Employment Status</label>
          <Select {...register("employmentType")}>
            <option value="">Please select status</option>
            <option value="salaried">Salaried Employee</option>
            <option value="self_employed">Self-Employed Professional</option>
            <option value="business_owner">Business Owner / Entrepreneur</option>
            <option value="freelancer">Freelancer / Independent</option>
          </Select>
          {errors.employmentType && (
            <p className="text-xs text-red-500">{errors.employmentType.message}</p>
          )}
        </div>

        {/* Monthly Income */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Monthly Net Income ({currency})</label>
          <Input
            type="number"
            placeholder="e.g. 50000"
            error={!!errors.monthlyIncome}
            {...register("monthlyIncome")}
          />
          {errors.monthlyIncome && (
            <p className="text-xs text-red-500">{errors.monthlyIncome.message}</p>
          )}
        </div>

        {/* Existing Loans */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Existing Monthly EMI Outflow ({currency})</label>
          <Input
            type="number"
            placeholder="e.g. 0"
            error={!!errors.existingLoans}
            {...register("existingLoans")}
          />
          {errors.existingLoans && (
            <p className="text-xs text-red-500">{errors.existingLoans.message}</p>
          )}
        </div>

        {/* Purpose Details */}
        {purpose === "other" && (
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Provide Purpose Detail</label>
            <Input
              type="text"
              placeholder="Explain why you are applying for the loan..."
              error={!!errors.purposeDetail}
              {...register("purposeDetail")}
            />
            {errors.purposeDetail && (
              <p className="text-xs text-red-500">{errors.purposeDetail.message}</p>
            )}
          </div>
        )}
      </div>



      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/60">
        <Button type="submit" isLoading={isSubmitting}>
          Next: Upload Documents
        </Button>
      </div>
    </form>
  );
}
