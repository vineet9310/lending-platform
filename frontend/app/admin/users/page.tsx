"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { ArrowLeft, Users, Activity, ShieldAlert, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

interface UserItem {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const roleParam = roleFilter === "all" ? "" : `&role=${roleFilter}`;
      const res = await fetch(`/api/admin/users?page=${page}&limit=10${roleParam}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.users);
        setTotalPages(json.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load user list");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, page]);

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "suspended" : "active";
    const confirm = window.confirm(`Are you sure you want to change this user status to ${nextStatus}?`);
    if (!confirm) return;

    setActionLoadingId(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status: nextStatus }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`User status updated to ${nextStatus}!`);
        fetchUsers(); // Refresh list
      } else {
        toast.error(data.error || "Failed to change status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error modifying status");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" /> Platform User Directory
          </h1>
          <p className="text-xs text-slate-400">Suspend/activate borrowers, check agent verifications, and audit administrative roles</p>
        </div>
        <Link href="/admin/dashboard">
          <Button variant="outline" size="sm" className="h-9 text-xs flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
      </div>

      {/* Filter */}
      <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-2 flex-1 w-full">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role Type:</span>
            <Select
              className="max-w-[240px]"
              value={roleFilter}
              onChange={(e: any) => {
                setRoleFilter(e.target.value);
                setPage(1); // reset to first page
              }}
            >
              <option value="all">All Registered Users</option>
              <option value="borrower">Borrowers Only</option>
              <option value="agent">Verification Agents Only</option>
              <option value="admin">System Administrators Only</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex h-36 items-center justify-center">
              <Activity className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-2xl dark:border-slate-800">
              <span className="text-xs text-slate-400">No users found</span>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Details</TableHead>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>System Role</TableHead>
                    <TableHead>Email Verified</TableHead>
                    <TableHead>Phone Verified</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Account Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isModifying = actionLoadingId === user._id;
                    return (
                      <TableRow key={user._id}>
                        <TableCell>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.fullName}</p>
                            <p className="text-[10px] text-slate-400">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500 font-semibold">{user.phone}</TableCell>
                        <TableCell className="text-xs capitalize font-medium">{user.role}</TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            user.isEmailVerified ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          }`}>
                            {user.isEmailVerified ? "Verified" : "Unverified"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            user.isPhoneVerified ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          }`}>
                            {user.isPhoneVerified ? "Verified" : "Unverified"}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(user.createdAt).toLocaleDateString("en-PK")}
                        </TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            user.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {user.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={user.status === "active" ? "destructive" : "default"}
                            size="sm"
                            className="h-8 text-[11px] font-bold px-4"
                            onClick={() => handleToggleStatus(user._id, user.status)}
                            isLoading={isModifying}
                          >
                            {user.status === "active" ? "Suspend" : "Activate"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-slate-500 font-medium">Page {page} of {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
