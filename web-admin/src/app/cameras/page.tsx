"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useCustomerIoT } from "@/customer/context/CustomerIoTContext";
import { useLanguage } from "@/context/LanguageContext";
import { WebCameraPlayer } from "@/customer/components/WebCameraPlayer";
import { DeviceDetailModal } from "@/customer/components/DeviceDetailModal";
import { DeviceItem } from "@/customer/types/device";
import {
  Video,
  PlusCircle,
  RefreshCw,
  X,
  Sliders,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export default function CustomerCameraWallPage() {
  const { allDevicesWithEnergySamples, refreshDevices } = useCustomerIoT();
  const { language } = useLanguage();

  const [gridLayout, setGridLayout] = useState<1 | 4 | 9>(4);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [fullscreenCam, setFullscreenCam] = useState<DeviceItem | null>(null);
  const [detailHwId, setDetailHwId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>("ALL");
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);

  const cameras = useMemo(
    () =>
      allDevicesWithEnergySamples.filter(
        (d) =>
          d.category === "camera" &&
          (selectedRoom === "ALL" || d.roomName.trim() === selectedRoom)
      ),
    [allDevicesWithEnergySamples, selectedRoom]
  );

  const rooms = useMemo(() => {
    const s = new Set<string>();
    allDevicesWithEnergySamples
      .filter((d) => d.category === "camera")
      .forEach((c) => {
        if (c.roomName?.trim()) s.add(c.roomName.trim());
      });
    return Array.from(s);
  }, [allDevicesWithEnergySamples]);

  const totalPages = Math.max(1, Math.ceil(cameras.length / gridLayout));
  const safePage = Math.min(currentPage, totalPages - 1);
  const visibleCameras = useMemo(
    () => cameras.slice(safePage * gridLayout, (safePage + 1) * gridLayout),
    [cameras, safePage, gridLayout]
  );

  useEffect(() => {
    const onVisChange = () => {
      setIsTabVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, []);

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
      {/* Top Camera Wall Header */}
      <div className="shrink-0 p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/12 text-cyan-500 flex items-center justify-center shrink-0">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">
              {language === "vi"
                ? "Trung tâm giám sát Camera (WebRTC Wall)"
                : "WebRTC Security Camera Wall"}
            </h1>
            <p className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2]">
              {cameras.length}{" "}
              {language === "vi"
                ? "camera đang liên kết · Tự động quản lý luồng theo khung hiển thị"
                : "linked cameras · Auto stream management"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rooms.length > 0 && (
            <select
              value={selectedRoom}
              onChange={(e) => {
                setSelectedRoom(e.target.value);
                setCurrentPage(0);
              }}
              className="h-7 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-medium"
            >
              <option value="ALL">
                {language === "vi" ? "Tất cả khu vực" : "All locations"}
              </option>
              {rooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#EEF1F5] dark:bg-[#1C232E] p-0.5">
            {[
              { size: 1 as const, label: "1×1" },
              { size: 4 as const, label: "2×2" },
              { size: 9 as const, label: "3×3" },
            ].map((opt) => (
              <button
                key={opt.size}
                type="button"
                onClick={() => {
                  setGridLayout(opt.size);
                  setCurrentPage(0);
                }}
                className={`h-6 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  gridLayout === opt.size
                    ? "bg-blue-600 text-white"
                    : "text-[#525D6F] dark:text-[#9BA4B2]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              refreshDevices();
              toast.success("Đã làm mới danh sách Camera");
            }}
            className="h-7 w-7 rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:bg-[#EEF1F5] dark:hover:bg-[#1C232E] flex items-center justify-center cursor-pointer"
            title="Làm mới"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <Link
            href="/pair"
            className="h-7 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{language === "vi" ? "Thêm Camera" : "Add camera"}</span>
          </Link>
        </div>
      </div>

      {/* Camera Wall Grid with Internal Scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
        {cameras.length === 0 ? (
          <div className="h-full rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-col items-center justify-center p-10 text-center space-y-2.5">
            <Video className="w-9 h-9 text-cyan-500" />
            <h3 className="text-sm font-semibold">
              {language === "vi"
                ? "Chưa có Camera an ninh nào trong tài khoản"
                : "No security cameras linked"}
            </h3>
            <p className="text-xs text-[#525D6F] dark:text-[#9BA4B2] max-w-md">
              {language === "vi"
                ? "Ghép nối Camera AI Austec để xem trực tiếp nhiều luồng WebRTC cùng lúc trên màn hình máy tính."
                : "Pair an Austec AI camera to watch live multi-stream WebRTC feeds."}
            </p>
            <Link
              href="/pair"
              className="mt-1 h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{language === "vi" ? "Ghép nối Camera" : "Pair camera"}</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div
              className={`grid gap-3 ${
                gridLayout === 1
                  ? "grid-cols-1"
                  : gridLayout === 4
                    ? "grid-cols-1 md:grid-cols-2"
                    : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
              }`}
            >
              {visibleCameras.map((cam) => (
                <div
                  key={cam.hardwareId}
                  className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] overflow-hidden flex flex-col"
                >
                  <WebCameraPlayer
                    hardwareId={cam.hardwareId}
                    deviceName={cam.name}
                    isActive={isTabVisible}
                    className={
                      gridLayout === 1
                        ? "h-[64vh]"
                        : gridLayout === 4
                          ? "h-64"
                          : "h-48"
                    }
                    onExpandFullscreen={() => setFullscreenCam(cam)}
                  />
                  <div className="px-3 py-2 flex items-center justify-between gap-2 text-xs border-t border-black/[0.06] dark:border-white/[0.06]">
                    <div className="min-w-0">
                      <div className="font-semibold text-[13px] truncate">
                        {cam.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            cam.isOnline ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <span
                          className={`text-[11px] font-medium ${
                            cam.isOnline
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-500"
                          }`}
                        >
                          {cam.isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                        </span>
                        <span className="text-[11px] text-[#7B8596] font-mono truncate">
                          · {cam.roomName} · {cam.hardwareId}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setFullscreenCam(cam)}
                        className="h-7 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:border-blue-500 text-[11px] font-medium cursor-pointer"
                      >
                        Phóng to
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailHwId(cam.hardwareId)}
                        className="h-7 w-7 rounded-lg hover:bg-[#EEF1F5] dark:hover:bg-[#1C232E] flex items-center justify-center cursor-pointer"
                        title="Chi tiết & cài đặt Camera"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pb-1">
                <button
                  type="button"
                  disabled={safePage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  className="h-7 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] text-xs font-medium flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Trang trước</span>
                </button>
                <span className="text-xs font-mono tabular-nums">
                  Trang {safePage + 1} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={safePage >= totalPages - 1}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  className="h-7 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] text-xs font-medium flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                >
                  <span>Trang tiếp</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Camera Modal */}
      {fullscreenCam && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col p-4">
          <div className="shrink-0 flex items-center justify-between pb-3 text-white">
            <div>
              <h3 className="text-sm font-semibold">{fullscreenCam.name}</h3>
              <p className="text-xs text-[#9BA4B2] font-mono">
                {fullscreenCam.roomName} · {fullscreenCam.hardwareId}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFullscreenCam(null)}
              className="h-8 px-3 rounded-lg bg-white/10 hover:bg-rose-600 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Đóng</span>
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <WebCameraPlayer
              hardwareId={fullscreenCam.hardwareId}
              deviceName={fullscreenCam.name}
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      <DeviceDetailModal
        hardwareId={detailHwId}
        initialTab="settings"
        onClose={() => setDetailHwId(null)}
      />
    </div>
  );
}
