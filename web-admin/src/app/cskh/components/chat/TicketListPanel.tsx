"use client";

import React from "react";
import { Search, MessageSquare, Clock, CheckCheck } from "lucide-react";
import { Ticket } from "../../types";

interface TicketListPanelProps {
  tickets: Ticket[];
  selectedTicketId: string;
  onSelectTicket: (ticket: Ticket) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const TicketListPanel: React.FC<TicketListPanelProps> = ({
  tickets,
  selectedTicketId,
  onSelectTicket,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="w-full md:w-80 shrink-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Hàng Chờ CSKH
          </span>
          <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
            {tickets.length} luồng
          </span>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Serial, tên, SĐT..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full text-xs pl-7 pr-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {tickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2 opacity-60" />
            <p className="font-semibold text-slate-600 dark:text-slate-400">Chưa có cuộc trò chuyện nào</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Hàng chờ sẽ tự động cập nhật ngay khi khách hàng gửi tin nhắn từ Mobile App qua WebSocket.
            </p>
          </div>
        ) : (
          tickets.map((t) => {
            const isSelected = selectedTicketId === t.id;
            const lastMsg = t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1] : null;
            const lastTime = lastMsg?.time || (t.createdAt ? t.createdAt.substring(11, 16) : "--:--");
            const isCustomerSender = lastMsg
              ? lastMsg.sender === "CUSTOMER" || (lastMsg as any).senderRole === "CUSTOMER"
              : false;
            const isUnread = isCustomerSender;

            return (
              <div
                key={t.id}
                onClick={() => onSelectTicket(t)}
                className={`p-2.5 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-cyan-50 dark:bg-cyan-950/40 border-l-4 border-cyan-500"
                    : isUnread
                    ? "bg-cyan-500/[0.04] dark:bg-cyan-950/20 hover:bg-slate-50 dark:hover:bg-slate-800/40 border-l-2 border-cyan-400"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300 border-l-2 border-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isUnread ? (
                      <span className="relative flex h-2 w-2 shrink-0" title="Khách gửi tin nhắn mới - Chưa phản hồi">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                      </span>
                    ) : (
                      <span title="CSKH đã trả lời" className="flex items-center">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-500/90 shrink-0" />
                      </span>
                    )}
                    <span className="font-mono text-[10px] font-bold text-cyan-600 dark:text-cyan-400">{t.id}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className="flex items-center gap-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500"
                      title="Thời gian trả lời cuối cùng"
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {lastTime}
                    </span>
                    {t.selectedDevice && (
                      <span
                        className={`text-[8px] font-bold px-1 py-0.2 rounded ${
                          t.selectedDevice.isOwned
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {t.selectedDevice.isOwned ? "ĐÃ SỞ HỮU" : "TƯ VẤN"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="font-semibold text-slate-900 dark:text-white text-xs mt-1 truncate flex items-center justify-between">
                  <span className="truncate">{t.customerName}</span>
                  {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 ml-1"></span>}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {lastMsg ? lastMsg.text : t.subject}
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                  <span>{t.customerPhone}</span>
                  <span className="truncate max-w-[120px]">{t.deviceName || "Hỗ trợ chung"}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
