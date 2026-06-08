import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    type: "up" | "down" | "neutral";
  };
  className?: string;
}

export default function StatsCard({ title, value, description, icon, trend, className }: StatsCardProps) {
  return (
    <Card className={cn("overflow-hidden group hover:scale-[1.01] transition-transform duration-200", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {title}
            </p>
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {value}
            </h3>
          </div>
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600 transition-colors group-hover:bg-blue-100/80 dark:bg-slate-900 dark:text-blue-400 dark:group-hover:bg-slate-800">
            {icon}
          </div>
        </div>

        {(description || trend) && (
          <div className="mt-4 flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold",
                  trend.type === "up" && "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400",
                  trend.type === "down" && "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400",
                  trend.type === "neutral" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                )}
              >
                {trend.value}
              </span>
            )}
            {description && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
