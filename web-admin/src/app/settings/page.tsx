"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useCustomerIoT } from "@/customer/context/CustomerIoTContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { getApiBaseUrl, setCustomApiUrl } from "@/context/apiConfig";
import { DeviceItem, getCategoryDisplayName } from "@/customer/types/device";
import { DeviceDetailModal } from "@/customer/components/DeviceDetailModal";
import {
  Settings,
  ShieldAlert,
  Sun,
  Moon,
  Languages,
  Server,
  X,
} from "lucide-react";
import { toast } from "sonner";

export default function CustomerSettingsAndDeviceCenterPage() {
  const {
    allDevicesWithEnergySamples,
    updateDeviceName,
    updateDeviceLocation,
    triggerEmergencyLockdown,
  } = useCustomerIoT();
  const { language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [apiUrlInput, setApiUrlInput] = useState("");
  const [mediaMtxUrlInput, setMediaMtxUrlInput] = useState("");
  const [editingDevice, setEditingDevice] = useState<DeviceItem | null>(null);
  const [detailHwId, setDetailHwId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newRoom, setNewRoom] = useState("");

  useEffect(() => {
    setApiUrlInput(getApiBaseUrl());
    if (typeof window !== "undefined") {
      setMediaMtxUrlInput(
        localStorage.getItem("austec_mediamtx_url") || "http://103.82.195.138:8889"
      );
    }
  }, []);

  const handleSaveEndpointConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomApiUrl(apiUrlInput.trim() || null);
    if (typeof window !== "undefined" && mediaMtxUrlInput.trim()) {
      localStorage.setItem("austec_mediamtx_url", mediaMtxUrlInput.trim());
    }
    toast.success("Đã lưu cấu hình kết nối máy chủ Cloud & MediaMTX");
  };

  const handleQuickEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    if (newName.trim() && newName.trim() !== editingDevice.name) {
      await updateDeviceName(editingDevice.hardwareId, newName.trim());
    }
    if (newRoom.trim() && newRoom.trim() !== editingDevice.roomName) {
      await updateDeviceLocation(editingDevice.hardwareId, newRoom.trim());
    }
    setEditingDevice(null);
    toast.success("Đã cập nhật tên và khu vực thiết bị");
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
      {/* Top Banner */}
      <div className="shrink-0 p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600/12 text-blue-500 flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">
              Quản lý tập trung thiết bị & cài đặt ứng dụng
            </h1>
            <p className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2]">
              Đổi tên nhanh, gán khu vực, kiểm tra Firmware OTA và tùy chỉnh giao diện
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            const count = await triggerEmergencyLockdown();
            toast.success(
              `Đã kích hoạt khóa an toàn khẩn cấp cho ${count} cửa cuốn`
            );
          }}
          className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Khóa khẩn cấp tất cả cửa cuốn</span>
        </button>
      </div>

      {/* Scrollable Inner Workspace */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-3">
        {/* 1. Centralized Device Management Table */}
        <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold">
              Danh mục thiết bị trong nhà ({allDevicesWithEnergySamples.length})
            </h2>
            <Link
              href="/pair"
              className="text-xs font-medium text-blue-500 hover:underline"
            >
              + Thêm thiết bị mới
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-black/[0.08] dark:border-white/[0.08] text-[11px] text-[#7B8596]">
                  <th className="py-2 px-3 font-medium">Thiết bị</th>
                  <th className="py-2 px-3 font-medium">Hardware ID</th>
                  <th className="py-2 px-3 font-medium">Phân loại</th>
                  <th className="py-2 px-3 font-medium">Khu vực</th>
                  <th className="py-2 px-3 font-medium">Bảo hành</th>
                  <th className="py-2 px-3 font-medium text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {allDevicesWithEnergySamples.map((dev) => (
                  <tr
                    key={dev.hardwareId}
                    className="hover:bg-[#F6F7F9] dark:hover:bg-[#1C232E]"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[12px]">{dev.name}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            dev.isOnline ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <span
                          className={`text-[10px] font-medium ${
                            dev.isOnline
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-500"
                          }`}
                        >
                          {dev.isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-[#7B8596]">
                      {dev.hardwareId}
                    </td>
                    <td className="py-2.5 px-3">
                      {getCategoryDisplayName(dev.category, language)}
                    </td>
                    <td className="py-2.5 px-3">{dev.roomName}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] tabular-nums">
                      {dev.warrantyUntil}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDevice(dev);
                            setNewName(dev.name);
                            setNewRoom(dev.roomName);
                          }}
                          className="h-7 px-2.5 rounded-md border border-black/[0.08] dark:border-white/[0.08] hover:border-blue-500 font-medium cursor-pointer"
                        >
                          Đổi tên / Phòng
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            toast.success(
                              `Thiết bị ${dev.name} đang chạy Firmware mới nhất (v2.14.6-OTA)`
                            )
                          }
                          className="h-7 px-2.5 rounded-md border border-black/[0.08] dark:border-white/[0.08] hover:border-emerald-500 font-medium cursor-pointer"
                        >
                          Check OTA
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailHwId(dev.hardwareId)}
                          className="h-7 px-2.5 rounded-md bg-blue-600 text-white font-medium cursor-pointer"
                        >
                          Mở
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. App Preferences & Cloud Server Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-6 p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-3">
            <h2 className="text-xs font-semibold">
              Tùy chỉnh giao diện & ngôn ngữ
            </h2>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
              <div className="flex items-center gap-2.5">
                {theme === "dark" ? (
                  <Moon className="w-4 h-4 text-blue-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
                <div>
                  <div className="text-xs font-semibold">
                    Chế độ màu giao diện
                  </div>
                  <div className="text-[11px] text-[#7B8596]">
                    Graphite Neutral (Tối / Sáng)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="h-7 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
              >
                {theme === "dark" ? "Giao diện tối" : "Giao diện sáng"}
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
              <div className="flex items-center gap-2.5">
                <Languages className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-xs font-semibold">Ngôn ngữ hiển thị</div>
                  <div className="text-[11px] text-[#7B8596]">
                    Hỗ trợ Tiếng Việt & Tiếng Anh
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
                className="h-7 px-3 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] text-xs font-medium cursor-pointer"
              >
                {language === "vi" ? "Tiếng Việt" : "English"}
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSaveEndpointConfig}
            className="lg:col-span-6 p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-3"
          >
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-500" />
              <h2 className="text-xs font-semibold">
                Cấu hình máy chủ Cloud & MediaMTX Camera
              </h2>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Địa chỉ IoT Backend API Gateway
              </label>
              <input
                type="text"
                value={apiUrlInput}
                onChange={(e) => setApiUrlInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Máy chủ stream Camera MediaMTX (WebRTC :8889)
              </label>
              <input
                type="text"
                value={mediaMtxUrlInput}
                onChange={(e) => setMediaMtxUrlInput(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono"
              />
            </div>

            <button
              type="submit"
              className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer"
            >
              Lưu cấu hình kết nối
            </button>
          </form>
        </div>
      </div>

      {/* Quick Rename & Room Assignment Modal */}
      {editingDevice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setEditingDevice(null)}
        >
          <form
            onSubmit={handleQuickEditSave}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#151A22] p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Đổi tên & gán phòng: {editingDevice.hardwareId}
              </h3>
              <button
                type="button"
                onClick={() => setEditingDevice(null)}
                className="p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Tên thiết bị
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Khu vực / Phòng
              </label>
              <input
                type="text"
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingDevice(null)}
                className="px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
              >
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

      <DeviceDetailModal
        hardwareId={detailHwId}
        onClose={() => setDetailHwId(null)}
      />
    </div>
  );
}
