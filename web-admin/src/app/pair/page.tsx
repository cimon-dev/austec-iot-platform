"use client";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCustomerIoT } from "@/customer/context/CustomerIoTContext";
import { customerApi } from "@/customer/services/customer-api-client";
import {
  QrCode,
  Bluetooth,
  KeyRound,
  Wifi,
  PlusCircle,
  Loader2,
  Compass,
  Camera,
  X,
} from "lucide-react";
import { toast } from "sonner";

const LeafletLocationPicker = dynamic(
  () =>
    import("@/customer/components/LeafletLocationPicker").then(
      (m) => m.LeafletLocationPicker
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-44 rounded-lg bg-[#EEF1F5] dark:bg-[#1C232E] flex items-center justify-center text-xs text-[#7B8596]">
        Đang tải bản đồ tọa độ...
      </div>
    ),
  }
);

const PROVISIONING_TEMPLATES = [
  { prefix: "WIFRFTT-", label: "Cửa cuốn trung tâm (WIFRFTT)" },
  { prefix: "AMTUONG-", label: "Cửa cuốn âm tường (WIFRF_ECO)" },
  { prefix: "OCAM-", label: "Ổ cắm / Công tắc (SMARTSW)" },
  { prefix: "CAM-", label: "Camera AI 4K (ESP32-CAM)" },
  { prefix: "SMARTMETTER-", label: "Công tơ chống giật (SmartMetter)" },
  { prefix: "BMS-", label: "Pin lưu trữ BMS 16S" },
];

