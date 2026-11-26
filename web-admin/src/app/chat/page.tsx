"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCustomerAuth } from "@/customer/context/CustomerAuthContext";
import { useCustomerIoT } from "@/customer/context/CustomerIoTContext";
import { customerApi } from "@/customer/services/customer-api-client";
import { getApiBaseUrl, getWsChatUrl } from "@/context/apiConfig";
import { DeviceItem } from "@/customer/types/device";
import {
  MessageSquare,
  Headphones,
  Users,
  Plus,
  Send,
  Paperclip,
  Cpu,
  FileText,
  X,
  Loader2,
  UserPlus,
  Trash2,
  Shield,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

function resolveMediaUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const base = getApiBaseUrl().replace(/\/+$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url) || url.includes("/uploads/");
}

function CustomerChatContent() {
  const searchParams = useSearchParams();
  const consultProduct = searchParams.get("consult") || "";
  const queryDeviceHw = searchParams.get("device") || "";
  const queryDeviceName = searchParams.get("deviceName") || "";
  const { user } = useCustomerAuth();
  const { allDevicesWithEnergySamples: devices } = useCustomerIoT();

  const [leftTab, setLeftTab] = useState<"chats" | "tickets">("chats");
  const [selectedRoomId, setSelectedRoomId] = useState<string>("CSKH_LIVE");
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvDetail, setActiveConvDetail] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [cskhTicketId, setCskhTicketId] = useState<string | null>(null);
  const [inputText, setInputText] = useState<string>("");
  const [pendingDevice, setPendingDevice] = useState<DeviceItem | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);

  // Support Requests (Tickets)
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [ticketHwId, setTicketHwId] = useState("");
  const [ticketType, setTicketType] = useState("WARRANTY");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketImages, setTicketImages] = useState<string[]>([]);
  const [uploadingTicketImg, setUploadingTicketImg] = useState(false);

  // New Direct / Group Chat Modals
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [chatModalMode, setChatModalMode] = useState<"direct" | "group">("direct");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Group Member Management (Column 3)
  const [showAddGroupMember, setShowAddGroupMember] = useState(false);
  const [groupMemberQuery, setGroupMemberQuery] = useState("");
  const [groupMemberResults, setGroupMemberResults] = useState<any[]>([]);

  // Attach Device Card Picker
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const selectedRoomRef = useRef<string>(selectedRoomId);
  selectedRoomRef.current = selectedRoomId;

  useEffect(() => {
    if (consultProduct) {
      setSelectedRoomId("CSKH_LIVE");
      setInputText(
        `Xin chào CSKH Austec, tôi cần tư vấn và báo giá chi tiết về sản phẩm: ${consultProduct}.`
      );
    }
  }, [consultProduct]);

  useEffect(() => {
    if (queryDeviceHw) {
      setSelectedRoomId("CSKH_LIVE");
      const found = devices.find(
        (d) => d.hardwareId.toLowerCase() === queryDeviceHw.toLowerCase()
      );
      if (found) {
        setPendingDevice(found);
      }
      setInputText(
        `Xin chào kỹ thuật viên Austec, tôi cần kiểm tra hỗ trợ thiết bị ${
          queryDeviceName || found?.name || queryDeviceHw
        } (${queryDeviceHw}).`
      );
    }
  }, [queryDeviceHw, queryDeviceName, devices]);

  const loadConversations = useCallback(async () => {
    const res = await customerApi.get("/api/chat/conversations");
    const list = res.conversations || res.data?.conversations || [];
    if (Array.isArray(list)) {
      setConversations(list);
    }
  }, []);

  const loadSupportRequests = useCallback(async () => {
    const res = await customerApi.get("/api/cskh/requests", { scope: "my" });
    const list = res.requests || res.data?.requests || [];
    if (Array.isArray(list)) {
      setSupportRequests(list);
    }
  }, []);

  const loadConversationDetail = useCallback(async (roomId: string) => {
    if (roomId === "CSKH_LIVE") {
      setActiveConvDetail(null);
      return;
    }
    const res = await customerApi.get(
      `/api/chat/conversations/${encodeURIComponent(roomId)}`
    );
    if (res.success && res.conversation) {
      setActiveConvDetail(res.conversation);
    }
  }, []);

  const loadActiveRoomMessages = useCallback(
    async (roomId: string) => {
      if (!user) return;
      if (roomId === "CSKH_LIVE") {
        const res = await customerApi.get("/api/cskh/active-chat", {
          customerId: user.id,
        });
        if (res.success) {
          setCskhTicketId(res.ticket?.id || null);
          setMessages(Array.isArray(res.messages) ? res.messages : []);
        }
      } else {
        const res = await customerApi.get(
          `/api/chat/conversations/${encodeURIComponent(roomId)}/messages`
        );
        const list = res.messages || res.data?.messages || [];
        setMessages(Array.isArray(list) ? list : []);
      }
    },
    [user]
  );

  useEffect(() => {
    loadConversations();
    loadSupportRequests();
  }, [loadConversations, loadSupportRequests]);

  useEffect(() => {
    loadActiveRoomMessages(selectedRoomId);
    loadConversationDetail(selectedRoomId);

    // Notify WS room join for direct/group conversations
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && user) {
      if (selectedRoomId !== "CSKH_LIVE") {
        ws.send(
          JSON.stringify({
            type: "JOIN_CONVERSATION",
            conversationId: selectedRoomId,
            userId: user.id,
          })
        );
      } else {
        ws.send(JSON.stringify({ type: "LEAVE_CONVERSATION" }));
      }
    }
  }, [selectedRoomId, user, loadActiveRoomMessages, loadConversationDetail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Persistent Realtime WebSocket for both CSKH Live & Direct/Group Conversations
  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    let active = true;

    try {
      const ws = new WebSocket(getWsChatUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (!active) return;
        ws.send(
          JSON.stringify({
            type: "JOIN",
            role: "CUSTOMER",
            customerId: user.id,
            customerName: user.fullName,
          })
        );
        if (selectedRoomRef.current !== "CSKH_LIVE") {
          ws.send(
            JSON.stringify({
              type: "JOIN_CONVERSATION",
              conversationId: selectedRoomRef.current,
              userId: user.id,
            })
          );
        }
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "CONVERSATION_STARTED") {
            if (msg.ticket?.id) setCskhTicketId(msg.ticket.id);
            if (Array.isArray(msg.messages) && selectedRoomRef.current === "CSKH_LIVE") {
              setMessages(msg.messages);
            }
          } else if (
            msg.type === "NEW_MESSAGE" ||
            msg.type === "CSKH_MESSAGE" ||
            msg.type === "CHAT_MESSAGE"
          ) {
            if (selectedRoomRef.current === "CSKH_LIVE") {
              loadActiveRoomMessages("CSKH_LIVE");
            }
          } else if (
            msg.type === "NEW_CONVERSATION_MESSAGE" ||
            msg.type === "MESSAGE_ACK"
          ) {
            if (msg.ticketId && selectedRoomRef.current === "CSKH_LIVE") {
              setCskhTicketId(msg.ticketId);
              loadActiveRoomMessages("CSKH_LIVE");
            } else if (
              !msg.conversationId ||
              String(msg.conversationId) === String(selectedRoomRef.current)
            ) {
              loadActiveRoomMessages(selectedRoomRef.current);
            }
            loadConversations();
          }
        } catch {
          // ignore malformed frames
        }
      };
    } catch {
      // fallback polling below
    }

    const poll = setInterval(() => {
      loadActiveRoomMessages(selectedRoomRef.current);
    }, 10000);

    return () => {
      active = false;
      clearInterval(poll);
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
    };
  }, [user, loadActiveRoomMessages, loadConversations]);

  const buildSelectedDevicePayload = (d: DeviceItem) => ({
    hardwareId: d.hardwareId,
    name: d.name,
    modelName: d.modelName,
    category: d.category,
    roomName: d.roomName,
    isOnline: d.isOnline,
    warrantyUntil: d.warrantyUntil,
  });

  const handleSendMessage = async (
    e?: React.FormEvent,
    options?: {
      text?: string;
      attachmentUrls?: string[];
      device?: DeviceItem | null;
    }
  ) => {
    if (e) e.preventDefault();
    if (!user) return;
    const text = (options?.text ?? inputText).trim();
    const attachmentUrls = options?.attachmentUrls || [];
    const deviceToSend =
      options?.device !== undefined ? options.device : pendingDevice;

    if (!text && attachmentUrls.length === 0 && !deviceToSend) return;

    const finalText =
      text ||
      (deviceToSend
        ? `Gửi thẻ thiết bị: ${deviceToSend.name} (${deviceToSend.hardwareId})`
        : "[Tệp đính kèm]");

    setIsSending(true);
    if (!options?.text) setInputText("");
    if (options?.device === undefined && pendingDevice) setPendingDevice(null);

    const clientTempId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const ws = wsRef.current;
    const wsOpen = ws && ws.readyState === WebSocket.OPEN;

    try {
      if (selectedRoomId === "CSKH_LIVE") {
        const selectedDevice = deviceToSend
          ? buildSelectedDevicePayload(deviceToSend)
          : undefined;

        if (wsOpen) {
          if (!cskhTicketId) {
            ws.send(
              JSON.stringify({
                type: "START_CONVERSATION",
                customerId: user.id,
                customerName: user.fullName,
                customerPhone: user.phoneNumber,
                hardwareId: deviceToSend?.hardwareId,
                message: finalText,
                attachmentUrls,
                selectedDevice,
              })
            );
          } else {
            ws.send(
              JSON.stringify({
                type: "SEND_MESSAGE",
                ticketId: cskhTicketId,
                customerId: user.id,
                sender: "CUSTOMER",
                senderRole: "CUSTOMER",
                text: finalText,
                attachmentUrls,
                selectedDevice,
                clientTempId,
              })
            );
          }
          // Refresh quickly to ensure consistent UI state
          setTimeout(() => loadActiveRoomMessages("CSKH_LIVE"), 250);
        } else {
          const res = await customerApi.post("/api/cskh/active-chat/messages", {
            customerId: user.id,
            text: finalText,
            message: finalText,
            attachmentUrls,
            selectedDevice,
          });
          if (res.success) {
            await loadActiveRoomMessages("CSKH_LIVE");
          } else {
            toast.error(res.error || "Không thể gửi tin nhắn CSKH");
          }
        }
      } else {
        const messageType = deviceToSend
          ? "DEVICE_SNAPSHOT"
          : attachmentUrls.length > 0
            ? isImageUrl(attachmentUrls[0])
              ? "IMAGE"
              : "FILE"
            : "TEXT";
        const attachments = attachmentUrls.map((url) => ({
          url,
          mediaType: isImageUrl(url) ? "image" : "file",
        }));
        const metadata = deviceToSend
          ? { selectedDevice: buildSelectedDevicePayload(deviceToSend) }
          : undefined;

        if (wsOpen) {
          ws.send(
            JSON.stringify({
              type: "SEND_CONVERSATION_MESSAGE",
              conversationId: selectedRoomId,
              content: finalText,
              messageType,
              attachments,
              metadata,
              senderId: user.id,
              senderName: user.fullName,
              senderRole: "CUSTOMER",
              clientTempId,
            })
          );
          setTimeout(() => loadActiveRoomMessages(selectedRoomId), 250);
        } else {
          const res = await customerApi.post(
            `/api/chat/conversations/${encodeURIComponent(selectedRoomId)}/messages`,
            {
              content: finalText,
              messageType,
              attachments,
              metadata,
              clientTempId,
            }
          );
          if (res.success) {
            await loadActiveRoomMessages(selectedRoomId);
          } else {
            toast.error(res.error || "Không thể gửi tin nhắn");
          }
        }
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const endpoint = file.type.startsWith("image/")
      ? "/api/upload/image"
      : "/api/upload/file";
    const up = await customerApi.uploadFile(file, endpoint);
    const url = up.url || up.data?.url;
    if (up.success && url) {
      await handleSendMessage(undefined, {
        text: file.type.startsWith("image/") ? "" : `Đính kèm tệp: ${file.name}`,
        attachmentUrls: [url],
        device: null,
      });
      toast.success("Đã gửi tệp đính kèm");
    } else {
      toast.error(up.error || "Không thể tải tệp lên");
    }
  };

  const handleUploadTicketImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingTicketImg(true);
    try {
      const up = await customerApi.uploadFile(file, "/api/upload/image");
      const url = up.url || up.data?.url;
      if (up.success && url) {
        setTicketImages((prev) => [...prev, url]);
        toast.success("Đã đính kèm ảnh vào phiếu hỗ trợ");
      } else {
        toast.error(up.error || "Không thể tải ảnh lên");
      }
    } finally {
      setUploadingTicketImg(false);
    }
  };

  const handleSearchUsers = async (q: string) => {
    setUserSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchedUsers([]);
      return;
    }
    const res = await customerApi.get("/api/chat/users/search", { q: q.trim() });
    const list = res.users || res.data?.users || [];
    setSearchedUsers(Array.isArray(list) ? list : []);
  };

  const handleStartDirectChat = async (targetUserId: string) => {
    const res = await customerApi.post("/api/chat/conversations/direct", {
      targetUserId,
    });
    const convId =
      res.conversationId ||
      res.conversation?.id ||
      res.data?.conversationId ||
      res.data?.conversation?.id;
    if (res.success && convId) {
      setShowNewChatModal(false);
      await loadConversations();
      setSelectedRoomId(String(convId));
    } else {
      toast.error(res.error || "Không thể tạo hội thoại trực tiếp");
    }
  };

  const handleCreateGroupChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupTitle.trim() || selectedUserIds.length === 0) {
      toast.error("Vui lòng nhập tên nhóm và chọn ít nhất 1 thành viên");
      return;
    }
    const res = await customerApi.post("/api/chat/conversations/group", {
      title: groupTitle.trim(),
      memberIds: selectedUserIds,
    });
    const convId =
      res.conversationId ||
      res.conversation?.id ||
      res.data?.conversationId ||
      res.data?.conversation?.id;
    if (res.success && convId) {
      setShowNewChatModal(false);
      setGroupTitle("");
      setSelectedUserIds([]);
      await loadConversations();
      setSelectedRoomId(String(convId));
      toast.success("Đã tạo nhóm trò chuyện mới");
    } else {
      toast.error(res.error || "Không thể tạo nhóm");
    }
  };

  const handleSearchGroupMember = async (q: string) => {
    setGroupMemberQuery(q);
    if (q.trim().length < 2) {
      setGroupMemberResults([]);
      return;
    }
    const res = await customerApi.get("/api/chat/users/search", { q: q.trim() });
    setGroupMemberResults(Array.isArray(res.users) ? res.users : []);
  };

  const handleAddMemberToActiveGroup = async (memberId: string) => {
    if (selectedRoomId === "CSKH_LIVE") return;
    const res = await customerApi.post(
      `/api/chat/conversations/${encodeURIComponent(selectedRoomId)}/members`,
      { memberIds: [memberId] }
    );
    if (res.success) {
      toast.success("Đã thêm thành viên vào nhóm");
      setShowAddGroupMember(false);
      setGroupMemberQuery("");
      setGroupMemberResults([]);
      loadConversationDetail(selectedRoomId);
    } else {
      toast.error(res.error || "Không thể thêm thành viên");
    }
  };

  const handleRemoveGroupMember = async (targetUserId: string) => {
    if (selectedRoomId === "CSKH_LIVE") return;
    const res = await customerApi.delete(
      `/api/chat/conversations/${encodeURIComponent(
        selectedRoomId
      )}/members/${encodeURIComponent(targetUserId)}`
    );
    if (res.success) {
      toast.success("Đã cập nhật thành viên nhóm");
      loadConversationDetail(selectedRoomId);
      loadConversations();
    } else {
      toast.error(res.error || "Không thể xóa thành viên");
    }
  };

  const handleToggleGroupMemberRole = async (
    targetUserId: string,
    currentRole: string
  ) => {
    if (selectedRoomId === "CSKH_LIVE") return;
    const nextRole =
      String(currentRole).toUpperCase() === "ADMIN" ? "MEMBER" : "ADMIN";
    const res = await customerApi.put(
      `/api/chat/conversations/${encodeURIComponent(
        selectedRoomId
      )}/members/${encodeURIComponent(targetUserId)}/role`,
      { role: nextRole }
    );
    if (res.success) {
      toast.success(`Đã đổi vai trò thành ${nextRole}`);
      loadConversationDetail(selectedRoomId);
    } else {
      toast.error(res.error || "Không thể cập nhật vai trò");
    }
  };

  const handleCreateSupportTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketDesc.trim() || !user) return;
    const dev = devices.find((d) => d.hardwareId === ticketHwId);
    const res = await customerApi.post("/api/cskh/requests", {
      customerId: user.id,
      customerName: user.fullName,
      customerPhone: user.phoneNumber,
      customerEmail: user.email,
      hardwareId: ticketHwId || "GENERAL",
      deviceName: dev?.name || "Hỗ trợ chung",
      requestType: ticketType,
      requestTypeName:
        ticketType === "WARRANTY"
          ? "Yêu cầu bảo hành chính hãng"
          : ticketType === "TECHNICAL"
            ? "Hỗ trợ kỹ thuật từ xa"
            : "Tư vấn nâng cấp lắp đặt",
      description: ticketDesc.trim(),
      images: ticketImages,
      replyChannel: "APP_CHAT",
    });
    if (res.success) {
      toast.success("Đã gửi phiếu yêu cầu hỗ trợ kỹ thuật");
      setShowNewTicketModal(false);
      setTicketDesc("");
      setTicketImages([]);
      loadSupportRequests();
    } else {
      toast.error(res.error || "Không thể tạo phiếu hỗ trợ");
    }
  };

  const activeConversation =
    activeConvDetail ||
    conversations.find((c) => String(c.id) === String(selectedRoomId));
  const isGroupConversation =
    selectedRoomId !== "CSKH_LIVE" &&
    String(activeConversation?.type || "").toUpperCase() === "GROUP";

  return (
    <div className="h-full min-h-0 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] overflow-hidden grid grid-cols-1 lg:grid-cols-12">
      {/* COLUMN 1: CONVERSATIONS & TICKETS LIST (3 cols) */}
      <div className="lg:col-span-3 border-r border-black/[0.08] dark:border-white/[0.08] flex flex-col min-h-0 overflow-hidden">
        <div className="shrink-0 p-3 border-b border-black/[0.08] dark:border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold">Tin nhắn & hỗ trợ</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setChatModalMode("direct");
                  setShowNewChatModal(true);
                }}
                title="Tạo cuộc trò chuyện mới"
                className="w-7 h-7 rounded-lg bg-blue-600 text-white hover:bg-blue-500 flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowNewTicketModal(true)}
                title="Gửi phiếu bảo hành / hỗ trợ kỹ thuật"
                className="w-7 h-7 rounded-lg bg-[#EEF1F5] dark:bg-[#1C232E] hover:bg-blue-600 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#EEF1F5] dark:bg-[#1C232E]">
            <button
              type="button"
              onClick={() => setLeftTab("chats")}
              className={`py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                leftTab === "chats"
                  ? "bg-white dark:bg-[#151A22] text-blue-500"
                  : "text-[#525D6F] dark:text-[#9BA4B2]"
              }`}
            >
              Trò chuyện
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("tickets")}
              className={`py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                leftTab === "tickets"
                  ? "bg-white dark:bg-[#151A22] text-blue-500"
                  : "text-[#525D6F] dark:text-[#9BA4B2]"
              }`}
            >
              Phiếu hỗ trợ ({supportRequests.length})
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-black/[0.06] dark:divide-white/[0.06]">
          {leftTab === "chats" ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedRoomId("CSKH_LIVE")}
                className={`w-full p-3 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                  selectedRoomId === "CSKH_LIVE"
                    ? "bg-blue-600/10 border-l-2 border-blue-600"
                    : "hover:bg-[#F6F7F9] dark:hover:bg-[#1C232E]"
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-rose-500/12 text-rose-500 flex items-center justify-center shrink-0">
                  <Headphones className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold truncate">
                    CSKH Austec 24/7
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      Trực tuyến
                    </span>
                  </div>
                </div>
              </button>

              {conversations.map((c) => {
                const active = String(c.id) === String(selectedRoomId);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedRoomId(String(c.id))}
                    className={`w-full p-3 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                      active
                        ? "bg-blue-600/10 border-l-2 border-blue-600"
                        : "hover:bg-[#F6F7F9] dark:hover:bg-[#1C232E]"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-blue-600/12 text-blue-500 flex items-center justify-center font-semibold text-xs shrink-0">
                      {String(c.type || "").toUpperCase() === "GROUP" ? (
                        <Users className="w-4 h-4" />
                      ) : (
                        (c.title || c.name || "C").charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-semibold truncate">
                        {c.title || c.name || "Hội thoại gia đình"}
                      </div>
                      <p className="text-[11px] text-[#7B8596] truncate mt-0.5">
                        {c.lastMessage || "Bấm để mở tin nhắn"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </>
          ) : (
            <div className="p-2.5 space-y-2">
              <button
                type="button"
                onClick={() => setShowNewTicketModal(true)}
                className="w-full py-2 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
              >
                + Tạo phiếu bảo hành / hỗ trợ mới
              </button>
              {supportRequests.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#7B8596]">
                  Chưa có phiếu yêu cầu hỗ trợ nào.
                </div>
              ) : (
                supportRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">
                        {req.requestTypeName || req.requestType}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-600/12 text-blue-500 text-[10px] font-mono">
                        {req.status || "OPEN"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2]">
                      {req.description}
                    </p>
                    {req.adminResponse && (
                      <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] mt-1">
                        <span className="font-semibold">Phản hồi CSKH:</span>{" "}
                        {req.adminResponse}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 2: MAIN LIVE CHAT AREA (6 cols) */}
      <div className="lg:col-span-6 flex flex-col min-h-0 overflow-hidden border-r border-black/[0.08] dark:border-white/[0.08]">
        {/* Chat Room Header */}
        <div className="shrink-0 px-3.5 py-2.5 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold truncate">
              {selectedRoomId === "CSKH_LIVE"
                ? "Tổng đài CSKH & Kỹ thuật viên Austec"
                : activeConversation?.title ||
                  activeConversation?.name ||
                  "Phòng trò chuyện"}
            </h3>
            <p className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2] truncate">
              {selectedRoomId === "CSKH_LIVE"
                ? `Phiên hỗ trợ: ${cskhTicketId || "Trực tuyến"}`
                : isGroupConversation
                  ? `Nhóm trò chuyện · ${(activeConversation?.members || []).length} thành viên`
                  : "Kết nối trực tiếp qua WebSocket"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowDevicePicker(true)}
            className="h-7 px-2.5 rounded-lg border border-blue-500/30 bg-blue-600/10 text-blue-500 text-[11px] font-medium flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Gửi thẻ thiết bị</span>
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2.5 bg-[#F6F7F9]/60 dark:bg-[#0D1015]/60">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-1.5">
              <MessageSquare className="w-7 h-7 text-blue-500" />
              <p className="text-xs font-semibold">
                Bắt đầu cuộc trò chuyện trực tuyến
              </p>
              <p className="text-[11px] text-[#7B8596] max-w-sm">
                Gửi tin nhắn, hình ảnh hoặc đính kèm thẻ thiết bị để kỹ thuật viên kiểm tra trạng thái từ xa.
              </p>
            </div>
          ) : (
            messages.map((m: any, idx: number) => {
              const isMe =
                m.senderRole === "CUSTOMER" ||
                m.sender === "user" ||
                String(m.senderId || m.sender_id) === String(user?.id);
              const content = m.message || m.content || m.text || "";

              const rawAtts: string[] = [];
              if (Array.isArray(m.attachmentUrls)) {
                m.attachmentUrls.forEach((u: any) => typeof u === "string" && rawAtts.push(u));
              }
              if (Array.isArray(m.images)) {
                m.images.forEach((u: any) => typeof u === "string" && rawAtts.push(u));
              }
              if (Array.isArray(m.attachments)) {
                m.attachments.forEach((a: any) => {
                  const u = typeof a === "string" ? a : a?.url;
                  if (u && !rawAtts.includes(u)) rawAtts.push(u);
                });
              }
              const uniqueAtts = Array.from(new Set(rawAtts.filter(Boolean)));
              const attachedDevice = m.selectedDevice || m.metadata?.selectedDevice;

              return (
                <div
                  key={m.id || m.clientTempId || idx}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[78%] rounded-xl px-3 py-2 text-xs space-y-1.5 ${
                      isMe
                        ? "bg-blue-600 text-white rounded-br-xs"
                        : "bg-white dark:bg-[#1C232E] border border-black/[0.08] dark:border-white/[0.08] rounded-bl-xs"
                    }`}
                  >
                    {!isMe && (
                      <div className="text-[10px] font-semibold text-blue-500">
                        {m.senderName || "CSKH Austec"}
                      </div>
                    )}

                    {/* Structured Device Card */}
                    {attachedDevice && (
                      <div
                        className={`p-2 rounded-lg border text-[11px] space-y-0.5 ${
                          isMe
                            ? "bg-white/15 border-white/20 text-white"
                            : "bg-[#F6F7F9] dark:bg-[#151A22] border-black/[0.08] dark:border-white/[0.08]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Cpu className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {attachedDevice.name || attachedDevice.hardwareId}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] opacity-80">
                          {attachedDevice.hardwareId} ·{" "}
                          {attachedDevice.isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                        </div>
                      </div>
                    )}

                    {/* Inline Image & File Attachments */}
                    {uniqueAtts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {uniqueAtts.map((url, aIdx) => {
                          const fullUrl = resolveMediaUrl(url);
                          return isImageUrl(url) ? (
                            <button
                              key={aIdx}
                              type="button"
                              onClick={() => setLightboxUrl(fullUrl)}
                              className="block rounded-lg overflow-hidden border border-white/20 cursor-pointer"
                            >
                              <img
                                src={fullUrl}
                                alt="Đính kèm"
                                className="max-w-[200px] max-h-[160px] object-cover"
                              />
                            </button>
                          ) : (
                            <a
                              key={aIdx}
                              href={fullUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 underline text-[11px]"
                            >
                              <Paperclip className="w-3 h-3" />
                              <span>Tệp đính kèm</span>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    {content && (
                      <div className="leading-relaxed whitespace-pre-wrap break-words">
                        {content}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Pending Attached Device Banner */}
        {pendingDevice && (
          <div className="shrink-0 px-3 py-1.5 border-t border-black/[0.06] dark:border-white/[0.06] bg-blue-600/[0.06] flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 truncate">
              <Cpu className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium truncate">
                Đính kèm thiết bị: {pendingDevice.name} ({pendingDevice.hardwareId})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPendingDevice(null)}
              className="p-0.5 hover:text-rose-500 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => handleSendMessage(e)}
          className="shrink-0 p-2.5 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center gap-2 bg-white dark:bg-[#151A22]"
        >
          <label
            title="Đính kèm ảnh hoặc tài liệu"
            className="w-8 h-8 rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:bg-[#EEF1F5] dark:hover:bg-[#1C232E] flex items-center justify-center cursor-pointer shrink-0"
          >
            <Paperclip className="w-4 h-4 text-[#7B8596]" />
            <input type="file" onChange={handleFileUpload} className="hidden" />
          </label>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Nhập nội dung tin nhắn..."
            className="flex-1 h-8 px-3 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isSending || (!inputText.trim() && !pendingDevice)}
            className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Gửi</span>
          </button>
        </form>
      </div>

      {/* COLUMN 3: GROUP MEMBERS (when Group) OR DEVICE TELEMETRY SNAPSHOTS (3 cols) */}
      <div className="hidden lg:flex lg:col-span-3 flex-col min-h-0 overflow-hidden p-3 space-y-3">
        {isGroupConversation && (
          <div className="shrink-0 pb-3 border-b border-black/[0.08] dark:border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[#7B8596]">
                Thành viên nhóm ({(activeConversation?.members || []).length})
              </h4>
              <button
                type="button"
                onClick={() => setShowAddGroupMember((v) => !v)}
                className="text-[11px] font-medium text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3 h-3" />
                <span>Thêm</span>
              </button>
            </div>

            {showAddGroupMember && (
              <div className="space-y-1.5 p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                <input
                  type="text"
                  value={groupMemberQuery}
                  onChange={(e) => handleSearchGroupMember(e.target.value)}
                  placeholder="Tìm theo SĐT / Email..."
                  className="w-full h-7 px-2 rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] text-[11px]"
                />
                {groupMemberResults.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between text-[11px] py-1"
                  >
                    <span className="truncate">{u.fullName || u.name}</span>
                    <button
                      type="button"
                      onClick={() => handleAddMemberToActiveGroup(String(u.id))}
                      className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] cursor-pointer"
                    >
                      Thêm
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {(activeConversation?.members || []).map((mem: any) => {
                const memId = String(mem.userId || mem.id);
                const isSelf = memId === String(user?.id);
                const role = String(mem.role || "MEMBER").toUpperCase();
                return (
                  <div
                    key={memId}
                    className="p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] flex items-center justify-between gap-2 text-[11px]"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {mem.fullName || mem.name || memId}
                      </div>
                      <div className="text-[10px] font-mono text-[#7B8596]">
                        {role}
                      </div>
                    </div>
                    {!isSelf && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleGroupMemberRole(memId, role)}
                          title="Chuyển quyền Quản trị / Thành viên"
                          className="p-1 rounded hover:bg-blue-500/15 text-blue-500 cursor-pointer"
                        >
                          <Shield className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveGroupMember(memId)}
                          title="Xóa khỏi nhóm"
                          className="p-1 rounded hover:bg-rose-500/15 text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="shrink-0">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[#7B8596]">
            Thiết bị của bạn ({devices.length})
          </h4>
          <p className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2] mt-0.5">
            Gửi nhanh thẻ thông số thiết bị vào cuộc trò chuyện
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
          {devices.map((d) => (
            <div
              key={d.hardwareId}
              className="p-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] space-y-1.5 text-xs"
            >
              <div>
                <div className="font-semibold text-[12px] truncate">{d.name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      d.isOnline ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium ${
                      d.isOnline
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-500"
                    }`}
                  >
                    {d.isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                  </span>
                </div>
              </div>
              <div className="text-[10px] font-mono text-[#7B8596] truncate">
                {d.hardwareId} · BH {d.warrantyUntil}
              </div>
              <button
                type="button"
                onClick={() =>
                  handleSendMessage(undefined, {
                    text: `Nhờ kỹ thuật viên kiểm tra giúp tôi thiết bị ${d.name} (${d.hardwareId}).`,
                    device: d,
                  })
                }
                className="w-full py-1 rounded-md bg-blue-600/12 hover:bg-blue-600 hover:text-white text-blue-600 dark:text-blue-400 font-medium text-[11px] transition-colors cursor-pointer"
              >
                Gửi vào khung chat
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Send Device Card Picker */}
      {showDevicePicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setShowDevicePicker(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#151A22] p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Chọn thiết bị gửi vào cuộc trò chuyện
              </h3>
              <button
                type="button"
                onClick={() => setShowDevicePicker(false)}
                className="p-1 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.06] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {devices.map((d) => (
                <button
                  key={d.hardwareId}
                  type="button"
                  onClick={() => {
                    setShowDevicePicker(false);
                    setPendingDevice(d);
                  }}
                  className="w-full p-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:border-blue-500 text-left text-xs flex items-center justify-between cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{d.name}</div>
                    <div className="text-[11px] font-mono text-[#7B8596]">
                      {d.hardwareId}
                    </div>
                  </div>
                  <span className="text-blue-500 font-medium shrink-0">Chọn</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Direct or Group Chat */}
      {showNewChatModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setShowNewChatModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#151A22] p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Tạo cuộc trò chuyện mới</h3>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setChatModalMode("direct")}
                className={`py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  chatModalMode === "direct"
                    ? "bg-blue-600 text-white"
                    : "bg-[#EEF1F5] dark:bg-[#1C232E]"
                }`}
              >
                Chat 1-1
              </button>
              <button
                type="button"
                onClick={() => setChatModalMode("group")}
                className={`py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  chatModalMode === "group"
                    ? "bg-blue-600 text-white"
                    : "bg-[#EEF1F5] dark:bg-[#1C232E]"
                }`}
              >
                Tạo nhóm gia đình
              </button>
            </div>

            {chatModalMode === "group" && (
              <input
                type="text"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="Tên nhóm gia đình..."
                className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
              />
            )}

            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
              placeholder="Tìm người dùng theo SĐT, Email hoặc Tên..."
              className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
            />

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {searchedUsers.map((u) => (
                <div
                  key={u.id}
                  className="p-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{u.fullName || u.name}</div>
                    <div className="text-[11px] font-mono text-[#7B8596] truncate">
                      {u.phoneNumber || u.email}
                    </div>
                  </div>
                  {chatModalMode === "direct" ? (
                    <button
                      type="button"
                      onClick={() => handleStartDirectChat(String(u.id))}
                      className="px-2.5 py-1 rounded-md bg-blue-600 text-white text-[11px] font-medium cursor-pointer shrink-0"
                    >
                      Nhắn tin
                    </button>
                  ) : (
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(String(u.id))}
                      onChange={(e) =>
                        setSelectedUserIds((prev) =>
                          e.target.checked
                            ? [...prev, String(u.id)]
                            : prev.filter((id) => id !== String(u.id))
                        )
                      }
                    />
                  )}
                </div>
              ))}
            </div>

            {chatModalMode === "group" && (
              <button
                type="button"
                onClick={handleCreateGroupChat}
                className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
              >
                Tạo nhóm ({selectedUserIds.length} thành viên)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create Support Request Ticket (with Image Attachment) */}
      {showNewTicketModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setShowNewTicketModal(false)}
        >
          <form
            onSubmit={handleCreateSupportTicket}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#151A22] p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Gửi phiếu yêu cầu bảo hành / kỹ thuật
              </h3>
              <button
                type="button"
                onClick={() => setShowNewTicketModal(false)}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Thiết bị cần hỗ trợ
              </label>
              <select
                value={ticketHwId}
                onChange={(e) => setTicketHwId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
              >
                <option value="">Hỗ trợ chung toàn hệ thống</option>
                {devices.map((d) => (
                  <option key={d.hardwareId} value={d.hardwareId}>
                    {d.name} ({d.hardwareId})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Loại yêu cầu</label>
              <select
                value={ticketType}
                onChange={(e) => setTicketType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
              >
                <option value="WARRANTY">Bảo hành chính hãng tại nhà</option>
                <option value="TECHNICAL">Xử lý sự cố kết nối / phần cứng</option>
                <option value="INSTALL">Tư vấn lắp đặt thiết bị mới</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Mô tả chi tiết tình trạng *
              </label>
              <textarea
                rows={3}
                value={ticketDesc}
                onChange={(e) => setTicketDesc(e.target.value)}
                placeholder="Mô tả triệu chứng hoặc yêu cầu hỗ trợ..."
                className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Ảnh chụp hiện trường ({ticketImages.length})
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {ticketImages.map((img, i) => (
                  <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-black/[0.1] dark:border-white/[0.1]">
                    <img
                      src={resolveMediaUrl(img)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setTicketImages((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                <label className="h-14 px-3 rounded-lg border border-dashed border-black/[0.15] dark:border-white/[0.15] hover:border-blue-500 flex items-center gap-1.5 text-[11px] text-[#525D6F] dark:text-[#9BA4B2] cursor-pointer">
                  {uploadingTicketImg ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ImageIcon className="w-3.5 h-3.5" />
                  )}
                  <span>Thêm ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadTicketImage}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewTicketModal(false)}
                className="px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
              >
                Gửi phiếu yêu cầu
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Xem ảnh"
            className="max-w-full max-h-full rounded-xl object-contain"
          />
        </div>
      )}
    </div>
  );
}

export default function CustomerChatPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Đang tải...</div>}>
      <CustomerChatContent />
    </Suspense>
  );
}
