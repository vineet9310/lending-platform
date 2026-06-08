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
import { calculateEMI } from "@/lib/emi-calculator";

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
      amountRequested: wizardData.amountRequested,
      tenureMonths: wizardData.tenureMonths,
      purpose: wizardData.purpose,
      purposeDetail: wizardData.purposeDetail,
      employmentType: wizardData.employmentType,
      monthlyIncome: wizardData.monthlyIncome,
      existingLoans: wizardData.existingLoans,
    },
  });

  const amountRequested = watch("amountRequested");
  const tenureMonths = watch("tenureMonths");
  const purpose = watch("purpose");

  // Live calculation sidebar calculation
  const defaultRate = 18; // default annual interest rate
  const liveEmi = calculateEMI(amountRequested || 0, defaultRate, tenureMonths || 12, "reducing_balance");

  const onSubmit = (data: LoanApplicationInput) => {
    updateWizardData(data);
    setWizardStep("documents");
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
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {currency} {amountRequested?.toLocaleString()}
            </span>
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
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {tenureMonths} Months
            </span>
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

        {/* Purpose */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loan Purpose</label>
          <Select {...register("purpose")}>
            <option value="business">Business Expansion</option>
            <option value="education">Education Expenses</option>
            <option value="medical">Medical Emergencies</option>
            <option value="purchase">Asset / Property Purchase</option>
            <option value="personal">Personal / Wedding Costs</option>
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
            <option value="salaried">Salaried Employee</option>
            <option value="self_employed">Self-Employed (Business)</option>
            <option value="student">Student</option>
            <option value="unemployed">Unemployed</option>
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

      {/* Live Calculator preview inside form */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/20">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Live Loan Estimate</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Est. Monthly EMI</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{currency} {liveEmi.emiAmount?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Total Interest</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{currency} {liveEmi.totalInterest?.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase">Total Payable</p>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{currency} {liveEmi.totalPayable?.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/60">
        <Button type="submit">
          Next: Upload Documents
        </Button>
      </div>
    </form>
  );
}
