"use client";

import React from "react";
import { ShieldAlert, RefreshCw, Download } from "lucide-react";

interface BlackboxHeaderProps {
  language: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onExport: () => void;
}

export const BlackboxHeader: React.FC<BlackboxHeaderProps> = ({
  language,
  isRefreshing,
  onRefresh,
  onExport,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2.5 shrink-0">
      <div>
        <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>{language === "vi" ? "Hộp đen kiểm toán" : "Blackbox Audit"}</span>
        </h1>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-800 transition-all shadow-xs cursor-pointer shrink-0"
          title="Làm mới danh sách từ cơ sở dữ liệu PostgreSQL"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-500" : "text-slate-400"}`} />
          <span>{isRefreshing ? "Đang tải..." : "Làm mới"}</span>
        </button>

        <button
          type="button"
          onClick={onExport}
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold border border-slate-800 dark:border-slate-700 transition-all shadow-xs cursor-pointer shrink-0"
          title="Tải file Excel báo cáo pháp lý đầy đủ 100% kèm chuỗi Merkle Root"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>{language === "vi" ? "Xuất báo cáo pháp lý (.xlsx)" : "Export Legal Audit (.xlsx)"}</span>
        </button>
      </div>
    </div>
  );
};
