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
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      }
    }
  }, [isLoading, isAuthenticated, pathname]);

  // Safety timer fallback: If still unauthenticated on non-auth page after 1.2s, force redirect
  useEffect(() => {
    if (pathname === "/login" || pathname === "/register") return;
    const timer = setTimeout(() => {
      if (!isAuthenticated && typeof window !== "undefined") {
        window.location.replace("/login");
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [isAuthenticated, pathname]);

  // If on public authentication routes, render standalone full-page view
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  // Loading state while checking authentication session
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-pulse shadow-lg shadow-cyan-500/10">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Đang kiểm tra phiên đăng nhập an toàn...</p>
            <p className="text-xs text-slate-500 font-mono mt-1">Austec IoT Platform 2.0</p>
          </div>
          <a
            href="/login"
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md shadow-cyan-900/30"
          >
            Vào thẳng trang Đăng Nhập &rarr;
          </a>
        </div>
      </div>
    );
  }

  // If unauthenticated on protected routes, show redirecting state with direct link
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <p className="text-sm text-slate-300">Đang chuyển hướng tới trang đăng nhập...</p>
          <a
            href="/login"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 text-white"
          >
            Bấm vào đây nếu không tự chuyển
          </a>
        </div>
      </div>
    );
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
