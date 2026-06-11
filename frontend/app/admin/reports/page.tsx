"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import StatsCard from "@/components/dashboard/StatsCard";
import EMIChart from "@/components/dashboard/EMIChart";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, BarChart3, Activity, TrendingUp, ShieldAlert, Award } from "lucide-react";
import toast from "react-hot-toast";

interface PurposeValue {
  name: string;
  value: number;
}

interface PortfolioReport {
  totalPortfolioSize: number;
  activeLoansCount: number;
  closedLoansCount: number;
  defaultedLoansCount: number;
  totalPenaltiesCollected: number;
  collectionRate: number;
  purposeBreakdown: PurposeValue[];
}

export default function ReportsPage() {
  const [report, setReport] = useState<PortfolioReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReportsData = async () => {
    try {
      const res = await fetch("/api/admin/reports/portfolio");
      const json = await res.json();
      if (json.success) {
        setReport(json.portfolio);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load reports summary");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";
  
  // Custom Pie Chart Colors
  const COLORS = ["#1e40af", "#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Activity className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-slate-500">Failed to render financial reports.</p>
        <Link href="/admin/dashboard" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
          Go back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-blue-600" /> Reports & Analytics Desk
          </h1>
          <p className="text-xs text-slate-400">Audit system lending portfolio, monthly profit and loss summaries and credit allocations</p>
        </div>
        <Link href="/admin/dashboard">
          <Button variant="outline" size="sm" className="h-9 text-xs flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Portfolio"
          value={`${currency} ${report.totalPortfolioSize?.toLocaleString()}`}
          description="Unpaid active loans"
          icon={<TrendingUp className="h-5 w-5 text-blue-600" />}
        />
        <StatsCard
          title="Installment Collection Rate"
          value={`${report.collectionRate}%`}
          description="Payer settlements ratio"
          icon={<Award className="h-5 w-5 text-green-600" />}
        />
        <StatsCard
          title="Penalties Revenue"
          value={`${currency} ${report.totalPenaltiesCollected?.toLocaleString()}`}
          description="Late payment collections"
          icon={<ShieldAlert className="h-5 w-5 text-red-600" />}
        />
        <StatsCard
          title="Defaults Registered"
          value={report.defaultedLoansCount}
          description="Accounts exceeding billing caps"
          icon={<ShieldAlert className="h-5 w-5 text-red-600" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Line Cash flow chart */}
        <div className="lg:col-span-2">
          <EMIChart />
        </div>

        {/* Pie allocation chart */}
        <div className="lg:col-span-1">
          <Card className="h-full border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
            <CardHeader>
              <CardTitle className="text-base font-bold">Portfolio Distribution</CardTitle>
              <CardDescription>Loan disbursements breakdown by borrower purpose</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <div className="w-full h-full min-w-0 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={report.purposeBreakdown}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {report.purposeBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                      formatter={(value: any) => [`${currency} ${Number(value).toLocaleString()}`]}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" style={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
