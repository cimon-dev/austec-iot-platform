"use client";

import React, { useState, useEffect } from "react";
import { Edit3, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/context/apiConfig";

interface EditDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: any | null;
  onUpdated: (updatedDevice: any) => void;
  models: any[];
  groups: any[];
}

export function EditDeviceModal({
  isOpen,
  onClose,
  device,
  onUpdated,
  models,
  groups
}: EditDeviceModalProps) {
  const [form, setForm] = useState({
    customName: "",
    modelName: "",
    group: "",
    deviceType: "DOOR",
    owner: "",
    phone: "",
    addressDisplay: "",
    warrantyEndAt: "",
    subscriptionType: "LIMITED",
    subscriptionStatus: "ACTIVE"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (device) {
      setForm({
        customName: device.customName || device.name || "",
        modelName: device.modelName || device.model || "",
        group: device.group || "",
        deviceType: device.deviceType || device.type || "DOOR",
        owner: device.owner || device.ownerName || "",
        phone: device.phone || device.ownerPhone || "",
        addressDisplay: device.addressDisplay || device.address || "",
        warrantyEndAt: device.warrantyEndAt || device.warranty || "",
        subscriptionType: device.subscriptionType || "LIMITED",
        subscriptionStatus: device.subscriptionStatus || "ACTIVE"
      });
    }
  }, [device]);

  if (!isOpen || !device) return null;

  const hardwareId = device.hardwareId || device.hwId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customName.trim()) {
      toast.error("Vui lòng nhập tên thiết bị!");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      hardwareId,
      hwId: hardwareId,
      customName: form.customName.trim(),
      name: form.customName.trim(),
      modelName: form.modelName,
      model: form.modelName,
      group: form.group,
      deviceType: form.deviceType,
      type: form.deviceType,
      owner: form.owner.trim(),
      phone: form.phone.trim(),
      addressDisplay: form.addressDisplay.trim(),
      address: form.addressDisplay.trim(),
      warrantyEndAt: form.warrantyEndAt.trim(),
      warranty: form.warrantyEndAt.trim(),
      subscriptionType: form.subscriptionType,
      subscriptionStatus: form.subscriptionStatus
    };

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/devices/${hardwareId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.device) {
        onUpdated(data.device);
        onClose();
      } else {
        toast.error(data.error || "Không thể cập nhật thiết bị trong CSDL");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Chỉnh Sửa Thiết Bị ({hardwareId})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Cập nhật thông số kỹ thuật và thông tin vào CSDL PostgreSQL
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Hardware ID (Bất biến)
            </label>
            <input
              type="text"
              disabled
              value={hardwareId}
              className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 font-mono cursor-not-allowed uppercase"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Tên Thiết Bị (*)
            </label>
            <input
              type="text"
              required
              placeholder="vd: Cửa cuốn Showroom Austec 02"
              value={form.customName}
              onChange={(e) => setForm({ ...form, customName: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Model Thương Phẩm
              </label>
              <select
                value={form.modelName}
                onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                {models.map(m => (
                  <option key={m.id || m.modelCode} value={m.modelCode}>
                    {m.modelName} ({m.modelCode})
                  </option>
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                {groups.map(g => (
                  <option key={g.id || g.code} value={g.groupName}>
                    {g.groupName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Loại Phần Cứng
              </label>
              <select
                value={form.deviceType}
                onChange={(e) => setForm({ ...form, deviceType: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                <option value="DOOR">Cửa cuốn thông minh (DOOR)</option>
                <option value="SMART_LOCK">Khóa cửa Masaru (SMART_LOCK)</option>
                <option value="UPS">Bộ lưu điện (UPS)</option>
                <option value="CAM">Camera AI giám sát (CAM)</option>
                <option value="SENSOR">Cảm biến môi trường (SENSOR)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Hạn Bảo Hành
              </label>
              <input
                type="text"
                placeholder="vd: 12/2028 hoặc 2028-12-31"
                value={form.warrantyEndAt}
                onChange={(e) => setForm({ ...form, warrantyEndAt: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Gói Thuê Bao
              </label>
              <select
                value={form.subscriptionType}
                onChange={(e) => setForm({ ...form, subscriptionType: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                <option value="LIMITED">Có thời hạn (LIMITED)</option>
                <option value="PERPETUAL">Vĩnh viễn (PERPETUAL)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Trạng Thái Thuê Bao
              </label>
              <select
                value={form.subscriptionStatus}
                onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              >
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="EXPIRED">Hết hạn (EXPIRED)</option>
                <option value="SUSPENDED">Tạm ngưng (SUSPENDED)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Chủ Sở Hữu / Khách Hàng
              </label>
              <input
                type="text"
                placeholder="vd: Nguyễn Văn A"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Địa Chỉ Lắp Đặt
            </label>
            <input
              type="text"
              placeholder="vd: Biệt thự BT4, KĐT Ecopark, Hưng Yên"
              value={form.addressDisplay}
              onChange={(e) => setForm({ ...form, addressDisplay: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !form.customName.trim()}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs px-4 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Lưu Cập Nhật Vào CSDL</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
