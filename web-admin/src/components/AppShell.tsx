"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { AdminHeader } from "./AdminHeader";
import { useAuth } from "../context/AuthContext";
import { CustomerShell } from "../customer/components/CustomerShell";
import { ShieldCheck } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminAuthRoute = pathname === "/admin/login" || pathname === "/admin/register";

  useEffect(() => {
    if (!isAdminRoute) return;
    if (!isLoading && !isAuthenticated && !isAdminAuthRoute) {
      if (typeof window !== "undefined") {
        window.location.replace("/admin/login");
      }
    }
  }, [isAdminRoute, isAdminAuthRoute, isLoading, isAuthenticated, pathname]);

  // Customer Web routes (root / and all non-/admin routes)
  if (!isAdminRoute) {
    return <CustomerShell>{children}</CustomerShell>;
  }

  // Public Admin authentication routes (/admin/login, /admin/register)
  if (isAdminAuthRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-pulse shadow-lg shadow-cyan-500/10">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">
              Đang kiểm tra phiên đăng nhập Quản trị...
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1">Austec IoT CMS 2.0</p>
          </div>
          <a
            href="/admin/login"
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all"
          >
            Vào thẳng trang Đăng Nhập Quản Trị &rarr;
          </a>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <p className="text-sm text-slate-300">Đang chuyển hướng tới trang đăng nhập Quản trị...</p>
          <a
            href="/admin/login"
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
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
        <AdminHeader />
        <main className="flex-1 overflow-hidden p-2 sm:p-3 md:p-3.5 flex flex-col min-h-0 min-w-0 bg-slate-100/70 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
