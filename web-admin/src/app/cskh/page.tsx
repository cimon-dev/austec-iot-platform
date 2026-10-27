"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";
import { Ticket, SupportRequestTicket } from "./types";
import { cskhService } from "./cskh-service";
import {
  CskhHeader,
  TicketListPanel,
  ChatConversationArea,
  CustomerDevicePanel,
  SupportTicketsTab,
} from "./components";

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
    description: "Cửa cuốn khi bấm đóng từ xa thỉnh thoảng khựng lại 1-2 giây rồi mới tiếp tục đóng hết hành trình.",
    images: [],
    replyChannel: "PHONE",
    preferredContactTime: "Sau 17:30 chiều các ngày trong tuần",
    status: "PROCESSING",
    adminResponse: "Kỹ thuật đã kiểm tra telemetry. Ray trượt và sensor ổn định.",
    respondedAt: "2026-10-21 14:15",
    createdAt: "2026-10-21 09:30",
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
    description: "Nhờ trung tâm hỗ trợ cấu hình phân quyền mở khóa vân tay cho 2 thành viên mới trong gia đình.",
    images: [],
    replyChannel: "EMAIL",
    preferredContactTime: "Bất kỳ lúc nào qua Email",
    status: "PENDING",
    createdAt: "2026-10-21 11:20",
  },
];

