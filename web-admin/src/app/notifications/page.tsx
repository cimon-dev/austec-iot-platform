"use client";

import React, { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { 
  Bell, 
  Send, 
  Plus, 
  Clock, 
  Smartphone, 
  Mail, 
  MessageSquare, 
  CheckCircle2, 
  X, 
  Filter, 
  Search, 
  Trash2, 
  Radio
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";
import { Pagination } from "@/components/Pagination";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

interface NotificationItem {
  id: number;
  title: string;
  category: "SYSTEM" | "MAINTENANCE" | "OTA_UPDATE" | "PROMO" | "ALERT";
  target: string;
  channel: "APP_PUSH" | "SMS" | "EMAIL";
  sentAt: string;
  status: "SENT" | "SCHEDULED" | "DRAFT";
  readRate: number;
  deliveredCount: number;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 101,
    title: "Bảo trì nâng cấp Cloud Broker MQTT v2.5",
    category: "MAINTENANCE",
    target: "Tất cả khách hàng (Toàn hệ thống)",
    channel: "APP_PUSH",
    sentAt: "17/10/2026 23:00",
    status: "SENT",
    readRate: 84.5,
    deliveredCount: 4250
  },
  {
    id: 102,
    title: "Cập nhật Firmware v2.1 cho Cửa cuốn Titadoor Super",
    category: "OTA_UPDATE",
    target: "Model: AUSTEC-DOOR-A500",
    channel: "APP_PUSH",
    sentAt: "15/10/2026 09:30",
    status: "SENT",
    readRate: 91.2,
    deliveredCount: 1850
  },
  {
    id: 103,
    title: "Nhắc nhở kiểm tra định kỳ ắc quy bộ lưu điện UPS",
    category: "ALERT",
    target: "Nhóm: GROUP_UPS_220V",
    channel: "APP_PUSH",
    sentAt: "20/10/2026 08:00",
    status: "SCHEDULED",
    readRate: 0,
    deliveredCount: 2300
  },
  {
    id: 104,
    title: "Chương trình gia hạn gói bảo hành Vàng 24 tháng",
    category: "PROMO",
    target: "Khách hàng sắp hết hạn bảo hành",
    channel: "EMAIL",
    sentAt: "---",
    status: "DRAFT",
    readRate: 0,
    deliveredCount: 650
  },
  {
    id: 105,
    title: "Cập nhật ứng dụng Austec Smart v2.5.0 trên App Store & Google Play",
    category: "SYSTEM",
    target: "Toàn bộ khách hàng",
    channel: "APP_PUSH",
    sentAt: "14/10/2026 15:00",
    status: "SENT",
    readRate: 88.5,
    deliveredCount: 8900
  },
  {
    id: 106,
    title: "Cảnh báo khẩn: Kiểm tra nguồn sạc dự phòng trong đợt mưa bão",
    category: "ALERT",
    target: "Khu vực Miền Trung",
    channel: "APP_PUSH",
    sentAt: "12/10/2026 18:20",
    status: "SENT",
    readRate: 94.1,
    deliveredCount: 3200
  },
  {
    id: 107,
    title: "Khuyến mãi giảm 20% khi lắp đặt thêm Khóa Masaru X1",
    category: "PROMO",
    target: "Khách hàng đã sở hữu Cửa cuốn",
    channel: "SMS",
    sentAt: "25/10/2026 09:00",
    status: "SCHEDULED",
    readRate: 0,
    deliveredCount: 1500
  },
  {
    id: 108,
    title: "Firmware OTA v3.1.2 - Khắc phục cảm biến chạm Masaru",
    category: "OTA_UPDATE",
    target: "Model: MASARU-X1",
    channel: "APP_PUSH",
    sentAt: "10/10/2026 11:00",
    status: "SENT",
    readRate: 89.9,
    deliveredCount: 890
  },
  {
    id: 109,
    title: "Khảo sát ý kiến người dùng về tính năng chia sẻ chìa khóa số",
    category: "SYSTEM",
    target: "Người dùng hoạt động 30 ngày qua",
    channel: "EMAIL",
    sentAt: "---",
    status: "DRAFT",
    readRate: 0,
    deliveredCount: 4100
  }
];

export default function NotificationsManagementPage() {
  const { t } = useLanguage();
  const { canView, canCreate, canDelete } = usePermissions();

  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [notiPage, setNotiPage] = useState(1);
  const [notiPageSize, setNotiPageSize] = useState(10);

  // Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NotificationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [composeForm, setComposeForm] = useState({
    title: "",
    category: "SYSTEM" as const,
    targetType: "ALL",
    targetModel: "AUSTEC-DOOR-A500",
    channel: "APP_PUSH" as const,
    body: "",
    scheduleMode: "NOW",
    scheduleTime: ""
  });

  const filteredNotis = notifications.filter(n => {
    const matchSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        n.target.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = !filterCategory || n.category === filterCategory;
    const matchStatus = !filterStatus || n.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  useEffect(() => {
    setNotiPage(1);
  }, [searchQuery, filterCategory, filterStatus]);

  const totalNotiPages = Math.max(1, Math.ceil(filteredNotis.length / notiPageSize));
  const paginatedNotis = useMemo(() => {
    const start = (notiPage - 1) * notiPageSize;
    return filteredNotis.slice(start, start + notiPageSize);
  }, [filteredNotis, notiPage, notiPageSize]);

  const handleSendNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeForm.title) return;

    const newNoti: NotificationItem = {
      id: Date.now() % 10000,
      title: composeForm.title,
      category: composeForm.category,
      target: composeForm.targetType === "ALL" ? "Tất cả khách hàng (Toàn hệ thống)" : `Model: ${composeForm.targetModel}`,
      channel: composeForm.channel,
      sentAt: composeForm.scheduleMode === "NOW" ? new Date().toLocaleString("vi-VN") : composeForm.scheduleTime || "Chờ lịch",
      status: composeForm.scheduleMode === "NOW" ? "SENT" : "SCHEDULED",
      readRate: 0,
      deliveredCount: composeForm.targetType === "ALL" ? 4300 : 1200
    };

    setNotifications([newNoti, ...notifications]);
    setIsComposeOpen(false);
    toast.success(
      composeForm.scheduleMode === "NOW" 
        ? "Đã phát sóng thông báo thành công đến các thiết bị!" 
        : "Đã lên lịch phát sóng thông báo thành công!"
    );

    // Reset Form
    setComposeForm({
      title: "",
      category: "SYSTEM",
      targetType: "ALL",
      targetModel: "AUSTEC-DOOR-A500",
      channel: "APP_PUSH",
      body: "",
      scheduleMode: "NOW",
      scheduleTime: ""
    });
  };

  const handleDelete = (item: NotificationItem) => {
    if (!canDelete("mod_noti")) return;
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      setNotifications(prev => prev.filter(n => n.id !== deleteTarget.id));
      toast.success("Đã xóa chiến dịch thông báo thành công!");
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // RBAC Gating
  if (!canView("mod_noti")) {
    return (
      <AccessDenied 
        moduleName="Trung Tâm Quản Lý Thông Báo (Push Hub)"
        requiredModule="mod_noti"
      />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2 overflow-hidden">


      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <span>Trung Tâm Quản Lý Thông Báo (Push Hub)</span>
          </h1>
        </div>

        {canCreate("mod_noti") && (
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer w-fit"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Soạn Thông Báo Mới</span>
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row gap-2 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, đối tượng..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="flex-1 sm:flex-none text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">Tất cả phân loại</option>
            <option value="SYSTEM">Hệ thống</option>
            <option value="MAINTENANCE">Bảo trì</option>
            <option value="OTA_UPDATE">Firmware OTA</option>
            <option value="ALERT">Cảnh báo kỹ thuật</option>
            <option value="PROMO">Khuyến mại / CSKH</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="flex-1 sm:flex-none text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="SENT">Đã phát sóng</option>
            <option value="SCHEDULED">Đã lên lịch</option>
            <option value="DRAFT">Bản nháp</option>
          </select>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-xs min-w-[800px]">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px] sticky top-0 z-10">
              <tr>
                <th className="p-2.5 w-12 text-center">ID</th>
                <th className="p-2.5">Tiêu đề thông báo</th>
                <th className="p-2.5">Phân loại</th>
                <th className="p-2.5">Đối tượng nhận</th>
                <th className="p-2.5">Kênh gửi</th>
                <th className="p-2.5">Thời gian phát</th>
                <th className="p-2.5">Trạng thái</th>
                <th className="p-2.5">Đã gửi / Đã xem</th>
                {canDelete("mod_noti") && (
                  <th className="p-2.5 text-right">Thao tác</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredNotis.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Không tìm thấy thông báo nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedNotis.map((n: NotificationItem) => (
                  <tr key={n.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5 text-center text-slate-500 font-mono">#{n.id}</td>
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                      {n.title}
                    </td>
                    <td className="p-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        n.category === "MAINTENANCE" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" :
                        n.category === "OTA_UPDATE" ? "bg-cyan-500/10 text-cyan-600 border border-cyan-500/20" :
                        n.category === "ALERT" ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" :
                        "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}>
                        {n.category}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300 font-medium">
                      {n.target}
                    </td>
                    <td className="p-2.5">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                        {n.channel === "APP_PUSH" && <Smartphone className="w-3.5 h-3.5 text-cyan-500" />}
                        {n.channel === "SMS" && <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />}
                        {n.channel === "EMAIL" && <Mail className="w-3.5 h-3.5 text-indigo-500" />}
                        <span>{n.channel === "APP_PUSH" ? "App Mobile" : n.channel}</span>
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                      {n.sentAt}
                    </td>
                    <td className="p-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        n.status === "SENT" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                        n.status === "SCHEDULED" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                        "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                      }`}>
                        {n.status === "SENT" ? "Đã gửi" : n.status === "SCHEDULED" ? "Chờ gửi" : "Bản nháp"}
                      </span>
                    </td>
                    <td className="p-2.5 font-mono text-[11px]">
                      {n.status === "SENT" ? (
                        <div>
                          <strong className="text-slate-900 dark:text-white">{n.deliveredCount.toLocaleString()}</strong> TB
                          <span className="text-emerald-600 dark:text-emerald-400 ml-1 font-bold">({n.readRate}%)</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Dự kiến ~{n.deliveredCount.toLocaleString()} TB</span>
                      )}
                    </td>
                    {canDelete("mod_noti") && (
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => handleDelete(n)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={notiPage}
          totalItems={filteredNotis.length}
          pageSize={notiPageSize}
          onPageChange={setNotiPage}
          onPageSizeChange={setNotiPageSize}
          pageSizeOptions={[10, 15, 20, 50, 100]}
          itemName="thông báo"
        />
      </div>

      {/* Compose Notification Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-500" />
                <span>Soạn Thảo & Phát Thông Báo Mới</span>
              </h3>
              <button onClick={() => setIsComposeOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phân loại thông báo *</label>
                  <select
                    value={composeForm.category}
                    onChange={e => setComposeForm({ ...composeForm, category: e.target.value as any })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="SYSTEM">Hệ thống chung</option>
                    <option value="MAINTENANCE">Thông báo bảo trì</option>
                    <option value="OTA_UPDATE">Nâng cấp Firmware OTA</option>
                    <option value="ALERT">Cảnh báo kỹ thuật khẩn</option>
                    <option value="PROMO">Chương trình khuyến mãi / CSKH</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Kênh phát sóng *</label>
                  <select
                    value={composeForm.channel}
                    onChange={e => setComposeForm({ ...composeForm, channel: e.target.value as any })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="APP_PUSH">Mobile App Push Notification</option>
                    <option value="SMS">Tin nhắn SMS</option>
                    <option value="EMAIL">Thư điện tử Email</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tiêu đề thông báo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tiêu đề hiển thị trên thanh thông báo..."
                  value={composeForm.title}
                  onChange={e => setComposeForm({ ...composeForm, title: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Đối tượng nhận *</label>
                  <select
                    value={composeForm.targetType}
                    onChange={e => setComposeForm({ ...composeForm, targetType: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">Tất cả khách hàng sử dụng App</option>
                    <option value="MODEL">Theo dòng sản phẩm (Model)</option>
                  </select>
                </div>

                {composeForm.targetType === "MODEL" && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Chọn Model thiết bị</label>
                    <select
                      value={composeForm.targetModel}
                      onChange={e => setComposeForm({ ...composeForm, targetModel: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="AUSTEC-DOOR-A500">Cửa cuốn Austec A500</option>
                      <option value="UPS-SIN-220V">Bộ lưu điện UPS 220V</option>
                      <option value="LOCK-MASARU-PRO">Khóa Masaru Pro</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Nội dung chi tiết *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Nội dung thông báo gửi đến người dùng..."
                  value={composeForm.body}
                  onChange={e => setComposeForm({ ...composeForm, body: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Thời gian phát</label>
                  <select
                    value={composeForm.scheduleMode}
                    onChange={e => setComposeForm({ ...composeForm, scheduleMode: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="NOW">Gửi ngay lập tức</option>
                    <option value="SCHEDULE">Lên lịch hẹn giờ</option>
                  </select>
                </div>

                {composeForm.scheduleMode === "SCHEDULE" && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Chọn ngày giờ phát</label>
                    <input
                      type="datetime-local"
                      value={composeForm.scheduleTime}
                      onChange={e => setComposeForm({ ...composeForm, scheduleTime: e.target.value })}
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-sm cursor-pointer"
                >
                  {composeForm.scheduleMode === "NOW" ? "Phát Sóng Ngay" : "Lưu Lịch Phát"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        itemName={deleteTarget?.title}
        itemType="Chiến dịch thông báo"
        isDeleting={isDeleting}
      />
    </div>
  );
}
