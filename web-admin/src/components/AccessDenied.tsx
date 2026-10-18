"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, RefreshCw, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../context/PermissionContext";

interface AccessDeniedProps {
  moduleName?: string;
  moduleTitle?: string;
  moduleId?: string;
  requiredModule?: string;
  requiredPermission?: string;
}

export function AccessDenied({ 
  moduleName, 
  moduleTitle, 
  moduleId, 
  requiredModule, 
  requiredPermission 
}: AccessDeniedProps) {
  const title = moduleTitle || moduleName || "Phân hệ này";
  const id = moduleId || requiredModule || requiredPermission || "RESTRICTED";
  const { user, quickSwitchRole } = useAuth();
  const { currentRoleName } = usePermissions();

  return (
    <div className="flex-1 flex items-center justify-center p-6 h-full min-h-[400px]">
      <div className="max-w-md w-full p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div>
          <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/40">
            HTTP 403 FORBIDDEN
          </span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
            Quyền Truy Cập Bị Giới Hạn
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Tài khoản của bạn đang đăng nhập với vai trò <strong className="text-slate-900 dark:text-white font-semibold">{currentRoleName}</strong> ({user?.role}), không được cấp quyền truy cập vào <strong>{title}</strong> theo chính sách bảo mật RBAC của hệ thống.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-left text-xs space-y-1.5">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Tài khoản hiện tại:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{user?.email}</span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Mã định danh module:</span>
            <span className="font-mono text-slate-800 dark:text-slate-200">{id}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về Dashboard</span>
          </Link>

          {user?.role !== "ADMIN" && (
            <button
              type="button"
              onClick={() => quickSwitchRole("ADMIN")}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Chuyển Sang Admin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
