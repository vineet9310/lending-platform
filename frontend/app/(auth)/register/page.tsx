"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Shield, Sparkles, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

const registerSchema = z.object({
  fullName: z.string().min(3, { message: "Full name must be at least 3 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().min(10, { message: "Please enter a valid phone number" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
  role: z.enum(["borrower", "agent", "admin"]),
  cnic: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    country: z.string().optional(),
  }),
});

type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      role: "borrower",
      cnic: "",
      address: {
        street: "",
        city: "",
        province: "",
        country: "Pakistan",
      },
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resJson = await res.json();

      if (res.ok) {
        toast.success("Registration successful! Check your email for OTP.");
        router.push(`/verify-otp?email=${encodeURIComponent(data.email)}`);
      } else {
        toast.error(resJson.error || "Failed to register account");
      }
    } catch (err) {
      console.error(err);
      toast.error("Registration error. Please check your network.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background elements */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-950 to-slate-950"></div>
      <div className="absolute top-1/4 left-1/4 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-[80px]"></div>

      <div className="relative z-10 w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
            <Shield className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white flex items-center gap-1.5">
            Create Account <Sparkles className="h-4 w-4 text-blue-400" />
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Register to apply for instant low-interest collateral loans
          </p>
        </div>

        <Card className="border-slate-200/80 bg-white/70 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Full Name</label>
                  <Input
                    type="text"
                    placeholder="e.g. John Doe"
                    error={!!errors.fullName}
                    {...register("fullName")}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-500">{errors.fullName.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Email Address</label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    error={!!errors.email}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-red-500">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Phone Number</label>
                  <Input
                    type="text"
                    placeholder="e.g. +923001234567"
                    error={!!errors.phone}
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-xs text-red-500">{errors.phone.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      error={!!errors.password}
                      className="pr-10"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-500">{errors.password.message}</p>
                  )}
                </div>

                {/* CNIC (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Identity Number (CNIC)</label>
                  <Input
                    type="text"
                    placeholder="e.g. 4210112345671"
                    error={!!errors.cnic}
                    {...register("cnic")}
                  />
                </div>

                {/* Onboarding Role (For testing / ease of use) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Register As (Role)</label>
                  <Select {...register("role")}>
                    <option value="borrower">Borrower</option>
                    <option value="agent">Verification Agent</option>
                    <option value="admin">System Administrator</option>
                  </Select>
                </div>
              </div>

              {/* Address Fields */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Residential Address</span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-500">Street</label>
                    <Input type="text" placeholder="e.g. Street 4, Sector F" {...register("address.street")} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500">City</label>
                      <Input type="text" placeholder="Karachi" {...register("address.city")} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500">Province</label>
                      <Input type="text" placeholder="Sindh" {...register("address.province")} />
                    </div>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full mt-4" isLoading={isLoading}>
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-slate-500 dark:text-slate-400">Already have an account? </span>
              <Link href="/login" className="text-blue-600 hover:underline dark:text-blue-400 font-semibold">
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
