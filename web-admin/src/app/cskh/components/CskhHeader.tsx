"use client";

import React from "react";
import { Headphones, MessageSquare, FileText, Wifi } from "lucide-react";

interface CskhHeaderProps {
  activeTab: "chat" | "tickets";
  onTabChange: (tab: "chat" | "tickets") => void;
  activeChatCount: number;
  ticketCount: number;
  wsStatus: "connecting" | "connected" | "disconnected";
}

export const CskhHeader: React.FC<CskhHeaderProps> = ({
  activeTab,
  onTabChange,
  activeChatCount,
  ticketCount,
  wsStatus,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
          <Headphones className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Trung Tâm Hỗ Trợ Khách Hàng & Kỹ Thuật IoT (CSKH)
            </h1>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              Live Gateway & Helpdesk
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  wsStatus === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : wsStatus === "connecting"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-rose-500"
                }`}
              />
              <span className="text-slate-600 dark:text-slate-400 font-semibold">
                {wsStatus === "connected"
                  ? "Real-time Online"
                  : wsStatus === "connecting"
                  ? "Đang kết nối..."
                  : "Mất kết nối WS"}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Kênh tiếp nhận trực tuyến thời gian thực giữa kỹ thuật viên Austec và người dùng cuối trên ứng dụng Mobile
          </p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 shrink-0">
        <button
          type="button"
          onClick={() => onTabChange("chat")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeTab === "chat"
              ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Hỗ Trợ Trực Tuyến Live 1-1 ({activeChatCount})</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange("tickets")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeTab === "tickets"
              ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Yêu Cầu Kỹ Thuật Form ({ticketCount})</span>
        </button>
      </div>
    </div>
  );
};
