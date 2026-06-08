"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          className: "dark:bg-slate-900 dark:text-slate-100 border dark:border-slate-800 text-sm",
          duration: 4000,
          style: {
            borderRadius: "12px",
          },
        }}
      />
    </SessionProvider>
  );
}
