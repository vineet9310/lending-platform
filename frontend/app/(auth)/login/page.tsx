import React, { Suspense } from "react";
import LoginForm from "@/components/forms/LoginForm";
import { Shield, Sparkles } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950 to-slate-950"></div>
      
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[80px]"></div>
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-600/10 blur-[100px]"></div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white flex items-center gap-1.5">
            LendEasy Finance <Sparkles className="h-4 w-4 text-blue-400" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Secure, low-interest peer-to-peer micro-lending portal
          </p>
        </div>

        <Suspense fallback={<div className="text-white text-center text-xs">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
