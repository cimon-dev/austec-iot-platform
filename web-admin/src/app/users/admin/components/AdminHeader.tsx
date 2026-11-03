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
      <div>
        <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Cán bộ quản trị
        </h1>
      </div>

      {canCreate && (
        <button
          type="button"
          onClick={onOpenCreate}
          className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white dark:text-slate-900 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm cán bộ mới</span>
        </button>
      )}
    </div>
  );
};
