"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Shield, KeyRound, ArrowLeft } from "lucide-react";
import Link from "next/link";

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Email address is required.");
      return;
    }
    if (code.length < 6) {
      toast.error("Please enter the 6-digit OTP code.");
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Account activated successfully!");
        setVerified(true);
      } else {
        toast.error(data.error || "Failed to verify email OTP");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during verification.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (verified) {
    return (
      <Card className="border-slate-200/80 bg-white/70 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70 text-center">
        <CardHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400">
            <Shield className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold mt-4">Account Verified!</CardTitle>
          <CardDescription>
            Your email has been verified and your account is now active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/login" className="block w-full">
            <Button className="w-full">Sign In to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/80 bg-white/70 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
          <KeyRound className="h-5 w-5 text-blue-600" /> Verify Email OTP
        </CardTitle>
        <CardDescription className="text-center">
          Enter the 6-digit verification code sent to your email address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Registered Email</label>
            <Input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Verification Code (OTP)</label>
            <Input
              type="text"
              placeholder="000000"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center text-lg font-bold tracking-widest"
              required
            />
          </div>

          <Button type="submit" className="w-full mt-2" isLoading={isVerifying}>
            Activate Account
          </Button>
        </form>

        <div className="mt-6 flex justify-between text-xs font-semibold">
          <Link href="/register" className="text-slate-500 hover:text-slate-700 flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to Register
          </Link>
          <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
            Sign In instead
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyOtpPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950 to-slate-950"></div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        <Suspense fallback={<div className="text-white text-center text-xs">Loading...</div>}>
          <VerifyOtpContent />
        </Suspense>
      </div>
    </main>
  );
}
