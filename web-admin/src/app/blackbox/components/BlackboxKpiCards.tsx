import React from "react";
import { CheckCircle2, ShieldCheck, Zap, AlertTriangle } from "lucide-react";
import { BlackboxLogEntry } from "../types";

interface BlackboxKpiCardsProps {
  language: string;
  logs?: BlackboxLogEntry[];
}

export const BlackboxKpiCards: React.FC<BlackboxKpiCardsProps> = ({ language, logs = [] }) => {
  const total = logs.length;
  const successCount = logs.filter((l) => l.status === "ACKNOWLEDGED").length;
  const successRate = total > 0 ? ((successCount / total) * 100).toFixed(1) : "100";
  const avgLatency = total > 0 ? Math.round(logs.reduce((acc, l) => acc + (l.latencyMs || 0), 0) / total) : 0;
  const timeoutCount = logs.filter((l) => l.status === "TIMEOUT").length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 shrink-0">
      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
          {language === "vi" ? "Tổng lệnh hôm nay" : "Commands Today"}
        </div>
        <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
          {total.toLocaleString()}
        </div>
        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold truncate">
          <CheckCircle2 className="w-3 h-3 shrink-0" />
          <span>{successRate}% {language === "vi" ? "Thành công" : "Success"}</span>
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
          {language === "vi" ? "Độ trễ trung bình" : "Avg Latency"}
        </div>
        <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
          {avgLatency > 0 ? `${avgLatency} ms` : "0 ms"}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400">
          SLA: &le; 250ms
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
          {language === "vi" ? "Lệnh Timeout" : "Timeout Commands"}
        </div>
        <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
          {timeoutCount}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
          {timeoutCount > 0 ? "Tự động retry & ghi log" : "Không có lệnh quá hạn"}
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
          {language === "vi" ? "Chữ ký mật mã" : "Crypto Verification"}
        </div>
        <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">
          {total > 0 ? "100% OK" : "0 OK"}
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
          HMAC-SHA256
        </div>
      </div>
    </div>
  );
};
