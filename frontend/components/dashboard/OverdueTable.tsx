"use client";

import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Activity, AlertOctagon, ShieldAlert, Send } from "lucide-react";

interface OverdueEMI {
  _id: string;
  emiNumber: number;
  dueDate: string;
  totalEMI: number;
  penaltyAmount: number;
  penaltyReason?: string;
  borrower: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  loan: {
    _id: string;
    loanNumber: string;
    emiAmount: number;
  };
}

export default function OverdueTable() {
  const [emis, setEmis] = useState<OverdueEMI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchOverdue = async () => {
    try {
      const res = await fetch("/api/admin/overdue");
      const data = await res.json();
      if (data.success) {
        setEmis(data.overdueEmis);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load overdue EMIs");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdue();
  }, []);

  const handleWaivePenalty = async (emiId: string) => {
    const reason = window.prompt("Enter reason for waiving this penalty:");
    if (reason === null) return; // cancelled

    setActionLoadingId(emiId);
    try {
      const res = await fetch(`/api/admin/waive-penalty/${emiId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Penalty waived successfully!");
        fetchOverdue(); // Refresh
      } else {
        toast.error(data.error || "Failed to waive penalty");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error waiving penalty");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSendReminder = async (emi: OverdueEMI) => {
    setActionLoadingId(emi._id + "-remind");
    try {
      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: emi.borrower._id,
          eventName: "emi_overdue",
          details: {
            dueDate: new Date(emi.dueDate).toLocaleDateString("en-PK"),
            amount: emi.totalEMI,
            penalty: emi.penaltyAmount,
            penaltyRate: 2,
          },
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Overdue SMS/Email alert dispatched!");
      } else {
        toast.error(data.error || "Failed to dispatch alert");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error dispatching alert");
    } finally {
      setActionLoadingId(null);
    }
  };

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  return (
    <Card className="w-full border-red-100 bg-red-50/5 dark:border-red-950/20 dark:bg-slate-950">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertOctagon className="h-5 w-5" /> Overdue EMIs Alerts
          </CardTitle>
          <p className="text-xs text-slate-400">List of loans with outstanding payments past due date</p>
        </div>
        <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs animate-pulse">
          {emis.length} Accounts
        </Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-36 items-center justify-center">
            <Activity className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : emis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-2xl dark:border-slate-800">
            <ShieldAlert className="h-8 w-8 text-green-500 mb-2" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No overdue accounts!</p>
            <p className="text-[10px] text-slate-400">All collections are currently up-to-date.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Borrower</TableHead>
                <TableHead>Loan No.</TableHead>
                <TableHead>EMI #</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>EMI Amount</TableHead>
                <TableHead>Penalty Accrued</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emis.map((emi) => {
                const isWaiving = actionLoadingId === emi._id;
                const isReminding = actionLoadingId === emi._id + "-remind";
                return (
                  <TableRow key={emi._id} className="hover:bg-red-50/20 dark:hover:bg-red-950/5">
                    <TableCell>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {emi.borrower?.fullName}
                        </p>
                        <p className="text-[10px] text-slate-400">{emi.borrower?.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-xs text-slate-500">{emi.loan?.loanNumber}</TableCell>
                    <TableCell className="font-medium text-xs">EMI #{emi.emiNumber}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(emi.dueDate).toLocaleDateString("en-PK", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-bold text-xs">
                      {currency} {emi.totalEMI?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {emi.penaltyAmount > 0 ? (
                        <span className="text-xs font-bold text-red-600 dark:text-red-400">
                          {currency} {emi.penaltyAmount?.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {emi.penaltyAmount > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-[10px] border-amber-200 hover:bg-amber-50 text-amber-600 dark:border-amber-900/40 dark:hover:bg-amber-950/20"
                          onClick={() => handleWaivePenalty(emi._id)}
                          isLoading={isWaiving}
                        >
                          Waive Penalty
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="h-8 text-[10px] bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 inline-flex"
                        onClick={() => handleSendReminder(emi)}
                        isLoading={isReminding}
                      >
                        <Send className="h-3 w-3" /> Remind
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
