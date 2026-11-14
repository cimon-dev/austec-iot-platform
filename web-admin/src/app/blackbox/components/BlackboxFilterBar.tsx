"use client";

import React from "react";
import { Search, RefreshCw, Calendar, Filter } from "lucide-react";

interface BlackboxFilterBarProps {
  language: string;
  searchHardwareId: string;
  onSearchChange: (value: string) => void;
  fromDate: string;
  onFromDateChange: (value: string) => void;
  toDate: string;
  onToDateChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  selectedCommandType: string;
  onCommandTypeChange: (cmd: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedRole: string;
  onRoleChange: (role: string) => void;
  onReset: () => void;
}

export const BlackboxFilterBar: React.FC<BlackboxFilterBarProps> = ({
  language,
  searchHardwareId,
  onSearchChange,
  fromDate,
  onFromDateChange,
  toDate,
  onToDateChange,
  selectedCategory,
  onCategoryChange,
  selectedCommandType,
  onCommandTypeChange,
  selectedStatus,
  onStatusChange,
  selectedRole,
  onRoleChange,
  onReset,
}) => {
  const isVi = language === "vi";

  const setQuickRange = (days: number | null) => {
    if (days === null) {
      onFromDateChange("");
      onToDateChange("");
      return;
    }
    const end = new Date();
    const start = new Date();
    if (days === 0) {
      // Hôm nay
      const todayStr = start.toISOString().split("T")[0];
      onFromDateChange(todayStr);
      onToDateChange(todayStr);
      return;
    }
    start.setDate(start.getDate() - days);
    onFromDateChange(start.toISOString().split("T")[0]);
    onToDateChange(end.toISOString().split("T")[0]);
  };

  return (
    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-2 shrink-0">
      {/* Hàng 1: Tìm kiếm & Các dropdown phân loại */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              isVi
                ? "Tìm theo Hardware ID, Tên người dùng, Email hoặc IP..."
                : "Search by Hardware ID, Name, Email or IP..."
            }
            value={searchHardwareId}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Nhóm Thiết Bị */}
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 shrink-0 font-medium"
          >
            <option value="ALL">{isVi ? "Mọi nhóm thiết bị" : "All Categories"}</option>
            <option value="ROLLER_DOOR">{isVi ? "🚪 Cửa cuốn Austec" : "Roller Door"}</option>
            <option value="SOCKET">{isVi ? "🔌 Ổ cắm thông minh" : "Smart Socket"}</option>
            <option value="CAMERA">{isVi ? "📹 Camera an ninh AI" : "AI Camera"}</option>
          </select>

          {/* Loại Lệnh */}
          <select
            value={selectedCommandType}
            onChange={(e) => onCommandTypeChange(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 shrink-0 font-medium"
          >
            <option value="ALL">{isVi ? "Mọi loại mã lệnh" : "All Commands"}</option>
            <option value="OPEN">{isVi ? "Mở cửa (Mã 1)" : "Open (Code 1)"}</option>
            <option value="CLOSE">{isVi ? "Đóng cửa (Mã 2)" : "Close (Code 2)"}</option>
            <option value="STOP">{isVi ? "Dừng lại (Mã 3)" : "Stop (Code 3)"}</option>
            <option value="TURN_ON">{isVi ? "Bật nguồn (Mã 13)" : "Turn On (Code 13)"}</option>
            <option value="TURN_OFF">{isVi ? "Ngắt nguồn (Mã 14)" : "Turn Off (Code 14)"}</option>
            <option value="CHILD_LOCK">{isVi ? "Khóa an toàn trẻ em" : "Child Lock"}</option>
            <option value="RF_SETUP">{isVi ? "Học Remote RF (Mã 11)" : "RF Setup (Code 11)"}</option>
            <option value="RF_CLEAR">{isVi ? "Xóa Remote RF (Mã 12)" : "RF Clear (Code 12)"}</option>
            <option value="STREAM_START">{isVi ? "Xem Camera (Mã 13)" : "Stream Live (Code 13)"}</option>
          </select>

          {/* Trạng Thái */}
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 shrink-0"
          >
            <option value="ALL">{isVi ? "Mọi trạng thái" : "All Status"}</option>
            <option value="ACKNOWLEDGED">{isVi ? "Đã xác nhận (ACK_OK)" : "Acknowledged"}</option>
            <option value="TIMEOUT">{isVi ? "Hết hạn (TIMEOUT)" : "Timeout"}</option>
            <option value="REJECTED">{isVi ? "Bị từ chối" : "Rejected"}</option>
          </select>

          {/* Người Gửi */}
          <select
            value={selectedRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 shrink-0"
          >
            <option value="ALL">{isVi ? "Mọi vai trò" : "All Roles"}</option>
            <option value="CUSTOMER">{isVi ? "Chủ nhà / Khách hàng" : "Customer"}</option>
            <option value="CSKH">{isVi ? "Hỗ trợ CSKH" : "CSKH"}</option>
            <option value="ADMIN">{isVi ? "Quản trị viên (Admin)" : "Admin"}</option>
          </select>

          <button
            type="button"
            onClick={onReset}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
            title={isVi ? "Làm mới toàn bộ bộ lọc" : "Reset all filters"}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hàng 2: Bộ lọc theo Khoảng Ngày / Giờ & Phím tắt tiện lợi */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
            <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{isVi ? "Khoảng ngày:" : "Date range:"}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => onFromDateChange(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              title={isVi ? "Từ ngày" : "From Date"}
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => onToDateChange(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
              title={isVi ? "Đến ngày" : "To Date"}
            />
          </div>

          {/* Phím tắt chọn nhanh ngày */}
          <div className="flex items-center gap-1 pl-1">
            <button
              type="button"
              onClick={() => setQuickRange(0)}
              className="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              {isVi ? "Hôm nay" : "Today"}
            </button>
            <button
              type="button"
              onClick={() => setQuickRange(7)}
              className="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              {isVi ? "7 ngày qua" : "Last 7 days"}
            </button>
            <button
              type="button"
              onClick={() => setQuickRange(30)}
              className="px-2 py-0.5 rounded text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              {isVi ? "30 ngày" : "30 days"}
            </button>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={() => setQuickRange(null)}
                className="px-2 py-0.5 rounded text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                {isVi ? "Xóa ngày" : "Clear date"}
              </button>
            )}
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-mono hidden lg:block">
          ISO/IEC 27001 Cryptographic Blackbox
        </div>
      </div>
    </div>
  );
};
