"use client";

import React, { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Activity } from "lucide-react";

interface ChartRow {
  month: string;
  disbursements: number;
  collections: number;
}

export default function EMIChart() {
  const [data, setData] = useState<ChartRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchChartData = async () => {
      try {
        const res = await fetch("/api/admin/reports/monthly");
        const json = await res.json();
        if (json.success) {
          setData(json.report);
        }
      } catch (err) {
        console.error("Failed to load monthly chart data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChartData();
  }, []);

  if (!mounted) return null;

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base font-bold">Inflows vs Outflows</CardTitle>
        <CardDescription>Monthly disbursements vs collections (Last 12 months)</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Activity className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center border border-dashed rounded-xl">
            <span className="text-xs text-slate-400">No transaction data available yet</span>
          </div>
        ) : (
          <div className="w-full h-full min-w-0 min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart
                data={data}
                margin={{
                  top: 5,
                  right: 5,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: "11px", fill: "#94a3b8" }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  style={{ fontSize: "11px", fill: "#94a3b8" }}
                  tickFormatter={(value) => `${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", backgroundColor: "#ffffff" }}
                  formatter={(value: any) => [`${currency} ${Number(value).toLocaleString()}`]}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Line
                  name="Disbursements (Outflow)"
                  type="monotone"
                  dataKey="disbursements"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  name="Collections (Inflow)"
                  type="monotone"
                  dataKey="collections"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
