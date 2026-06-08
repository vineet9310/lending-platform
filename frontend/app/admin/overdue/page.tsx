"use client";

import React from "react";
import Link from "next/link";
import OverdueTable from "@/components/dashboard/OverdueTable";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default function AdminOverduePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" /> Overdue Collection Desk
          </h1>
          <p className="text-xs text-slate-400">Review all accounts currently failing to clear billing installments on time</p>
        </div>
        <Link href="/admin/dashboard">
          <Button variant="outline" size="sm" className="h-9 text-xs flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="w-full">
        <OverdueTable />
      </div>
    </div>
  );
}
