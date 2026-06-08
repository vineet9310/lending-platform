"use client";

import React, { useEffect, useState } from "react";
import StatsCard from "@/components/dashboard/StatsCard";
import EMIChart from "@/components/dashboard/EMIChart";
import LoanPipeline from "@/components/dashboard/LoanPipeline";
import OverdueTable from "@/components/dashboard/OverdueTable";
import { DollarSign, Briefcase, CreditCard, Activity, ArrowRight, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

interface PortfolioStats {
  totalPortfolioSize: number;
  activeLoansCount: number;
  closedLoansCount: number;
  defaultedLoansCount: number;
  totalPenaltiesCollected: number;
  collectionRate: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PortfolioStats>({
    totalPortfolioSize: 0,
    activeLoansCount: 0,
    closedLoansCount: 0,
    defaultedLoansCount: 0,
    totalPenaltiesCollected: 0,
    collectionRate: 100,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/reports/portfolio");
      const json = await res.json();
      if (json.success) {
        setStats(json.portfolio);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load portfolio stats");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Activity className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Greeting Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-900 to-indigo-950 p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-blue-400" /> LendEasy Admin Workspace
          </h1>
          <p className="text-xs text-blue-200 mt-1">Monitor credit distributions, approve pending loan contracts, track collections and manage defaults.</p>
        </div>
      </div>

      {/* Stats Summary row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Active Loan Portfolio"
          value={`${currency} ${stats.totalPortfolioSize?.toLocaleString()}`}
          description="Total unpaid principal"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatsCard
          title="Active Borrowers"
          value={stats.activeLoansCount}
          description="Active accounts in billing"
          icon={<Briefcase className="h-5 w-5" />}
        />
        <StatsCard
          title="Collection Rate %"
          value={`${stats.collectionRate}%`}
          description="Outstanding vs Settled EMIs"
          icon={<CreditCard className="h-5 w-5" />}
          trend={{ value: "On target", type: "up" }}
        />
        <StatsCard
          title="Overdue Accounts"
          value={stats.defaultedLoansCount}
          description="Marked defaulted loans"
          icon={<Briefcase className="h-5 w-5" />}
        />
      </div>

      {/* Charts & Inflow visualization */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EMIChart />
        </div>
        <div className="lg:col-span-1">
          <OverdueTable />
        </div>
      </div>

      {/* Loan Pipeline Kanban column grid */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Active Loan Approval Pipeline (Kanban Board)</h3>
        <LoanPipeline />
      </div>
    </div>
  );
}
