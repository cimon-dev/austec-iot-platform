"use client";

import React from "react";
import { RotateCcw, Save, Loader2 } from "lucide-react";

interface SettingsHeaderProps {
  canUpdate: boolean;
  isSaving: boolean;
  onReset: () => void;
  onSave: () => void;
}

export function SettingsHeader({
  canUpdate,
  isSaving,
  onReset,
  onSave,
}: SettingsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2.5 shrink-0">
      <div>
        <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Cài đặt hệ thống
        </h1>
      </div>

      {canUpdate && (
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            disabled={isSaving}
            onClick={onReset}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục mặc định</span>
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={onSave}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Lưu thiết lập</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
