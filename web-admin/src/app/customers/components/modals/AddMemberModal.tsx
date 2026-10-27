"use client";

import React from "react";
import { UserPlus, X, Sparkles } from "lucide-react";
import { MatrixDeviceItem } from "../../types";

interface SuggestedMember {
  memberName: string;
  phoneNumber: string;
  role: "MEMBER" | "GUEST" | "TECH";
  sourceDeviceName: string;
  canControl: boolean;
  canViewHistory: boolean;
  canChildLock: boolean;
  canConfig: boolean;
  scheduleLimitActive: boolean;
}

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  currentSelectedDevice: MatrixDeviceItem | null;
  suggestedMembers: SuggestedMember[];
  form: {
    memberName: string;
    phoneNumber: string;
    role: "MEMBER" | "GUEST" | "TECH";
    canControl: boolean;
    canViewHistory: boolean;
    canChildLock: boolean;
    canConfig: boolean;
    scheduleLimitActive: boolean;
    accessStartTime: string;
    accessEndTime: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
}

export function AddMemberModal({
  isOpen,
  onClose,
  onSubmit,
  currentSelectedDevice,
  suggestedMembers,
  form,
  setForm,
}: AddMemberModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Ủy Quyền Thành Viên Thứ Cấp
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-3.5 space-y-3 text-xs">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Thiết bị nhận phân quyền:{" "}
            <strong className="text-cyan-600 dark:text-cyan-400 font-mono">
              {currentSelectedDevice?.hardwareId}
            </strong>{" "}
            ({currentSelectedDevice?.deviceName})
          </div>

          {suggestedMembers.length > 0 && (
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <div className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Gợi ý từ các thiết bị khác của chủ nhà ({suggestedMembers.length}):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {suggestedMembers.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setForm({
                        memberName: sug.memberName,
                        phoneNumber: sug.phoneNumber,
                        role: sug.role,
                        canControl: sug.canControl,
                        canViewHistory: sug.canViewHistory,
                        canChildLock: sug.canChildLock,
                        canConfig: sug.canConfig,
                        scheduleLimitActive: sug.scheduleLimitActive,
                        accessStartTime: "08:00",
                        accessEndTime: "18:00",
                      });
                    }}
                    className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-cyan-500/40 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500 hover:text-white text-[10.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>+ {sug.memberName}</span>
                    <span className="text-[9px] opacity-75">({sug.sourceDeviceName})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Họ và tên thành viên *
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Trần Thu Hà (Vợ), Nguyễn Văn An..."
              value={form.memberName}
              onChange={(e) => setForm({ ...form, memberName: e.target.value })}
              className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Số điện thoại đăng nhập App *
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: 0988 123 456..."
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Vai trò phân định
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as any })}
              className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="MEMBER">Thành viên gia đình (Family Member)</option>
              <option value="GUEST">Khách tạm thời / Người giúp việc (Guest)</option>
              <option value="TECH">Kỹ thuật viên bảo trì (Technician)</option>
            </select>
          </div>

          {/* Granular permissions */}
          <div className="space-y-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Các quyền cho phép kích hoạt:
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.canControl}
                onChange={(e) => setForm({ ...form, canControl: e.target.checked })}
                className="w-3.5 h-3.5 text-purple-600 rounded"
              />
              <span>Được phép điều khiển (Đóng / Mở / Khóa)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.canViewHistory}
                onChange={(e) => setForm({ ...form, canViewHistory: e.target.checked })}
                className="w-3.5 h-3.5 text-purple-600 rounded"
              />
              <span>Xem lịch sử đóng mở và cảnh báo an ninh</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.canChildLock}
                onChange={(e) => setForm({ ...form, canChildLock: e.target.checked })}
                className="w-3.5 h-3.5 text-purple-600 rounded"
              />
              <span>Kích hoạt Khóa Trẻ Em / Khóa Cứng</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.scheduleLimitActive}
                onChange={(e) => setForm({ ...form, scheduleLimitActive: e.target.checked })}
                className="w-3.5 h-3.5 text-amber-600 rounded"
              />
              <span>Giới hạn khung giờ truy cập (08:00 - 18:00)</span>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-xs cursor-pointer"
            >
              Cấp Quyền & Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
