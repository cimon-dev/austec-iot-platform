"use client";

import React from "react";
import { Plus, X } from "lucide-react";

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  newRoleName: string;
  onRoleNameChange: (name: string) => void;
}

export const CreateRoleModal: React.FC<CreateRoleModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  newRoleName,
  onRoleNameChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-4 shadow-2xl space-y-3 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Thêm Vai Trò Quản Trị Mới</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tên Vai Trò Mới *
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Kỹ thuật viên bảo hành, Giám sát kho..."
              value={newRoleName}
              onChange={(e) => onRoleNameChange(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xs transition-all cursor-pointer"
            >
              Tạo Vai Trò
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