export default function CustomerPairDevicePage() {
  const router = useRouter();
  const { addOrUpdateDevice, refreshDevices } = useCustomerIoT();

  const [mode, setMode] = useState<"hardware_id" | "web_ble" | "claim_otp">("hardware_id");

  // Mode 1: Direct Hardware ID / QR Pairing
  const [hardwareId, setHardwareId] = useState("");
  const [customName, setCustomName] = useState("");
  const [roomName, setRoomName] = useState("Tầng 1 - Phòng khách");
  const [addressDisplay, setAddressDisplay] = useState("Hà Nội");
  const [lat, setLat] = useState("21.028511");
  const [lng, setLng] = useState("105.854167");
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Webcam QR Scanner
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrStatus, setQrStatus] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mode 2: Web Bluetooth Wi-Fi Onboarding
  const [bleDeviceName, setBleDeviceName] = useState<string | null>(null);
  const [bleDeviceRef, setBleDeviceRef] = useState<any>(null);
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [bleStepText, setBleStepText] = useState("");

  // Mode 3: Claim Ownership Transfer OTP
  const [transferOtp, setTransferOtp] = useState("");

  const stopQrScanner = () => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowQrModal(false);
    setQrStatus("");
  };

  useEffect(() => {
    return () => {
      if (scanTimerRef.current) clearInterval(scanTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startQrScanner = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      toast.error("Trình duyệt không hỗ trợ mở camera quét QR");
      return;
    }
    setShowQrModal(true);
    setQrStatus("Đang khởi động camera...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      if (!BarcodeDetectorCtor) {
        setQrStatus(
          "Trình duyệt này chưa bật BarcodeDetector. Hãy dùng Chrome/Edge mới nhất hoặc nhập trực tiếp mã Hardware ID."
        );
        return;
      }

      const detector = new BarcodeDetectorCtor({ formats: ["qr_code", "code_128"] });
      setQrStatus("Đưa tem QR thiết bị vào khung hình để tự động nhận diện...");

      scanTimerRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0 && codes[0].rawValue) {
            const raw = String(codes[0].rawValue).trim();
            let extracted = raw;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.hardwareId || parsed.hwId || parsed.id) {
                extracted = String(parsed.hardwareId || parsed.hwId || parsed.id);
              }
            } catch {
              // raw plain string
            }
            setHardwareId(extracted);
            toast.success(`Đã quét mã thiết bị: ${extracted}`);
            stopQrScanner();
          }
        } catch {
          // keep scanning
        }
      }, 350);
    } catch (err: any) {
      setQrStatus(`Không thể truy cập camera: ${err?.message || "Bị từ chối quyền"}`);
    }
  };

  const detectGpsLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ định vị GPS");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setIsLocating(false);
        toast.success("Đã lấy tọa độ GPS hiện tại");
      },
      (err) => {
        setIsLocating(false);
        toast.error(`Không thể lấy vị trí GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleDirectPair = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanHw = hardwareId.trim();
    if (!cleanHw) {
      toast.error("Vui lòng nhập Mã Hardware ID / Serial trên tem QR thiết bị");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await customerApi.post("/api/devices/pair", {
        hardwareId: cleanHw,
        customName: customName.trim() || undefined,
        location: roomName.trim() || "Nhà riêng",
        addressDisplay: addressDisplay.trim() || roomName.trim(),
        lat: parseFloat(lat) || 21.028511,
        lng: parseFloat(lng) || 105.854167,
      });

      if (res.success) {
        if (res.device) {
          addOrUpdateDevice(res.device);
        }
        await refreshDevices();
        toast.success(`Ghép nối thiết bị ${cleanHw} thành công`);
        router.push("/");
      } else {
        toast.error(res.error || "Không thể ghép nối thiết bị");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanWebBluetooth = async () => {
    const nav: any = typeof navigator !== "undefined" ? navigator : null;
    if (!nav || !nav.bluetooth) {
      toast.error(
        "Trình duyệt chưa hỗ trợ Web Bluetooth API. Vui lòng dùng Chrome/Edge trên máy tính hoặc tab Mã Hardware ID."
      );
      return;
    }
    try {
      setBleStepText("Đang mở hộp thoại quét Bluetooth BLE...");
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          "0000ffff-0000-1000-8000-00805f9b34fb",
          "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
          "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
        ],
      });
      const detectedName = device.name || device.id || "AUSTEC-BLE-DEVICE";
      setBleDeviceName(detectedName);
      setBleDeviceRef(device);
      if (!hardwareId) setHardwareId(detectedName);
      setBleStepText(
        `Đã kết nối với ${detectedName}. Nhập thông tin Wi-Fi để nạp xuống mạch.`
      );
      toast.success(`Đã chọn thiết bị Bluetooth: ${detectedName}`);
    } catch (err: any) {
      setBleStepText("");
      if (err?.name !== "NotFoundError") {
        toast.error(`Lỗi quét Bluetooth: ${err.message || err}`);
      }
    }
  };

  const handleSendBleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifiSsid.trim()) {
      toast.error("Vui lòng nhập tên mạng Wi-Fi (SSID 2.4GHz)");
      return;
    }
    const targetHw = (hardwareId || bleDeviceName || "").trim();
    if (!targetHw) {
      toast.error("Vui lòng quét thiết bị BLE hoặc nhập Hardware ID");
      return;
    }

    setIsSubmitting(true);
    try {
      if (bleDeviceRef && bleDeviceRef.gatt) {
        setBleStepText("Đang gửi thông tin Wi-Fi qua Bluetooth GATT...");
        try {
          const server = await bleDeviceRef.gatt.connect();
          const services = await server.getPrimaryServices();
          const payload = JSON.stringify({
            ssid: wifiSsid.trim(),
            pass: wifiPassword,
            hwId: targetHw,
          });
          const encoder = new TextEncoder();
          for (const svc of services) {
            const chars = await svc.getCharacteristics();
            for (const ch of chars) {
              if (ch.properties.write || ch.properties.writeWithoutResponse) {
                await ch.writeValue(encoder.encode(payload));
                break;
              }
            }
          }
        } catch {
          // continue to cloud activation
        }
      }

      setBleStepText("Đang kích hoạt quyền sở hữu thiết bị trên Cloud...");
      const res = await customerApi.post("/api/devices/pair", {
        hardwareId: targetHw,
        customName: customName.trim() || targetHw,
        location: roomName.trim() || "Nhà riêng",
        addressDisplay: addressDisplay.trim() || "Hà Nội",
        lat: parseFloat(lat) || 21.028511,
        lng: parseFloat(lng) || 105.854167,
      });

      if (res.success) {
        await refreshDevices();
        toast.success(`Đã kích hoạt thiết bị ${targetHw} thành công`);
        router.push("/");
      } else {
        toast.error(res.error || "Không thể kích hoạt thiết bị trên Cloud");
      }
    } finally {
      setIsSubmitting(false);
      setBleStepText("");
    }
  };

  const handleClaimOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferOtp.trim().length < 4) {
      toast.error("Vui lòng nhập mã OTP chuyển nhượng hợp lệ");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await customerApi.post("/api/devices/transfer/claim", {
        otp: transferOtp.trim(),
        transferCode: transferOtp.trim(),
      });
      if (res.success) {
        await refreshDevices();
        toast.success(
          res.message || "Nhận chuyển giao quyền sở hữu thiết bị thành công"
        );
        router.push("/");
      } else {
        toast.error(res.error || "Mã OTP không hợp lệ hoặc đã hết hạn");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedLat = parseFloat(lat) || 21.028511;
  const parsedLng = parseFloat(lng) || 105.854167;

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-sm font-semibold">
            Thêm & ghép nối thiết bị thông minh mới
          </h1>
          <p className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2] mt-0.5">
            Quét QR bằng Webcam, nhập Hardware ID, nạp Wi-Fi qua Web Bluetooth hoặc nhận chuyển giao OTP
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#EEF1F5] dark:bg-[#1C232E] p-1 rounded-lg border border-black/[0.06] dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => setMode("hardware_id")}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium cursor-pointer ${
              mode === "hardware_id"
                ? "bg-blue-600 text-white"
                : "text-[#525D6F] dark:text-[#9BA4B2]"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Hardware ID / QR</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("web_ble")}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium cursor-pointer ${
              mode === "web_ble"
                ? "bg-blue-600 text-white"
                : "text-[#525D6F] dark:text-[#9BA4B2]"
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>Web Bluetooth (BLE)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("claim_otp")}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium cursor-pointer ${
              mode === "claim_otp"
                ? "bg-blue-600 text-white"
                : "text-[#525D6F] dark:text-[#9BA4B2]"
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Nhận chuyển giao OTP</span>
          </button>
        </div>
      </div>

      {/* Scrollable Inner Form Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
        {mode === "hardware_id" && (
          <form
            onSubmit={handleDirectPair}
            className="max-w-4xl mx-auto p-5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {PROVISIONING_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.prefix}
                    type="button"
                    onClick={() => {
                      if (!hardwareId.startsWith(tpl.prefix)) {
                        setHardwareId(tpl.prefix);
                      }
                    }}
                    className="h-7 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] hover:border-blue-500 text-[11px] font-medium cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={startQrScanner}
                className="h-8 px-3 rounded-lg bg-blue-600/12 border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Quét QR qua Webcam</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Mã Hardware ID / Serial trên tem thiết bị *
                </label>
                <input
                  type="text"
                  value={hardwareId}
                  onChange={(e) => setHardwareId(e.target.value)}
                  placeholder="VD: WIFRFTT-88239A hoặc OCAM-001"
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Tên gọi thiết bị trong nhà
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="VD: Cửa cuốn Gara chính"
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Khu vực / Phòng lắp đặt
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Tầng 1 - Gara"
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Địa chỉ công trình
                </label>
                <input
                  type="text"
                  value={addressDisplay}
                  onChange={(e) => setAddressDisplay(e.target.value)}
                  placeholder="Khu đô thị, Quận/Huyện, Tỉnh/Thành..."
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                />
              </div>
            </div>

            {/* Interactive Leaflet Map Picker + Lat/Lng Inputs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">
                  Chọn tọa độ lắp đặt trên bản đồ (nhấp vào vị trí công trình)
                </label>
                <button
                  type="button"
                  disabled={isLocating}
                  onClick={detectGpsLocation}
                  className="h-7 px-2.5 rounded-lg border border-blue-500/35 bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-500 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Compass
                    className={`w-3.5 h-3.5 ${isLocating ? "animate-spin" : ""}`}
                  />
                  <span>Lấy GPS trình duyệt</span>
                </button>
              </div>

              <LeafletLocationPicker
                lat={parsedLat}
                lng={parsedLng}
                onChange={(nLat, nLng) => {
                  setLat(String(nLat));
                  setLng(String(nLng));
                }}
                className="h-44"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#7B8596] mb-1">
                    Vĩ độ (Latitude)
                  </label>
                  <input
                    type="text"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#7B8596] mb-1">
                    Kinh độ (Longitude)
                  </label>
                  <input
                    type="text"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlusCircle className="w-4 h-4" />
                )}
                <span>Kích hoạt & thêm vào nhà của tôi</span>
              </button>
            </div>
          </form>
        )}

        {mode === "web_ble" && (
          <form
            onSubmit={handleSendBleProvision}
            className="max-w-4xl mx-auto p-5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-4"
          >
            <div className="p-3.5 rounded-lg bg-blue-600/[0.08] border border-blue-500/25 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-blue-500 flex items-center gap-1.5">
                  <Bluetooth className="w-4 h-4" />
                  <span>Bước 1: Quét tìm mạch Austec qua Web Bluetooth (BLE)</span>
                </div>
                <p className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2]">
                  Đặt máy tính đã bật Bluetooth trong phạm vi 5m (hỗ trợ Chrome & Edge).
                </p>
              </div>
              <button
                type="button"
                onClick={handleScanWebBluetooth}
                className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shrink-0 cursor-pointer"
              >
                Quét Bluetooth
              </button>
            </div>

            {bleStepText && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-600 dark:text-emerald-400">
                {bleStepText}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Thiết bị BLE đã chọn / Hardware ID *
                </label>
                <input
                  type="text"
                  value={hardwareId}
                  onChange={(e) => setHardwareId(e.target.value)}
                  placeholder="Quét BLE hoặc nhập mã thiết bị..."
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Đặt tên hiển thị
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="VD: Cửa cuốn mặt tiền"
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Bước 2: Tên mạng Wi-Fi gia đình (SSID 2.4GHz) *
                </label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="Nhập tên Wi-Fi..."
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Mật khẩu Wi-Fi
                </label>
                <input
                  type="password"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  placeholder="Nhập mật khẩu Wi-Fi..."
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
                <span>Nạp Wi-Fi qua BLE & kích hoạt</span>
              </button>
            </div>
          </form>
        )}

        {mode === "claim_otp" && (
          <form
            onSubmit={handleClaimOtp}
            className="max-w-xl mx-auto p-5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-4"
          >
            <h2 className="text-sm font-semibold">
              Nhận bàn giao quyền sở hữu thiết bị bằng mã OTP
            </h2>
            <p className="text-xs text-[#525D6F] dark:text-[#9BA4B2]">
              Nhập mã OTP 6 chữ số do chủ sở hữu cũ tạo (hiệu lực 15 phút) để tiếp nhận thiết bị cùng thời hạn bảo hành.
            </p>
            <div>
              <label className="block text-xs font-medium mb-1">
                Mã OTP chuyển giao (6 chữ số)
              </label>
              <input
                type="text"
                maxLength={8}
                value={transferOtp}
                onChange={(e) => setTransferOtp(e.target.value.toUpperCase())}
                placeholder="Nhập mã OTP..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-base font-mono tracking-widest"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Xác nhận nhận quyền sở hữu</span>
            </button>
          </form>
        )}
      </div>

      {/* Webcam QR Scanner Modal */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={stopQrScanner}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/15 bg-[#151A22] text-white p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <QrCode className="w-4 h-4 text-blue-400" />
                <span>Quét mã QR trên tem thiết bị</span>
              </div>
              <button
                type="button"
                onClick={stopQrScanner}
                className="p-1 rounded hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video border border-white/10">
              <video
                ref={videoRef}
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-8 border-2 border-blue-500/70 rounded-lg pointer-events-none" />
            </div>
            <p className="text-[11px] text-[#9BA4B2] text-center">{qrStatus}</p>
          </div>
        </div>
      )}
    </div>
  );
}
