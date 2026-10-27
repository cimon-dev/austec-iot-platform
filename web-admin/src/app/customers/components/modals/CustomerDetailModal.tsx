"use client";

import React from "react";
import { X, Lock, Unlock, Edit3 } from "lucide-react";
import { CustomerAccount } from "../../types";

interface CustomerDetailModalProps {
  customer: CustomerAccount | null;
  onClose: () => void;
  canUpdate: boolean;
  onToggleStatus: (id: string) => void;
  onViewMatrix: (ownerId: string) => void;
  onEditCustomer?: (cust: CustomerAccount) => void;
}

export function CustomerDetailModal({
  customer,
  onClose,
  canUpdate,
  onToggleStatus,
  onViewMatrix,
  onEditCustomer,
}: CustomerDetailModalProps) {
  if (!customer) return null;

  return (
    <div className="w-80 lg:w-96 shrink-0 h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden animate-in slide-in-from-right-3 duration-150">
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="min-w-0">
          <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono tracking-wider uppercase font-bold">
            Hồ Sơ Khách Hàng
          </div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">{customer.fullName}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto flex-1 text-xs">
        {/* Basic Info */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Mã KH:</span>
            <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{customer.id}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Số điện thoại:</span>
            <span className="font-mono text-slate-900 dark:text-white font-semibold">{customer.phoneNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Email:</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">{customer.email}</span>
          </div>
          <div className="flex justify-between items-start gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 shrink-0">Địa chỉ:</span>
            <span className="text-slate-800 dark:text-slate-200 text-right">
              {customer.address}, {customer.province}
            </span>
          </div>
        </div>

        {/* Account Actions */}
        {canUpdate && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => onEditCustomer?.(customer)}
              className="w-full py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
            >
              <Edit3 className="w-3.5 h-3.5" /> <span>Chỉnh sửa thông tin khách hàng</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleStatus(customer.id)}
              className={`w-full py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                customer.isActive
                  ? "bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              }`}
            >
              {customer.isActive ? (
                <>
                  <Lock className="w-3.5 h-3.5" /> <span>Khóa tài khoản khách hàng</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" /> <span>Mở khóa tài khoản khách hàng</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Device List of Customer */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
            <span>Thiết Bị Sở Hữu ({customer.devices.length})</span>
            <button
              type="button"
              onClick={() => onViewMatrix(customer.id)}
              className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Xem ma trận RBAC ➔</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {customer.devices.map((dev) => (
              <div
                key={dev.hardwareId}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] space-y-1"
              >
                <div className="flex justify-between items-center font-bold">
                  <span className="font-mono text-cyan-600 dark:text-cyan-400">{dev.hardwareId}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] ${
                      dev.isOnline ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                    }`}
                  >
                    {dev.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
                <div className="text-slate-800 dark:text-slate-200">{dev.modelName}</div>
                <div className="text-[10px] text-slate-500 flex justify-between">
                  <span>
                    Vai trò: <strong className="text-purple-600 dark:text-purple-400">{dev.roleInHome}</strong>
                  </span>
                  <span>BH: {dev.warrantyUntil}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
