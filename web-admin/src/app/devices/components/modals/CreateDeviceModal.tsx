"use client";

import React, { useState } from "react";
import { Plus, X, AlertCircle, CheckCircle2, Check } from "lucide-react";

interface CreateDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newDevice: any) => void;
  models: any[];
  groups: any[];
  devices: any[];
}

export function CreateDeviceModal({
  isOpen,
  onClose,
  onCreated,
  models,
  groups,
  devices
}: CreateDeviceModalProps) {
  const [form, setForm] = useState({
    hwId: "",
    name: "",
    model: models[0]?.code || "AUSTEC-A900",
    group: groups[0]?.name || "Cửa cuốn nhôm Đức",
    type: "DOOR",
    owner: "",
    phone: "",
    warranty: "12/2028"
  });

  if (!isOpen) return null;

  const isDuplicateHwId = form.hwId.trim() !== "" && 
    devices.some(d => d.hwId?.trim().toUpperCase() === form.hwId.trim().toUpperCase());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hwId.trim() || !form.name.trim() || isDuplicateHwId) return;

    const newDevice = {
      hwId: form.hwId.trim().toUpperCase(),
      name: form.name.trim(),
      model: form.model,
      group: form.group,
      type: form.type,
      owner: form.owner.trim() || "Chưa gán",
      phone: form.phone.trim() || "---",
      status: "in_stock",
      isOnline: false,
      battery: 100,
      openState: "STOCK",
      isLocked: false,
      signal: 0,
      warranty: form.warranty.trim() || "12/2028",
      address: "Kho tổng Austec",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2028-12-31T00:00:00.000Z",
      subscriptionStatus: "ACTIVE"
    };

    onCreated(newDevice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Khởi Tạo Thiết Bị Mới Vào Kho (Anti-Duplicate Check)
              </h3>
              <p className="text-[11px] text-slate-500">
                Thêm một thiết bị mới đơn lẻ với mã Hardware ID chống trùng lặp tuyệt đối
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Hardware ID / Serial Máy (*)
            </label>
            <input
              type="text"
              required
              placeholder="vd: AT-DOOR-88239A99 hoặc AT-CAM-00109A99"
              value={form.hwId}
              onChange={(e) => setForm({ ...form, hwId: e.target.value })}
              className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none uppercase ${
                isDuplicateHwId 
                  ? "border-rose-500 ring-2 ring-rose-500/20" 
                  : "border-slate-200 dark:border-slate-700 focus:border-cyan-500"
              }`}
            />
            {isDuplicateHwId && (
              <div className="flex items-center gap-1.5 mt-1.5 p-2 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Hardware ID &quot;{form.hwId.trim()}&quot; đã tồn tại trong CSDL kho! Chống nhập trùng kích hoạt.</span>
              </div>
            )}
            {!isDuplicateHwId && form.hwId.trim() && (
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span>Hardware ID hợp lệ, chưa từng tồn tại trong hệ thống.</span>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Tên Thiết Bị (*)
            </label>
            <input
              type="text"
              required
              placeholder="vd: Cửa cuốn Showroom Austec 02"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Model Thương Phẩm
              </label>
              <select
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              >
                {models.map(m => (
                  <option key={m.id} value={m.code}>{m.name} ({m.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nhóm Sản Phẩm
              </label>
              <select
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              >
                {groups.map(g => (
                  <option key={g.id} value={g.name}>{g.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Loại Phần Cứng
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="DOOR">Cửa cuốn (DOOR)</option>
                <option value="SMART_LOCK">Khóa thông minh (SMART_LOCK)</option>
                <option value="CAMERA">Camera AI (CAMERA)</option>
                <option value="SENSOR_ENV">Cảm biến nhiệt ẩm (SENSOR_ENV)</option>
                <option value="UPS">Bộ lưu điện (UPS)</option>
                <option value="BIKE">Xe máy điện / GSHT (BIKE)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Hạn Bảo Hành
              </label>
              <input
                type="text"
                placeholder="vd: 12/2028"
                value={form.warranty}
                onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Khách Hàng / Nơi Lắp Đặt
              </label>
              <input
                type="text"
                placeholder="vd: Trần Quốc Bảo"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Số Điện Thoại
              </label>
              <input
                type="text"
                placeholder="vd: 0988 123 456"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isDuplicateHwId || !form.hwId.trim() || !form.name.trim()}
              className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs flex items-center gap-1.5 transition-all ${
                isDuplicateHwId || !form.hwId.trim() || !form.name.trim()
                  ? "bg-slate-400 cursor-not-allowed opacity-60"
                  : "bg-cyan-600 hover:bg-cyan-500 cursor-pointer"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Lưu Thiết Bị Vào Kho</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
