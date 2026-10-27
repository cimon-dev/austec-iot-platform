"use client";

import React from "react";
import { Search, RefreshCw } from "lucide-react";

interface BlackboxFilterBarProps {
  language: string;
  searchHardwareId: string;
  onSearchChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  onReset: () => void;
}

export const BlackboxFilterBar: React.FC<BlackboxFilterBarProps> = ({
  language,
  searchHardwareId,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedRole,
  onRoleChange,
  onReset,
}) => {
  return (
    <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
      <div className="relative flex-1 min-w-0">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={
            language === "vi"
              ? "Tìm theo Hardware ID, Email hoặc IP..."
              : "Search by Hardware ID, Email or IP..."
          }
          value={searchHardwareId}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0">
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 shrink-0"
        >
          <option value="ALL">{language === "vi" ? "Mọi trạng thái" : "All Status"}</option>
          <option value="ACKNOWLEDGED">{language === "vi" ? "Đã xác nhận (ACK)" : "Acknowledged"}</option>
          <option value="TIMEOUT">{language === "vi" ? "Hết hạn (TIMEOUT)" : "Timeout"}</option>
          <option value="REJECTED">{language === "vi" ? "Bị từ chối" : "Rejected"}</option>
        </select>

        <select
          value={selectedRole}
          onChange={(e) => onRoleChange(e.target.value)}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 shrink-0"
        >
          <option value="ALL">{language === "vi" ? "Mọi người gửi" : "All Actors"}</option>
          <option value="CUSTOMER">{language === "vi" ? "Khách hàng" : "Customer"}</option>
          <option value="CSKH">{language === "vi" ? "CSKH" : "CSKH"}</option>
          <option value="ADMIN">{language === "vi" ? "Admin" : "Admin"}</option>
        </select>

        <button
          type="button"
          onClick={onReset}
          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
          title="Làm mới bộ lọc"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
