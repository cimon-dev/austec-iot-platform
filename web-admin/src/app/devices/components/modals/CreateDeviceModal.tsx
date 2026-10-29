"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/context/apiConfig";

interface CreateDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newDevice: any) => void;
  models: any[];
  groups: any[];
  deviceTypes?: any[];
  devices: any[];
}

export function CreateDeviceModal({
  isOpen,
  onClose,
  onCreated,
  models,
  groups,
  deviceTypes = [],
  devices
}: CreateDeviceModalProps) {
  const [internalTypes, setInternalTypes] = useState<any[]>(deviceTypes);

  useEffect(() => {
    if (deviceTypes && deviceTypes.length > 0) {
      setInternalTypes(deviceTypes);
    } else {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      fetch(`${getApiBaseUrl()}/api/admin/device-types`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.deviceTypes)) {
            setInternalTypes(data.deviceTypes);
          }
        })
        .catch(err => console.warn("Lỗi nạp device types trong modal thêm thiết bị:", err));
    }
  }, [deviceTypes]);

  const [form, setForm] = useState({
    hardwareId: "",
    customName: "",
    modelName: "",
    group: "",
    deviceType: "DOOR",
    owner: "",
    phone: "",
    addressDisplay: "",
    warrantyEndAt: "12/2028"
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-select first model and group and type when options are loaded
  useEffect(() => {
    if (models.length > 0 && !form.modelName) {
      setForm(prev => ({
        ...prev,
        modelName: models[0]?.modelCode || "AUSTEC-A900"
      }));
    }
  }, [models]);

  useEffect(() => {
    if (groups.length > 0 && !form.group) {
      setForm(prev => ({
        ...prev,
        group: groups[0]?.groupName || "Cửa cuốn nhôm Đức"
      }));
    }
  }, [groups]);

  useEffect(() => {
    if (internalTypes.length > 0) {
      const firstCode = internalTypes[0]?.typeCode || internalTypes[0]?.code;
      if (firstCode && (!form.deviceType || form.deviceType === "DOOR")) {
        setForm(prev => ({
          ...prev,
          deviceType: firstCode
        }));
      }
    }
  }, [internalTypes]);

  if (!isOpen) return null;

  const isDuplicateHwId = form.hardwareId.trim() !== "" && 
    devices.some(d => (d.hardwareId || d.hwId)?.trim().toUpperCase() === form.hardwareId.trim().toUpperCase());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.hardwareId.trim() || !form.customName.trim() || isDuplicateHwId) return;

    setIsSubmitting(true);

    const payload = {
      hardwareId: form.hardwareId.trim(),
      hwId: form.hardwareId.trim(),
      customName: form.customName.trim(),
      name: form.customName.trim(),
      modelName: form.modelName || models[0]?.modelCode || "AUSTEC-A900",
      model: form.modelName || models[0]?.modelCode || "AUSTEC-A900",
      group: form.group || groups[0]?.groupName || "Chưa phân nhóm",
      groupName: form.group || groups[0]?.groupName || "Chưa phân nhóm",
      deviceType: form.deviceType,
      type: form.deviceType,
      owner: form.owner.trim() || "Chưa gán",
      ownerName: form.owner.trim() || "Chưa gán",
      phone: form.phone.trim() || "---",
      ownerPhone: form.phone.trim() || "---",
      addressDisplay: form.addressDisplay.trim() || "Kho tổng Austec",
      address: form.addressDisplay.trim() || "Kho tổng Austec",
      warrantyEndAt: form.warrantyEndAt.trim() || "12/2028",
      warranty: form.warrantyEndAt.trim() || "12/2028",
      status: (form.owner && form.owner.trim() !== "") ? "offline" : "in_stock",
      isOnline: false,
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2028-12-31T00:00:00.000Z",
      subscriptionStatus: "ACTIVE"
    };

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.device) {
        onCreated(data.device);
        onClose();
        setForm({
          hardwareId: "",
          customName: "",
          modelName: models[0]?.modelCode || "",
          group: groups[0]?.groupName || "",
          deviceType: "DOOR",
          owner: "",
          phone: "",
          addressDisplay: "",
          warrantyEndAt: "12/2028"
        });
      } else {
        toast.error(data.error || "Không thể tạo thiết bị trên CSDL");
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
            <div className="w-7 h-7 rounded-lg bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Thêm Mới Thiết Bị Vào CSDL
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Lưu trữ bền vững vào bảng thiết bị PostgreSQL
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
              Hardware ID / Mã Định Danh (*)
            </label>
            <input
              type="text"
              required
              placeholder="vd: esp32_door_01 hoặc AT-DOOR-88239A99"
              value={form.hardwareId}
              onChange={(e) => setForm({ ...form, hardwareId: e.target.value })}
              className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none ${
                isDuplicateHwId 
                  ? "border-rose-500 ring-2 ring-rose-500/20" 
                  : "border-slate-200 dark:border-slate-700 focus:border-cyan-500"
              }`}
            />
            {isDuplicateHwId && (
              <div className="flex items-center gap-1.5 mt-1.5 p-2 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Hardware ID &quot;{form.hardwareId.trim()}&quot; đã tồn tại trong CSDL! Chống nhập trùng kích hoạt.</span>
              </div>
            )}
            {!isDuplicateHwId && form.hardwareId.trim() && (
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
              value={form.customName}
              onChange={(e) => setForm({ ...form, customName: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              >
                {models.length === 0 ? (
                  <option value="AUSTEC-A900">Austec Titadoor A900 Super (AUSTEC-A900)</option>
                ) : (
                  models.map(m => (
                    <option key={m.id || m.modelCode} value={m.modelCode}>
                      {m.modelName} ({m.modelCode})
                    </option>
                  ))
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              >
                {groups.length === 0 ? (
                  <option value="Cửa cuốn nhôm Đức">Cửa cuốn nhôm Đức</option>
                ) : (
                  groups.map(g => (
                    <option key={g.id || g.code} value={g.groupName}>
                      {g.groupName}
                    </option>
                  ))
                )}
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              >
                {internalTypes && internalTypes.length > 0 ? (
                  internalTypes.map((t: any) => {
                    const code = t.typeCode || t.code || t.type_code;
                    const name = t.typeName || t.name || t.type_name || code;
                    return (
                      <option key={t.id || code} value={code}>
                        {name} ({code})
                      </option>
                    );
                  })
                ) : (
                  <>
                    <option value="DOOR">Cửa cuốn thông minh (DOOR)</option>
                    <option value="SMART_LOCK">Khóa cửa Masaru (SMART_LOCK)</option>
                    <option value="UPS">Bộ lưu điện (UPS)</option>
                    <option value="CAM">Camera AI giám sát (CAM)</option>
                    <option value="SENSOR">Cảm biến môi trường (SENSOR)</option>
                  </>
                )}
                {form.deviceType && internalTypes && !internalTypes.some((t: any) => (t.typeCode || t.code || t.type_code) === form.deviceType) && (
                  <option value={form.deviceType}>{form.deviceType}</option>
                )}
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Chủ Sở Hữu / Khách Hàng
              </label>
              <input
                type="text"
                placeholder="vd: Nguyễn Văn A (để trống nếu là kho)"
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
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
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
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
              disabled={isSubmitting || isDuplicateHwId || !form.hardwareId.trim() || !form.customName.trim()}
              className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-4 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Lưu Vào CSDL</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
