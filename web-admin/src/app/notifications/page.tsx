"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Send,
  Smartphone,
  Mail,
  MessageSquare,
  X,
  Search,
  Trash2,
  Image as ImageIcon,
  Upload,
  Megaphone,
  ExternalLink,
  Pin,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";
import { Pagination } from "@/components/Pagination";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { getApiBaseUrl } from "@/context/apiConfig";

type NotificationCategory =
  | "SYSTEM"
  | "MAINTENANCE"
  | "OTA_UPDATE"
  | "PROMO"
  | "ALERT"
  | "AD_BANNER";

type CampaignType = "STANDARD" | "PROMO_BANNER" | "NEW_DEVICE" | "CAMPAIGN";
type ActionType = "NONE" | "OPEN_SHOP" | "OPEN_CHAT" | "OPEN_URL";

interface NotificationItem {
  id: number;
  title: string;
  message?: string;
  category: NotificationCategory;
  target: string;
  channel: "APP_PUSH" | "SMS" | "EMAIL";
  sentAt: string;
  status: "SENT" | "SCHEDULED" | "DRAFT";
  readRate: number;
  deliveredCount: number;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  campaignType?: CampaignType;
  actionType?: ActionType;
  actionValue?: string | null;
  ctaLabel?: string | null;
  priority?: number;
  expiresAt?: string | null;
  metadata?: {
    campaignCode?: string;
    badgeText?: string;
    promoCode?: string;
    [key: string]: any;
  };
}

const CAMPAIGN_LABELS: Record<CampaignType, string> = {
  STANDARD: "Thông báo thường",
  PROMO_BANNER: "Banner quảng cáo",
  NEW_DEVICE: "Thiết bị mới",
  CAMPAIGN: "Chiến dịch",
};

const INITIAL_FORM = {
  title: "",
  category: "SYSTEM" as NotificationCategory,
  campaignType: "STANDARD" as CampaignType,
  targetType: "ALL",
  targetModel: "AUSTEC-DOOR-A500",
  channel: "APP_PUSH" as "APP_PUSH" | "SMS" | "EMAIL",
  body: "",
  scheduleMode: "NOW",
  scheduleTime: "",
  imageUrl: "",
  bannerUrl: "",
  actionType: "NONE" as ActionType,
  actionValue: "",
  ctaLabel: "",
  priority: 0,
  expiresAt: "",
  badgeText: "",
  campaignCode: "",
};