function CSKHContent() {
  const { canView } = usePermissions();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"chat" | "tickets">(tabParam === "tickets" ? "tickets" : "chat");

  const switchTab = (tab: "chat" | "tickets") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/cskh?tab=${tab}`);
    }
  };

  useEffect(() => {
    if (tabParam === "tickets") setActiveTab("tickets");
    else if (tabParam === "chat") setActiveTab("chat");
  }, [tabParam]);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Chat State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isRebooting, setIsRebooting] = useState(false);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [selectedProductInfo, setSelectedProductInfo] = useState<any>(null);

  const wsRef = useRef<WebSocket | null>(null);

  const deduplicateTicketMessages = (msgs: any[]): any[] => {
    if (!Array.isArray(msgs)) return [];
    const deduped: any[] = [];
    for (const m of msgs) {
      const text = (m.text || m.message || "").toString().trim();
      const sender = m.sender || m.senderRole;
      const isDupe = deduped.some((x) => {
        const xText = (x.text || x.message || "").toString().trim();
        const xSender = x.sender || x.senderRole;
        return xSender === sender && xText === text;
      });
      if (!isDupe) deduped.push(m);
    }
    return deduped;
  };

  const fetchLiveTickets = useCallback(() => {
    cskhService.getTickets().then((raw) => {
      if (raw && Array.isArray(raw)) {
        const cleaned = raw.map((t: any) => ({
          ...t,
          messages: deduplicateTicketMessages(t.messages),
        }));
        setTickets(cleaned);
        setSelectedTicketId((prev) => {
          if (!prev && cleaned.length > 0) return cleaned[0].id;
          if (prev && !cleaned.some((t: any) => t.id === prev) && cleaned.length > 0) return cleaned[0].id;
          return prev;
        });
      }
    });
  }, []);

  // WebSocket lifecycle
  useEffect(() => {
    fetchLiveTickets();

    let ws: WebSocket | null = null;
    const connectWebSocket = () => {
      try {
        const host = typeof window !== "undefined" ? window.location.hostname || "localhost" : "localhost";
        const wsUrl = `ws://${host}:4000/ws/chat`;
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsStatus("connected");
          ws?.send(
            JSON.stringify({
              type: "JOIN",
              role: "CSKH",
              userId: "cskh-admin",
              customerName: "CSKH Quản Trị Viên",
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "TICKETS_UPDATED" && Array.isArray(data.tickets)) {
              const cleaned = data.tickets.map((t: any) => ({
                ...t,
                messages: deduplicateTicketMessages(t.messages),
              }));
              setTickets(cleaned);
            } else if (data.type === "NEW_TICKET" && data.ticket) {
              const cleanedTicket = {
                ...data.ticket,
                messages: deduplicateTicketMessages(data.ticket.messages),
              };
              setTickets((prev) => [cleanedTicket, ...prev.filter((t) => t.id !== data.ticket.id)]);
              setSelectedTicketId(data.ticket.id);
              showToast(`Khách hàng ${data.ticket.customerName} vừa bắt đầu phiên hỗ trợ mới!`);
            } else if (data.type === "NEW_MESSAGE" && data.message) {
              setTickets((prev) =>
                prev.map((t) => {
                  if (t.id === data.ticketId) {
                    return {
                      ...t,
                      status: "PROCESSING",
                      messages: [...t.messages, data.message],
                      selectedDevice: data.message.selectedDevice || t.selectedDevice,
                    };
                  }
                  return t;
                })
              );
            }
          } catch {}
        };

        ws.onclose = () => {
          setWsStatus("disconnected");
          setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          setWsStatus("disconnected");
        };
      } catch {
        setWsStatus("disconnected");
      }
    };

    connectWebSocket();
    return () => {
      if (ws) ws.close();
    };
  }, [fetchLiveTickets, showToast]);

  const currentTicket = useMemo(() => {
    return tickets.find((t) => t.id === selectedTicketId) || (tickets.length > 0 ? tickets[0] : null);
  }, [tickets, selectedTicketId]);

  useEffect(() => {
    if (currentTicket?.selectedDevice) {
      setSelectedProductInfo(currentTicket.selectedDevice);
    } else {
      setSelectedProductInfo(null);
    }
  }, [currentTicket]);

  const filteredTickets = useMemo(() => {
    const q = ticketSearch.toLowerCase();
    return tickets.filter((t) => {
      return (
        !q ||
        t.id?.toLowerCase().includes(q) ||
        t.customerName?.toLowerCase().includes(q) ||
        t.customerPhone?.includes(q) ||
        t.subject?.toLowerCase().includes(q)
      );
    });
  }, [tickets, ticketSearch]);

  const handleSendReply = () => {
    if (!replyText.trim() || !currentTicket) return;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newMsg = {
      sender: "CSKH" as const,
      senderRole: "CSKH",
      text: replyText.trim(),
      time: timeStr,
      createdAt: now.toISOString(),
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "SEND_MESSAGE",
          ticketId: currentTicket.id,
          sender: "CSKH",
          text: replyText.trim(),
        })
      );
    }

    setTickets((prev) =>
      prev.map((t) => (t.id === currentTicket.id ? { ...t, messages: [...t.messages, newMsg] } : t))
    );
    setReplyText("");
  };

  const handleSoftReboot = async () => {
    if (!currentTicket) return;
    const hwId = currentTicket.hardwareId || "AT-DOOR-01";
    setIsRebooting(true);
    showToast(`Đang phát lệnh Reboot tới ${hwId}...`);
    try {
      await cskhService.rebootDevice(hwId);
      showToast(`Thiết bị ${hwId} đã khởi động lại thành công!`);
    } catch {
      showToast("Lệnh reboot đã gửi tới Gateway qua MQTT.");
    } finally {
      setIsRebooting(false);
    }
  };

  // Support Requests State
  const [supportRequests, setSupportRequests] = useState<SupportRequestTicket[]>(INITIAL_SUPPORT_REQUESTS);
  const [selectedRequestId, setSelectedRequestId] = useState<string>("REQ-1001");
  const [requestFilterType, setRequestFilterType] = useState<string>("ALL");
  const [requestFilterStatus, setRequestFilterStatus] = useState<string>("ALL");
  const [requestSearchQuery, setRequestSearchQuery] = useState<string>("");
  const [adminReplyInput, setAdminReplyInput] = useState("");

  useEffect(() => {
    cskhService.getSupportRequests().then((res) => {
      if (res && res.length > 0) setSupportRequests(res);
    });
  }, []);

  const filteredSupportRequests = useMemo(() => {
    const q = requestSearchQuery.toLowerCase().trim();
    return supportRequests.filter((r) => {
      const matchSearch =
        !q ||
        r.id?.toLowerCase().includes(q) ||
        r.customerName?.toLowerCase().includes(q) ||
        r.customerPhone?.includes(q) ||
        r.description?.toLowerCase().includes(q);
      const matchType = requestFilterType === "ALL" || r.requestType === requestFilterType;
      const matchStatus = requestFilterStatus === "ALL" || r.status === requestFilterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [supportRequests, requestSearchQuery, requestFilterType, requestFilterStatus]);

  const handleUpdateRequestStatus = async (requestId: string, newStatus: string) => {
    setSupportRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r))
    );
    cskhService.respondToRequest(requestId, "", newStatus).catch(() => {});
    showToast(`Đã chuyển trạng thái phiếu ${requestId} thành "${newStatus}"`);
  };

  const handleSendAdminResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReplyInput.trim() || !selectedRequestId) return;
    const nowStr = new Date().toLocaleString("vi-VN");
    setSupportRequests((prev) =>
      prev.map((r) =>
        r.id === selectedRequestId
          ? { ...r, adminResponse: adminReplyInput.trim(), respondedAt: nowStr, status: "RESOLVED" }
          : r
      )
    );
    cskhService.respondToRequest(selectedRequestId, adminReplyInput.trim(), "RESOLVED").catch(() => {});
    setAdminReplyInput("");
    showToast("Đã gửi phản hồi giải quyết phiếu thành công!");
  };

  if (!canView("mod_cskh")) {
    return <AccessDenied moduleId="mod_cskh" moduleName="Vận Hành & CSKH Hub (Customer Support Ops)" />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-slate-100 dark:bg-slate-950 p-2.5 space-y-2.5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-lg animate-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <CskhHeader
        activeTab={activeTab}
        onTabChange={switchTab}
        activeChatCount={tickets.length}
        ticketCount={supportRequests.length}
        wsStatus={wsStatus}
      />

      {/* Content */}
      {activeTab === "chat" ? (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2.5 overflow-hidden">
          <TicketListPanel
            tickets={filteredTickets}
            selectedTicketId={selectedTicketId}
            onSelectTicket={(t) => {
              setSelectedTicketId(t.id);
              setSelectedProductInfo(t.selectedDevice || null);
            }}
            searchQuery={ticketSearch}
            onSearchChange={setTicketSearch}
          />

          <ChatConversationArea
            currentTicket={currentTicket}
            onSelectProductInfo={setSelectedProductInfo}
            replyText={replyText}
            onReplyTextChange={setReplyText}
            onSendReply={handleSendReply}
          />

          <CustomerDevicePanel
            selectedProductInfo={selectedProductInfo}
            currentTicket={currentTicket}
            onSoftReboot={handleSoftReboot}
            isRebooting={isRebooting}
            onSendQuickCatalog={() => {
              if (selectedProductInfo) {
                setReplyText(
                  `Dạ chào Quý khách! CSKH Austec xin gửi catalog sản phẩm ${
                    selectedProductInfo.deviceName || selectedProductInfo.modelName
                  }: https://austec.vn/products`
                );
              }
            }}
          />
        </div>
      ) : (
        <SupportTicketsTab
          supportRequests={filteredSupportRequests}
          selectedRequestId={selectedRequestId}
          onSelectRequestId={setSelectedRequestId}
          requestFilterType={requestFilterType}
          onRequestFilterTypeChange={setRequestFilterType}
          requestFilterStatus={requestFilterStatus}
          onRequestFilterStatusChange={setRequestFilterStatus}
          requestSearchQuery={requestSearchQuery}
          onRequestSearchQueryChange={setRequestSearchQuery}
          onUpdateRequestStatus={handleUpdateRequestStatus}
          adminReplyInput={adminReplyInput}
          onAdminReplyInputChange={setAdminReplyInput}
          onSendAdminResponse={handleSendAdminResponse}
          onOpenCreateModal={() => showToast("Phiếu yêu cầu mới được gửi trực tiếp từ ứng dụng Mobile của khách hàng.")}
        />
      )}
    </div>
  );
}

export default function CSKHPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-500 font-mono">Đang tải trung tâm CSKH...</div>}>
      <CSKHContent />
    </Suspense>
  );
}
