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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
      <div>
        <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          {activeTab === "accounts" ? "Khách hàng ứng dụng" : "Phân quyền Gia đình & Thiết bị"}
        </h1>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 shrink-0">
        <button
          type="button"
          onClick={() => onTabChange("accounts")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "accounts"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Tài Khoản Khách Hàng ({totalCustomers})</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("matrix")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "matrix"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Ma Trận Phân Quyền 3 Khối (RBAC)</span>
        </button>
      </div>
    </div>
  );
};
