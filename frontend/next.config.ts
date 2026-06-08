import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/auth/session",
        destination: "/api/auth/session",
      },
      {
        source: "/api/auth/signin",
        destination: "/api/auth/signin",
      },
      {
        source: "/api/auth/signout",
        destination: "/api/auth/signout",
      },
      {
        source: "/api/auth/callback/:path*",
        destination: "/api/auth/callback/:path*",
      },
      {
        source: "/api/auth/csrf",
        destination: "/api/auth/csrf",
      },
      {
        source: "/api/auth/providers",
        destination: "/api/auth/providers",
      },
      {
        source: "/api/auth/register",
        destination: "http://127.0.0.1:3001/api/auth/register",
      },
      {
        source: "/api/auth/verify-email",
        destination: "http://127.0.0.1:3001/api/auth/verify-email",
      },
      {
        source: "/api/auth/verify-otp",
        destination: "http://127.0.0.1:3001/api/auth/verify-otp",
      },
      {
        source: "/api/auth/forgot-password",
        destination: "http://127.0.0.1:3001/api/auth/forgot-password",
      },
      {
        source: "/api/auth/reset-password",
        destination: "http://127.0.0.1:3001/api/auth/reset-password",
      },
      {
        source: "/api/auth/send-otp",
        destination: "http://127.0.0.1:3001/api/auth/send-otp",
      },
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
