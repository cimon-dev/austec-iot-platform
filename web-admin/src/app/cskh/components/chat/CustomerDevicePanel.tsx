"use client";

import React from "react";
import { Box, ShieldCheck, Cpu, RefreshCw, Send } from "lucide-react";
import { Ticket } from "../../types";

interface CustomerDevicePanelProps {
  selectedProductInfo: any;
  currentTicket: Ticket | null;
  onSoftReboot: () => void;
  isRebooting: boolean;
  onSendQuickCatalog: () => void;
}

export const CustomerDevicePanel: React.FC<CustomerDevicePanelProps> = ({
  selectedProductInfo,
  currentTicket,
  onSoftReboot,
  isRebooting,
  onSendQuickCatalog,
}) => {
  return (
    <div className="w-full md:w-80 shrink-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
          <Box className="w-3.5 h-3.5 text-cyan-500" />
          <span>Thông Tin Sản Phẩm & Thiết Bị</span>
        </span>
        {selectedProductInfo && (
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
              selectedProductInfo.isOwned
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            }`}
          >
            {selectedProductInfo.isOwned ? "ĐÃ SỞ HỮU" : "CHƯA SỞ HỮU"}
          </span>
        )}
      </div>

      {!selectedProductInfo ? (
        <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center flex-1">
          <Box className="w-10 h-10 mb-2 text-slate-300 dark:text-slate-700" />
          <p className="font-semibold text-slate-600 dark:text-slate-400">Chưa chọn sản phẩm nào</p>
          <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
            Bấm vào thiết bị đính kèm trong tin nhắn chat hoặc chọn ticket để xem thông số kỹ thuật đầy đủ tại đây.
          </p>
        </div>
      ) : (
        <div className="p-3 space-y-3 overflow-y-auto flex-1 text-xs">
          {/* Product Render Image & Title */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-800/40">
            <div className="relative h-32 w-full bg-slate-200 dark:bg-slate-800">
              <img
                src={
                  selectedProductInfo.imageUrl ||
                  "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80"
                }
                alt="Hình ảnh thiết bị"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900/80 text-white backdrop-blur-xs">
                  {selectedProductInfo.categoryTag || "SMART DEVICE"}
                </span>
              </div>
            </div>
            <div className="p-2.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                {selectedProductInfo.deviceName || selectedProductInfo.modelName}
              </h3>
              <p className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Model: {selectedProductInfo.modelName}
              </p>
              {selectedProductInfo.hardwareId && (
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-mono">Serial / MAC:</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                    {selectedProductInfo.hardwareId}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ownership & Warranty Card */}
          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5 text-[11px]">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-500" />
              <span>Tình Trạng & Bảo Hành</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Phân loại:</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {selectedProductInfo.isOwned ? "Thiết bị khách hàng đã sở hữu" : "Khách hàng cần tư vấn mua mới"}
              </span>
            </div>
            {selectedProductInfo.isOwned ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Gói Cloud / IoT:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {selectedProductInfo.subscriptionStatus || "Còn hạn (Gia hạn đến 12/2027)"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Bảo hành chính hãng:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedProductInfo.warrantyMonths || 36} Tháng
                  </span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Giá tham khảo:</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">
                  {selectedProductInfo.price
                    ? `${selectedProductInfo.price.toLocaleString("vi-VN")} đ`
                    : "Liên hệ báo giá"}
                </span>
              </div>
            )}
          </div>

          {/* Specifications List */}
          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5 text-[11px]">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-purple-500" />
              <span>Thông Số Xuất Xưởng</span>
            </div>
            {selectedProductInfo.specs ? (
              Object.entries(selectedProductInfo.specs).map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between items-center py-0.5 border-b border-slate-100 dark:border-slate-800/50 last:border-none"
                >
                  <span className="text-slate-500">{k}:</span>
                  <span className="font-semibold text-slate-900 dark:text-white text-right font-mono text-[10px] max-w-[170px] truncate">
                    {String(v)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-[10px]">Đang cập nhật tài liệu kỹ thuật từ nhà máy Austec.</p>
            )}
          </div>

          {/* Telemetry Quick Actions (If Owned) */}
          {selectedProductInfo.isOwned && currentTicket && (
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                Thao Tác Kỹ Thuật Từ Xa
              </span>
              <button
                type="button"
                onClick={onSoftReboot}
                disabled={isRebooting}
                className="w-full py-1.5 px-2.5 rounded-md text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRebooting ? "animate-spin" : ""}`} />
                <span>{isRebooting ? "Đang gửi lệnh Reboot..." : "Khởi Động Lại Vi Điều Khiển (Reboot)"}</span>
              </button>
            </div>
          )}

          {/* Quick Catalog Recommendation Button */}
          <button
            type="button"
            onClick={onSendQuickCatalog}
            className="w-full py-2 px-3 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Gửi Thông Tin Sản Phẩm Vào Chat</span>
          </button>
        </div>
      )}
    </div>
  );
};
