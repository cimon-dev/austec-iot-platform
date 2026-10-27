"use client";

import React from "react";
import { Shield } from "lucide-react";

interface RolesHeaderProps {
  rolesCount: number;
}

export const RolesHeader: React.FC<RolesHeaderProps> = ({ rolesCount }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2.5 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
          <Shield className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Vai Trò & Ma Trận Phân Quyền Hệ Thống</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-bold">
              {rolesCount} Vai Trò
            </span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Cấu hình phân quyền chi tiết (RBAC) cho từng nhóm nhân sự và cán bộ vận hành
          </p>
        </div>
      </div>
    </div>
  );
};
