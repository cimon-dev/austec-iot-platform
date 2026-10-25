"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Radio, 
  Bluetooth, 
  Wifi, 
  RotateCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Zap, 
  DoorClosed, 
  DoorOpen, 
  Square, 
  KeyRound, 
  Trash2, 
  Terminal, 
  ArrowRight, 
  ExternalLink,
  Cpu,
  ShieldCheck,
  Send,
  Sparkles,
  Check
} from "lucide-react";

export default function PairingLabPage() {
  const [method, setMethod] = useState<"BLE" | "WIFI">("BLE");
  const [scanning, setScanning] = useState<boolean>(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<Array<{ id: string; name: string; rssi: number }>>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("amtuong1994");
  
  // WiFi credentials
  const [wifiSsid, setWifiSsid] = useState<string>("Austec_SmartHome_2.4G");
  const [wifiPass, setWifiPass] = useState<string>("Austec@2026");
  
  // Pairing progress
  const [isPairing, setIsPairing] = useState<boolean>(false);
  const [pairingProgress, setPairingProgress] = useState<number>(0);
  const [pairingStepText, setPairingStepText] = useState<string>("");
  const [pairingTimer, setPairingTimer] = useState<number>(0);
  const [pairingStatus, setPairingStatus] = useState<"IDLE" | "IN_PROGRESS" | "SUCCESS" | "TIMEOUT">("IDLE");

  // Live Control State for Hardware: amtuong1994
  const [doorState, setDoorState] = useState<string>("CLOSED");
  const [isCommandSending, setIsCommandSending] = useState<boolean>(false);
  const [lastAction, setLastAction] = useState<string>("None");
  const [mqttHistory, setMqttHistory] = useState<Array<{ topic: string; payload: string; timestamp: string; direction: string }>>([]);
  const [brokerOnline, setBrokerOnline] = useState<boolean>(true);

  // 1. Quét tìm thiết bị
  const handleStartScan = () => {
    setScanning(true);
    setDiscoveredDevices([]);
    setTimeout(() => {
      setDiscoveredDevices([
        { id: "amtuong1994", name: "Austec Door ESP32-C3 (Mạch Lab Thật)", rssi: -58 },
        { id: "AT-DOOR-88239A01", name: "Austec Titadoor German Alu #1", rssi: -72 },
        { id: "AT-LOCK-MASARU-01", name: "Austec Masaru Smart Lock", rssi: -84 },
      ]);
      setScanning(false);
    }, 1500);
  };

  useEffect(() => {
    handleStartScan();
  }, [method]);

  // 2. Fetch MQTT Status & History
  const fetchMqttHistory = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/mqtt/history");
      const data = await res.json();
      if (data.success && data.history) {
        setMqttHistory(data.history);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchMqttHistory();
    const interval = setInterval(fetchMqttHistory, 3000);
    return () => clearInterval(interval);
  }, []);

  // 3. Tiến trình Ghép Nối (Vòng tròn 0% -> 100%)
  const handleStartPairing = () => {
    setIsPairing(true);
    setPairingProgress(0);
    setPairingTimer(0);
    setPairingStatus("IN_PROGRESS");
    setPairingStepText("Đang kết nối Bluetooth BLE tới chip ESP32-C3...");

    let currentSec = 0;
    const timerInterval = setInterval(() => {
      currentSec += 1;
      setPairingTimer(currentSec);
      if (currentSec >= 60) {
        clearInterval(timerInterval);
        setIsPairing(false);
        setPairingStatus("TIMEOUT");
      }
    }, 1000);

    // Chặng 1: 0 - 25% (1.5s)
    setTimeout(() => {
      setPairingProgress(25);
      setPairingStepText("Đã kết nối BLE! Đang mã hóa và truyền cấu hình WiFi 2.4GHz & Token...");
    }, 1500);

    // Chặng 2: 25 - 50% (3.5s)
    setTimeout(() => {
      setPairingProgress(50);
      setPairingStepText("ESP32 đã nhận thông số! Đang ghi Flash EEPROM và khởi động lại...");
    }, 3500);

    // Chặng 3: 50 - 75% (5.5s)
    setTimeout(() => {
      setPairingProgress(75);
      setPairingStepText("ESP32 đang kết nối vào WiFi gia đình & bắt tay MQTT Broker port 1883...");
    }, 5500);

    // Chặng 4: 75 - 100% (7.5s - Thành công)
    setTimeout(async () => {
      clearInterval(timerInterval);
      setPairingProgress(100);
      setPairingStepText("Ghép nối hoàn tất! Thiết bị đã kích hoạt trên CSDL Austec Cloud!");
      setPairingStatus("SUCCESS");
      setIsPairing(false);

      // Gọi API Backend xác nhận ghép nối vào DB
      try {
        await fetch("http://localhost:4000/api/pairing/simulate-onboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hardwareId: selectedDevice,
            userId: "00000000-0000-0000-0000-000000000001",
            modelCode: "DOOR_GERMAN_ALU",
            customerName: "Nguyễn Mạnh Đức (Chủ Nhà)"
          })
        });
        fetchMqttHistory();
      } catch (err) {
        console.error("Lỗi xác nhận onboard:", err);
      }
    }, 7500);
  };

  // Nút test thử nghiệm trạng thái Timeout 60s
  const handleSimulateTimeout = () => {
    setIsPairing(false);
    setPairingProgress(100);
    setPairingTimer(60);
    setPairingStatus("TIMEOUT");
  };

  // 4. Phát lệnh Điều Khiển Thực Tế qua MQTT (Action 1, 2, 3, 11, 12)
  const handleSendCommand = async (cmd: string, actionNumber: string, label: string) => {
    try {
      setIsCommandSending(true);
      setLastAction(`Lệnh: ${label} (Action ${actionNumber})`);
      
      const token = typeof window !== "undefined" ? (localStorage.getItem("austec_auth_token") || localStorage.getItem("token")) : "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("http://localhost:4000/api/devices/control", {
        method: "POST",
        headers,
        body: JSON.stringify({
          hardwareId: selectedDevice,
          command: cmd,
          actorId: "00000000-0000-0000-0000-000000000001",
          actorRole: "CUSTOMER"
        })
      });
      const data = await res.json();
      if (data.success) {
        if (cmd === "OPEN") setDoorState("OPENING");
        if (cmd === "CLOSE") setDoorState("CLOSING");
        if (cmd === "STOP") setDoorState("PAUSED");
      }
      fetchMqttHistory();
    } catch (err) {
      console.error("Lỗi điều khiển thiết bị:", err);
    } finally {
      setIsCommandSending(false);
    }
  };

  // 5. Giả lập tín hiệu Cảm biến Công tắc Hành trình (Action 4 & 5)
  const handleTriggerSensor = async (actionCode: "4" | "5", stateName: string) => {
    try {
      // Gửi MQTT Publish gói tin từ ESP32: austec/amtuong1994/pub/action -> "4" hoặc "5"
      await fetch("http://localhost:4000/api/mqtt/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `austec/${selectedDevice}/pub/action`,
          payload: actionCode
        })
      });
      setDoorState(stateName);
      setLastAction(`Cảm biến chạm: Action ${actionCode} -> ${stateName}`);
      fetchMqttHistory();
    } catch (err) {
      console.error("Lỗi kích hoạt cảm biến:", err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-0">
      {/* 1. Header Page */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 dark:border-cyan-500/30 font-mono">
              HARDWARE INTEGRATION LAB
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">ESP32-C3 WiFi & BLE UART</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            <Radio className="w-7 h-7 text-cyan-500 dark:text-cyan-400 animate-pulse" />
            Phòng Thí Nghiệm Ghép Nối & Điều Khiển Phần Cứng Trực Tiếp
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ghép nối 2 phương thức (BLE & WiFi), giám sát vòng tròn tiến trình 0 - 100% kèm xử lý Timeout 60s và điều khiển rơ-le ăn khớp 100% mã nguồn ESP32
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/guides"
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-all shadow-xs"
          >
            <ExternalLink className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Xem Hướng Dẫn Reset Nút Cơ 10s
          </Link>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            MQTT Port: 1883 Sẵn Sàng
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ========================================================= */}
        {/* CỘT TRÁI: QUY TRÌNH GHÉP NỐI THIẾT BỊ (BƯỚC 1 - 4) (7 COLS) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card: Lựa chọn phương thức ghép nối */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs flex items-center justify-center font-mono">1</span>
                Chọn Phương Thức Ghép Nối
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">Tự động nhận diện phần cứng</span>
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod("BLE")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  method === "BLE"
                    ? "bg-cyan-500/10 border-cyan-500 text-slate-900 dark:text-white shadow-sm shadow-cyan-500/10"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-cyan-600 dark:text-cyan-400">
                    <Bluetooth className="w-4 h-4" />
                    <span>Bluetooth (BLE)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold">
                    Khuyên dùng
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Dò tìm sóng Bluetooth UART, cấu hình nhanh trong 10 giây mà không cần ngắt mạng 4G/WiFi
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMethod("WIFI")}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  method === "WIFI"
                    ? "bg-cyan-500/10 border-cyan-500 text-slate-900 dark:text-white shadow-sm shadow-cyan-500/10"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
                    <Wifi className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                    <span>WiFi SoftAP</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Dự phòng
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Kết nối vào điểm phát WiFi nội bộ phát ra từ bo mạch ESP32 (cổng Web 80)
                </p>
              </button>
            </div>
          </div>

          {/* Card: Dò tìm & Chọn thiết bị */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs flex items-center justify-center font-mono">2</span>
                Tìm Kiếm Thiết Bị Lân Cận
              </h2>
              <button
                onClick={handleStartScan}
                disabled={scanning}
                className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-medium"
              >
                <RotateCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
                {scanning ? "Đang quét sóng..." : "Quét lại"}
              </button>
            </div>

            <div className="space-y-2">
              {discoveredDevices.map((dev) => {
                const isChosen = selectedDevice === dev.id;
                return (
                  <div
                    key={dev.id}
                    onClick={() => setSelectedDevice(dev.id)}
                    className={`p-3 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                      isChosen
                        ? "bg-cyan-500/10 border-cyan-500 text-slate-900 dark:text-white shadow-xs"
                        : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isChosen ? "bg-cyan-500 text-white dark:text-slate-950" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}>
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{dev.name}</span>
                          {dev.id === "amtuong1994" && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold">
                              MÃ CODECƯACUỐN
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">ID: {dev.id}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">{dev.rssi} dBm (Mạnh)</span>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isChosen ? "border-cyan-500 bg-cyan-500 text-white dark:text-black" : "border-slate-300 dark:border-slate-700"
                      }`}>
                        {isChosen && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: Nhập thông tin WiFi nhà khách & Nạp cấu hình */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs flex items-center justify-center font-mono">3</span>
              Cấu Hình Mạng WiFi Cho Thiết Bị
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tên WiFi Gia Đình (SSID)
                </label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Mật Khẩu WiFi
                </label>
                <input
                  type="text"
                  value={wifiPass}
                  onChange={(e) => setWifiPass(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            {/* Lưu ý băng tần 2.4GHz */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400" />
              <span>
                <b>Lưu ý quan trọng:</b> Mọi vi điều khiển ESP32-C3 chỉ hỗ trợ sóng <b>WiFi 2.4GHz</b> (không hỗ trợ băng tần 5GHz). Vui lòng kiểm tra chắc chắn tên mạng.
              </span>
            </div>

            {/* Nút hành động Ghép Nối & Nút Test Timeout */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleSimulateTimeout}
                className="text-xs text-slate-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-400 transition-colors cursor-pointer"
              >
                (Thử nghiệm giả lập Timeout 60s)
              </button>

              <button
                type="button"
                disabled={isPairing}
                onClick={handleStartPairing}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-md shadow-cyan-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isPairing ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    Đang Ghép Nối ({pairingProgress}%)...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Bắt Đầu Ghép Nối Thiết Bị
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card: VÒNG TRÒN TIẾN TRÌNH GHÉP NỐI & XỬ LÝ TIMEOUT */}
          {(isPairing || pairingStatus !== "IDLE") && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span>Tiến Trình Ghép Nối Thời Gian Thực</span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">Thời gian: {pairingTimer}s / 60s</span>
              </h3>

              {/* Vòng tròn Progress hoặc Trạng thái */}
              <div className="flex flex-col items-center justify-center py-4">
                {pairingStatus === "TIMEOUT" ? (
                  <div className="w-24 h-24 rounded-full bg-rose-500/10 border-4 border-rose-500 flex items-center justify-center text-rose-500">
                    <AlertTriangle className="w-10 h-10 animate-bounce" />
                  </div>
                ) : pairingStatus === "SUCCESS" ? (
                  <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-4 border-emerald-500 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                ) : (
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke="currentColor"
                        strokeWidth="8"
                        className="text-slate-100 dark:text-slate-800"
                        fill="transparent"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={301}
                        strokeDashoffset={301 - (301 * pairingProgress) / 100}
                        strokeLinecap="round"
                        className="text-cyan-500 dark:text-cyan-400 transition-all duration-500 ease-out"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">{pairingProgress}%</span>
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">{pairingTimer}s</span>
                    </div>
                  </div>
                )}

                {/* Thông báo tiến trình text */}
                <p className="text-xs text-center font-medium text-slate-700 dark:text-slate-200 mt-4 max-w-md">
                  {pairingStepText}
                </p>
              </div>

              {/* KHỐI XỬ LÝ NẾU BỊ TIMEOUT SAU 60 GIÂY */}
              {pairingStatus === "TIMEOUT" && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 to-white dark:from-rose-950/40 dark:to-slate-900 border-2 border-rose-300 dark:border-rose-500/50 space-y-3 shadow-xs">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase">
                    <AlertTriangle className="w-4 h-4" />
                    Ghép Nối Quá Thời Gian (Timeout &gt; 60 giây)
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    Hệ thống không nhận được tín hiệu bắt tay (handshake) từ thiết bị sau 60 giây. Thường do sai mật khẩu WiFi hoặc thiết bị đang kẹt cấu hình cũ.
                  </p>
                  
                  <div className="p-3 rounded-lg bg-white dark:bg-black/60 border border-rose-200 dark:border-rose-500/30 text-xs space-y-1 shadow-xs">
                    <div className="font-bold text-slate-900 dark:text-white">Chỉ dẫn khôi phục phần cứng:</div>
                    <div className="text-amber-800 dark:text-amber-300">
                      👉 <b>Nhấn giữ nút cơ BOOT (GPIO 0) trên bo mạch trong 10 GIÂY LIÊN TỤC</b> cho đến khi đèn LED xanh nhấp nháy 3 lần để reset lại bộ nhớ, sau đó thử ghép nối lại.
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleStartPairing}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      Thử ghép nối lại
                    </button>
                    <Link
                      href="/guides?model=DOOR_GERMAN_ALU"
                      className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-bold flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Xem video hướng dẫn bấm nút Reset 10s
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* CỘT PHẢI: BẢNG ĐIỀU KHIỂN PHẦN CỨNG TRỰC TIẾP (5 COLS)   */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Bảng Điều Khiển Cửa Cuốn Thực Tế qua MQTT */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-mono font-bold">
                  LIVE MQTT CONTROLLER
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">Điều Khiển Rơ-le Cửa Cuốn</h2>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Thiết bị:</span>
                <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">{selectedDevice}</span>
              </div>
            </div>

            {/* Trạng thái cửa cuốn hiện tại */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                {doorState === "OPEN" || doorState === "OPENING" ? (
                  <DoorOpen className="w-8 h-8 text-emerald-500 dark:text-emerald-400 animate-pulse" />
                ) : (
                  <DoorClosed className="w-8 h-8 text-cyan-500 dark:text-cyan-400" />
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Trạng thái rơ-le / cảm biến:</div>
              <div className="text-xl font-black font-mono tracking-wider text-slate-900 dark:text-white">
                {doorState === "OPEN" && <span className="text-emerald-600 dark:text-emerald-400">MỞ HOÀN TOÀN (CB_UP)</span>}
                {doorState === "CLOSED" && <span className="text-cyan-600 dark:text-cyan-400">ĐÓNG HOÀN TOÀN (CB_DOWN)</span>}
                {doorState === "OPENING" && <span className="text-amber-600 dark:text-amber-400">ĐANG MỞ LÊN (Action 1)</span>}
                {doorState === "CLOSING" && <span className="text-amber-600 dark:text-amber-400">ĐANG ĐÓNG XUỐNG (Action 2)</span>}
                {doorState === "PAUSED" && <span className="text-rose-600 dark:text-rose-400">ĐÃ DỪNG LẠI (Action 3)</span>}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">{lastAction}</div>
            </div>

            {/* Cụm 3 nút điều khiển cơ bản (Mở 1, Dừng 3, Đóng 2) */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                disabled={isCommandSending}
                onClick={() => handleSendCommand("OPEN", "1", "Mở Cửa")}
                className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center gap-1 active:scale-95 shadow-xs"
              >
                <DoorOpen className="w-5 h-5" />
                <span>MỞ CỬA</span>
                <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-500">Action: 1</span>
              </button>

              <button
                type="button"
                disabled={isCommandSending}
                onClick={() => handleSendCommand("STOP", "3", "Dừng Lại")}
                className="p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 rounded-xl text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center gap-1 active:scale-95 shadow-xs"
              >
                <Square className="w-5 h-5" />
                <span>DỪNG LẠI</span>
                <span className="text-[9px] font-mono text-rose-600 dark:text-rose-500">Action: 3</span>
              </button>

              <button
                type="button"
                disabled={isCommandSending}
                onClick={() => handleSendCommand("CLOSE", "2", "Đóng Cửa")}
                className="p-3 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 rounded-xl text-center font-bold text-xs transition-all cursor-pointer flex flex-col items-center gap-1 active:scale-95 shadow-xs"
              >
                <DoorClosed className="w-5 h-5" />
                <span>ĐÓNG CỬA</span>
                <span className="text-[9px] font-mono text-cyan-600 dark:text-cyan-500">Action: 2</span>
              </button>
            </div>

            {/* Cụm 2 nút học mã & xóa Remote RF 433MHz (Action 11 & 12) */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={isCommandSending}
                onClick={() => handleSendCommand("RF_SETUP", "11", "Học Mã Remote")}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <KeyRound className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                <span>Cài Remote RF (11)</span>
              </button>

              <button
                type="button"
                disabled={isCommandSending}
                onClick={() => handleSendCommand("RF_CLEAR", "12", "Xóa Mã Remote")}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa Remote RF (12)</span>
              </button>
            </div>

            {/* GIẢ LẬP TÍN HIỆU CẢM BIẾN HÀNH TRÌNH CB_UP & CB_DOWN */}
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Kiểm Thử Cảm Biến Hành Trình Cơ Khí:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTriggerSensor("4", "OPEN")}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors shadow-xs"
                >
                  Chạm CB_UP (Action 4)
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerSensor("5", "CLOSED")}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors shadow-xs"
                >
                  Chạm CB_DOWN (Action 5)
                </button>
              </div>
            </div>
          </div>

          {/* Card: Communication Terminal (Live MQTT Console) */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                MQTT Console Thời Gian Thực (Port 1883)
              </span>
              <button
                onClick={fetchMqttHistory}
                className="text-[11px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer transition-colors"
              >
                Làm mới
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] h-48 overflow-y-auto space-y-1.5 text-slate-300">
              {mqttHistory.length === 0 ? (
                <div className="text-slate-500 text-center py-8">
                  Đang lắng nghe gói tin MQTT từ mạch ESP32...
                </div>
              ) : (
                mqttHistory.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 leading-tight">
                    <span className="text-slate-500">[{item.timestamp}]</span>
                    <span className={`font-bold ${item.direction === "INCOMING" ? "text-emerald-400" : "text-cyan-400"}`}>
                      {item.direction === "INCOMING" ? "RX <" : "TX >"}
                    </span>
                    <span className="text-slate-400 truncate max-w-[150px]">{item.topic}</span>
                    <span className="text-white font-bold bg-slate-900 px-1 rounded">{item.payload}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
