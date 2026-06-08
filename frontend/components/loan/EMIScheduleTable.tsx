"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import LoanStatusBadge from "./LoanStatusBadge";
import { CreditCard, Calendar, CheckCircle } from "lucide-react";
import Script from "next/script";

interface EMIRow {
  _id: string;
  emiNumber: number;
  dueDate: string;
  principalComponent: number;
  interestComponent: number;
  totalEMI: number;
  status: string;
  paidAmount: number;
  paidAt?: string;
  penaltyAmount: number;
}

interface EMIScheduleTableProps {
  schedule: EMIRow[];
  loanId: string;
  borrowerName: string;
  borrowerEmail: string;
  borrowerPhone: string;
  onPaymentSuccess?: () => void;
}

export default function EMIScheduleTable({
  schedule,
  loanId,
  borrowerName,
  borrowerEmail,
  borrowerPhone,
  onPaymentSuccess,
}: EMIScheduleTableProps) {
  const [payingEmiId, setPayingEmiId] = useState<string | null>(null);

  const handlePayEMI = async (emi: EMIRow) => {
    setPayingEmiId(emi._id);
    try {
      // 1. Create order on server
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emiScheduleId: emi._id }),
      });
      const orderData = await res.json();

      if (orderData.error) {
        toast.error(orderData.error);
        setPayingEmiId(null);
        return;
      }

      const { orderId, amount, currency } = orderData;

      // 2. Launch Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_mockKeyId123", // fallback
        amount: amount,
        currency: currency,
        name: process.env.NEXT_PUBLIC_APP_NAME || "LendEasy",
        description: `Repayment for EMI #${emi.emiNumber}`,
        order_id: orderId,
        handler: async function (response: any) {
          // Verify payment on server
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json();

          if (verifyData.success) {
            toast.success("Payment successful!");
            if (onPaymentSuccess) onPaymentSuccess();
          } else {
            toast.error(verifyData.error || "Payment verification failed");
          }
          setPayingEmiId(null);
        },
        prefill: {
          name: borrowerName,
          email: borrowerEmail,
          contact: borrowerPhone,
        },
        theme: {
          color: "#1e40af", // LendEasy primary blue
        },
        modal: {
          ondismiss: function () {
            setPayingEmiId(null);
            toast.error("Payment checkout cancelled.");
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error("Failed to initialize payment checkout.");
      setPayingEmiId(null);
    }
  };

  const currency = process.env.NEXT_PUBLIC_CURRENCY || "PKR";

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>EMI #</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Principal Part</TableHead>
            <TableHead>Interest Part</TableHead>
            <TableHead>Penalty</TableHead>
            <TableHead>Total EMI</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {schedule.map((row) => {
            const isPaying = payingEmiId === row._id;
            const totalDue = row.totalEMI + row.penaltyAmount;
            return (
              <TableRow key={row._id}>
                <TableCell className="font-bold text-xs">#{row.emiNumber}</TableCell>
                <TableCell className="text-xs text-slate-500">
                  {new Date(row.dueDate).toLocaleDateString("en-PK", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell className="text-xs">{currency} {row.principalComponent?.toLocaleString()}</TableCell>
                <TableCell className="text-xs">{currency} {row.interestComponent?.toLocaleString()}</TableCell>
                <TableCell className="text-xs">
                  {row.penaltyAmount > 0 ? (
                    <span className="font-bold text-red-500">{currency} {row.penaltyAmount?.toLocaleString()}</span>
                  ) : (
                    <span className="text-slate-400">None</span>
                  )}
                </TableCell>
                <TableCell className="text-xs font-bold">{currency} {totalDue?.toLocaleString()}</TableCell>
                <TableCell>
                  <LoanStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-right">
                  {row.status === "paid" ? (
                    <span className="text-xs text-green-600 font-bold flex items-center justify-end gap-1">
                      <CheckCircle className="h-4 w-4" /> Paid
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      className="h-8 text-[11px] bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 ml-auto"
                      onClick={() => handlePayEMI(row)}
                      isLoading={isPaying}
                    >
                      <CreditCard className="h-3.5 w-3.5" /> Pay Now
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </>
  );
}
