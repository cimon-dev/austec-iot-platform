"use client";

import React, { useState } from "react";
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
  RefreshCw
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";

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

export default function CSKHHubPage() {
  const { t, language } = useLanguage();
  const { canView, canUpdate, canCreate } = usePermissions();

  const [tickets, setTickets] = useState<Ticket[]>([
    {
      id: "TICK-9081",
      customerName: "Nguyễn Mạnh Đức",
      customerPhone: "0944 102 588",
      hardwareId: "AT-DOOR-88239A01",
      deviceName: "Cửa cuốn Gara Đức Mạnh",
      subject: "Cửa cuốn phát tiếng kêu rít lạ khi bấm mở từ App",
      status: "OPEN",
      priority: "URGENT",
      createdAt: "5 phút trước",
      messages: [
        { sender: "CUSTOMER", text: "Chào kỹ thuật, tôi bấm mở cửa cuốn trên app thì nghe tiếng rít rất to ở motor, nhờ kiểm tra giúp.", time: "14:30", hasSnapshot: true },
        { sender: "CSKH", text: "Dạ em chào anh Đức. Hệ thống đã tự động nhận diện thiết bị của anh. Em kiểm tra thấy dòng motor hơi cao (4.8A), anh vui lòng tạm dừng cửa giúp em nhé.", time: "14:31" },
      ],
      technicalSnapshot: {
        model: "Austec Titadoor A900 Super",
        fwVersion: "v2.4.1",
        rssi: -62,
        battery: 98,
        isOnline: true,
        lastHeartbeat: "3 giây trước",
        diagnostics: "Cảnh báo: Dòng điện tải motor 4.8A (Ngưỡng an toàn < 4.0A). Nghi vấn kẹt ray hoặc khô dầu mỡ.",
      },
    },
    {
      id: "TICK-9082",
      customerName: "Dan Phung",
      customerPhone: "0906 806 066",
      hardwareId: "AT-LOCK-77124B02",
      deviceName: "Khóa chính Biệt thự",
      subject: "Hỏi cách tạo mã số OTP mở khóa từ xa cho người giúp việc",
      status: "PROCESSING",
      priority: "NORMAL",
      createdAt: "20 phút trước",
      messages: [
        { sender: "CUSTOMER", text: "Tôi muốn tạo mã mở cửa 1 lần cho người giúp việc vào nhà lúc 16h thì thao tác thế nào?", time: "14:15" },
      ],
      technicalSnapshot: {
        model: "Masaru Smart Lock X1 Pro",
        fwVersion: "v3.1.0",
        rssi: -58,
        battery: 92,
        isOnline: true,
        lastHeartbeat: "10 giây trước",
        diagnostics: "Thiết bị hoạt động hoàn hảo. Pin 92%. Đã kích hoạt tính năng OTP ảo.",
      },
    },
  ]);

  const [selectedTicketId, setSelectedTicketId] = useState<string>("TICK-9081");
  const [ticketSearch, setTicketSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isRebooting, setIsRebooting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"tickets" | "chat" | "telemetry">("chat");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const currentTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

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

  const handleSendReply = () => {
    if (!replyText.trim()) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === selectedTicketId) {
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
    setReplyText("");
  };

  const handleSoftReboot = () => {
    if (isRebooting) return;
    setIsRebooting(true);
    showToast(`Đang phát lệnh Soft Reboot tới ${currentTicket.hardwareId}...`);

    setTimeout(() => {
      setIsRebooting(false);
      showToast(`Thiết bị ${currentTicket.hardwareId} đã hoàn tất Soft Reboot thành công!`);
      
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

  // RBAC Gating
  if (!canView("mod_cskh")) {
    return (
      <AccessDenied 
        moduleName="Vận Hành & CSKH Hub (Customer Support Ops)"
        requiredModule="mod_cskh"
      />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2 overflow-hidden">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 border border-cyan-500/50 text-white shadow-2xl text-xs animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {language === "vi" ? "CSKH Hub & Live Chat Trực Tiếp" : "Customer Support Hub & Live Telemetry"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-500 dark:text-slate-400">{language === "vi" ? "Trực ban:" : "Specialist:"}</span>
          <span className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-lg font-bold">
            CSKH Specialist 01
          </span>
        </div>
      </div>

      {/* Mobile Workspace Segmented Tabs (< lg) */}
      <div className="flex lg:hidden items-center p-1 bg-slate-200/60 dark:bg-slate-800/80 rounded-lg shrink-0 gap-1">
        <button
          type="button"
          onClick={() => setMobileTab("tickets")}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            mobileTab === "tickets"
              ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          <Headphones className="w-3.5 h-3.5" />
          <span>Tickets ({filteredTickets.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("chat")}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            mobileTab === "chat"
              ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span className="truncate">Chat: {currentTicket.customerName.split(" ").slice(-1)[0]}</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("telemetry")}
          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            mobileTab === "telemetry"
              ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Viễn Thám</span>
        </button>
      </div>

      {/* 3-COLUMN WORKSPACE: Tickets List | Live Chat | Remote Telemetry Inspector */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
        {/* COL 1: TICKET QUEUE (3.5 COLS) */}
        <div className={`${mobileTab === "tickets" ? "flex" : "hidden lg:flex"} lg:col-span-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex-col min-h-0 overflow-hidden`}>
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={language === "vi" ? "Lọc ticket, khách hàng..." : "Filter tickets..."}
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1.5 space-y-1">
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTicketId(t.id);
                  setMobileTab("chat");
                }}
                className={`p-2.5 rounded-lg cursor-pointer transition-all ${
                  selectedTicketId === t.id
                    ? "bg-slate-100 dark:bg-slate-800 border-l-4 border-rose-500 shadow-sm"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="flex justify-between items-start mb-0.5">
                  <span className="text-[10px] font-mono font-bold text-cyan-600 dark:text-cyan-400">{t.id}</span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      t.priority === "URGENT"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
                <div className="font-semibold text-xs text-slate-900 dark:text-white">{t.customerName}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{t.subject}</div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-mono">
                  <span className="truncate max-w-[120px]">{t.deviceName}</span>
                  <span>{t.createdAt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COL 2: LIVE CHAT WINDOW (5.5 COLS) */}
        <div className={`${mobileTab === "chat" ? "flex" : "hidden lg:flex"} lg:col-span-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex-col min-h-0 justify-between overflow-hidden`}>
          {/* Chat Header */}
          <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setMobileTab("tickets")}
                className="lg:hidden p-1 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-200/60 dark:bg-slate-800 text-xs font-semibold shrink-0 cursor-pointer"
                title="Quay lại danh sách ticket"
              >
                ← Tickets
              </button>
              <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs border border-slate-200 dark:border-slate-700 shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                  <span className="truncate">{currentTicket.customerName}</span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono shrink-0">● Online</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">{currentTicket.customerPhone}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setMobileTab("telemetry")}
                className="lg:hidden bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-[11px] px-2 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Activity className="w-3 h-3" />
                <span>Viễn thám</span>
              </button>

              {canUpdate("mod_cskh") && (
                <button
                  onClick={() => {
                    setTickets((prev) =>
                      prev.map((t) => (t.id === selectedTicketId ? { ...t, status: "RESOLVED" } : t))
                    );
                    showToast(language === "vi" ? "Đã giải quyết xong ticket!" : "Ticket marked as resolved!");
                  }}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span className="hidden sm:inline">{language === "vi" ? "Đã xử lý" : "Mark Resolved"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 min-h-0 p-3 overflow-y-auto space-y-2.5">
            {currentTicket.messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === "CSKH" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] p-2.5 rounded-lg text-xs leading-relaxed ${
                    m.sender === "CSKH"
                      ? "bg-slate-900 text-white dark:bg-rose-600 dark:text-white rounded-br-none shadow-sm"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div>{m.text}</div>
                  {m.hasSnapshot && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/40 dark:border-slate-700/60 text-[10px] text-cyan-500 dark:text-cyan-300 font-mono flex items-center gap-1 font-semibold">
                      <Activity className="w-3 h-3" />
                      <span>{language === "vi" ? "Đính kèm viễn thám:" : "Telemetry snapshot:"} {currentTicket.hardwareId}</span>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 font-mono px-1">{m.time}</span>
              </div>
            ))}
          </div>

          {/* Reply Input Box */}
          <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={language === "vi" ? "Nhập nội dung tư vấn kỹ thuật..." : "Type response to customer..."}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 transition-colors shadow-sm"
              />
              <button
                onClick={handleSendReply}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-rose-600 dark:hover:bg-rose-500 text-white p-2 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* COL 3: REMOTE TELEMETRY INSPECTOR (3.5 COLS) */}
        <div className={`${mobileTab === "telemetry" ? "flex" : "hidden lg:flex"} lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm p-3 flex-col min-h-0 justify-between overflow-hidden`}>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-0.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {language === "vi" ? "Soi Viễn Thám Từ Xa" : "Remote Telemetry Inspector"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileTab("chat")}
                className="lg:hidden text-xs text-cyan-600 dark:text-cyan-400 font-semibold p-1 hover:underline cursor-pointer"
              >
                ← Về Chat
              </button>
            </div>

            {/* Diagnostic Alert Box */}
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Chẩn Đoán Tự Động (AI Insight)</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                {currentTicket.technicalSnapshot.diagnostics}
              </p>
            </div>

            {/* Live Metrics */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Hardware ID:</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold text-[11px]">{currentTicket.hardwareId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">{language === "vi" ? "Model máy:" : "Model SKU:"}</span>
                <span className="text-slate-900 dark:text-white font-medium text-right text-[11px]">{currentTicket.technicalSnapshot.model}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Firmware:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">{currentTicket.technicalSnapshot.fwVersion}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">{language === "vi" ? "Sóng Wi-Fi:" : "Wi-Fi Signal:"}</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                  <Wifi className="w-3 h-3" /> {currentTicket.technicalSnapshot.rssi} dBm
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">{language === "vi" ? "Mức Pin / Nguồn:" : "Power Battery:"}</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 text-[11px]">
                  <Battery className="w-3 h-3" /> {currentTicket.technicalSnapshot.battery}%
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">Heartbeat:</span>
                <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px]">{currentTicket.technicalSnapshot.lastHeartbeat}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <button 
              onClick={handleSoftReboot}
              disabled={isRebooting}
              className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-white dark:text-cyan-400 border border-slate-800 dark:border-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {isRebooting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>{language === "vi" ? "Đang phát lệnh Reboot..." : "Dispatching reboot..."}</span>
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{language === "vi" ? "Khởi Động Lại Mạch (Soft Reboot)" : "Remote Soft Reboot"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
