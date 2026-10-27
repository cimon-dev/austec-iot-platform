"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

interface BlackboxKpiCardsProps {
  language: string;
}

export const BlackboxKpiCards: React.FC<BlackboxKpiCardsProps> = ({ language }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 shrink-0">
      <div className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
          {language === "vi" ? "Tổng lệnh hôm nay" : "Commands Today"}
        </div>
        <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">14,295</div>
        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold truncate">
          <CheckCircle2 className="w-3 h-3 shrink-0" /> 99.96% {language === "vi" ? "Thành công" : "Success"}
        </div>
      </div>

      <div className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
          {language === "vi" ? "Độ trễ trung bình" : "Avg Latency"}
        </div>
        <div className="text-base sm:text-lg font-bold text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">168 ms</div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400">SLA: &le; 250ms</div>
      </div>

      <div className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
          {language === "vi" ? "Lệnh Timeout" : "Timeout Commands"}
        </div>
        <div className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">6</div>
        <div className="text-[10px] text-amber-600 dark:text-amber-400 truncate">Tự động retry & ghi log</div>
      </div>

      <div className="p-2 sm:p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
          {language === "vi" ? "Chữ ký mật mã" : "Crypto Verification"}
        </div>
        <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">100% OK</div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">HMAC-SHA256</div>
      </div>
    </div>
  );
};
