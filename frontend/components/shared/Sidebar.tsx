"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  FilePlus,
  Briefcase,
  FileCheck,
  Users,
  CreditCard,
  DollarSign,
  AlertTriangle,
  FolderOpen,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const role = (session?.user as any)?.role || "borrower";

  // Navigation configurations per role
  const borrowerLinks = [
    { name: "Dashboard", href: "/borrower/dashboard", icon: LayoutDashboard },
    { name: "Apply for Loan", href: "/borrower/apply", icon: FilePlus },
    { name: "My Loans", href: "/borrower/my-loans", icon: Briefcase },
    { name: "My Documents", href: "/borrower/documents", icon: FolderOpen },
  ];

  const agentLinks = [
    { name: "Dashboard", href: "/agent/dashboard", icon: LayoutDashboard },
    { name: "KYC/Collateral Reviews", href: "/agent/applications", icon: FileCheck },
  ];

  const adminLinks = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "All Applications", href: "/admin/all-applications", icon: FileCheck },
    { name: "Disbursements", href: "/admin/disbursement", icon: DollarSign },
    { name: "Repayments", href: "/admin/repayments", icon: CreditCard },
    { name: "Overdue EMIs", href: "/admin/overdue", icon: AlertTriangle },
    { name: "Users Management", href: "/admin/users", icon: Users },
    { name: "Reports & P&L", href: "/admin/reports", icon: BarChart3 },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const links =
    role === "admin" || role === "superadmin"
      ? adminLinks
      : role === "agent"
      ? agentLinks
      : borrowerLinks;

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200/80 bg-slate-50 transition-transform md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:translate-x-0 dark:border-slate-800 dark:bg-slate-950",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header (visible on mobile only since desktop has Navbar above it) */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200/80 px-6 md:hidden dark:border-slate-800">
          <span className="font-bold text-slate-800 dark:text-white">LendEasy Navigation</span>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-5 w-5 text-slate-500" />
            </button>
          )}
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/10 dark:bg-blue-600"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-50"
                )}
              >
                <link.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400 dark:text-slate-500")} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer profile info (Optional sidebar footer) */}
        <div className="border-t border-slate-200/80 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3 rounded-xl bg-slate-100/60 p-3 dark:bg-slate-900/40">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold dark:bg-blue-900/50 dark:text-blue-300">
              {role.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">
                {role} Panel
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Secure Session
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
