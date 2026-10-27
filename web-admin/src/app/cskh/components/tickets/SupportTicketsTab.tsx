"use client";

import React from "react";
import { Search, Plus, FileText, Mail, Phone, Bell, Send } from "lucide-react";
import { SupportRequestTicket } from "../../types";

interface SupportTicketsTabProps {
  supportRequests: SupportRequestTicket[];
  selectedRequestId: string;
  onSelectRequestId: (id: string) => void;
  requestFilterType: string;
  onRequestFilterTypeChange: (type: string) => void;
  requestFilterStatus: string;
  onRequestFilterStatusChange: (status: string) => void;
  requestSearchQuery: string;
  onRequestSearchQueryChange: (q: string) => void;
  onUpdateRequestStatus: (
    requestId: string,
    newStatus: "PENDING" | "PROCESSING" | "RESOLVED" | "REJECTED"
  ) => void;
  adminReplyInput: string;
  onAdminReplyInputChange: (text: string) => void;
  onSendAdminResponse: (e: React.FormEvent) => void;
  onOpenCreateModal: () => void;
}

export const SupportTicketsTab: React.FC<SupportTicketsTabProps> = ({
  supportRequests,
  selectedRequestId,
  onSelectRequestId,
  requestFilterType,
  onRequestFilterTypeChange,
  requestFilterStatus,
  onRequestFilterStatusChange,
  requestSearchQuery,
  onRequestSearchQueryChange,
  onUpdateRequestStatus,
  adminReplyInput,
  onAdminReplyInputChange,
  onSendAdminResponse,
  onOpenCreateModal,
}) => {
  const currentRequest =
    supportRequests.find((r) => r.id === selectedRequestId) || supportRequests[0] || null;

  return (
    <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2.5 overflow-hidden">
      {/* Table Column */}
      <div className="flex-1 min-w-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã phiếu, tên, SĐT..."
                value={requestSearchQuery}
                onChange={(e) => onRequestSearchQueryChange(e.target.value)}
                className="text-xs pl-7 pr-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white w-52 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <select
              value={requestFilterType}
              onChange={(e) => onRequestFilterTypeChange(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">Mọi loại yêu cầu</option>
              <option value="TECHNICAL">Sự cố kỹ thuật</option>
              <option value="SETUP">Cài đặt / Cấu hình</option>
              <option value="WARRANTY">Bảo hành / Đổi trả</option>
              <option value="RENEWAL">Gia hạn dịch vụ</option>
              <option value="FEEDBACK">Góp ý dịch vụ</option>
            </select>

            <select
              value={requestFilterStatus}
              onChange={(e) => onRequestFilterStatusChange(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="PENDING">Mới nhận (Pending)</option>
              <option value="PROCESSING">Đang xử lý (Processing)</option>
              <option value="RESOLVED">Đã giải quyết (Resolved)</option>
              <option value="REJECTED">Từ chối (Rejected)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-2.5 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Phiếu Mới</span>
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-2.5">Mã Phiếu</th>
                <th className="p-2.5">Khách Hàng</th>
                <th className="p-2.5">Loại Yêu Cầu</th>
                <th className="p-2.5">Thiết Bị Liên Quan</th>
                <th className="p-2.5">Kênh Nhận Tin</th>
                <th className="p-2.5">Trạng Thái</th>
                <th className="p-2.5">Thời Gian</th>
                <th className="p-2.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {supportRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2 opacity-60" />
                    <p className="font-semibold text-slate-600 dark:text-slate-400">
                      Chưa có phiếu yêu cầu hỗ trợ nào
                    </p>
                  </td>
                </tr>
              ) : (
                supportRequests.map((req) => {
                  const isSelected = selectedRequestId === req.id;
                  return (
                    <tr
                      key={req.id}
                      onClick={() => onSelectRequestId(req.id)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isSelected ? "bg-cyan-50/70 dark:bg-cyan-950/40 border-l-2 border-cyan-500" : ""
                      }`}
                    >
                      <td className="p-2.5 font-mono text-cyan-600 dark:text-cyan-400 font-bold">{req.id}</td>
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {req.customerName || "Khách Hàng"}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">{req.customerPhone || "---"}</div>
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            req.requestType === "TECHNICAL"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : req.requestType === "RENEWAL"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : req.requestType === "WARRANTY"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {req.requestType === "TECHNICAL"
                            ? "SỰ CỐ KỸ THUẬT"
                            : req.requestType === "RENEWAL"
                            ? "GIA HẠN"
                            : req.requestType === "WARRANTY"
                            ? "BẢO HÀNH"
                            : "HƯỚNG DẪN"}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {req.hardwareId || "Chưa gán TB"}
                      </td>
                      <td className="p-2.5">
                        <span className="flex items-center gap-1 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                          {req.replyChannel === "EMAIL" && <Mail className="w-3 h-3 text-cyan-500" />}
                          {req.replyChannel === "PHONE" && <Phone className="w-3 h-3 text-emerald-500" />}
                          {req.replyChannel === "PUSH" && <Bell className="w-3 h-3 text-amber-500" />}
                          <span>{req.replyChannel}</span>
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            req.status === "RESOLVED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : req.status === "PROCESSING"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : req.status === "REJECTED"
                              ? "bg-slate-200 dark:bg-slate-700 text-slate-500 border-slate-300 dark:border-slate-600"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {req.status === "RESOLVED"
                            ? "ĐÃ XỬ LÝ"
                            : req.status === "PROCESSING"
                            ? "ĐANG XỬ LÝ"
                            : req.status === "PENDING"
                            ? "MỚI GỬI"
                            : "TỪ CHỐI"}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-[10px] text-slate-400">{req.createdAt}</td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRequestId(req.id);
                          }}
                          className={`text-[11px] px-2 py-1 rounded-md border font-semibold cursor-pointer ${
                            isSelected
                              ? "bg-cyan-600 text-white border-cyan-600"
                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {isSelected ? "Đang xem" : "Xem phiếu ➔"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column: Ticket Inspector */}
      {currentRequest && (
        <div className="w-full md:w-96 shrink-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
            <div>
              <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase">
                Chi Tiết Phiếu Yêu Cầu
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-xs">{currentRequest.id}</h3>
            </div>

            <select
              value={currentRequest.status}
              onChange={(e) => onUpdateRequestStatus(currentRequest.id, e.target.value as any)}
              className="text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="PENDING">Mới nhận (Pending)</option>
              <option value="PROCESSING">Đang xử lý (Processing)</option>
              <option value="RESOLVED">Đã giải quyết (Resolved)</option>
              <option value="REJECTED">Từ chối (Rejected)</option>
            </select>
          </div>

          <div className="p-3 space-y-3 overflow-y-auto flex-1 text-xs">
            {/* Customer Information */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5 text-[11px]">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Thông Tin Người Yêu Cầu
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khách hàng:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{currentRequest.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số điện thoại:</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                  {currentRequest.customerPhone}
                </span>
              </div>
              {currentRequest.customerEmail && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-mono text-[10px]">
                    {currentRequest.customerEmail}
                  </span>
                </div>
              )}
              {currentRequest.hardwareId && (
                <div className="flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Hardware ID:</span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                    {currentRequest.hardwareId}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-500">Kênh phản hồi:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {currentRequest.replyChannel === "EMAIL"
                    ? "Gửi qua Email"
                    : currentRequest.replyChannel === "PHONE"
                    ? "Gọi điện trực tiếp"
                    : "Thông báo Push App"}
                </span>
              </div>
            </div>

            {/* Request Description */}
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5 text-[11px]">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nội Dung Yêu Cầu</div>
              <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{currentRequest.description}</p>
            </div>

            {/* Admin Response Form */}
            <form onSubmit={onSendAdminResponse} className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Phản Hồi Xử Lý Của Kỹ Thuật Viên
              </label>
              <textarea
                rows={3}
                placeholder="Nhập nội dung giải pháp xử lý hoặc hướng dẫn..."
                value={adminReplyInput}
                onChange={(e) => onAdminReplyInputChange(e.target.value)}
                className="w-full text-xs p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="w-full py-1.5 px-3 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gửi Phản Hồi & Hoàn Tất Phiếu</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
