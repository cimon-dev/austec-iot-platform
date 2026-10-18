"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { AdminHeader } from "./AdminHeader";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/login" && pathname !== "/register") {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // If on public authentication routes, render standalone full-page view
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  // Loading state while checking authentication session
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-pulse">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="text-xs font-mono text-slate-400">Kiểm tra phiên đăng nhập an toàn...</span>
        </div>
      </div>
    );
  }

  // If unauthenticated on protected routes, do not render shell content while redirecting
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased transition-colors">
      {/* Collapsible Responsive Sidebar */}
      <Sidebar />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Top Header */}
        <AdminHeader />

        {/* Viewport Content Area */}
        <main className="flex-1 overflow-hidden p-2 sm:p-3 md:p-3.5 flex flex-col min-h-0 min-w-0 bg-slate-100/70 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
