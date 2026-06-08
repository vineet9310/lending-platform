"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Settings, ShieldCheck, Save } from "lucide-react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [defaultRate, setDefaultRate] = useState("18");
  const [maxAmount, setMaxAmount] = useState("5000000");
  const [minAmount, setMinAmount] = useState("10000");
  const [penaltyRate, setPenaltyRate] = useState("2");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Simulate setting saving to DB/LocalStorage
    setTimeout(() => {
      setIsSaving(false);
      toast.success("System configurations saved successfully!");
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" /> Platform Configurations
          </h1>
          <p className="text-xs text-slate-400">Configure global interest parameters, lending caps, 2FA profiles and overdue billing rates</p>
        </div>
        <Link href="/admin/dashboard">
          <Button variant="outline" size="sm" className="h-9 text-xs flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="max-w-2xl">
        <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-1.5">
              <ShieldCheck className="h-5 w-5 text-blue-600" /> Lending Framework Limits
            </CardTitle>
            <CardDescription>Define risk parameters and default billing rates for loan contracts</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Default Annual Interest Rate (%)</label>
                  <Input
                    type="number"
                    value={defaultRate}
                    onChange={(e) => setDefaultRate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Daily Late Penalty Rate (%)</label>
                  <Input
                    type="number"
                    value={penaltyRate}
                    onChange={(e) => setPenaltyRate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Minimum Loan Amount (INR)</label>
                  <Input
                    type="number"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Maximum Loan Amount (INR)</label>
                  <Input
                    type="number"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <Button type="submit" className="flex items-center gap-1 text-xs" isLoading={isSaving}>
                  <Save className="h-4 w-4" /> Save System Settings
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
