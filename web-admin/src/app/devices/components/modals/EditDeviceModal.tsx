"use client";

import React, { useState, useEffect } from "react";
import { Edit3, X, AlertCircle, Check, Loader2 } from "lucide-react";
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
    name: "",
    model: "",
    group: "",
    type: "DOOR",
    owner: "",
    phone: "",
    address: "",
    warranty: "",
    subscriptionType: "LIMITED",
    subscriptionStatus: "ACTIVE"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (device) {
      setForm({
        name: device.name || device.customName || "",
        model: device.model || device.modelName || "",
        group: device.group || device.deviceType || "",
        type: device.type || device.deviceType || "DOOR",
        owner: device.owner || device.ownerName || "",
        phone: device.phone || device.ownerPhone || "",
        address: device.address || device.addressDisplay || "",
        warranty: device.warranty || device.warrantyEndAt || "",
        subscriptionType: device.subscriptionType || "LIMITED",
        subscriptionStatus: device.subscriptionStatus || "ACTIVE"
      });
      setSubmitError(null);
    }
  }, [device]);

  if (!isOpen || !device) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      name: form.name.trim(),
      model: form.model,
      group: form.group,
      type: form.type,
      owner: form.owner.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      warranty: form.warranty.trim(),
      subscriptionType: form.subscriptionType,
      subscriptionStatus: form.subscriptionStatus
    };

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const hwId = device.hwId || device.hardwareId;
      const res = await fetch(`${getApiBaseUrl()}/api/admin/devices/${hwId}`, {
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
        setSubmitError(data.error || "Không thể cập nhật thiết bị trong CSDL");
      }
    } catch (err: any) {
      setSubmitError("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Chỉnh Sửa Thông Tin Thiết Bị ({device.hwId || device.hardwareId})
              </h3>
              <p className="text-[11px] text-slate-500">
                Cập nhật thông số phần cứng, khách hàng sở hữu & gói cước trong CSDL
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

        {submitError && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Hardware ID (Cố Định)
              </label>
              <input
                type="text"
                disabled
                value={device.hwId || device.hardwareId}
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
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Model Thương Phẩm
              </label>
              <select
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                {models.length === 0 ? (
                  <option value={form.model || "AUSTEC-A900"}>{form.model || "AUSTEC-A900"}</option>
                ) : (
                  models.map(m => {
                    const code = m.modelCode || m.code || m.id;
                    const name = m.modelName || m.name || code;
                    return (
                      <option key={m.id || code} value={code}>
                        {name} ({code})
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Nhóm Sản Phẩm
              </label>
              <select
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                {groups.length === 0 ? (
                  <option value={form.group || "Cửa cuốn nhôm Đức"}>{form.group || "Cửa cuốn nhôm Đức"}</option>
                ) : (
                  groups.map(g => {
                    const gName = g.groupName || g.name || g.code;
                    return (
                      <option key={g.id || gName} value={gName}>
                        {gName}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Loại Phần Cứng
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
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
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Số Điện Thoại
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Địa Chỉ Lắp Đặt Chi Tiết
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Gói Dịch Vụ
              </label>
              <select
                value={form.subscriptionType}
                onChange={(e) => setForm({ ...form, subscriptionType: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="LIMITED">Có Thời Hạn (Định kỳ)</option>
                <option value="PERPETUAL">Vô Thời Hạn (Trọn đời)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Trạng Thái Gói Cước
              </label>
              <select
                value={form.subscriptionStatus}
                onChange={(e) => setForm({ ...form, subscriptionStatus: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ACTIVE">Hoạt Động (ACTIVE)</option>
                <option value="EXPIRED">Hết Hạn (EXPIRED)</option>
                <option value="LIFETIME">Trọn Đời (LIFETIME)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !form.name.trim()}
              className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs flex items-center gap-1.5 transition-all ${
                isSubmitting || !form.name.trim()
                  ? "bg-slate-400 cursor-not-allowed opacity-60"
                  : "bg-indigo-600 hover:bg-indigo-500 cursor-pointer"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu PostgreSQL...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Cập Nhật Vào CSDL</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
