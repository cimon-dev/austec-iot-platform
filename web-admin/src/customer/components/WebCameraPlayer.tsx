"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { customerApi } from "../services/customer-api-client";
import { useCustomerIoT } from "../context/CustomerIoTContext";
import { canViewCameraStream, getScheduleBlockedReason } from "../types/device";
import { getApiBaseUrl } from "@/context/apiConfig";
import {
  Video,
  RefreshCw,
  Maximize2,
  Camera,
  AlertTriangle,
  ExternalLink,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

interface WebCameraPlayerProps {
  hardwareId: string;
  deviceName?: string;
  isActive?: boolean;
  className?: string;
  showControls?: boolean;
  compact?: boolean;
  onExpandFullscreen?: () => void;
}

const streamCache: Record<string, { webrtc: string; hls?: string; rtsp?: string }> = {};

export function WebCameraPlayer({
  hardwareId,
  deviceName,
  isActive = true,
  className = "h-56",
  showControls = true,
  compact = false,
  onExpandFullscreen,
}: WebCameraPlayerProps) {
  const { findByHardwareId, sendCommand } = useCustomerIoT();
  const device = findByHardwareId(hardwareId);
  const sendCommandRef = useRef(sendCommand);
  sendCommandRef.current = sendCommand;

  const [webrtcUrl, setWebrtcUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reloadNonce, setReloadNonce] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMixedContentBlocked, setIsMixedContentBlocked] = useState<boolean>(false);

  const allowedToStream = device ? canViewCameraStream(device) : true;
  const blockedReason = device ? getScheduleBlockedReason(device) : "";

  const resolveStream = useCallback(async () => {
    if (!isActive || !hardwareId) return;
    if (!allowedToStream) {
      setIsLoading(false);
      setErrorMsg(blockedReason || "Ngoài khung giờ được phép xem camera");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setIsMixedContentBlocked(false);

    // Send STREAM_START (command 13)
    sendCommandRef.current(hardwareId, "STREAM_START").catch(() => {});

    let url = streamCache[hardwareId]?.webrtc || "";
    if (!url || reloadNonce > 0) {
      try {
        const res = await customerApi.get(`/api/devices/${hardwareId}/camera/stream`);
        const data = res.data || res;
        const endpoints = data?.endpoints || res.endpoints;
        if (endpoints && endpoints.webrtc) {
          url = String(endpoints.webrtc).trim();
          streamCache[hardwareId] = {
            webrtc: url,
            hls: endpoints.hls,
            rtsp: endpoints.rtsp,
          };
        }
      } catch {
        // fallback below
      }
    }

    if (!url) {
      const customMedia =
        typeof window !== "undefined"
          ? localStorage.getItem("austec_mediamtx_url")
          : null;
      const base = customMedia || "http://103.82.195.138:8889";
      url = `${base.replace(/\/+$/, "")}/live/${hardwareId}`;
    }

    try {
      const parsed = new URL(url);
      parsed.searchParams.set("controls", "false");
      parsed.searchParams.set("muted", "true");
      parsed.searchParams.set("autoplay", "true");
      parsed.searchParams.set("playsinline", "true");
      const finalUrl = parsed.toString();
      setWebrtcUrl(finalUrl);

      if (
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        parsed.protocol === "http:"
      ) {
        setIsMixedContentBlocked(true);
      }
    } catch {
      setErrorMsg(`Đường dẫn stream không hợp lệ: ${url}`);
    } finally {
      setIsLoading(false);
    }
  }, [allowedToStream, blockedReason, hardwareId, isActive, reloadNonce]);

  useEffect(() => {
    resolveStream();
    return () => {
      if (isActive && hardwareId) {
        sendCommandRef.current(hardwareId, "STREAM_STOP").catch(() => {});
      }
    };
  }, [hardwareId, isActive, resolveStream]);

  const handleSnapshot = async () => {
    sendCommand(hardwareId, "TAKE_SNAPSHOT").catch(() => {});
    const snapUrl = `${getApiBaseUrl()}/api/devices/${encodeURIComponent(
      hardwareId
    )}/camera/snapshot?t=${Date.now()}`;
    window.open(snapUrl, "_blank");
    toast.success("Đã gửi lệnh chụp ảnh Snapshot Camera");
  };

  if (!allowedToStream) {
    return (
      <div
        className={`relative rounded-xl bg-[#0D1015] border border-white/[0.08] flex flex-col items-center justify-center p-3 text-center ${className}`}
      >
        <ShieldAlert className="w-6 h-6 text-amber-500 mb-1.5" />
        <p className="text-xs font-semibold text-white">Tạm khóa quyền xem Camera</p>
        <p className="text-[11px] text-[#9BA4B2] mt-0.5 max-w-xs">{blockedReason}</p>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-lg overflow-hidden bg-black border border-black/[0.08] dark:border-white/[0.08] group flex flex-col justify-between ${className}`}
    >
      {/* Top Overlay Badge */}
      <div
        className={`absolute ${
          compact ? "top-1.5 left-1.5 right-1.5" : "top-2.5 left-2.5 right-2.5"
        } z-10 flex items-center justify-between pointer-events-none`}
      >
        <div
          className={`flex items-center gap-1.5 ${
            compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]"
          } rounded-md bg-black/75 backdrop-blur-xs border border-white/10 text-white font-mono`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          <span className="font-semibold">LIVE</span>
          {!compact && (
            <>
              <span className="text-white/50">•</span>
              <span className="truncate max-w-[160px]">{deviceName || hardwareId}</span>
            </>
          )}
        </div>

        {showControls && (
          <div className="flex items-center gap-1 pointer-events-auto">
            <button
              type="button"
              onClick={handleSnapshot}
              title="Chụp ảnh Snapshot"
              className={`${
                compact ? "p-1" : "p-1.5"
              } rounded-md bg-black/75 hover:bg-blue-600 text-white border border-white/10 transition-colors cursor-pointer`}
            >
              <Camera className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
            </button>
            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              title="Tải lại luồng Video"
              className={`${
                compact ? "p-1" : "p-1.5"
              } rounded-md bg-black/75 hover:bg-blue-600 text-white border border-white/10 transition-colors cursor-pointer`}
            >
              <RefreshCw className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
            </button>
            {!compact && webrtcUrl && (
              <a
                href={webrtcUrl}
                target="_blank"
                rel="noreferrer"
                title="Mở tab luồng trực tiếp"
                className="p-1.5 rounded-md bg-black/75 hover:bg-blue-600 text-white border border-white/10 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {onExpandFullscreen && (
              <button
                type="button"
                onClick={onExpandFullscreen}
                title="Mở rộng"
                className={`${
                  compact ? "p-1" : "p-1.5"
                } rounded-md bg-black/75 hover:bg-blue-600 text-white border border-white/10 transition-colors cursor-pointer`}
              >
                <Maximize2 className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Video / Iframe Container */}
      <div className="w-full h-full flex items-center justify-center relative">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-10 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-[11px] text-[#9BA4B2] font-mono">
              Đang kết nối luồng WebRTC ({hardwareId})...
            </span>
          </div>
        )}

        {errorMsg ? (
          <div className="p-4 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 text-amber-400 mx-auto" />
            <p className="text-xs text-white font-semibold">{errorMsg}</p>
          </div>
        ) : isMixedContentBlocked ? (
          <div className="p-4 text-center space-y-2.5 max-w-xs">
            <Video className="w-7 h-7 text-cyan-400 mx-auto" />
            <p className="text-xs text-white font-semibold">
              Luồng Camera MediaMTX đang chạy qua HTTP
            </p>
            <p className="text-[11px] text-[#9BA4B2]">
              Trình duyệt chặn nhúng HTTP bên trong trang HTTPS. Bấm nút bên dưới để mở luồng WebRTC trực tiếp.
            </p>
            <a
              href={webrtcUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
            >
              <span>Mở luồng Live WebRTC</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          webrtcUrl && (
            <iframe
              key={`${hardwareId}-${reloadNonce}`}
              src={webrtcUrl}
              title={deviceName || hardwareId}
              className="w-full h-full border-0 bg-black"
              allow="autoplay; fullscreen; microphone; camera"
              onLoad={() => setIsLoading(false)}
            />
          )
        )}
      </div>
    </div>
  );
}

