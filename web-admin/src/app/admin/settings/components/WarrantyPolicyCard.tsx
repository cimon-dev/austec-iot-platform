"use client";

import React from "react";

interface WarrantyPolicyCardProps {
  expiryNotificationDays: number;
  trialExpiryPeriod: number;
  notificationFrequency: string;
  onChangeExpiryDays: (val: number) => void;
  onChangeTrialDays: (val: number) => void;
  onChangeFrequency: (val: string) => void;
}

export function WarrantyPolicyCard({
  expiryNotificationDays,
  trialExpiryPeriod,
  notificationFrequency,
  onChangeExpiryDays,
  onChangeTrialDays,
  onChangeFrequency,
}: WarrantyPolicyCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
        <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Chính sách bảo hành & cảnh báo
        </h2>
      </div>

      <div className="p-4 space-y-3.5 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Thời hạn cảnh báo (ngày)
          </label>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={expiryNotificationDays}
              onChange={(e) => onChangeExpiryDays(Number(e.target.value))}
              className="w-36 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-slate-500 font-medium">ngày</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Thời gian dùng thử (ngày)
          </label>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={trialExpiryPeriod}
              onChange={(e) => onChangeTrialDays(Number(e.target.value))}
              className="w-36 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-slate-500 font-medium">ngày</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Tần suất gửi cảnh báo
          </label>
          <div className="sm:col-span-2">
            <select
              value={notificationFrequency}
              onChange={(e) => onChangeFrequency(e.target.value)}
              className="w-56 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="daily">Hàng ngày</option>
              <option value="weekly">Hàng tuần</option>
              <option value="monthly">Hàng tháng</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
