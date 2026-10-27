"use client";

import React from "react";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { BlackboxLogEntry } from "../types";
import { Pagination } from "@/components/Pagination";

interface BlackboxTableProps {
  logs: BlackboxLogEntry[];
  selectedLogId?: string | number;
  onSelectLog: (log: BlackboxLogEntry) => void;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const BlackboxTable: React.FC<BlackboxTableProps> = ({
  logs,
  selectedLogId,
  onSelectLog,
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}) => {
  return (
    <div className="flex flex-col h-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Dòng sự kiện ({totalItems} bản ghi)</span>
        </div>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Độ phân giải: 1 ms</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {logs.map((log) => {
          const isSelected = selectedLogId === log.id;
          return (
            <div
              key={log.id}
              onClick={() => onSelectLog(log)}
              className={`px-3 py-2.5 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                isSelected
                  ? "bg-cyan-500/10 border-l-4 border-cyan-600 dark:border-cyan-400"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 ${
                    log.status === "ACKNOWLEDGED"
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                  }`}
                >
                  {log.commandType}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {log.hardwareId}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
                      ({log.modelName})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 truncate">
                    <span>
                      Gửi bởi: <strong className="text-slate-800 dark:text-slate-200">{log.userEmail}</strong>
                    </span>
                    <span>•</span>
                    <span className="font-mono text-slate-500">{log.clientIp}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1 text-xs font-mono font-bold">
                  <span
                    className={
                      log.latencyMs <= 250
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    }
                  >
                    {log.latencyMs} ms
                  </span>
                  {log.status === "ACKNOWLEDGED" ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{log.timestamp}</div>
              </div>
            </div>
          );
        })}

        {logs.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            Không tìm thấy bản ghi hộp đen nào khớp với điều kiện tra cứu.
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={[10, 15, 20, 50, 100]}
        itemName="lệnh"
      />
    </div>
  );
};
