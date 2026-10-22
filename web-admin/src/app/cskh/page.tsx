"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
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
  Radio,
  Box,
  Cpu,
  Tag,
  Maximize2,
  CheckCheck,
  Sparkles,
  Layers,
  Info
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
  updatedAt?: string;
  selectedDevice?: {
    isOwned: boolean;
    hardwareId?: string;
    deviceName: string;
    modelName: string;
    categoryTag: string;
    specs?: Record<string, string>;
    imageUrl?: string;
    price?: number;
    subscriptionStatus?: string;
    warrantyMonths?: number;
    activationDate?: string;
  };
  messages: Array<{
    sender: "CUSTOMER" | "CSKH";
    senderRole?: string;
    text: string;
    time: string;
    createdAt?: string;
    hasSnapshot?: boolean;
    attachmentUrls?: string[];
    selectedDevice?: {
      isOwned: boolean;
      hardwareId?: string;
      deviceName: string;
      modelName: string;
      categoryTag: string;
      specs?: Record<string, string>;
      imageUrl?: string;
      price?: number;
      subscriptionStatus?: string;
      warrantyMonths?: number;
      activationDate?: string;
    };
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

function resolveProductFromTicket(ticket: Ticket | null) {
  if (!ticket) return null;

  if (ticket.selectedDevice) {
    return ticket.selectedDevice;
  }

  const name = ticket.deviceName || "";
  const model = ticket.technicalSnapshot?.model || "Austec Titadoor A900 Super";
  const hwId = ticket.hardwareId || "AT-DOOR-88239A01";

  if (name.includes("Cửa Cuốn") || name.includes("Gara") || hwId.includes("DOOR")) {
    return {
      isOwned: true,
      hardwareId: hwId,
      deviceName: name || "Cửa Cuốn Khe Thoáng Austec Titadoor A900 Super",
      modelName: model,
      categoryTag: "CỬA CUỐN THÔNG MINH",
      imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80",
      subscriptionStatus: "Còn hạn (Gia hạn đến 12/2027)",
      warrantyMonths: 36,
      activationDate: "15/10/2024",
      specs: {
        "Công suất": "850W Turbo Inverter",
        "Tải trọng tối đa": "1200 kg",
        "Thân cửa": "Hợp kim nhôm 6063-T5 AkzoNobel",
        "Điện áp": "220V AC / 50Hz (UPS 48h)",
        "Chuẩn kháng nước": "IP65 toàn thân motor",
        "Chuẩn kết nối": "Wi-Fi 2.4GHz + RF 433MHz Rolling Code",
        "Cảm biến an toàn": "Chống xô kẹp quang học + Đảo chiều",
        "Tốc độ đóng mở": "15 cm/giây (Êm ái)"
      }
    };
  } else if (name.includes("Khóa") || hwId.includes("LOCK")) {
    return {
      isOwned: true,
      hardwareId: hwId,
      deviceName: name || "Khóa Thông Minh FaceID Austec Masaru Pro",
      modelName: "Austec Masaru FaceID X1",
      categoryTag: "KHÓA CỬA TỰ ĐỘNG",
      imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80",
      subscriptionStatus: "Trọn đời (Perpetual)",
      warrantyMonths: 24,
      activationDate: "02/01/2025",
      specs: {
        "Mở khóa": "FaceID 3D, Vân tay FPC, Mã PIN, Thẻ từ RFID",
        "Tốc độ nhận diện": "< 0.3s (Chống giả mạo ảnh chụp)",
        "Nguồn điện": "Pin sạc Lithium 5000mAh (Type-C)",
        "Chất liệu": "Hợp kim kẽm nguyên khối CNC",
        "Báo động": "Báo động cạy phá, sai mật khẩu 5 lần"
      }
    };
  } else if (name.includes("Cổng") || hwId.includes("GATE")) {
    return {
      isOwned: true,
      hardwareId: hwId,
      deviceName: name || "Motor Cổng Trượt Tự Động Austec Turbo",
      modelName: "Austec Gate Turbo 1500",
      categoryTag: "MOTOR CỔNG TỰ ĐỘNG",
      imageUrl: "https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600&auto=format&fit=crop&q=80",
      subscriptionStatus: "Còn hạn 12 tháng",
      warrantyMonths: 24,
      activationDate: "18/06/2025",
      specs: {
        "Công suất": "550W Biến tần Inverter",
        "Tải trọng cổng": "1500 kg (Chiều dài 12m)",
        "Tiêu chuẩn bảo vệ": "IP67 chống ngập nước ngoài trời",
        "Điện áp": "220V AC / 24V DC Brushless"
      }
    };
  }

  return {
    isOwned: true,
    hardwareId: hwId,
    deviceName: name || "Thiết Bị Thông Minh Austec IoT",
    modelName: model,
    categoryTag: "HỆ THỐNG SMART HOME AUSTEC",
    imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80",
    subscriptionStatus: "Tiêu chuẩn",
    warrantyMonths: 24,
    activationDate: "2025",
    specs: {
      "Model": model,
      "Hardware ID": hwId,
      "Kết nối": "Wi-Fi IoT Gateway Austec",
      "Nguồn điện": "220V AC / 50Hz"
    }
  };
}

function CSKHContent() {
  const { t, language } = useLanguage();
  const { canView, canUpdate, canCreate } = usePermissions();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"chat" | "tickets">(tabParam === "tickets" ? "tickets" : "chat");

  // Sync tab with URL parameter
  useEffect(() => {
    if (tabParam === "tickets") {
      setActiveTab("tickets");
    } else if (tabParam === "chat") {
      setActiveTab("chat");
    }
  }, [tabParam]);

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
  // TAB 1: LIVE 1-1 CHAT (WEBSOCKET REAL-TIME)
  // =========================================================================
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("");
  const [ticketSearch, setTicketSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isRebooting, setIsRebooting] = useState(false);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [selectedProductInfo, setSelectedProductInfo] = useState<any>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const currentTicket = useMemo(() => {
    return tickets.find((t) => t.id === selectedTicketId) || (tickets.length > 0 ? tickets[0] : null);
  }, [tickets, selectedTicketId]);

  // Keep selected product in sync with ticket
  useEffect(() => {
    if (currentTicket) {
      if (currentTicket.selectedDevice) {
        setSelectedProductInfo(currentTicket.selectedDevice);
      } else {
        setSelectedProductInfo(resolveProductFromTicket(currentTicket));
      }
    } else {
      setSelectedProductInfo(null);
    }
  }, [currentTicket?.id, currentTicket?.selectedDevice]);

  // Scroll messages to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentTicket?.messages?.length]);

  const getTicketActivityTimestamp = (t: Ticket): number => {
    if (t.messages && t.messages.length > 0) {
      const lastMsg = t.messages[t.messages.length - 1];
      if (lastMsg.createdAt) {
        const d = new Date(lastMsg.createdAt).getTime();
        if (!isNaN(d) && d > 0) return d;
      }
    }
    if (t.updatedAt) {
      const d = new Date(t.updatedAt).getTime();
      if (!isNaN(d) && d > 0) return d;
    }
    if (t.createdAt) {
      const d = new Date(t.createdAt).getTime();
      if (!isNaN(d) && d > 0) return d;
    }
    return 0;
  };

  const filteredTickets = useMemo(() => {
    const list = tickets.filter((t) => {
      const q = ticketSearch.toLowerCase();
      return (
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        (t.customerPhone && t.customerPhone.includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.deviceName && t.deviceName.toLowerCase().includes(q)) ||
        (t.hardwareId && t.hardwareId.toLowerCase().includes(q))
      );
    });

    // Sắp xếp tin nhắn / hoạt động mới nhất lên đầu tiên theo thời gian thực
    return [...list].sort((a, b) => {
      const timeA = getTicketActivityTimestamp(a);
      const timeB = getTicketActivityTimestamp(b);
      return timeB - timeA;
    });
  }, [tickets, ticketSearch]);

  const deduplicateTicketMessages = (msgs: any[]): any[] => {
    if (!Array.isArray(msgs)) return [];
    const deduped: any[] = [];
    for (const m of msgs) {
      const text = (m.text || m.message || '').toString().trim();
      const sender = m.sender || m.senderRole;
      const isDupe = deduped.some(x => {
        const xText = (x.text || x.message || '').toString().trim();
        const xSender = x.sender || x.senderRole;
        return xSender === sender && xText === text;
      });
      if (!isDupe) {
        deduped.push(m);
      }
    }
    return deduped;
  };

  const fetchLiveTickets = () => {
    fetch("http://localhost:4000/api/cskh/tickets", {
      headers: { "Authorization": "Bearer austec-admin-super-token" }
    })
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.tickets)) {
          const cleaned = res.tickets.map((t: any) => ({
            ...t,
            messages: deduplicateTicketMessages(t.messages)
          }));
          setTickets(cleaned);
          setSelectedTicketId(prev => {
            if (!prev && cleaned.length > 0) return cleaned[0].id;
            if (prev && !cleaned.some((t: any) => t.id === prev) && cleaned.length > 0) return cleaned[0].id;
            return prev;
          });
        }
      })
      .catch(() => {});
  };

  // WebSocket Connection Lifecycle
  useEffect(() => {
    fetchLiveTickets();

    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connectWebSocket = () => {
      try {
        const host = typeof window !== "undefined" ? (window.location.hostname || "localhost") : "localhost";
        const wsUrl = `ws://${host}:4000/ws/chat`;
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsStatus("connected");
          ws?.send(JSON.stringify({
            type: "JOIN",
            role: "CSKH",
            userId: "cskh-admin",
            customerName: "CSKH Quản Trị Viên"
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "TICKETS_UPDATED" && Array.isArray(data.tickets)) {
              const cleaned = data.tickets.map((t: any) => ({
                ...t,
                messages: deduplicateTicketMessages(t.messages)
              }));
              setTickets(cleaned);
              setSelectedTicketId(prev => {
                if (!prev && cleaned.length > 0) return cleaned[0].id;
                if (prev && !cleaned.some((t: any) => t.id === prev) && cleaned.length > 0) return cleaned[0].id;
                return prev;
              });
            } else if (data.type === "NEW_TICKET" && data.ticket) {
              const cleanedTicket = {
                ...data.ticket,
                messages: deduplicateTicketMessages(data.ticket.messages)
              };
              setTickets(prev => [cleanedTicket, ...prev.filter(t => t.id !== data.ticket.id)]);
              setSelectedTicketId(data.ticket.id);
              showToast(`Khách hàng ${data.ticket.customerName} vừa bắt đầu phiên hỗ trợ mới!`);
            } else if (data.type === "NEW_MESSAGE" && data.message) {
              setTickets(prev => prev.map(t => {
                if (t.id === data.ticketId) {
                  const normMsg = (data.message.text || data.message.message || "").toString().trim();
                  const exists = t.messages.some(m => 
                    (m.text || "").toString().trim() === normMsg && 
                    (m.sender === data.message.sender || (m as any).senderRole === data.message.senderRole)
                  );
                  if (exists) return t;
                  return {
                    ...t,
                    status: "PROCESSING",
                    messages: [...t.messages, data.message],
                    selectedDevice: data.message.selectedDevice || t.selectedDevice
                  };
                }
                return t;
              }));
              if (data.message.selectedDevice) {
                setSelectedProductInfo(data.message.selectedDevice);
              }
            } else if (data.type === "CONVERSATION_STARTED" && data.ticket) {
              const cleanedTicket = {
                ...data.ticket,
                messages: deduplicateTicketMessages(data.ticket.messages)
              };
              setTickets(prev => [cleanedTicket, ...prev.filter(t => t.id !== data.ticket.id)]);
              setSelectedTicketId(data.ticket.id);
              if (data.ticket.selectedDevice) {
                setSelectedProductInfo(data.ticket.selectedDevice);
              }
            }
          } catch (e) {
            console.error("WS error parsing message:", e);
          }
        };

        ws.onclose = () => {
          setWsStatus("disconnected");
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch (e) {
        setWsStatus("disconnected");
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  const handleSendReply = () => {
    if (!replyText.trim() || !currentTicket) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const newMsg = {
      sender: "CSKH" as const,
      text: replyText.trim(),
      time: timeStr,
    };

    // Optimistic local state update
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === currentTicket.id) {
          return {
            ...t,
            status: "PROCESSING",
            messages: [...t.messages, newMsg],
          };
        }
        return t;
      })
    );

    // Send via WebSocket if connected, otherwise fallback to REST (KHÔNG GỬI 2 LẦN CÙNG LÚC)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "SEND_MESSAGE",
        ticketId: currentTicket.id,
        sender: "CSKH",
        text: replyText.trim(),
      }));
    } else {
      // Call REST endpoint ONLY when WebSocket is disconnected
      fetch(`http://localhost:4000/api/cskh/tickets/${currentTicket.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer austec-admin-super-token"
        },
        body: JSON.stringify({
          sender: "CSKH",
          text: replyText.trim(),
          message: replyText.trim()
        })
      }).catch(() => {});
    }

    setReplyText("");
    showToast("Đã gửi tin nhắn tức thời qua WebSocket tới Mobile của khách hàng!");
  };

  const handleSoftReboot = () => {
    if (isRebooting || !currentTicket) return;
    const targetHwId = selectedProductInfo?.hardwareId || currentTicket.hardwareId;
    setIsRebooting(true);
    showToast(`Đang phát lệnh Soft Reboot tới ${targetHwId}...`);

    setTimeout(() => {
      setIsRebooting(false);
      showToast(`Thiết bị ${targetHwId} đã hoàn tất Soft Reboot thành công!`);
      
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const rebootMsg = `[HỆ THỐNG]: Kỹ thuật viên CSKH đã gửi lệnh Khởi động lại vi điều khiển (Soft Reboot). Thiết bị ${targetHwId} đã kết nối lại ổn định.`;

      // Broadcast reboot via WS
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "SEND_MESSAGE",
          ticketId: currentTicket.id,
          sender: "CSKH",
          text: rebootMsg
        }));
      }

      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === currentTicket.id) {
            return {
              ...t,
              messages: [
                ...t.messages,
                {
                  sender: "CSKH",
                  text: rebootMsg,
                  time: timeStr,
                },
              ],
              technicalSnapshot: {
                ...t.technicalSnapshot,
                lastHeartbeat: "1 giây trước",
                diagnostics: "Thiết bị vừa được Soft Reboot thành công. Tất cả thông số viễn thám đã trở về ngưỡng ổn định.",
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
    const hwId = selectedProductInfo?.hardwareId || currentTicket.hardwareId;
    showToast(`Đang đồng bộ Telemetry viễn thám từ ${hwId}...`);
    setTimeout(() => {
      showToast(`Đã kéo dữ liệu viễn thám thiết bị ${hwId} thành công qua WebSocket!`);
    }, 1000);
  };

  const handleSendQuickCatalog = () => {
    if (!currentTicket || !selectedProductInfo) return;
    const text = `Dạ chào Quý khách! CSKH Austec xin gửi thông tin chi tiết và catalogue sản phẩm ${selectedProductInfo.deviceName || selectedProductInfo.modelName}: https://austec.vn/products/${(selectedProductInfo.modelName || 'device').toLowerCase().replace(/\s+/g, '-')}. Quý khách cần hỗ trợ thêm thông số nào cứ nhắn em nhé ạ!`;
    setReplyText(text);
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

  useEffect(() => {
    fetchRequests();
    const reqTimer = setInterval(fetchRequests, 10000);
    return () => clearInterval(reqTimer);
  }, []);

  // Filtered requests with defensive null checks
  const filteredSupportRequests = useMemo(() => {
    return supportRequests.filter((r) => {
      const q = requestSearchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.customerName && r.customerName.toLowerCase().includes(q)) ||
        (r.customerPhone && r.customerPhone.includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.hardwareId && r.hardwareId.toLowerCase().includes(q));

      const matchType = requestFilterType === "ALL" || r.requestType === requestFilterType;
      const matchStatus = requestFilterStatus === "ALL" || r.status === requestFilterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [supportRequests, requestSearchQuery, requestFilterType, requestFilterStatus]);

  const currentRequest = useMemo(() => {
    return supportRequests.find(r => r.id === selectedRequestId) || supportRequests[0] || null;
  }, [supportRequests, selectedRequestId]);

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
    replyChannel: "PUSH" as const,
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
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                {wsStatus === 'connected' ? 'WEBSOCKET REALTIME' : 'KẾT NỐI LẠI WS'}
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
                  <p className="text-[11px] text-slate-400 mt-1">Hàng chờ sẽ tự động cập nhật ngay khi khách hàng gửi tin nhắn từ Mobile App qua WebSocket.</p>
                </div>
              ) : (
                filteredTickets.map((t) => {
                  const isSelected = selectedTicketId === t.id;
                  const lastMsg = t.messages && t.messages.length > 0 ? t.messages[t.messages.length - 1] : null;
                  const lastTime = lastMsg?.time || (t.createdAt ? t.createdAt.substring(11, 16) : "--:--");
                  const isCustomerSender = lastMsg ? (lastMsg.sender === "CUSTOMER" || (lastMsg as any).senderRole === "CUSTOMER") : false;
                  // Nhận biết chưa đọc / đã đọc bằng màu sắc và icon (tránh rườm rà chữ)
                  const isUnread = isCustomerSender;

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTicketId(t.id);
                        if (t.selectedDevice) {
                          setSelectedProductInfo(t.selectedDevice);
                        } else {
                          setSelectedProductInfo(resolveProductFromTicket(t));
                        }
                      }}
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
                          {/* Nhận biết chưa/đã đọc chỉ bằng màu sắc và icon */}
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
                          {/* Thời gian cuối cùng trả lời */}
                          <span className="flex items-center gap-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500" title="Thời gian trả lời cuối cùng">
                            <Clock className="w-2.5 h-2.5" />
                            {lastTime}
                          </span>
                          {t.selectedDevice && (
                            <span className={`text-[8px] font-bold px-1 py-0.2 rounded ${
                              t.selectedDevice.isOwned 
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            }`}>
                              {t.selectedDevice.isOwned ? "ĐÃ SỞ HỮU" : "TƯ VẤN"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="font-semibold text-slate-900 dark:text-white text-xs mt-1 truncate flex items-center justify-between">
                        <span className="truncate">{t.customerName}</span>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 ml-1"></span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {lastMsg ? lastMsg.text : t.subject}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1 flex justify-between">
                        <span>{t.customerPhone}</span>
                        <span className="truncate max-w-[120px]">{t.deviceName || 'Hỗ trợ chung'}</span>
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
                  Khi khách hàng nhấn nút <strong>&quot;Bắt đầu cuộc trò chuyện&quot;</strong> trên Austec Mobile App, luồng tin nhắn sẽ tự động kết nối qua WebSocket và xuất hiện tại đây theo thời gian thực để CSKH hỗ trợ.
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
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{currentTicket.deviceName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const prod = currentTicket.selectedDevice || resolveProductFromTicket(currentTicket);
                        setSelectedProductInfo(prod);
                      }}
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
                        {/* Device Chip if Attached */}
                        {m.selectedDevice && (
                          <div
                            onClick={() => setSelectedProductInfo(m.selectedDevice)}
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
                                  {m.selectedDevice.isOwned ? `Đã sở hữu • ${m.selectedDevice.hardwareId || ""}` : "Tư vấn mới • Chưa sở hữu"}
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
                                onClick={() => setImagePreviewUrl(img)}
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

          {/* Right Column: THÔNG TIN SẢN PHẨM & THIẾT BỊ ĐƯỢC CHỌN (KHỐI THAY THẾ CHẨN ĐOÁN VIỄN THÁM) */}
          <div className="w-full md:w-80 shrink-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-cyan-500" />
                <span>Thông Tin Sản Phẩm & Thiết Bị</span>
              </span>
              {selectedProductInfo && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                  selectedProductInfo.isOwned
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                }`}>
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
                      src={selectedProductInfo.imageUrl || "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80"} 
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
                        <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{selectedProductInfo.hardwareId}</span>
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
                        <span className="font-semibold text-slate-900 dark:text-white">{selectedProductInfo.warrantyMonths || 36} Tháng</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Giá tham khảo:</span>
                      <span className="font-bold text-cyan-600 dark:text-cyan-400">
                        {selectedProductInfo.price ? `${selectedProductInfo.price.toLocaleString("vi-VN")} đ` : "Liên hệ báo giá"}
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
                      <div key={k} className="flex justify-between items-center py-0.5 border-b border-slate-100 dark:border-slate-800/50 last:border-none">
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
                )}

                {/* CSKH Quick Assistance Actions */}
                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={handleSendQuickCatalog}
                    className="w-full py-1.5 px-2.5 rounded-md text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Gửi Link Catalogue Vào Chat</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: SERVICE TICKETS / SUPPORT REQUEST FORM (DEFENSIVE GUARDS APPLIED) */}
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
                  {filteredSupportRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2 opacity-60" />
                        <p className="font-semibold text-slate-600 dark:text-slate-400">Chưa có phiếu yêu cầu hỗ trợ nào</p>
                        <p className="text-[11px] text-slate-400 mt-1">Các phiếu được gửi từ Mobile App hoặc tạo tại đây sẽ hiển thị danh sách tại bảng này.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSupportRequests.map((req) => {
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
                            <div className="font-semibold text-slate-900 dark:text-white">{req.customerName || "Khách Hàng"}</div>
                            <div className="font-mono text-[10px] text-slate-500">{req.customerPhone || "---"}</div>
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
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Ticket Inspector Details & Resolution Form */}
          {currentRequest ? (
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
                {(currentRequest.images || []).length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>Hình Ảnh / Hiện Trường Đính Kèm ({(currentRequest.images || []).length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(currentRequest.images || []).map((imgUrl, i) => (
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
          ) : (
            <div className="w-full md:w-96 shrink-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden items-center justify-center p-6 text-center text-slate-400">
              <FileText className="w-10 h-10 mb-2 text-slate-300 dark:text-slate-700" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Chọn một phiếu từ danh sách để xem chi tiết</p>
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
                    <option value="PUSH">Gửi thông báo đẩy về Mobile App (Mặc định)</option>
                    <option value="PHONE">Gọi điện thoại trực tiếp</option>
                    <option value="EMAIL">Gửi thông báo qua Email</option>
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
          <div className="max-w-2xl max-h-[85vh] rounded-lg overflow-hidden border border-slate-700 shadow-2xl relative">
            <button
              onClick={() => setImagePreviewUrl(null)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
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
