"use client";

import React from "react";
import { ShoppingBag, Plus } from "lucide-react";

interface StoreHeaderProps {
  onOpenCreateModal: () => void;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({ onOpenCreateModal }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2.5 shrink-0">
      <div>
        <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Gian hàng & Thương phẩm
        </h1>
      </div>

      <button
        type="button"
        onClick={onOpenCreateModal}
        className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Thêm sản phẩm mới</span>
      </button>
    </div>
  );
};
