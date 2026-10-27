"use client";

import React, { useRef, useEffect } from "react";
import { Send, Box, Tag, Headphones } from "lucide-react";
import { Ticket } from "../../types";

interface ChatConversationAreaProps {
  currentTicket: Ticket | null;
  onSelectProductInfo: (prod: any) => void;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onSendReply: () => void;
  onImageClick?: (url: string) => void;
}

export const ChatConversationArea: React.FC<ChatConversationAreaProps> = ({
  currentTicket,
  onSelectProductInfo,
  replyText,
  onReplyTextChange,
  onSendReply,
  onImageClick,
}) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentTicket?.messages?.length]);

  if (!currentTicket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-3 border border-cyan-500/20 shadow-inner">
          <Headphones className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
          Chưa Có Cuộc Trò Chuyện Nào Đang Hoạt Động
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
          Khi khách hàng nhấn nút <strong>&quot;Bắt đầu cuộc trò chuyện&quot;</strong> trên Austec Mobile App, luồng tin nhắn sẽ tự động kết nối qua WebSocket và xuất hiện tại đây theo thời gian thực để CSKH hỗ trợ.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Chat Header */}
      <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
        <div>
          <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
            <span>{currentTicket.customerName}</span>
            <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
              {currentTicket.customerPhone}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
            <span>Thiết bị: {currentTicket.hardwareId}</span>
            <span>•</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{currentTicket.deviceName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectProductInfo(currentTicket.selectedDevice)}
            className="px-2 py-1 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 flex items-center gap-1 cursor-pointer"
          >
            <Box className="w-3 h-3" />
            <span>Xem chi tiết sản phẩm ➔</span>
          </button>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            WebSocket Live
          </span>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
        {currentTicket.messages.map((m, idx) => (
          <div key={idx} className={`flex flex-col ${m.sender === "CSKH" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed ${
                m.sender === "CSKH"
                  ? "bg-cyan-600 text-white rounded-br-none"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none border border-slate-200 dark:border-slate-700/60"
              }`}
            >
              {/* Device Chip if Attached */}
              {m.selectedDevice && (
                <div
                  onClick={() => onSelectProductInfo(m.selectedDevice)}
                  className={`mb-2 p-2 rounded-lg cursor-pointer transition-all border flex items-center justify-between gap-2 ${
                    m.sender === "CSKH"
                      ? "bg-white/10 border-white/20 hover:bg-white/20 text-white"
                      : "bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400"
                  }`}
                  title="Bấm để hiển thị chi tiết sản phẩm ở khối bên phải"
                >
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-[11px] block truncate">
                        {m.selectedDevice.deviceName || m.selectedDevice.modelName}
                      </span>
                      <span className="text-[10px] opacity-80 font-mono">
                        {m.selectedDevice.isOwned
                          ? `Đã sở hữu • ${m.selectedDevice.hardwareId || ""}`
                          : "Tư vấn mới • Chưa sở hữu"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold underline shrink-0">Xem thông số ➔</span>
                </div>
              )}

              {/* Image Attachments */}
              {m.attachmentUrls && m.attachmentUrls.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {m.attachmentUrls.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => onImageClick && onImageClick(img)}
                      className="relative w-28 h-24 rounded-lg overflow-hidden border border-white/20 dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <img src={img} alt="Hình ảnh đính kèm" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {m.text}
            </div>
            <span className="text-[9px] text-slate-400 font-mono mt-0.5 px-1">{m.time}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-2 shrink-0">
        <input
          type="text"
          placeholder="Nhập nội dung phản hồi cho khách hàng qua WebSocket..."
          value={replyText}
          onChange={(e) => onReplyTextChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSendReply()}
          className="flex-1 text-xs px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
        />
        <button
          type="button"
          onClick={onSendReply}
          className="px-3.5 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Gửi</span>
        </button>
      </div>
    </div>
  );
};
