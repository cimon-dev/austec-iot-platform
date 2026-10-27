"use client";

import React, { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Users,
  Search,
  Plus,
  Trash2,
  Shield,
  DoorClosed,
  Lock,
  Video,
  Radio,
} from "lucide-react";
import { MatrixOwnerItem, MemberPermissionItem } from "../../types";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { AddMemberModal } from "../modals/AddMemberModal";

interface FamilyMatrixTabProps {
  matrixData: MatrixOwnerItem[];
  selectedOwnerId: string;
  onSelectOwner: (ownerId: string) => void;
  selectedHardwareId: string;
  onSelectHardware: (hwId: string) => void;
  onTogglePermission: (
    memberId: string,
    field: "canControl" | "canViewHistory" | "canChildLock" | "canConfig" | "scheduleLimitActive"
  ) => void;
  onRevokeMember: (memberId: string, memberName: string) => void;
  onAddMemberSubmit: (newMember: MemberPermissionItem) => void;
  revokeTarget: { memberId: string; memberName: string; hwId: string } | null;
  isRevoking: boolean;
  onConfirmRevoke: () => void;
  onCancelRevoke: () => void;
}

export function FamilyMatrixTab({
  matrixData,
  selectedOwnerId,
  onSelectOwner,
  selectedHardwareId,
  onSelectHardware,
  onTogglePermission,
  onRevokeMember,
  onAddMemberSubmit,
  revokeTarget,
  isRevoking,
  onConfirmRevoke,
  onCancelRevoke,
}: FamilyMatrixTabProps) {
  const [ownerSearchQuery, setOwnerSearchQuery] = useState("");
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  // Form State for Adding Member
  const [newMemberForm, setNewMemberForm] = useState({
    memberName: "",
    phoneNumber: "",
    role: "MEMBER" as "MEMBER" | "GUEST" | "TECH",
    canControl: true,
    canViewHistory: false,
    canChildLock: false,
    canConfig: false,
    scheduleLimitActive: false,
    accessStartTime: "00:00",
    accessEndTime: "23:59",
  });

  const filteredOwners = useMemo(() => {
    return matrixData.filter((o) => {
      const q = ownerSearchQuery.toLowerCase();
      return (
        !q ||
        o.ownerName.toLowerCase().includes(q) ||
        o.phoneNumber.includes(q) ||
        o.ownerId.toLowerCase().includes(q)
      );
    });
  }, [matrixData, ownerSearchQuery]);

  const currentSelectedOwner = useMemo(() => {
    return matrixData.find((o) => o.ownerId === selectedOwnerId) || matrixData[0] || null;
  }, [matrixData, selectedOwnerId]);

  const currentSelectedDevice = useMemo(() => {
    if (!currentSelectedOwner) return null;
    return (
      currentSelectedOwner.devices.find((d) => d.hardwareId === selectedHardwareId) ||
      currentSelectedOwner.devices[0] ||
      null
    );
  }, [currentSelectedOwner, selectedHardwareId]);

  // Suggested members from other devices of the same owner
  const suggestedMembersFromOtherDevices = useMemo(() => {
    if (!currentSelectedOwner || !currentSelectedDevice) return [];
    const currentHwId = currentSelectedDevice.hardwareId;
    const currentPhones = new Set(
      (currentSelectedDevice.members || []).map((m) => (m.phoneNumber || "").replace(/\D/g, ""))
    );
    const currentNames = new Set(
      (currentSelectedDevice.members || []).map((m) => (m.memberName || "").toLowerCase().trim())
    );

    const suggestions: {
      memberName: string;
      phoneNumber: string;
      role: "MEMBER" | "GUEST" | "TECH";
      sourceDeviceName: string;
      canControl: boolean;
      canViewHistory: boolean;
      canChildLock: boolean;
      canConfig: boolean;
      scheduleLimitActive: boolean;
    }[] = [];

    for (const dev of currentSelectedOwner.devices) {
      if (dev.hardwareId === currentHwId) continue;
      for (const m of dev.members || []) {
        if ((m.role as string) === "OWNER") continue;
        const cleanPhone = (m.phoneNumber || "").replace(/\D/g, "");
        const normName = (m.memberName || "").toLowerCase().trim();
        if ((cleanPhone && currentPhones.has(cleanPhone)) || currentNames.has(normName)) {
          continue;
        }
        if (!suggestions.some((s) => s.phoneNumber === m.phoneNumber)) {
          suggestions.push({
            memberName: m.memberName,
            phoneNumber: m.phoneNumber,
            role: m.role as any,
            sourceDeviceName: dev.deviceName || dev.hardwareId,
            canControl: m.canControl,
            canViewHistory: m.canViewHistory,
            canChildLock: m.canChildLock,
            canConfig: m.canConfig,
            scheduleLimitActive: m.scheduleLimitActive,
          });
        }
      }
    }
    return suggestions;
  }, [currentSelectedOwner, currentSelectedDevice]);


  const handleSubmitNewMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.memberName.trim() || !newMemberForm.phoneNumber.trim()) {
      toast.error("Vui lòng nhập Họ tên và Số điện thoại thành viên!");
      return;
    }

    const newMember: MemberPermissionItem = {
      id: `PERM-${Date.now()}`,
      userId: `USER-${Date.now()}`,
      memberName: newMemberForm.memberName.trim(),
      phoneNumber: newMemberForm.phoneNumber.trim(),
      role: newMemberForm.role,
      canControl: newMemberForm.canControl,
      canViewHistory: newMemberForm.canViewHistory,
      canChildLock: newMemberForm.canChildLock,
      canConfig: newMemberForm.canConfig,
      scheduleLimitActive: newMemberForm.scheduleLimitActive,
      accessStartTime: newMemberForm.accessStartTime,
      accessEndTime: newMemberForm.accessEndTime,
      accessDays: [true, true, true, true, true, true, false],
    };

    onAddMemberSubmit(newMember);
    setIsAddMemberModalOpen(false);
  };

  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-2.5 overflow-hidden">
      {/* COLUMN 1: USERS / OWNERS LIST (3 cols) */}
      <div className="md:col-span-3 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">
                1
              </span>
              <span>Chủ Sở Hữu (Chủ Nhà)</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
              {filteredOwners.length} chủ nhà
            </span>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT..."
              value={ownerSearchQuery}
              onChange={(e) => setOwnerSearchQuery(e.target.value)}
              className="w-full text-xs pl-7 pr-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredOwners.map((owner) => {
            const isSelected = selectedOwnerId === owner.ownerId;
            const totalMembers = owner.devices.reduce((acc, d) => acc + d.members.length, 0);
            return (
              <div
                key={owner.ownerId}
                onClick={() => onSelectOwner(owner.ownerId)}
                className={`p-2.5 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-purple-50 dark:bg-purple-950/40 border-l-4 border-purple-600"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                    <Users
                      className={`w-3.5 h-3.5 ${
                        isSelected ? "text-purple-600 dark:text-purple-400" : "text-slate-400"
                      }`}
                    />
                    <span>{owner.ownerName}</span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                    {owner.devices.length} TB
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                  <span>{owner.phoneNumber}</span>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-sans font-medium">
                    {totalMembers} thành viên phụ
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{owner.address}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COLUMN 2: DEVICES OF SELECTED OWNER (4 cols) */}
      <div className="md:col-span-4 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-bold">
                2
              </span>
              <span>Thiết Bị Của Chủ Nhà</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
              {currentSelectedOwner ? currentSelectedOwner.devices.length : 0} thiết bị
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
            Chủ sở hữu:{" "}
            <strong className="text-slate-900 dark:text-white">
              {currentSelectedOwner?.ownerName || "Chưa chọn"}
            </strong>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1.5">
          {currentSelectedOwner?.devices.map((device) => {
            const isSelected = selectedHardwareId === device.hardwareId;
            return (
              <div
                key={device.hardwareId}
                onClick={() => onSelectHardware(device.hardwareId)}
                className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-cyan-50/60 dark:bg-cyan-950/40 border-cyan-500 shadow-xs"
                    : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 hover:border-cyan-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {device.deviceType === "Cửa cuốn" && (
                      <DoorClosed className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    )}
                    {device.deviceType === "Khóa thông minh" && (
                      <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    )}
                    {device.deviceType === "Camera AI" && (
                      <Video className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    )}
                    {device.deviceType !== "Cửa cuốn" &&
                      device.deviceType !== "Khóa thông minh" &&
                      device.deviceType !== "Camera AI" && (
                        <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )}
                    <span className="font-semibold text-slate-900 dark:text-white text-xs">
                      {device.deviceName}
                    </span>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                      device.isOnline
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                    }`}
                  >
                    {device.isOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                  <span>{device.hardwareId}</span>
                  <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                    {device.subscriptionType === "PERPETUAL" ? "Vô thời hạn" : "Có thời hạn"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 mt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <span>Model: {device.modelName}</span>
                  <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                    {device.members.length} người được chia sẻ ➔
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COLUMN 3: SECONDARY MEMBERS & PERMISSIONS (5 cols) */}
      <div className="md:col-span-5 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                3
              </span>
              <span>Thành Viên Phụ & Ma Trận Phân Quyền</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Thiết bị:{" "}
              <strong className="text-cyan-600 dark:text-cyan-400 font-mono">
                {currentSelectedDevice?.hardwareId || "Chưa chọn"}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddMemberModalOpen(true)}
            disabled={!currentSelectedDevice}
            className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm thành viên</span>
          </button>
        </div>

        {/* List of Shared Members with Granular Switches */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
          {!currentSelectedDevice || currentSelectedDevice.members.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <Shield className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
              <div className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                Chưa có thành viên phụ nào được ủy quyền
              </div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                Ấn vào nút "Thêm thành viên" để cấp quyền điều khiển cho vợ/chồng, con cái hoặc người giúp việc.
              </p>
            </div>
          ) : (
            currentSelectedDevice.members.map((member) => (
              <div
                key={member.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <span>{member.memberName}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          member.role === "MEMBER"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                            : member.role === "GUEST"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {member.role === "MEMBER"
                          ? "GIA ĐÌNH"
                          : member.role === "GUEST"
                          ? "KHÁCH"
                          : "KỸ THUẬT"}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                      {member.phoneNumber}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRevokeMember(member.id, member.memberName)}
                    className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="Thu hồi quyền thành viên"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Permissions Matrix Switches */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <label className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Quyền Điều Khiển:</span>
                    <input
                      type="checkbox"
                      checked={member.canControl}
                      onChange={() => onTogglePermission(member.id, "canControl")}
                      className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Xem Lịch Sử:</span>
                    <input
                      type="checkbox"
                      checked={member.canViewHistory}
                      onChange={() => onTogglePermission(member.id, "canViewHistory")}
                      className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Khóa Trẻ Em:</span>
                    <input
                      type="checkbox"
                      checked={member.canChildLock}
                      onChange={() => onTogglePermission(member.id, "canChildLock")}
                      className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">Cấu Hình TB:</span>
                    <input
                      type="checkbox"
                      checked={member.canConfig}
                      onChange={() => onTogglePermission(member.id, "canConfig")}
                      className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px]">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Giới Hạn Giờ Truy Cập:</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono ${
                        member.scheduleLimitActive
                          ? "text-amber-600 dark:text-amber-400 font-bold"
                          : "text-slate-400"
                      }`}
                    >
                      {member.scheduleLimitActive
                        ? `${member.accessStartTime} - ${member.accessEndTime}`
                        : "24/7 Không giới hạn"}
                    </span>
                    <input
                      type="checkbox"
                      checked={member.scheduleLimitActive}
                      onChange={() => onTogglePermission(member.id, "scheduleLimitActive")}
                      className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Add Member */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSubmit={handleSubmitNewMember}
        currentSelectedDevice={currentSelectedDevice}
        suggestedMembers={suggestedMembersFromOtherDevices}
        form={newMemberForm}
        setForm={setNewMemberForm}
      />

      {/* Standardized Revoke Member Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!revokeTarget}
        title="Thu Hồi Quyền Thành Viên"
        itemName={revokeTarget?.memberName}
        itemType="thành viên"
        description={`Bạn có chắc chắn muốn thu hồi toàn bộ quyền truy cập thiết bị (${revokeTarget?.hwId}) của người này?`}
        isDeleting={isRevoking}
        onConfirm={onConfirmRevoke}
        onClose={onCancelRevoke}
      />
    </div>
  );
}
