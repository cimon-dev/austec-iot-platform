"use client";

import React from "react";
import { Shield } from "lucide-react";

interface RolesHeaderProps {
  rolesCount: number;
}

export const RolesHeader: React.FC<RolesHeaderProps> = ({ rolesCount }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2.5 shrink-0">
      <div>
        <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>Vai trò & Phân quyền</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold">
            {rolesCount} vai trò
          </span>
        </h1>
      </div>
    </div>
  );
};
