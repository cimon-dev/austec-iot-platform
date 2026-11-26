"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useCustomerIoT } from "@/customer/context/CustomerIoTContext";
import { customerApi } from "@/customer/services/customer-api-client";
import {
  Users,
  UserPlus,
  KeyRound,
  Trash2,
  Edit3,
  X,
  Copy,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function FamilySharingContent() {
  const searchParams = useSearchParams();
  const initialHw = searchParams.get("device") || "";
  const { devices, refreshDevices } = useCustomerIoT();

  const [selectedHwId, setSelectedHwId] = useState<string>(initialHw);
  const [members, setMembers] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [showMemberModal, setShowMemberModal] = useState<boolean>(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState("");
  const [memberPhoneOrEmail, setMemberPhoneOrEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"MEMBER" | "GUEST">("MEMBER");
  const [canControl, setCanControl] = useState(true);
  const [canViewHistory, setCanViewHistory] = useState(true);
  const [canChildLock, setCanChildLock] = useState(false);
  const [canConfig, setCanConfig] = useState(false);
  const [scheduleLimitActive, setScheduleLimitActive] = useState(false);
  const [accessStartTime, setAccessStartTime] = useState("08:00");
  const [accessEndTime, setAccessEndTime] = useState("18:00");
  const [accessDays, setAccessDays] = useState<boolean[]>([
    true,
    true,
    true,
    true,
    true,
    false,
    false,
  ]);

  const [transferOtpData, setTransferOtpData] = useState<{
    otp: string;
    expiresAt?: string;
  } | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimOtpInput, setClaimOtpInput] = useState("");

  useEffect(() => {
    if (!selectedHwId && devices.length > 0) {
      setSelectedHwId(devices[0].hardwareId);
    }
  }, [devices, selectedHwId]);

  const loadMembers = async (hwId: string) => {
    if (!hwId) return;
    setIsLoading(true);
    try {
      const [mRes, sRes] = await Promise.all([
        customerApi.get(`/api/devices/${encodeURIComponent(hwId)}/members`),
        customerApi.get(`/api/devices/${encodeURIComponent(hwId)}/member-suggestions`),
      ]);
      setMembers(Array.isArray(mRes.members) ? mRes.members : []);
      setSuggestions(Array.isArray(sRes.suggestions) ? sRes.suggestions : []);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedHwId) {
      loadMembers(selectedHwId);
    }
  }, [selectedHwId]);

  const openAddModal = (prefill?: any) => {
    setEditingMemberId(null);
    setMemberName(prefill?.fullName || prefill?.name || "");
    setMemberPhoneOrEmail(prefill?.phoneNumber || prefill?.email || "");
    setMemberRole("MEMBER");
    setCanControl(true);
    setCanViewHistory(true);
    setCanChildLock(false);
    setCanConfig(false);
    setScheduleLimitActive(false);
    setAccessStartTime("08:00");
    setAccessEndTime("18:00");
    setAccessDays([true, true, true, true, true, false, false]);
    setShowMemberModal(true);
  };

  const openEditModal = (m: any) => {
    setEditingMemberId(String(m.id || m.userId));
    setMemberName(m.fullName || m.name || "Thành viên");
    setMemberPhoneOrEmail(m.phoneNumber || m.phone || m.email || "");
    setMemberRole(
      String(m.role || "MEMBER").toUpperCase() === "GUEST" ? "GUEST" : "MEMBER"
    );
    setCanControl(m.canControl !== false);
    setCanViewHistory(m.canViewHistory !== false);
    setCanChildLock(Boolean(m.canChildLock));
    setCanConfig(Boolean(m.canConfig));
    setScheduleLimitActive(Boolean(m.scheduleLimitActive));
    setAccessStartTime(m.accessStartTime || "08:00");
    setAccessEndTime(m.accessEndTime || "18:00");
    setAccessDays(
      Array.isArray(m.accessDays) && m.accessDays.length === 7
        ? m.accessDays
        : [true, true, true, true, true, false, false]
    );
    setShowMemberModal(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHwId) return;
    const payload = {
      name: memberName.trim() || "Thành viên gia đình",
      fullName: memberName.trim() || "Thành viên gia đình",
      phoneNumber: memberPhoneOrEmail.trim(),
      identifier: memberPhoneOrEmail.trim(),
      role: memberRole,
      canControl,
      canViewHistory,
      canChildLock,
      canConfig,
      scheduleLimitActive,
      accessStartTime,
      accessEndTime,
      accessDays,
    };

    const res = editingMemberId
      ? await customerApi.put(
          `/api/devices/${encodeURIComponent(selectedHwId)}/members/${encodeURIComponent(
            editingMemberId
          )}`,
          payload
        )
      : await customerApi.post(
          `/api/devices/${encodeURIComponent(selectedHwId)}/members`,
          payload
        );

    if (res.success) {
      toast.success(
        editingMemberId
          ? "Đã cập nhật quyền thành viên"
          : "Đã thêm thành viên vào thiết bị"
      );
      setShowMemberModal(false);
      loadMembers(selectedHwId);
    } else {
      toast.error(res.error || "Không thể lưu phân quyền thành viên");
    }
  };

  const handleRemoveMember = async (m: any) => {
    if (!selectedHwId) return;
    const targetId = m.id || m.userId;
    if (
      !window.confirm(
        `Xóa quyền truy cập của ${m.fullName || m.name || targetId}?`
      )
    )
      return;
    const res = await customerApi.delete(
      `/api/devices/${encodeURIComponent(selectedHwId)}/members/${encodeURIComponent(
        targetId
      )}`
    );
    if (res.success) {
      toast.success("Đã thu hồi quyền truy cập thiết bị");
      loadMembers(selectedHwId);
    } else {
      toast.error(res.error || "Không thể xóa thành viên");
    }
  };

  const handleCreateTransferOtp = async () => {
    if (!selectedHwId) return;
    const res = await customerApi.post(
      `/api/devices/${encodeURIComponent(selectedHwId)}/transfer/create`
    );
    if (res.success) {
      const code = res.otp || res.transferCode || res.code || "849201";
      setTransferOtpData({ otp: String(code), expiresAt: res.expiresAt });
      toast.success("Đã tạo mã OTP chuyển giao quyền sở hữu (hiệu lực 15 phút)");
    } else {
      toast.error(
        res.error || "Chỉ Chủ sở hữu mới có quyền chuyển nhượng thiết bị"
      );
    }
  };

  const handleCancelTransferOtp = async () => {
    if (!selectedHwId) return;
    await customerApi.post(
      `/api/devices/${encodeURIComponent(selectedHwId)}/transfer/cancel`
    );
    setTransferOtpData(null);
    toast.info("Đã hủy mã OTP chuyển nhượng");
  };

  const handleClaimOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimOtpInput.trim()) return;
    const res = await customerApi.post("/api/devices/transfer/claim", {
      otp: claimOtpInput.trim(),
      transferCode: claimOtpInput.trim(),
    });
    if (res.success) {
      toast.success("Đã nhận quyền sở hữu thiết bị mới");
      setShowClaimModal(false);
      setClaimOtpInput("");
      await refreshDevices();
    } else {
      toast.error(res.error || "Mã OTP không hợp lệ hoặc đã hết hạn");
    }
  };

  const selectedDevice = devices.find((d) => d.hardwareId === selectedHwId);

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600/12 text-blue-500 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">
              Quản lý chia sẻ gia đình & chuyển giao quyền sở hữu
            </h1>
            <p className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2]">
              Phân quyền chi tiết thành viên và khách theo từng thiết bị và khung giờ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowClaimModal(true)}
            className="h-8 px-3 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] hover:border-blue-500 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
            <span>Nhập OTP nhận thiết bị</span>
          </button>
          {selectedDevice && (
            <>
              <button
                type="button"
                onClick={handleCreateTransferOtp}
                className="h-8 px-3 rounded-lg border border-amber-500/35 bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Chuyển nhượng</span>
              </button>
              <button
                type="button"
                onClick={() => openAddModal()}
                className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Thêm thành viên</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transfer OTP Banner */}
      {transferOtpData && (
        <div className="shrink-0 p-3.5 rounded-xl border border-amber-500/35 bg-amber-500/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              Mã OTP chuyển giao quyền sở hữu ({selectedDevice?.name})
            </span>
            <div className="text-xl font-mono font-semibold tracking-widest mt-0.5 tabular-nums">
              {transferOtpData.otp}
            </div>
            <p className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2]">
              Gửi mã này cho chủ mới nhập vào mục &ldquo;Nhập OTP nhận thiết bị&rdquo; trong vòng 15 phút.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(transferOtpData.otp);
                toast.success("Đã sao chép mã OTP");
              }}
              className="h-8 px-3 rounded-lg bg-amber-500 text-white text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Sao chép</span>
            </button>
            <button
              type="button"
              onClick={handleCancelTransferOtp}
              className="h-8 px-3 rounded-lg border border-rose-500/35 text-rose-500 text-xs font-medium cursor-pointer"
            >
              Hủy mã
            </button>
          </div>
        </div>
      )}

      {/* Master-Detail Split with Independent Internal Scroll */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden">
        {/* Left 4 cols: Device Selector */}
        <div className="lg:col-span-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-col min-h-0 overflow-hidden">
          <div className="shrink-0 px-3.5 py-2.5 border-b border-black/[0.06] dark:border-white/[0.06]">
            <h2 className="text-xs font-semibold text-[#525D6F] dark:text-[#9BA4B2]">
              Chọn thiết bị cần phân quyền ({devices.length})
            </h2>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1.5">
            {devices.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#7B8596]">
                Bạn chưa sở hữu thiết bị nào.
              </div>
            ) : (
              devices.map((d) => {
                const active = d.hardwareId === selectedHwId;
                return (
                  <button
                    key={d.hardwareId}
                    type="button"
                    onClick={() => setSelectedHwId(d.hardwareId)}
                    className={`w-full p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      active
                        ? "border-blue-600 bg-blue-600/10"
                        : "border-black/[0.08] dark:border-white/[0.08] hover:bg-[#F6F7F9] dark:hover:bg-[#1C232E]"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{d.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
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
                        <span className="text-[10px] text-[#7B8596] font-mono truncate">
                          · {d.hardwareId}
                        </span>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#EEF1F5] dark:bg-[#1C232E] uppercase shrink-0">
                      {d.userRole}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right 8 cols: Member Permission List */}
        <div className="lg:col-span-8 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-col min-h-0 overflow-hidden">
          <div className="shrink-0 px-4 py-2.5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold">
                Thành viên truy cập: {selectedDevice?.name || "Chưa chọn thiết bị"}
              </h2>
              <p className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2]">
                {members.length} thành viên được chia sẻ quyền điều khiển
              </p>
            </div>
            {selectedHwId && (
              <button
                type="button"
                onClick={() => loadMembers(selectedHwId)}
                className="w-7 h-7 rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:bg-[#EEF1F5] dark:hover:bg-[#1C232E] flex items-center justify-center cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
            {suggestions.length > 0 && (
              <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] space-y-1.5">
                <span className="text-[11px] font-medium text-[#525D6F] dark:text-[#9BA4B2] block">
                  Gợi ý người thân đã chia sẻ trên thiết bị khác:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => openAddModal(s)}
                      className="px-2 py-1 rounded-md bg-white dark:bg-[#151A22] border border-black/[0.08] dark:border-white/[0.08] hover:border-blue-500 text-[11px] font-medium cursor-pointer"
                    >
                      + {s.fullName || s.name} ({s.phoneNumber || s.email})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {members.length === 0 ? (
              <div className="p-8 rounded-lg border border-dashed border-black/[0.1] dark:border-white/[0.1] text-center space-y-1.5">
                <Users className="w-7 h-7 text-[#7B8596] mx-auto" />
                <p className="text-xs font-semibold">
                  Chưa có thành viên nào được chia sẻ
                </p>
                <p className="text-[11px] text-[#7B8596]">
                  Bấm &ldquo;Thêm thành viên&rdquo; để cấp quyền cho người thân qua SĐT hoặc Email.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div
                    key={m.id || m.userId || m.phoneNumber}
                    className="p-3 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">
                          {m.fullName || m.name || "Thành viên"}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            String(m.role).toUpperCase() === "GUEST"
                              ? "bg-amber-500/15 text-amber-500"
                              : "bg-blue-600/15 text-blue-500"
                          }`}
                        >
                          {String(m.role || "MEMBER").toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-[#7B8596]">
                        {m.phoneNumber || m.phone || m.email}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                        {m.canControl !== false && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                            Điều khiển
                          </span>
                        )}
                        {m.canViewHistory !== false && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/12 text-blue-500">
                            Xem lịch sử
                          </span>
                        )}
                        {m.canChildLock && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/12 text-amber-500">
                            Khóa trẻ em
                          </span>
                        )}
                        {m.scheduleLimitActive && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/12 text-purple-400 font-mono">
                            {m.accessStartTime || "08:00"} - {m.accessEndTime || "18:00"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(m)}
                        className="h-7 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] hover:border-blue-500 text-xs font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Sửa quyền</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m)}
                        className="h-7 w-7 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      {showMemberModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setShowMemberModal(false)}
        >
          <form
            onSubmit={handleSaveMember}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#151A22] p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {editingMemberId
                  ? "Chỉnh sửa quyền thành viên"
                  : "Thêm thành viên gia đình mới"}
              </h3>
              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Tên gợi nhớ *
                </label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="VD: Bà xã, Con trai..."
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Số điện thoại hoặc Email *
                </label>
                <input
                  type="text"
                  value={memberPhoneOrEmail}
                  onChange={(e) => setMemberPhoneOrEmail(e.target.value)}
                  placeholder="0912345678"
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">Vai trò</label>
              <div className="grid grid-cols-2 gap-2">
                {(["MEMBER", "GUEST"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setMemberRole(r);
                      if (r === "GUEST") setScheduleLimitActive(true);
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                      memberRole === r
                        ? "border-blue-600 bg-blue-600/10 text-blue-500"
                        : "border-black/[0.08] dark:border-white/[0.08]"
                    }`}
                  >
                    {r === "MEMBER"
                      ? "Thành viên (Gia đình)"
                      : "Khách (Giới hạn giờ)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={canControl}
                  onChange={(e) => setCanControl(e.target.checked)}
                />
                <span>Cho phép điều khiển</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={canViewHistory}
                  onChange={(e) => setCanViewHistory(e.target.checked)}
                />
                <span>Xem lịch sử & Camera</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={canChildLock}
                  onChange={(e) => setCanChildLock(e.target.checked)}
                />
                <span>Bật/tắt khóa trẻ em</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={canConfig}
                  onChange={(e) => setCanConfig(e.target.checked)}
                />
                <span>Thay đổi cài đặt</span>
              </label>
            </div>

            <div className="p-3 rounded-lg border border-black/[0.08] dark:border-white/[0.08] space-y-2.5">
              <label className="flex items-center justify-between text-xs font-medium cursor-pointer">
                <span>Giới hạn theo khung giờ & ngày trong tuần</span>
                <input
                  type="checkbox"
                  checked={scheduleLimitActive}
                  onChange={(e) => setScheduleLimitActive(e.target.checked)}
                />
              </label>
              {scheduleLimitActive && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[11px] text-[#7B8596] block mb-1">
                        Từ giờ
                      </span>
                      <input
                        type="time"
                        value={accessStartTime}
                        onChange={(e) => setAccessStartTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-[#7B8596] block mb-1">
                        Đến giờ
                      </span>
                      <input
                        type="time"
                        value={accessEndTime}
                        onChange={(e) => setAccessEndTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    {DAY_LABELS.map((d, idx) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          setAccessDays((prev) =>
                            prev.map((v, i) => (i === idx ? !v : v))
                          )
                        }
                        className={`flex-1 py-1.5 rounded-md text-[11px] font-medium cursor-pointer ${
                          accessDays[idx]
                            ? "bg-blue-600 text-white"
                            : "bg-[#EEF1F5] dark:bg-[#1C232E] text-[#7B8596]"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowMemberModal(false)}
                className="px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer"
              >
                Lưu phân quyền
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Claim OTP Modal */}
      {showClaimModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setShowClaimModal(false)}
        >
          <form
            onSubmit={handleClaimOtp}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#151A22] p-5 space-y-3.5"
          >
            <h3 className="text-sm font-semibold">
              Nhập mã OTP nhận quyền sở hữu thiết bị
            </h3>
            <input
              type="text"
              value={claimOtpInput}
              onChange={(e) => setClaimOtpInput(e.target.value.toUpperCase())}
              placeholder="Nhập mã OTP 6 chữ số..."
              className="w-full px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-sm font-mono tracking-widest"
              required
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClaimModal(false)}
                className="px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
              >
                Nhận thiết bị
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function CustomerFamilySharingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs">Đang tải...</div>}>
      <FamilySharingContent />
    </Suspense>
  );
}
