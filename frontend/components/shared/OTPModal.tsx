"use client";

import React, { useState } from "react";
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
import { KeyRound } from "lucide-react";
import toast from "react-hot-toast";

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  phoneOrEmail: string;
  type: "phone" | "email";
  onVerificationSuccess: () => void;
}

export default function OTPModal({
  isOpen,
  onClose,
  phoneOrEmail,
  type,
  onVerificationSuccess,
}: OTPModalProps) {
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleVerify = async () => {
    if (code.length < 6) {
      toast.error("Please enter a valid 6-digit verification code.");
      return;
    }

    setIsVerifying(true);
    try {
      const endpoint = type === "email" ? "/api/auth/verify-email" : "/api/auth/verify-otp";
      const payload = type === "email" ? { email: phoneOrEmail, otp: code } : { phone: phoneOrEmail, otp: code };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(data.message || "Verified successfully!");
        onVerificationSuccess();
        onClose();
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error during verification");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const endpoint = type === "email" ? "/api/auth/register" : "/api/auth/send-otp"; // for email, they can register again or we trigger resend. Let's send OTP for phone, email OTP can be re-triggered.
      const payload = type === "email" ? { email: phoneOrEmail } : { phone: phoneOrEmail };

      const res = await fetch(type === "email" ? "/api/auth/forgot-password" : "/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Verification code resent successfully!");
      } else {
        toast.error(data.error || "Failed to resend code");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error resending verification code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-white">
            <KeyRound className="h-5 w-5 text-blue-600" /> Enter Verification Code
          </DialogTitle>
          <DialogDescription>
            We have sent a 6-digit OTP code to your registered {type === "email" ? "email" : "phone number"}:
            <span className="block font-bold text-slate-700 dark:text-slate-300 mt-1">{phoneOrEmail}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <Input
            type="text"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-12 text-center text-xl font-bold tracking-widest max-w-[220px]"
          />
          
          <button
            onClick={handleResend}
            disabled={isResending}
            className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
          >
            {isResending ? "Resending..." : "Didn't receive the code? Resend Code"}
          </button>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleVerify} isLoading={isVerifying} className="flex-1">
            Verify Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
