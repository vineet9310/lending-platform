"use client";

import React, { useState } from "react";
import { calculateEMI } from "@/lib/emi-calculator";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Slider } from "@/components/ui/Slider";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";

export default function EMICalculator() {
  const [principal, setPrincipal] = useState(100000);
  const [rate, setRate] = useState(12);
  const [tenure, setTenure] = useState(12);
  const [interestType, setInterestType] = useState<"flat" | "reducing_balance" | "interest_only">("reducing_balance");

  const results = calculateEMI(principal, rate, tenure, interestType);
  const currency = process.env.NEXT_PUBLIC_CURRENCY || "₹";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left Input Section */}
      <Card className="lg:col-span-1 border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardHeader>
          <CardTitle className="text-base font-bold">Parameters</CardTitle>
          <CardDescription>Adjust the sliders to estimate your payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Principal ({currency})</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">{currency}</span>
                <input
                  type="number"
                  min={10000}
                  max={5000000}
                  value={principal}
                  onChange={(e) => setPrincipal(Number(e.target.value))}
                  className="w-28 rounded-lg border border-slate-200 px-2 py-0.5 text-right text-xs font-bold text-blue-600 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-blue-400"
                />
              </div>
            </div>
            <Slider
              min={10000}
              max={5000000}
              step={5000}
              value={principal}
              onChange={setPrincipal}
            />
          </div>

          {/* Interest Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Annual Interest Rate (%)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={36}
                  step={0.5}
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="w-20 rounded-lg border border-slate-200 px-2 py-0.5 text-right text-xs font-bold text-blue-600 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-blue-400"
                />
                <span className="text-xs font-semibold text-slate-500">%</span>
              </div>
            </div>
            <Slider
              min={5}
              max={36}
              step={0.5}
              value={rate}
              onChange={setRate}
            />
          </div>

          {/* Tenure */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tenure (Months)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={tenure}
                  onChange={(e) => setTenure(Number(e.target.value))}
                  className="w-20 rounded-lg border border-slate-200 px-2 py-0.5 text-right text-xs font-bold text-blue-600 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-blue-400"
                />
                <span className="text-xs font-semibold text-slate-500">months</span>
              </div>
            </div>
            <Slider
              min={1}
              max={120}
              step={1}
              value={tenure}
              onChange={setTenure}
            />
          </div>

          {/* Interest Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Interest Calculation Type</label>
            <Select value={interestType} onChange={(e: any) => setInterestType(e.target.value)}>
              <option value="reducing_balance">Reducing Balance (Standard)</option>
              <option value="flat">Flat Interest Rate</option>
              <option value="interest_only">Monthly Interest (Interest Only)</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Right Result & Schedule Section */}
      <div className="lg:col-span-2 space-y-6">
        {/* Statistics block */}
        <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1 border-r border-slate-100 dark:border-slate-800/40">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Monthly EMI</p>
                <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{currency} {results.emiAmount?.toLocaleString("en-US")}</p>
              </div>
              <div className="space-y-1 border-r border-slate-100 dark:border-slate-800/40">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Interest</p>
                <p className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{currency} {results.totalInterest?.toLocaleString("en-US")}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Repayable</p>
                <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400">{currency} {results.totalPayable?.toLocaleString("en-US")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amortization Table */}
        <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
          <CardHeader>
            <CardTitle className="text-base font-bold">Amortization Schedule</CardTitle>
            <CardDescription>Detailed payment allocations over the tenure</CardDescription>
          </CardHeader>
          <CardContent className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">EMI #</TableHead>
                  <TableHead>Opening Bal.</TableHead>
                  <TableHead>Principal Component</TableHead>
                  <TableHead>Interest Component</TableHead>
                  <TableHead>Total EMI</TableHead>
                  <TableHead className="text-right">Closing Bal.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.schedule.map((row) => (
                  <TableRow key={row.emiNumber}>
                    <TableCell className="font-bold text-xs">#{row.emiNumber}</TableCell>
                    <TableCell className="text-xs">{currency} {row.outstandingPrincipal?.toLocaleString("en-US")}</TableCell>
                    <TableCell className="text-xs text-green-600 font-medium">{currency} {row.principalComponent?.toLocaleString("en-US")}</TableCell>
                    <TableCell className="text-xs text-amber-600 font-medium">{currency} {row.interestComponent?.toLocaleString("en-US")}</TableCell>
                    <TableCell className="text-xs font-bold">{currency} {row.totalEMI?.toLocaleString("en-US")}</TableCell>
                    <TableCell className="text-right text-xs text-slate-500">{currency} {row.closingBalance?.toLocaleString("en-US")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
