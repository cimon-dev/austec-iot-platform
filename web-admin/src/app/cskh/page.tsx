"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Headphones, 
  Send, 
  Paperclip, 
  AlertTriangle, 
  Wifi, 
  Battery, 
  Activity, 
  CheckCircle2, 
  Clock, 
  User, 
  MessageSquare,
  Search,
  RefreshCw,
  FileText,
  Mail,
  Phone,
  Bell,
  Image as ImageIcon,
  Check,
  X,
  Plus,
  Filter,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Radio
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";
import { Pagination } from "@/components/Pagination";

interface Ticket {
  id: string;
  customerName: string;
  customerPhone: string;
  hardwareId: string;
  deviceName: string;
  subject: string;
  status: "OPEN" | "PROCESSING" | "RESOLVED";
  priority: "URGENT" | "NORMAL" | "LOW";
  createdAt: string;
  messages: Array<{
    sender: "CUSTOMER" | "CSKH";
    text: string;
    time: string;
    hasSnapshot?: boolean;
  }>;
  technicalSnapshot: {
    model: string;
    fwVersion: string;
    rssi: number;
    battery: number;
    isOnline: boolean;
    lastHeartbeat: string;
    diagnostics: string;
  };
}

interface SupportRequestTicket {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  hardwareId?: string;
  deviceName?: string;
  requestType: "TECHNICAL" | "SETUP" | "WARRANTY" | "RENEWAL" | "FEEDBACK";
  description: string;
  images: string[];
  replyChannel: "EMAIL" | "PUSH" | "PHONE";
  preferredContactTime?: string;
  status: "PENDING" | "PROCESSING" | "RESOLVED" | "REJECTED";
  adminResponse?: string;
  respondedAt?: string;
  createdAt: string;
}

const INITIAL_SUPPORT_REQUESTS: SupportRequestTicket[] = [
  {
    id: "REQ-1001",
    customerId: "USR-008712",
    customerName: "Nguyễn Mạnh Đức",
    customerPhone: "0944 102 588",
    customerEmail: "duc.nguyen@austec.vn",
    hardwareId: "AT-DOOR-88239A01",
    deviceName: "Cửa cuốn Gara Đức Mạnh",
    requestType: "TECHNICAL",
    description: "Cửa cuốn khi bấm đóng từ xa thỉnh thoảng khựng lại 1-2 giây rồi mới tiếp tục đóng hết hành trình. Nhờ kỹ thuật kiểm tra log motor và sensor chống xô.",
    images: [
      "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80"
    ],
    replyChannel: "PHONE",
    preferredContactTime: "Sau 17:30 chiều các ngày trong tuần",
    status: "PROCESSING",
    adminResponse: "Kỹ thuật đã kiểm tra telemetry. Dòng tải bình thường, đề xuất hẹn kỹ thuật viên qua kiểm tra ray trượt lúc 17h30 chiều mai.",
    respondedAt: "2026-10-21 14:15",
    createdAt: "2026-10-21 09:30"
  },
  {
    id: "REQ-1002",
    customerId: "USR-009941",
    customerName: "Dan Phung",
    customerPhone: "0906 806 066",
    customerEmail: "dan.phung@austec.vn",
    hardwareId: "AT-LOCK-77124B02",
    deviceName: "Khóa chính Biệt thự Dan Phung",
    requestType: "SETUP",
    description: "Nhờ trung tâm hỗ trợ cấu hình phân quyền mở khóa vân tay cho 2 thành viên mới trong gia đình và thiết lập khung giờ vào nhà.",
    images: [],
    replyChannel: "EMAIL",
    preferredContactTime: "Bất kỳ lúc nào qua Email",
    status: "PENDING",
    createdAt: "2026-10-21 11:20"
  },
  {
    id: "REQ-1003",
    customerId: "USR-001928",
    customerName: "Nguyễn Văn Nam",
    customerPhone: "0912 345 678",
    customerEmail: "nam.nv@gmail.com",
    hardwareId: "AT-DOOR-88239A",
    deviceName: "Cửa Cuốn Austec Titadoor Super",
    requestType: "RENEWAL",
    description: "Tôi muốn gia hạn thêm gói dịch vụ 24 tháng cho thiết bị cửa cuốn nhà tôi và xuất hóa đơn VAT điện tử công ty.",
    images: [],
    replyChannel: "EMAIL",
    preferredContactTime: "Giờ hành chính 08:30 - 17:00",
    status: "RESOLVED",
    adminResponse: "Đã tạo đơn gia hạn 24 tháng và gửi link thanh toán + hóa đơn điện tử về email nam.nv@gmail.com.",
    respondedAt: "2026-10-21 15:45",
    createdAt: "2026-10-20 16:00"
  },
  {
    id: "REQ-1004",
    customerId: "USR-013441",
    customerName: "Hoàng Bích Thủy",
    customerPhone: "0934 556 789",
    customerEmail: "thuy.hb@gmail.com",
    hardwareId: "AT-SENSOR-TH-8803",
    deviceName: "Cảm Biến Nhiệt Ẩm Phòng Master",
    requestType: "WARRANTY",
    description: "Cảm biến nhiệt ẩm báo pin ảo và sai lệch độ ẩm khoảng 15% so với máy đo chuyên dụng, cần bảo hành hoặc đổi pin chuẩn.",
    images: [
      "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600&auto=format&fit=crop&q=80"
    ],
    replyChannel: "PUSH",
    preferredContactTime: "Sáng 09:00 - 11:00",
    status: "PENDING",
    createdAt: "2026-10-21 13:40"
  }
];

