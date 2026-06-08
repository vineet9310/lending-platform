import React from "react";
import { Badge } from "@/components/ui/Badge";

interface LoanStatusBadgeProps {
  status: string;
}

export default function LoanStatusBadge({ status }: LoanStatusBadgeProps) {
  const getBadgeDetails = (statusName: string) => {
    switch (statusName) {
      case "draft":
        return { text: "Draft", variant: "outline" as const };
      case "submitted":
        return { text: "Submitted", variant: "info" as const };
      case "kyc_pending":
        return { text: "KYC Pending", variant: "warning" as const };
      case "kyc_verified":
        return { text: "KYC Verified", variant: "success" as const };
      case "collateral_pending":
        return { text: "Collateral Pending", variant: "warning" as const };
      case "collateral_verified":
        return { text: "Collateral Verified", variant: "success" as const };
      case "under_review":
        return { text: "Under Review", variant: "info" as const };
      case "approved":
        return { text: "Approved Offer", variant: "success" as const };
      case "rejected":
        return { text: "Rejected", variant: "destructive" as const };
      case "disbursed":
        return { text: "Disbursed / Active", variant: "success" as const };
      case "cancelled":
        return { text: "Cancelled", variant: "secondary" as const };
      
      // Loan Account specific statuses
      case "active":
        return { text: "Active", variant: "success" as const };
      case "closed":
        return { text: "Closed / Fully Paid", variant: "info" as const };
      case "defaulted":
        return { text: "Defaulted", variant: "destructive" as const };
      case "restructured":
        return { text: "Restructured", variant: "warning" as const };

      // EMI specific statuses
      case "upcoming":
        return { text: "Upcoming", variant: "secondary" as const };
      case "due":
        return { text: "Due Today", variant: "info" as const };
      case "paid":
        return { text: "Paid", variant: "success" as const };
      case "overdue":
        return { text: "Overdue", variant: "destructive" as const };
      case "partial":
        return { text: "Partial Paid", variant: "warning" as const };
      case "waived":
        return { text: "Waived", variant: "outline" as const };

      default:
        return { text: statusName, variant: "default" as const };
    }
  };

  const details = getBadgeDetails(status);

  return (
    <Badge variant={details.variant} className="capitalize font-bold text-[10px] tracking-wide px-2 py-0.5 rounded-full">
      {details.text}
    </Badge>
  );
}
