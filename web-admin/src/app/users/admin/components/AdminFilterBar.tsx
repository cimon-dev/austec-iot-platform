"use client";

import React from "react";
import { Search } from "lucide-react";

interface AdminFilterBarProps {
  searchEmpId: string;
  onSearchEmpIdChange: (v: string) => void;
  searchEmail: string;
  onSearchEmailChange: (v: string) => void;
  searchPhone: string;
  onSearchPhoneChange: (v: string) => void;
  searchRole: string;
  onSearchRoleChange: (v: string) => void;
  searchCompany: string;
  onSearchCompanyChange: (v: string) => void;
  rolesList: string[];
  onReset: () => void;
}

export const AdminFilterBar: React.FC<AdminFilterBarProps> = ({
  searchEmpId,
  onSearchEmpIdChange,
  searchEmail,
  onSearchEmailChange,
  searchPhone,
  onSearchPhoneChange,
  searchRole,
  onSearchRoleChange,
  searchCompany,
  onSearchCompanyChange,
  rolesList,
  onReset,
}) => {
  return (
    <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs shrink-0">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <input
          type="text"
          placeholder="Mã NV..."
          value={searchEmpId}
          onChange={(e) => onSearchEmpIdChange(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
        />

        <input
          type="text"
          placeholder="Email..."
          value={searchEmail}
          onChange={(e) => onSearchEmailChange(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
        />

        <input
          type="text"
          placeholder="Số điện thoại..."
          value={searchPhone}
          onChange={(e) => onSearchPhoneChange(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
        />

        <select
          value={searchRole}
          onChange={(e) => onSearchRoleChange(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="">Tất cả vai trò</option>
          {rolesList.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Công ty / Đơn vị..."
          value={searchCompany}
          onChange={(e) => onSearchCompanyChange(e.target.value)}
          className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
        />

        <button
          type="button"
          onClick={onReset}
          className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
        >
          Đặt lại bộ lọc
        </button>
      </div>
    </div>
  );
};
