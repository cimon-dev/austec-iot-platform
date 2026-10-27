"use client";

import React from "react";

interface CompanyInfoCardProps {
  companyName: string;
  hotline: string;
  supportEmail: string;
  timezone: string;
  onChangeCompany: (val: string) => void;
  onChangeHotline: (val: string) => void;
  onChangeEmail: (val: string) => void;
  onChangeTimezone: (val: string) => void;
}

export function CompanyInfoCard({
  companyName,
  hotline,
  supportEmail,
  timezone,
  onChangeCompany,
  onChangeHotline,
  onChangeEmail,
  onChangeTimezone,
}: CompanyInfoCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
        <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Thông tin doanh nghiệp
        </h2>
      </div>

      <div className="p-4 space-y-3.5 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Tên doanh nghiệp
          </label>
          <div className="sm:col-span-2">
            <input
              type="text"
              value={companyName}
              onChange={(e) => onChangeCompany(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Hotline hỗ trợ kỹ thuật
          </label>
          <div className="sm:col-span-2">
            <input
              type="text"
              value={hotline}
              onChange={(e) => onChangeHotline(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Email tiếp nhận CSKH
          </label>
          <div className="sm:col-span-2">
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => onChangeEmail(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Múi giờ hệ thống
          </label>
          <div className="sm:col-span-2">
            <input
              type="text"
              value={timezone}
              onChange={(e) => onChangeTimezone(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
