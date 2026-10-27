"use client";

import React from "react";
import { ShoppingBag, Plus } from "lucide-react";

interface StoreHeaderProps {
  onOpenCreateModal: () => void;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({ onOpenCreateModal }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
          <ShoppingBag className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Quản Lý Gian Hàng & Thông Số Kỹ Thuật Xuất Xưởng
            </h1>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              Catalog & Specs Hub
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Quản lý danh mục sản phẩm thương phẩm, hình ảnh, thông số kỹ thuật xuất xưởng đồng bộ thời gian thực với Mobile App
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenCreateModal}
        className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
      >
        <Plus className="w-4 h-4" />
        <span>Thêm Sản Phẩm Mới</span>
      </button>
    </div>
  );
};
