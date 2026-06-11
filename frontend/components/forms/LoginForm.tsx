"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const callbackUrl = searchParams.get("callbackUrl") || "";
  const errorParam = searchParams.get("error");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: data.email.toLowerCase(),
        password: data.password,
      });

      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      toast.success("Logged in successfully!");
      
      // Determine where to redirect based on the role or callbackUrl
      // Wait, we need to inspect the session. We can fetch the session or just let Next.js do a client redirect.
      // Alternatively, fetch the api session or call window.location.reload() / navigate to base
      // Let's call /api/auth/session to find out the role!
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      
      if (session?.user) {
        const role = session.user.role;
        
        // Validate if callbackUrl is appropriate for the user's role
        let isValidCallback = false;
        if (callbackUrl) {
          const path = decodeURIComponent(callbackUrl);
          if (role === "borrower" && path.startsWith("/borrower")) {
            isValidCallback = true;
          } else if (role === "agent" && path.startsWith("/agent")) {
            isValidCallback = true;
          } else if ((role === "admin" || role === "superadmin") && (path.startsWith("/admin") || path.startsWith("/agent"))) {
            isValidCallback = true;
          }
        }

        if (isValidCallback) {
          router.push(callbackUrl);
        } else if (role === "admin" || role === "superadmin") {
          router.push("/admin/dashboard");
        } else if (role === "agent") {
          router.push("/agent/dashboard");
        } else {
          router.push("/borrower/dashboard");
        }
      } else {
        router.push("/borrower/dashboard");
      }
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-slate-200/80 bg-white/70 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/70">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
        <CardDescription className="text-center">
          Enter your credentials to access your loan account
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorParam && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/20 dark:text-red-400">
            {errorParam === "CredentialsSignin" && "Invalid email or password."}
            {errorParam === "suspended" && "Your account has been suspended."}
            {errorParam === "unauthorized" && "You are not authorized to view that page."}
            {!["CredentialsSignin", "suspended", "unauthorized"].includes(errorParam) && "Authentication failed. Please try again."}
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Password</label>
              <Link
                href="/forgot-password"
                className="text-xs text-blue-600 hover:underline dark:text-blue-400 font-medium"
              >
                Forgot password?
              </Link>
            </div>
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

          <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
            Sign In
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-500 dark:text-slate-400">New to the platform? </span>
          <Link href="/register" className="text-blue-600 hover:underline dark:text-blue-400 font-semibold">
            Create an account
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
