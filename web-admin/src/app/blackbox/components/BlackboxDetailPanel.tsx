"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { BlackboxLogEntry } from "../types";

interface BlackboxDetailPanelProps {
  selectedLog: BlackboxLogEntry | null;
  onBack?: () => void;
}

export const BlackboxDetailPanel: React.FC<BlackboxDetailPanelProps> = ({
  selectedLog,
  onBack,
}) => {
  const [copied, setCopied] = useState(false);

  if (!selectedLog) {
    return (
      <div className="flex flex-col h-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs justify-center items-center p-8 text-center text-slate-400 text-xs">
        Chọn một bản ghi để xem chi tiết bằng chứng lệnh.
      </div>
    );
  }

  const handleCopySig = () => {
    if (selectedLog.cryptoSignature) {
      navigator.clipboard.writeText(selectedLog.cryptoSignature);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="lg:hidden p-1 px-2 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1 cursor-pointer"
              title="Quay lại danh sách lệnh"
            >
              ← <span className="text-[11px]">Danh sách</span>
            </button>
          )}
          <div>
            <span className="text-[10px] uppercase font-mono text-cyan-600 dark:text-cyan-400 font-bold block">
              {selectedLog.id}
            </span>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Chi Tiết Bằng Chứng Lệnh</h3>
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
            selectedLog.status === "ACKNOWLEDGED"
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
          }`}
        >
          {selectedLog.status}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {/* Hardware */}
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Thiết Bị Phần Cứng</span>
          <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">{selectedLog.hardwareId}</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300">{selectedLog.modelName}</div>
        </div>

        {/* Sender Info */}
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Người Phát Lệnh</span>
          <div className="flex justify-between">
            <span className="text-slate-500">Tài khoản:</span>
            <span className="text-slate-900 dark:text-white font-semibold truncate max-w-[200px]">
              {selectedLog.userEmail}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Vai trò:</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">{selectedLog.userRole}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Địa chỉ IP:</span>
            <span className="text-slate-800 dark:text-slate-200 font-mono">{selectedLog.clientIp}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Thiết bị:</span>
            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
              {selectedLog.deviceFingerprint}
            </span>
          </div>
        </div>

        {/* Latency Timeline */}
        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">
            Tiến Trình Thực Thi
          </span>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">App gửi lệnh (T1):</span>
            <span className="text-slate-800 dark:text-slate-200">{selectedLog.timestamp}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Thiết bị ACK (T2):</span>
            <span className="text-emerald-600 dark:text-emerald-400">{selectedLog.ackTimestamp || "Chưa phản hồi"}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 font-bold">
            <span className="text-slate-600 dark:text-slate-400 font-sans">Thời gian khứ hồi:</span>
            <span className="text-cyan-600 dark:text-cyan-400">{selectedLog.latencyMs} ms</span>
          </div>
        </div>

        {/* Crypto Signature */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Chữ Ký Số Bất Biến (SHA-256)</span>
            {copied && (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold normal-case">
                <Check className="w-3 h-3" /> Đã sao chép
              </span>
            )}
          </div>
          <div
            onClick={handleCopySig}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-mono text-[10px] break-all cursor-pointer hover:border-cyan-500 transition-colors"
            title="Nhấn để copy mã băm SHA-256"
          >
            {selectedLog.cryptoSignature}
          </div>
        </div>

        {/* Command Payload */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gói Tin Lệnh (Payload)</span>
          <pre className="p-2 rounded-lg bg-slate-900 text-cyan-300 font-mono text-[10px] border border-slate-800 overflow-x-auto">
            {JSON.stringify(selectedLog.payload, null, 2)}
          </pre>
        </div>
      </div>

      <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
        <span>Tiêu chuẩn ISO/IEC 27001 Audit Ready</span>
        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">100% Immutable</span>
      </div>
    </div>
  );
};