export default function NotificationsManagementPage() {
  useLanguage();
  const { canView, canCreate, canDelete } = usePermissions();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [notiPage, setNotiPage] = useState(1);
  const [notiPageSize, setNotiPageSize] = useState(10);

  // Modal & Upload State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NotificationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingField, setUploadingField] = useState<"bannerUrl" | "imageUrl" | null>(null);
  const [composeForm, setComposeForm] = useState(INITIAL_FORM);

  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const resolveMediaUrl = (url?: string | null) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${getApiBaseUrl()}${url.startsWith("/") ? url : `/${url}`}`;
  };

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token"
          : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch (e) {
      console.warn("Lỗi nạp danh sách thông báo:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filteredNotis = notifications.filter((n) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      n.title.toLowerCase().includes(q) ||
      (n.target || "").toLowerCase().includes(q) ||
      (n.metadata?.campaignCode || "").toLowerCase().includes(q);
    const matchCat = !filterCategory || n.category === filterCategory;
    const matchStatus = !filterStatus || n.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  useEffect(() => {
    setNotiPage(1);
  }, [searchQuery, filterCategory, filterStatus]);

  const paginatedNotis = useMemo(() => {
    const start = (notiPage - 1) * notiPageSize;
    return filteredNotis.slice(start, start + notiPageSize);
  }, [filteredNotis, notiPage, notiPageSize]);

  const handleUploadMedia = async (
    file: File | undefined,
    field: "bannerUrl" | "imageUrl"
  ) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp hình ảnh (PNG, JPG, WebP...)");
      return;
    }

    try {
      setUploadingField(field);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token"
          : "austec-admin-super-token";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", field === "bannerUrl" ? "notifications/banners" : "notifications/images");

      const res = await fetch(`${getApiBaseUrl()}/api/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setComposeForm((prev) => ({
          ...prev,
          [field]: data.url,
          campaignType:
            field === "bannerUrl" && prev.campaignType === "STANDARD"
              ? "PROMO_BANNER"
              : prev.campaignType,
        }));
        toast.success(
          field === "bannerUrl"
            ? "Đã tải banner quảng cáo lên thành công!"
            : "Đã tải hình ảnh đính kèm thành công!"
        );
      } else {
        toast.error(data.error || "Không thể tải ảnh lên máy chủ");
      }
    } catch (err: any) {
      toast.error(`Lỗi tải ảnh: ${err.message}`);
    } finally {
      setUploadingField(null);
      if (field === "bannerUrl" && bannerInputRef.current) bannerInputRef.current.value = "";
      if (field === "imageUrl" && imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeForm.title.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token"
          : "austec-admin-super-token";

      const metadata: Record<string, any> = {};
      if (composeForm.badgeText.trim()) metadata.badgeText = composeForm.badgeText.trim();
      if (composeForm.campaignCode.trim()) metadata.campaignCode = composeForm.campaignCode.trim();

      const payload = {
        title: composeForm.title.trim(),
        message: composeForm.body.trim(),
        category: composeForm.category,
        campaignType: composeForm.campaignType,
        channel: composeForm.channel,
        target:
          composeForm.targetType === "ALL"
            ? "Tất cả khách hàng (Toàn hệ thống)"
            : `Model: ${composeForm.targetModel}`,
        targetModel: composeForm.targetType === "ALL" ? undefined : composeForm.targetModel,
        status: composeForm.scheduleMode === "NOW" ? "SENT" : "SCHEDULED",
        scheduleTime: composeForm.scheduleMode === "NOW" ? undefined : composeForm.scheduleTime,
        imageUrl: composeForm.imageUrl.trim() || undefined,
        bannerUrl: composeForm.bannerUrl.trim() || undefined,
        actionType: composeForm.actionType,
        actionValue: composeForm.actionValue.trim() || undefined,
        ctaLabel: composeForm.ctaLabel.trim() || undefined,
        priority: composeForm.priority,
        expiresAt: composeForm.expiresAt.trim() || undefined,
        metadata,
      };

      const res = await fetch(`${getApiBaseUrl()}/api/admin/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success && data.notification) {
        setNotifications((prev) => [data.notification, ...prev]);
        setIsComposeOpen(false);
        toast.success(
          composeForm.scheduleMode === "NOW"
            ? "Đã phát sóng thông báo thành công đến các thiết bị!"
            : "Đã lên lịch phát sóng thông báo thành công!"
        );
        setComposeForm(INITIAL_FORM);
      } else {
        toast.error(data.error || "Không thể gửi thông báo");
      }
    } catch (err: any) {
      toast.error(`Lỗi gửi thông báo: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (item: NotificationItem) => {
    if (!canDelete("mod_noti")) return;
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token"
          : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/notifications/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== deleteTarget.id));
        toast.success("Đã xóa thông báo thành công!");
        setDeleteTarget(null);
      } else {
        toast.error(data.error || "Không thể xóa thông báo");
      }
    } catch (e: any) {
      toast.error(`Lỗi xóa: ${e.message}`);
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

  const previewMedia = composeForm.bannerUrl.trim() || composeForm.imageUrl.trim();

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2 overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-2.5 shrink-0">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Thông báo hệ thống & Banner quảng cáo
          </h1>
        </div>

        {canCreate("mod_noti") && (
          <button
            type="button"
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer w-fit"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Soạn thông báo / Banner</span>
          </button>
        )}
      </div>

      {/* Filter / Search Bar */}
      <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row gap-2 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, đối tượng, mã chiến dịch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="flex-1 sm:flex-none text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Tất cả phân loại</option>
            <option value="SYSTEM">Hệ thống</option>
            <option value="MAINTENANCE">Bảo trì</option>
            <option value="OTA_UPDATE">Firmware OTA</option>
            <option value="ALERT">Cảnh báo kỹ thuật</option>
            <option value="PROMO">Khuyến mại / CSKH</option>
            <option value="AD_BANNER">Quảng cáo / Banner</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 sm:flex-none text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
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
          <table className="w-full text-left text-xs min-w-[900px]">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px] sticky top-0 z-10">
              <tr>
                <th className="p-2.5 w-12 text-center">ID</th>
                <th className="p-2.5">Nội dung & Hình ảnh / Banner</th>
                <th className="p-2.5">Phân loại / Chiến dịch</th>
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
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Đang tải danh sách thông báo...
                  </td>
                </tr>
              ) : filteredNotis.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Không tìm thấy thông báo nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedNotis.map((n: NotificationItem) => {
                  const thumb = resolveMediaUrl(n.bannerUrl || n.imageUrl);
                  const campType = (n.campaignType || "STANDARD") as CampaignType;
                  return (
                    <tr
                      key={n.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-2.5 text-center text-slate-500 font-mono">#{n.id}</td>
                      <td className="p-2.5 max-w-sm">
                        <div className="flex items-center gap-2.5">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={n.title}
                              className="w-14 h-9 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800"
                            />
                          ) : (
                            <div className="w-10 h-9 rounded-md border border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-400">
                              <ImageIcon className="w-4 h-4 opacity-50" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {(n.priority || 0) > 0 && (
                                <Pin className="w-3 h-3 text-blue-500 shrink-0" />
                              )}
                              <span className="font-semibold text-slate-900 dark:text-white truncate">
                                {n.title}
                              </span>
                            </div>
                            {n.message && n.message !== n.title && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {n.message}
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {n.bannerUrl && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9.5px] font-semibold">
                                  Banner
                                </span>
                              )}
                              {n.ctaLabel && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9.5px] font-semibold">
                                  CTA: {n.ctaLabel}
                                </span>
                              )}
                              {n.metadata?.campaignCode && (
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9.5px] font-mono">
                                  {n.metadata.campaignCode}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-2.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              n.category === "MAINTENANCE"
                                ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                : n.category === "OTA_UPDATE"
                                ? "bg-cyan-500/10 text-cyan-600 border border-cyan-500/20"
                                : n.category === "ALERT"
                                ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                : n.category === "AD_BANNER" || n.category === "PROMO"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {n.category}
                          </span>
                          {campType !== "STANDARD" && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {CAMPAIGN_LABELS[campType] || campType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300 font-medium">
                        {n.target}
                      </td>
                      <td className="p-2.5">
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                          {n.channel === "APP_PUSH" && (
                            <Smartphone className="w-3.5 h-3.5 text-cyan-500" />
                          )}
                          {n.channel === "SMS" && (
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          {n.channel === "EMAIL" && (
                            <Mail className="w-3.5 h-3.5 text-indigo-500" />
                          )}
                          <span>{n.channel === "APP_PUSH" ? "App Mobile" : n.channel}</span>
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                        <div>{n.sentAt}</div>
                        {n.expiresAt && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400">
                            Hết hạn: {n.expiresAt.slice(0, 10)}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            n.status === "SENT"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : n.status === "SCHEDULED"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {n.status === "SENT"
                            ? "Đã gửi"
                            : n.status === "SCHEDULED"
                            ? "Chờ gửi"
                            : "Bản nháp"}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-[11px]">
                        {n.status === "SENT" ? (
                          <div>
                            <strong className="text-slate-900 dark:text-white">
                              {n.deliveredCount.toLocaleString()}
                            </strong>{" "}
                            TB
                            <span className="text-emerald-600 dark:text-emerald-400 ml-1 font-bold">
                              ({n.readRate}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">
                            Dự kiến ~{n.deliveredCount.toLocaleString()} TB
                          </span>
                        )}
                      </td>
                      {canDelete("mod_noti") && (
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => handleDelete(n)}
                            className="p-1 rounded text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
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

      {/* Compose Notification & Banner Modal */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-blue-500" />
                <span>Soạn Thảo Thông Báo & Banner Quảng Cáo</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsComposeOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSendNotification}
              className="p-4 space-y-3.5 overflow-y-auto flex-1"
            >
              {/* Row 1: Category, Campaign Type, Channel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Phân loại *
                  </label>
                  <select
                    value={composeForm.category}
                    onChange={(e) => {
                      const cat = e.target.value as NotificationCategory;
                      setComposeForm((prev) => ({
                        ...prev,
                        category: cat,
                        campaignType:
                          cat === "AD_BANNER" && prev.campaignType === "STANDARD"
                            ? "PROMO_BANNER"
                            : prev.campaignType,
                      }));
                    }}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="SYSTEM">Hệ thống chung</option>
                    <option value="MAINTENANCE">Thông báo bảo trì</option>
                    <option value="OTA_UPDATE">Nâng cấp Firmware OTA</option>
                    <option value="ALERT">Cảnh báo kỹ thuật khẩn</option>
                    <option value="PROMO">Khuyến mãi / CSKH</option>
                    <option value="AD_BANNER">Quảng cáo / Thiết bị mới</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Hình thức hiển thị
                  </label>
                  <select
                    value={composeForm.campaignType}
                    onChange={(e) =>
                      setComposeForm({
                        ...composeForm,
                        campaignType: e.target.value as CampaignType,
                      })
                    }
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="STANDARD">Thông báo thường</option>
                    <option value="PROMO_BANNER">Banner quảng cáo</option>
                    <option value="NEW_DEVICE">Giới thiệu thiết bị mới</option>
                    <option value="CAMPAIGN">Chiến dịch / Sự kiện</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Kênh phát sóng *
                  </label>
                  <select
                    value={composeForm.channel}
                    onChange={(e) =>
                      setComposeForm({ ...composeForm, channel: e.target.value as any })
                    }
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="APP_PUSH">Mobile App Push</option>
                    <option value="SMS">Tin nhắn SMS</option>
                    <option value="EMAIL">Thư điện tử Email</option>
                  </select>
                </div>
              </div>

              {/* Title & Body */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tiêu đề thông báo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Ra mắt Cửa cuốn thông minh Austec Pro 2026 - Ưu đãi 15%..."
                  value={composeForm.title}
                  onChange={(e) => setComposeForm({ ...composeForm, title: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nội dung chi tiết *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Mô tả chi tiết thông báo, ưu đãi hoặc thông tin thiết bị mới..."
                  value={composeForm.body}
                  onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Media Upload Section: Banner & Image */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                    Hình ảnh & Banner quảng cáo (tùy chọn)
                  </span>
                  <span className="text-[10.5px] text-slate-500">
                    Hỗ trợ tải ảnh trực tiếp hoặc dán đường dẫn URL
                  </span>
                </div>

                {/* Banner URL */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                    Ảnh Banner quảng cáo (khổ ngang 16:9)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://... hoặc bấm Tải banner"
                      value={composeForm.bannerUrl}
                      onChange={(e) =>
                        setComposeForm({ ...composeForm, bannerUrl: e.target.value })
                      }
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                    <input
                      ref={bannerInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadMedia(e.target.files?.[0], "bannerUrl")}
                    />
                    <button
                      type="button"
                      disabled={uploadingField !== null}
                      onClick={() => bannerInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {uploadingField === "bannerUrl" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>Tải banner</span>
                    </button>
                    {composeForm.bannerUrl && (
                      <button
                        type="button"
                        onClick={() => setComposeForm({ ...composeForm, bannerUrl: "" })}
                        className="px-2 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        title="Xóa banner"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Thumbnail Image URL */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                    Ảnh minh họa nhỏ (tùy chọn khi không dùng banner ngang)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://... hoặc bấm Tải ảnh"
                      value={composeForm.imageUrl}
                      onChange={(e) =>
                        setComposeForm({ ...composeForm, imageUrl: e.target.value })
                      }
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadMedia(e.target.files?.[0], "imageUrl")}
                    />
                    <button
                      type="button"
                      disabled={uploadingField !== null}
                      onClick={() => imageInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300/70 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      {uploadingField === "imageUrl" ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>Tải ảnh</span>
                    </button>
                    {composeForm.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setComposeForm({ ...composeForm, imageUrl: "" })}
                        className="px-2 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                        title="Xóa ảnh"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Campaign / CTA Section */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  Tùy chọn nút hành động (CTA) & Chiến dịch
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Hành động khi bấm
                    </label>
                    <select
                      value={composeForm.actionType}
                      onChange={(e) =>
                        setComposeForm({
                          ...composeForm,
                          actionType: e.target.value as ActionType,
                        })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="NONE">Chỉ xem nội dung</option>
                      <option value="OPEN_SHOP">Mở Gian hàng thiết bị</option>
                      <option value="OPEN_CHAT">Mở Chat tư vấn CSKH</option>
                      <option value="OPEN_URL">Mở đường dẫn Web (URL)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Chữ nút hành động (CTA)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Xem thiết bị / Tư vấn ngay"
                      value={composeForm.ctaLabel}
                      onChange={(e) =>
                        setComposeForm({ ...composeForm, ctaLabel: e.target.value })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Nhãn nổi bật (Badge)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: MỚI, HOT, -15%"
                      value={composeForm.badgeText}
                      onChange={(e) =>
                        setComposeForm({ ...composeForm, badgeText: e.target.value })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {composeForm.actionType !== "NONE" && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      {composeForm.actionType === "OPEN_URL"
                        ? "Đường dẫn trang đích (URL)"
                        : composeForm.actionType === "OPEN_CHAT"
                        ? "Nội dung tin nhắn gợi ý gửi CSKH (tùy chọn)"
                        : "Từ khóa / Mã sản phẩm trong gian hàng (tùy chọn)"}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        composeForm.actionType === "OPEN_URL"
                          ? "https://austec.vn/khuyen-mai..."
                          : composeForm.actionType === "OPEN_CHAT"
                          ? "Tôi muốn tư vấn thêm về chương trình này..."
                          : "VD: AUSTEC-DOOR-A500"
                      }
                      value={composeForm.actionValue}
                      onChange={(e) =>
                        setComposeForm({ ...composeForm, actionValue: e.target.value })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Mã chiến dịch (tùy chọn)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: CAMP-2026-Q4"
                      value={composeForm.campaignCode}
                      onChange={(e) =>
                        setComposeForm({ ...composeForm, campaignCode: e.target.value })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                      Hạn hiển thị (tùy chọn)
                    </label>
                    <input
                      type="datetime-local"
                      value={composeForm.expiresAt}
                      onChange={(e) =>
                        setComposeForm({ ...composeForm, expiresAt: e.target.value })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <label className="flex items-center gap-2 pt-4 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={composeForm.priority > 0}
                      onChange={(e) =>
                        setComposeForm({
                          ...composeForm,
                          priority: e.target.checked ? 1 : 0,
                        })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Ghim ưu tiên lên đầu</span>
                  </label>
                </div>
              </div>

              {/* Target & Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Đối tượng nhận *
                  </label>
                  <select
                    value={composeForm.targetType}
                    onChange={(e) =>
                      setComposeForm({ ...composeForm, targetType: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">Tất cả khách hàng sử dụng App</option>
                    <option value="MODEL">Theo dòng sản phẩm (Model)</option>
                  </select>
                </div>

                {composeForm.targetType === "MODEL" ? (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Chọn Model thiết bị
                    </label>
                    <select
                      value={composeForm.targetModel}
                      onChange={(e) =>
                        setComposeForm({ ...composeForm, targetModel: e.target.value })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="AUSTEC-DOOR-A500">Cửa cuốn Austec A500</option>
                      <option value="UPS-SIN-220V">Bộ lưu điện UPS 220V</option>
                      <option value="LOCK-MASARU-PRO">Khóa Masaru Pro</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Thời gian phát
                    </label>
                    <select
                      value={composeForm.scheduleMode}
                      onChange={(e) =>
                        setComposeForm({ ...composeForm, scheduleMode: e.target.value })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="NOW">Gửi ngay lập tức</option>
                      <option value="SCHEDULE">Lên lịch hẹn giờ</option>
                    </select>
                  </div>
                )}
              </div>

              {composeForm.targetType === "MODEL" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Thời gian phát
                    </label>
                    <select
                      value={composeForm.scheduleMode}
                      onChange={(e) =>
                        setComposeForm({ ...composeForm, scheduleMode: e.target.value })
                      }
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="NOW">Gửi ngay lập tức</option>
                      <option value="SCHEDULE">Lên lịch hẹn giờ</option>
                    </select>
                  </div>
                  {composeForm.scheduleMode === "SCHEDULE" && (
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Chọn ngày giờ phát
                      </label>
                      <input
                        type="datetime-local"
                        value={composeForm.scheduleTime}
                        onChange={(e) =>
                          setComposeForm({ ...composeForm, scheduleTime: e.target.value })
                        }
                        className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {composeForm.targetType === "ALL" && composeForm.scheduleMode === "SCHEDULE" && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Chọn ngày giờ phát
                  </label>
                  <input
                    type="datetime-local"
                    value={composeForm.scheduleTime}
                    onChange={(e) =>
                      setComposeForm({ ...composeForm, scheduleTime: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {/* Live Mobile Preview */}
              {(composeForm.title || previewMedia) && (
                <div className="p-3 rounded-lg border border-blue-500/25 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
                  <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    Xem trước trên Mobile App
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-xs max-w-md">
                    {previewMedia && (
                      <div className="relative w-full aspect-[16/8] bg-slate-100 dark:bg-slate-800">
                        <img
                          src={resolveMediaUrl(previewMedia)}
                          alt="Banner preview"
                          className="w-full h-full object-cover"
                        />
                        {(composeForm.badgeText ||
                          composeForm.campaignType !== "STANDARD") && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold shadow-xs">
                            {composeForm.badgeText ||
                              CAMPAIGN_LABELS[composeForm.campaignType]}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="p-3 space-y-1">
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {composeForm.title || "Tiêu đề thông báo"}
                      </div>
                      {composeForm.body && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
                          {composeForm.body}
                        </p>
                      )}
                      {composeForm.actionType !== "NONE" && (
                        <div className="pt-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 text-white text-[10.5px] font-semibold">
                            <span>{composeForm.ctaLabel || "Xem chi tiết"}</span>
                            <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || uploadingField !== null}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs cursor-pointer transition-colors disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Đang gửi..."
                    : composeForm.scheduleMode === "NOW"
                    ? "Phát Sóng Ngay"
                    : "Lưu Lịch Phát"}
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
