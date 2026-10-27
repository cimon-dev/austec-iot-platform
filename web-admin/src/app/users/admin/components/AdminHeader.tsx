"use client";

import React from "react";
import { Users, Plus } from "lucide-react";

interface AdminHeaderProps {
  canCreate: boolean;
  onOpenCreate: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ canCreate, onOpenCreate }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2.5 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
          <Users className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Quản Lý Cán Bộ Quản Trị
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Danh sách nhân sự vận hành hệ thống IoT Austec Platform
          </p>
        </div>
      </div>

      {canCreate && (
        <button
          type="button"
          onClick={onOpenCreate}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm cán bộ mới</span>
        </button>
      )}
    </div>
  );
};