function CSKHContent() {
  const { t, language } = useLanguage();
  const { canView, canUpdate, canCreate } = usePermissions();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"chat" | "tickets">(tabParam === "tickets" ? "tickets" : "chat");

  const switchTab = (tab: "chat" | "tickets") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/cskh?tab=${tab}`);
    }
  };

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // =========================================================================
  // TAB 1: LIVE 1-1 CHAT
  // =========================================================================
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isRebooting, setIsRebooting] = useState(false);
  const [mobileTab, setMobileTab] = useState<"tickets" | "chat" | "telemetry">("chat");

  const currentTicket = tickets.find((t) => t.id === selectedTicketId) || (tickets.length > 0 ? tickets[0] : null);

  const filteredTickets = tickets.filter((t) => {
    const q = ticketSearch.toLowerCase();
    return (
      t.id.toLowerCase().includes(q) ||
      t.customerName.toLowerCase().includes(q) ||
      t.customerPhone.includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.deviceName.toLowerCase().includes(q) ||
      t.hardwareId.toLowerCase().includes(q)
    );
  });

  const fetchLiveTickets = () => {
    fetch("http://localhost:4000/api/cskh/tickets", {
      headers: { "Authorization": "Bearer austec-admin-super-token" }
    })
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.tickets)) {
          setTickets(res.tickets);
          setSelectedTicketId(prev => {
            if (!prev && res.tickets.length > 0) return res.tickets[0].id;
            if (prev && !res.tickets.some((t: any) => t.id === prev) && res.tickets.length > 0) return res.tickets[0].id;
            return prev;
          });
        }
      })
      .catch(() => {});
  };

  // Polling đồng bộ danh sách cuộc trò chuyện và tin nhắn 1-1 thời gian thực từ Mobile App
  useEffect(() => {
    fetchLiveTickets();
    const chatTimer = setInterval(fetchLiveTickets, 2500);
    return () => clearInterval(chatTimer);
  }, []);

  const handleSendReply = () => {
    if (!replyText.trim() || !currentTicket) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Optimistic local state update
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === currentTicket.id) {
          return {
            ...t,
            status: "PROCESSING",
            messages: [
              ...t.messages,
              {
                sender: "CSKH",
                text: replyText,
                time: timeStr,
              },
            ],
          };
        }
        return t;
      })
    );

    // Gửi tin nhắn vào đúng cuộc trò chuyện của khách hàng này
    fetch(`http://localhost:4000/api/cskh/tickets/${currentTicket.id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer austec-admin-super-token"
      },
      body: JSON.stringify({
        sender: "CSKH",
        text: replyText,
        message: replyText
      })
    })
      .then(() => fetchLiveTickets())
      .catch(() => {});

    setReplyText("");
    showToast("Đã gửi tin nhắn tới ứng dụng Mobile của khách hàng!");
  };

  const handleSoftReboot = () => {
    if (isRebooting || !currentTicket) return;
    const targetHwId = currentTicket.hardwareId;
    setIsRebooting(true);
    showToast(`Đang phát lệnh Soft Reboot tới ${targetHwId}...`);

    setTimeout(() => {
      setIsRebooting(false);
      showToast(`Thiết bị ${targetHwId} đã hoàn tất Soft Reboot thành công!`);
      
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === selectedTicketId) {
            return {
              ...t,
              messages: [
                ...t.messages,
                {
                  sender: "CSKH",
                  text: `[HỆ THỐNG]: Kỹ thuật viên CSKH đã gửi lệnh Khởi động lại vi điều khiển (Soft Reboot). Thiết bị đã kết nối lại bình thường.`,
                  time: timeStr,
                },
              ],
              technicalSnapshot: {
                ...t.technicalSnapshot,
                lastHeartbeat: "1 giây trước",
                diagnostics: "Thiết bị vừa được Soft Reboot thành công. Tất cả thông số đã trở về ngưỡng ổn định.",
              },
            };
          }
          return t;
        })
      );
    }, 2000);
  };

  const handleTriggerTelemetry = () => {
    if (!currentTicket) return;
    showToast(`Đang kéo dữ liệu Telemetry viễn thám từ ${currentTicket.hardwareId}...`);
    setTimeout(() => {
      showToast(`Đã đồng bộ thông số viễn thám thiết bị ${currentTicket.hardwareId} thành công!`);
    }, 1200);
  };

  // =========================================================================
  // TAB 2: SUPPORT SERVICE TICKETS / FORMS
  // =========================================================================
  const [supportRequests, setSupportRequests] = useState<SupportRequestTicket[]>(INITIAL_SUPPORT_REQUESTS);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("REQ-1001");
  const [requestFilterType, setRequestFilterType] = useState<string>("ALL");
  const [requestFilterStatus, setRequestFilterStatus] = useState<string>("ALL");
  const [requestSearchQuery, setRequestSearchQuery] = useState<string>("");
  const [isCreateRequestModalOpen, setIsCreateRequestModalOpen] = useState(false);
  const [adminReplyInput, setAdminReplyInput] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // Polling danh sách phiếu yêu cầu hỗ trợ từ Mobile App theo thời gian thực
  useEffect(() => {
    const fetchRequests = () => {
      fetch("http://localhost:4000/api/cskh/requests", {
        headers: { "Authorization": "Bearer austec-admin-super-token" }
      })
        .then(r => r.json())
        .then(res => {
          if (res.success && Array.isArray(res.requests) && res.requests.length > 0) {
            setSupportRequests(res.requests);
          }
        })
        .catch(() => {});
    };

    fetchRequests();
    const reqTimer = setInterval(fetchRequests, 3000);
    return () => clearInterval(reqTimer);
  }, []);

  // Filtered requests
  const filteredSupportRequests = useMemo(() => {
    return supportRequests.filter((r) => {
      const q = requestSearchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        r.id.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.hardwareId && r.hardwareId.toLowerCase().includes(q));

      const matchType = requestFilterType === "ALL" || r.requestType === requestFilterType;
      const matchStatus = requestFilterStatus === "ALL" || r.status === requestFilterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [supportRequests, requestSearchQuery, requestFilterType, requestFilterStatus]);

  const currentRequest = useMemo(() => {
    return supportRequests.find(r => r.id === selectedRequestId) || supportRequests[0] || null;
  }, [supportRequests, selectedRequestId]);

  // Update request status
  const handleUpdateRequestStatus = (requestId: string, newStatus: "PENDING" | "PROCESSING" | "RESOLVED" | "REJECTED") => {
    setSupportRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));

    fetch(`http://localhost:4000/api/cskh/requests/${requestId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer austec-admin-super-token"
      },
      body: JSON.stringify({ status: newStatus })
    }).catch(() => {});

    showToast(`Đã chuyển trạng thái phiếu ${requestId} thành "${newStatus}"`);
  };

  // Submit admin response to ticket
  const handleSendAdminResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyInput.trim() || !currentRequest) return;

    const nowStr = new Date().toLocaleString("vi-VN");
    const updated = {
      adminResponse: adminReplyInput.trim(),
      respondedAt: nowStr,
      status: "RESOLVED" as const
    };

    setSupportRequests(prev => prev.map(r => r.id === currentRequest.id ? { ...r, ...updated } : r));

    fetch(`http://localhost:4000/api/cskh/requests/${currentRequest.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer austec-admin-super-token"
      },
      body: JSON.stringify(updated)
    }).catch(() => {});

    setAdminReplyInput("");
    showToast(`Đã gửi phản hồi thành công qua ${currentRequest.replyChannel} cho khách hàng!`);
  };

  // Create request form state
  const [newRequestForm, setNewRequestForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    hardwareId: "AT-DOOR-88239A01",
    requestType: "TECHNICAL" as const,
    description: "",
    replyChannel: "PHONE" as const,
    preferredContactTime: "Trong giờ hành chính",
    imageUrl: ""
  });

  const handleCreateRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRequestForm.customerName.trim() || !newRequestForm.customerPhone.trim() || !newRequestForm.description.trim()) {
      alert("Vui lòng điền đủ Tên, Số điện thoại và Mô tả yêu cầu!");
      return;
    }

    const newReq: SupportRequestTicket = {
      id: `REQ-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: `USR-${Date.now().toString().slice(-6)}`,
      customerName: newRequestForm.customerName.trim(),
      customerPhone: newRequestForm.customerPhone.trim(),
      customerEmail: newRequestForm.customerEmail.trim(),
      hardwareId: newRequestForm.hardwareId,
      deviceName: "Thiết bị khách hàng",
      requestType: newRequestForm.requestType,
      description: newRequestForm.description.trim(),
      images: newRequestForm.imageUrl.trim() ? [newRequestForm.imageUrl.trim()] : [],
      replyChannel: newRequestForm.replyChannel,
      preferredContactTime: newRequestForm.preferredContactTime,
      status: "PENDING",
      createdAt: new Date().toLocaleString("vi-VN")
    };

    setSupportRequests([newReq, ...supportRequests]);
    setSelectedRequestId(newReq.id);
    setIsCreateRequestModalOpen(false);

    fetch("http://localhost:4000/api/cskh/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer austec-admin-super-token"
      },
      body: JSON.stringify(newReq)
    }).catch(() => {});

    showToast(`Đã tạo phiếu yêu cầu hỗ trợ mới mã ${newReq.id}!`);
  };

  // RBAC Gating
  if (!canView("mod_cskh")) {
    return (
      <AccessDenied 
        moduleTitle="Vận Hành & CSKH Hub (Customer Support Ops)"
        requiredPermission="Quyền truy cập Phân hệ CSKH (mod_cskh)"
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-slate-100 dark:bg-slate-950 p-2.5 space-y-2.5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-lg animate-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Trung Tâm Vận Hành CSKH & Hỗ Trợ Khách Hàng
              </h1>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                LIVE & TICKET HUB
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Kênh chat 1-1 trực tiếp và hệ thống tiếp nhận phiếu yêu cầu hỗ trợ dịch vụ từ Mobile App
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 shrink-0">
          <button
            type="button"
            onClick={() => switchTab("chat")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "chat"
                ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Trò Chuyện Trực Tuyến 1-1 ({tickets.length})</span>
          </button>
          <button
            type="button"
            onClick={() => switchTab("tickets")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "tickets"
                ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Phiếu Yêu Cầu Hỗ Trợ ({supportRequests.length})</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: LIVE 1-1 CSKH CHAT */}
      {/* ===================================================================== */}
      {activeTab === "chat" && (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2.5 overflow-hidden">
          {/* Left Column: Tickets Queue */}
          <div className="w-full md:w-80 shrink-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Hàng Chờ CSKH</span>
                <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                  {filteredTickets.length} luồng
                </span>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo Serial, tên, SĐT..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className="w-full text-xs pl-7 pr-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTickets.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2 opacity-60" />
                  <p className="font-semibold text-slate-600 dark:text-slate-400">Chưa có cuộc trò chuyện nào</p>
                  <p className="text-[11px] text-slate-400 mt-1">Hàng chờ sẽ tự động cập nhật khi khách hàng bắt đầu chat từ Mobile App.</p>
                </div>
              ) : (
                filteredTickets.map((t) => {
                  const isSelected = selectedTicketId === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTicketId(t.id);
                        setMobileTab("chat");
                      }}
                      className={`p-2.5 cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-cyan-50 dark:bg-cyan-950/40 border-l-4 border-cyan-500"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-cyan-600 dark:text-cyan-400">{t.id}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          t.priority === "URGENT" 
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}>
                          {t.priority === "URGENT" ? "KHẨN CẤP" : "THƯỜNG"}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white text-xs mt-1 truncate">{t.customerName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{t.subject}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                        <span>{t.customerPhone}</span>
                        <span>{t.createdAt ? t.createdAt.split("T")[0] : ""}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Middle Column: Chat Window */}
          <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {!currentTicket ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-900/50">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-3 border border-cyan-500/20 shadow-inner">
                  <Headphones className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  Chưa Có Cuộc Trò Chuyện Nào Đang Hoạt Động
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
                  Khi khách hàng nhấn nút <strong>&quot;Bắt đầu cuộc trò chuyện&quot;</strong> trên Austec Mobile App, luồng tin nhắn sẽ tự động kết nối và xuất hiện tại đây theo thời gian thực để CSKH hỗ trợ.
                </p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                      <span>{currentTicket.customerName}</span>
                      <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">{currentTicket.customerPhone}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 font-mono">
                      <span>Thiết bị: {currentTicket.hardwareId}</span>
                      <span>•</span>
                      <span>{currentTicket.deviceName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Đang đồng bộ Mobile
                    </span>
                  </div>
                </div>

                {/* Chat Messages Log */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
                  {currentTicket.messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${m.sender === "CSKH" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] p-2.5 rounded-xl text-xs leading-relaxed ${
                          m.sender === "CSKH"
                            ? "bg-cyan-600 text-white rounded-br-none"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none border border-slate-200 dark:border-slate-700/60"
                        }`}
                      >
                        {m.text}
                      </div>
                      <span className="text-[9px] text-slate-400 font-mono mt-0.5 px-1">{m.time}</span>
                    </div>
                  ))}
                </div>

                {/* Input Bar */}
                <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    placeholder="Nhập nội dung phản hồi cho khách hàng..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                    className="flex-1 text-xs px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendReply}
                    className="px-3.5 py-2 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right Column: Telemetry & Live Diagnostics */}
          <div className="w-full md:w-72 shrink-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-500" />
                <span>Chẩn Đoán Viễn Thám</span>
              </span>
            </div>

            {!currentTicket ? (
              <div className="p-6 text-center text-xs text-slate-400">
                Chưa có thiết bị kết nối viễn thám
              </div>
            ) : (
              <div className="p-3 space-y-2.5 overflow-y-auto flex-1 text-xs">
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Model:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{currentTicket.technicalSnapshot?.model || "Austec Titadoor A900 Super"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Firmware:</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{currentTicket.technicalSnapshot?.fwVersion || "v2.4.1"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Sóng Wi-Fi:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Wifi className="w-3 h-3" /> {currentTicket.technicalSnapshot?.rssi ?? -62} dBm
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Pin / Nguồn:</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <Battery className="w-3 h-3" /> {currentTicket.technicalSnapshot?.battery ?? 98}%
                    </span>
                  </div>
                </div>

                {/* Diagnostics Box */}
                <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-950/10 dark:bg-amber-950/20 space-y-1 text-[11px]">
                  <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Phát hiện hệ thống:</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {currentTicket.technicalSnapshot?.diagnostics || "Thiết bị hoạt động ổn định. Telemetry trực tuyến."}
                  </p>
                </div>

                {/* Remote Actions */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider block">Tác vụ khẩn cấp</span>
                  <button
                    type="button"
                    onClick={handleSoftReboot}
                    disabled={isRebooting}
                    className="w-full py-1.5 px-2.5 rounded-md text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRebooting ? "animate-spin" : ""}`} />
                    <span>{isRebooting ? "Đang gửi tín hiệu..." : "Soft Reboot Bo Mạch"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTriggerTelemetry}
                    className="w-full py-1.5 px-2.5 rounded-md text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Kéo Telemetry Viễn Thám</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: SERVICE TICKETS / SUPPORT REQUEST FORM */}
      {/* ===================================================================== */}
      {activeTab === "tickets" && (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2.5 overflow-hidden">
          {/* Left Column: Tickets Table & Filters */}
          <div className="flex-1 min-w-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Filter Toolbar */}
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm mã phiếu, khách, SĐT, serial..."
                    value={requestSearchQuery}
                    onChange={(e) => setRequestSearchQuery(e.target.value)}
                    className="text-xs pl-7 pr-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white w-52 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <select
                  value={requestFilterType}
                  onChange={(e) => setRequestFilterType(e.target.value)}
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
                  onChange={(e) => setRequestFilterStatus(e.target.value)}
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
                onClick={() => setIsCreateRequestModalOpen(true)}
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
                  {filteredSupportRequests.map((req) => {
                    const isSelected = selectedRequestId === req.id;
                    return (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedRequestId(req.id)}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                          isSelected ? "bg-cyan-50/70 dark:bg-cyan-950/40 border-l-2 border-cyan-500" : ""
                        }`}
                      >
                        <td className="p-2.5 font-mono text-cyan-600 dark:text-cyan-400 font-bold">{req.id}</td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-900 dark:text-white">{req.customerName}</div>
                          <div className="font-mono text-[10px] text-slate-500">{req.customerPhone}</div>
                        </td>
                        <td className="p-2.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            req.requestType === "TECHNICAL"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                              : req.requestType === "RENEWAL"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : req.requestType === "WARRANTY"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          }`}>
                            {req.requestType === "TECHNICAL" ? "SỰ CỐ KỸ THUẬT" : req.requestType === "RENEWAL" ? "GIA HẠN" : req.requestType === "WARRANTY" ? "BẢO HÀNH" : "HƯỚNG DẪN"}
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
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            req.status === "RESOLVED"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : req.status === "PROCESSING"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : req.status === "REJECTED"
                              ? "bg-slate-200 dark:bg-slate-700 text-slate-500 border-slate-300 dark:border-slate-600"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          }`}>
                            {req.status === "RESOLVED" ? "ĐÃ XỬ LÝ" : req.status === "PROCESSING" ? "ĐANG XỬ LÝ" : req.status === "PENDING" ? "MỚI GỬI" : "TỪ CHỐI"}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-[10px] text-slate-400">{req.createdAt}</td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequestId(req.id);
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
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Ticket Inspector Details & Resolution Form */}
          {currentRequest && (
            <div className="w-full md:w-96 shrink-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
                <div>
                  <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase">
                    Chi Tiết Phiếu Yêu Cầu
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs">{currentRequest.id}</h3>
                </div>

                {/* Status Switcher */}
                <select
                  value={currentRequest.status}
                  onChange={(e) => handleUpdateRequestStatus(currentRequest.id, e.target.value as any)}
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
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Thông Tin Người Yêu Cầu</div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Khách hàng:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{currentRequest.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số điện thoại:</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{currentRequest.customerPhone}</span>
                  </div>
                  {currentRequest.customerEmail && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Email:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-mono text-[10px]">{currentRequest.customerEmail}</span>
                    </div>
                  )}
                  {currentRequest.hardwareId && (
                    <div className="flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500">Hardware ID:</span>
                      <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{currentRequest.hardwareId}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500">Kênh phản hồi:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {currentRequest.replyChannel === "EMAIL" ? "Gửi qua Email" : currentRequest.replyChannel === "PHONE" ? "Gọi điện trực tiếp" : "Thông báo Push App"}
                    </span>
                  </div>
                  {currentRequest.preferredContactTime && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Khung giờ hẹn:</span>
                      <span className="text-slate-700 dark:text-slate-300">{currentRequest.preferredContactTime}</span>
                    </div>
                  )}
                </div>

                {/* Request Content */}
                <div className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mô Tả Yêu Cầu Của Khách Hàng</div>
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 leading-relaxed text-[11px]">
                    {currentRequest.description}
                  </div>
                </div>

                {/* Attached Images */}
                {currentRequest.images.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>Hình Ảnh / Hiện Trường Đính Kèm ({currentRequest.images.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentRequest.images.map((imgUrl, i) => (
                        <div
                          key={i}
                          onClick={() => setImagePreviewUrl(imgUrl)}
                          className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <img src={imgUrl} alt="Hiện trường sự cố" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Existing Admin Response */}
                {currentRequest.adminResponse && (
                  <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/10 dark:bg-emerald-950/20 space-y-1 text-[11px]">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Đã phản hồi tới khách hàng
                      </span>
                      <span className="text-[9px] font-mono">{currentRequest.respondedAt}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {currentRequest.adminResponse}
                    </p>
                  </div>
                )}

                {/* Reply Form */}
                <form onSubmit={handleSendAdminResponse} className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Gửi Phản Hồi Giải Quyết Cho Khách Hàng:
                  </div>
                  <textarea
                    rows={3}
                    placeholder={`Nhập nội dung phản hồi gửi về ${currentRequest.replyChannel}...`}
                    value={adminReplyInput}
                    onChange={(e) => setAdminReplyInput(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 px-3 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi Phản Hồi & Hoàn Thành Phiếu</span>
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE NEW SERVICE REQUEST */}
      {/* ===================================================================== */}
      {isCreateRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Tiếp Nhận Phiếu Yêu Cầu Hỗ Trợ Mới
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateRequestModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequestSubmit} className="p-3.5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Họ và tên khách hàng *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A..."
                    value={newRequestForm.customerName}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, customerName: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Số điện thoại liên hệ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0912 345 678..."
                    value={newRequestForm.customerPhone}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, customerPhone: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Loại yêu cầu hỗ trợ (Combobox) *
                  </label>
                  <select
                    value={newRequestForm.requestType}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, requestType: e.target.value as any })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="TECHNICAL">Sự cố kỹ thuật / Thiết bị không chạy</option>
                    <option value="SETUP">Hướng dẫn cài đặt / Thêm thành viên</option>
                    <option value="WARRANTY">Bảo hành linh kiện / Đổi trả thiết bị</option>
                    <option value="RENEWAL">Gia hạn gói dịch vụ 12/24 tháng</option>
                    <option value="FEEDBACK">Góp ý trải nghiệm dịch vụ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Kênh nhận phản hồi mong muốn
                  </label>
                  <select
                    value={newRequestForm.replyChannel}
                    onChange={(e) => setNewRequestForm({ ...newRequestForm, replyChannel: e.target.value as any })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="PHONE">Gọi điện thoại trực tiếp</option>
                    <option value="EMAIL">Gửi thông báo qua Email</option>
                    <option value="PUSH">Gửi thông báo đẩy về Mobile App</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Mô tả chi tiết nội dung sự cố / nhu cầu *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Mô tả cụ thể hiện tượng, mã lỗi hoặc yêu cầu khách hàng muốn gửi..."
                  value={newRequestForm.description}
                  onChange={(e) => setNewRequestForm({ ...newRequestForm, description: e.target.value })}
                  className="w-full text-xs p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Link ảnh hiện trường (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="https://... hoặc URL hình ảnh hiện trường"
                  value={newRequestForm.imageUrl}
                  onChange={(e) => setNewRequestForm({ ...newRequestForm, imageUrl: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateRequestModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Tạo Phiếu Yêu Cầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMAGE ZOOM PREVIEW */}
      {imagePreviewUrl && (
        <div 
          onClick={() => setImagePreviewUrl(null)} 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-2xl max-h-[85vh] rounded-lg overflow-hidden border border-slate-700 shadow-2xl">
            <img src={imagePreviewUrl} alt="Chi tiết ảnh hiện trường" className="max-w-full max-h-[85vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function CSKHHubPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-500 font-mono">Đang tải trung tâm CSKH...</div>}>
      <CSKHContent />
    </Suspense>
  );
}
