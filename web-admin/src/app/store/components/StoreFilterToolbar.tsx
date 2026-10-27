"use client";

import React from "react";
import { Search } from "lucide-react";

interface StoreFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  totalFiltered: number;
}

export const StoreFilterToolbar: React.FC<StoreFilterToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedStatus,
  onStatusChange,
  totalFiltered,
}) => {
  return (
    <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, thông số, mã..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="text-xs pl-7 pr-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white w-56 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
        >
          <option value="ALL">Mọi danh mục</option>
          <option value="DOOR">Cửa cuốn thông minh</option>
          <option value="LOCK">Khóa Masaru chuẩn Nhật</option>
          <option value="CAMERA">Camera An Ninh AI</option>
          <option value="SENSOR">Cảm biến môi trường</option>
          <option value="UPS">Bộ lưu điện Sin chuẩn</option>
          <option value="ACCESSORY">Phụ kiện IoT</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
        >
          <option value="ALL">Mọi trạng thái</option>
          <option value="ACTIVE">Đang kinh doanh</option>
          <option value="OUT_OF_STOCK">Tạm hết hàng</option>
          <option value="DISCONTINUED">Ngừng sản xuất</option>
        </select>
      </div>

      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
        Hiển thị <strong className="text-cyan-600 dark:text-cyan-400">{totalFiltered}</strong> sản phẩm
      </div>
    </div>
  );
};
