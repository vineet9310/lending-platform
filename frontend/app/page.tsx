import React from "react";
import Link from "next/link";
import EMICalculator from "@/components/loan/EMICalculator";
import { Shield, ArrowRight, TrendingUp, CheckCircle2, DollarSign, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-white overflow-hidden">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10">
            <Shield className="h-5 w-5" />
          </div>
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
            LendEasy
          </span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-xs font-semibold text-slate-400 hover:text-white transition-colors">
            Staff Portal
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-500/10 transition-all active:scale-[0.98]"
          >
            Borrower Login
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-6 md:px-12 max-w-7xl mx-auto w-full text-center space-y-8 z-10">
        {/* Dynamic Backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-blue-600/10 blur-[120px] -z-10"></div>

        <div className="space-y-4">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-blue-950/60 border border-blue-900/60 px-3 py-1 text-xs text-blue-400 font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Collateral-Backed Lending Network
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl max-w-4xl mx-auto leading-tight">
            Secure Private Loans, <br/>
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Simplified & Instant.
            </span>
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Apply for credit secured by gold or vehicle assets. Complete digital KYC audits, e-sign lending agreements, and receive instant disbursements with flexible reducing-balance EMIs.
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <Link href="/register">
            <button className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-bold hover:brightness-105 shadow-lg shadow-blue-500/15 transition-all active:scale-[0.98]">
              Apply For Loan Now <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
          <Link href="/login">
            <button className="rounded-xl border border-slate-800 bg-slate-950 px-6 py-3 text-sm font-bold text-slate-300 hover:bg-slate-900 transition-colors">
              Staff Desk Login
            </button>
          </Link>
        </div>
      </section>

      {/* Interactive EMI Calculator Section */}
      <section className="py-12 px-6 md:px-12 max-w-7xl mx-auto w-full bg-slate-950/40 rounded-3xl border border-slate-800/80 mb-20">
        <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl flex items-center justify-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" /> Interactive repayment estimator
          </h2>
          <p className="text-xs text-slate-500 leading-normal">
            Configure your principal, rate, and tenure to estimate your monthly EMI repayments instantly.
          </p>
        </div>

        {/* Embedded Calculator */}
        <div className="text-slate-900">
          <EMICalculator />
        </div>
      </section>

      {/* Features Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto w-full px-6 mb-20 text-left">
        <div className="border border-slate-800 bg-slate-950/60 p-6 rounded-2xl space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900/40 text-blue-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-slate-100 text-sm">Asset Secured</h3>
          <p className="text-xs text-slate-400 leading-normal">Pledge gold valuation sheets or motor vehicle certificates. Leverage up to 70% Loan-to-Value (LTV) limits safely.</p>
        </div>
        <div className="border border-slate-800 bg-slate-950/60 p-6 rounded-2xl space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-900/40 text-indigo-400">
            <Shield className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-slate-100 text-sm">Automated Escrow</h3>
          <p className="text-xs text-slate-400 leading-normal">Disburse directly via bank wires and collect monthly payments automatically using integrated Razorpay checkouts.</p>
        </div>
        <div className="border border-slate-800 bg-slate-950/60 p-6 rounded-2xl space-y-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-900/40 text-purple-400">
            <DollarSign className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-slate-100 text-sm">Compliant Audits</h3>
          <p className="text-xs text-slate-400 leading-normal">All transitions (Approved, Disbursed, Settled) produce signed agreement PDFs and Append-Only ledger Audit Logs.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} LendEasy Platform. Built for secure, low-interest micro-lending. All rights reserved.</p>
      </footer>
    </div>
  );
}
export const dynamic = "force-dynamic";
