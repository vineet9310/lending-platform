"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ShieldCheck, FileText, Send, Check } from "lucide-react";

interface LoanAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  amount: number;
  rate: number;
  tenure: number;
  phone: string;
  onSignSuccess: (agreementUrl: string) => void;
}

export default function LoanAgreementModal({
  isOpen,
  onClose,
  applicationId,
  amount,
  rate,
  tenure,
  phone,
  onSignSuccess,
}: LoanAgreementModalProps) {
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  const handleRequestOtp = async () => {
    setIsSendingOtp(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Verification OTP sent to your phone number!");
        setOtpSent(true);
      } else {
        toast.error(data.error || "Failed to send verification code");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to send OTP code");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleConfirmSign = async () => {
    if (!otpCode || otpCode.length < 6) {
      toast.error("Please enter a valid 6-digit OTP code");
      return;
    }

    setIsSigning(true);
    try {
      const res = await fetch("/api/loans/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, otp: otpCode }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Agreement signed successfully!");
        onSignSuccess(data.agreementUrl);
        onClose();
      } else {
        toast.error(data.error || "Failed to sign agreement");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error signing agreement");
    } finally {
      setIsSigning(false);
    }
  };

  // Basic monthly repayment estimate
  const monthlyRate = rate / 12 / 100;
  const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
            <FileText className="h-5 w-5 text-blue-600" /> Review & Sign Loan Agreement
          </DialogTitle>
          <DialogDescription>
            Please read the offer terms carefully before completing the electronic signature.
          </DialogDescription>
        </DialogHeader>

        {/* Offer Summary Cards */}
        <div className="grid grid-cols-3 gap-4 rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-900/40">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Offered Amount</p>
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{currency} {amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Interest Rate</p>
            <p className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{rate}% p.a.</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Monthly Repayment</p>
            <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{currency} {Math.round(emi).toLocaleString()}</p>
          </div>
        </div>

        {/* Agreement Text Block */}
        <div className="h-48 overflow-y-auto rounded-xl border border-slate-200/80 bg-white p-4 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
          <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">TERMS & CONDITIONS</h4>
          <p className="mb-2">This electronic document constitutes a binding agreement between the borrower and LendEasy private network lenders.</p>
          <p className="mb-2">1. The borrower promises to pay the monthly EMI amount of {currency} {Math.round(emi).toLocaleString()} for a total tenure of {tenure} months.</p>
          <p className="mb-2">2. Repayments are due on the designated monthly dates. A late payment penalty of 2% of the EMI amount per day overdue will be charged on all late repayments.</p>
          <p className="mb-2">3. The borrower has pledged collateral as security. In the event of default exceeding 90 days, the lender reserves the right to mark, possess or liquidate the collateral to recover outstanding amounts.</p>
          <p className="mb-2">4. Confirming this action with the SMS/Phone verification OTP represents a legally binding electronic signature.</p>
        </div>

        {/* OTP Verification panel */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              E-Signature OTP Authorization
            </span>
            {!otpSent ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-[11px] border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/40"
                onClick={handleRequestOtp}
                isLoading={isSendingOtp}
              >
                Send OTP Code
              </Button>
            ) : (
              <span className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> OTP Sent to {phone.slice(0, 4)}***{phone.slice(-3)}
              </span>
            )}
          </div>

          {otpSent && (
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="text"
                placeholder="Enter 6-digit OTP code"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="h-10 text-center text-sm font-bold tracking-wider max-w-[200px]"
              />
              <Button
                className="h-10 text-xs flex-1 flex items-center gap-1"
                onClick={handleConfirmSign}
                isLoading={isSigning}
              >
                <ShieldCheck className="h-4 w-4" /> Confirm & e-Sign
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
