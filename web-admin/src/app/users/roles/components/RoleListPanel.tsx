"use client";

import React from "react";
import { Search, Plus, Trash2, Users, Shield } from "lucide-react";
import { RoleItem } from "../types";

interface RoleListPanelProps {
  roles: RoleItem[];
  selectedRoleId: number;
  onSelectRole: (id: number) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  canCreate: boolean;
  canDelete: boolean;
  onOpenCreate: () => void;
  onDeleteRole: (role: RoleItem) => void;
}

export const RoleListPanel: React.FC<RoleListPanelProps> = ({
  roles,
  selectedRoleId,
  onSelectRole,
  searchQuery,
  onSearchChange,
  canCreate,
  canDelete,
  onOpenCreate,
  onDeleteRole,
}) => {
  const filtered = roles.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Danh Sách Vai Trò
          </span>
          {canCreate && (
            <button
              type="button"
              onClick={onOpenCreate}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm vai trò</span>
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm vai trò..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full text-xs pl-7 pr-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {filtered.map((role) => {
          const isSelected = selectedRoleId === role.id;
          return (
            <div
              key={role.id}
              onClick={() => onSelectRole(role.id)}
              className={`p-2.5 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                isSelected
                  ? "bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-600"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                  <Shield
                    className={`w-3.5 h-3.5 ${
                      isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"
                    }`}
                  />
                  <span className="truncate">{role.name}</span>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span>{role.userCount} nhân sự</span>
                  {role.isSystem && (
                    <span className="text-[9px] font-mono px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Mặc định
                    </span>
                  )}
                </div>
              </div>

              {!role.isSystem && canDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteRole(role);
                  }}
                  className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shrink-0"
                  title="Xóa vai trò này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
