"use client";

import React from "react";
import { Users, ShieldCheck } from "lucide-react";

interface CustomerHeaderProps {
  activeTab: string;
  totalCustomers: number;
  onTabChange: (tab: "accounts" | "matrix") => void;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  activeTab,
  totalCustomers,
  onTabChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Khách Hàng Ứng Dụng & Ma Trận Phân Quyền Gia Đình
            </h1>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              RBAC Multi-Level
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Quản lý tài khoản người dùng Mobile App, danh sách thiết bị và ủy quyền thành viên thứ cấp (Gia đình / Khách)
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 shrink-0">
        <button
          type="button"
          onClick={() => onTabChange("accounts")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeTab === "accounts"
              ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Tài Khoản Khách Hàng ({totalCustomers})</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("matrix")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeTab === "matrix"
              ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Ma Trận Phân Quyền 3 Khối (RBAC)</span>
        </button>
      </div>
    </div>
  );
};
