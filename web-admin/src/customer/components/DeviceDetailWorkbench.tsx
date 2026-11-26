"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCustomerIoT } from "@/customer/context/CustomerIoTContext";
import { customerApi } from "@/customer/services/customer-api-client";
import { useLanguage } from "@/context/LanguageContext";
import {
  canPerformControl,
  getCategoryDisplayName,
  getDeviceStateSummary,
  getScheduleBlockedReason,
} from "@/customer/types/device";
import { WebCameraPlayer } from "@/customer/components/WebCameraPlayer";
import { CustomerStepUpModal } from "@/customer/components/CustomerStepUpModal";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  ArrowLeft,
  ArrowUp,
  Square,
  ArrowDown,
  Lock,
  Unlock,
  Video,
  Power,
  Sliders,
  History,
  Settings,
  Radio,
  Trash2,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Users,
  Headphones,
  Link2,
  Unlink,
  Clock,
  Plus,
  X,
  Thermometer,
  Droplets,
  Wind,
} from "lucide-react";
import { toast } from "sonner";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export interface DeviceDetailWorkbenchProps {
  hardwareId: string;
  initialTab?: "control" | "history" | "settings";
  initialBmsTab?: "cells" | "chart" | "faults" | "config";
  isModal?: boolean;
  onClose?: () => void;
}

export function DeviceDetailWorkbench({
  hardwareId,
  initialTab = "control",
  initialBmsTab = "cells",
  isModal = false,
  onClose,
}: DeviceDetailWorkbenchProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const {
    allDevicesWithEnergySamples,
    findByHardwareId,
    sendCommand,
    updateDeviceName,
    updateDeviceLocation,
    updateDeviceProperties,
    unpairDevice,
  } = useCustomerIoT();

  const device = findByHardwareId(hardwareId);

  const [activeMainTab, setActiveMainTab] = useState<"control" | "history" | "settings">(initialTab);
  const [bmsSubTab, setBmsSubTab] = useState<"cells" | "chart" | "faults" | "config">(initialBmsTab);
  const [isBusy, setIsBusy] = useState(false);

  // History state
  const [remoteHistory, setRemoteHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState("");

  // Settings form state
  const [editName, setEditName] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [openTimeout, setOpenTimeout] = useState(23);
  const [closeTimeout, setCloseTimeout] = useState(20);
  const [autoSchedule, setAutoSchedule] = useState(false);
  const [accessLimit, setAccessLimit] = useState(false);
  const [accessStart, setAccessStart] = useState("08:00");
  const [accessEnd, setAccessEnd] = useState("18:00");
  const [accessDays, setAccessDays] = useState<boolean[]>([true, true, true, true, true, false, false]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [dynamicPropValues, setDynamicPropValues] = useState<Record<string, any>>({});

  // Add schedule inline form
  const [newSchedTime, setNewSchedTime] = useState("07:00");
  const [newSchedAction, setNewSchedAction] = useState("Mở 100%");
  const [newSchedType, setNewSchedType] = useState<"weekly" | "this_week">("weekly");
  const [newSchedDays, setNewSchedDays] = useState<boolean[]>([true, true, true, true, true, true, true]);

  // SmartMetter power limit
  const [powerLimitW, setPowerLimitW] = useState(4500);

  // BMS 13 Protection Parameters (synced with bms_landscape_screen.dart)
  const [ovCutoff, setOvCutoff] = useState(3.65);
  const [ovRecover, setOvRecover] = useState(3.55);
  const [uvCutoff, setUvCutoff] = useState(2.5);
  const [uvRecover, setUvRecover] = useState(2.8);
  const [balanceDelta, setBalanceDelta] = useState(0.015);
  const [activeBalance, setActiveBalance] = useState(true);
  const [chargeOcpRms, setChargeOcpRms] = useState(100);
  const [chargeOcpPeak, setChargeOcpPeak] = useState(140);
  const [dischargeOcpRms, setDischargeOcpRms] = useState(150);
  const [dischargeOcpPeak, setDischargeOcpPeak] = useState(220);
  const [ratedCapacityAh, setRatedCapacityAh] = useState(150);
  const [tempChargeMax, setTempChargeMax] = useState(55);
  const [tempDischargeMax, setTempDischargeMax] = useState(65);
  const [tempCutLow, setTempCutLow] = useState(-10);

  const [showUnpairStepUp, setShowUnpairStepUp] = useState(false);
  const [showLinkCamModal, setShowLinkCamModal] = useState(false);

  useEffect(() => {
    setActiveMainTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setBmsSubTab(initialBmsTab);
  }, [initialBmsTab]);

  useEffect(() => {
    if (!device) return;
    setEditName(device.name);
    setEditRoom(device.roomName);
    setOpenTimeout(device.openTimeoutSeconds || 23);
    setCloseTimeout(device.closeTimeoutSeconds || 20);
    setAutoSchedule(device.isAutoScheduleActive);
    setAccessLimit(device.isAccessLimitActive);
    setAccessStart(device.accessStartTime || "08:00");
    setAccessEnd(device.accessEndTime || "18:00");
    setAccessDays(
      Array.isArray(device.accessDays) && device.accessDays.length === 7
        ? [...device.accessDays]
        : [true, true, true, true, true, false, false]
    );
    setSchedules(
      Array.isArray(device.currentProperties?.schedules)
        ? [...device.currentProperties.schedules]
        : []
    );
    setPowerLimitW(
      Number(
        device.currentProperties?.power_limit ??
          device.currentProperties?.power_limit_w ??
          4500
      )
    );
    setNewSchedAction(
      device.category === "lightSwitch" ? "Bật công tắc" : "Mở 100%"
    );
    const dyn: Record<string, any> = {};
    (device.assignedProperties || []).forEach((p: any) => {
      const key = String(p?.propertyKey || "");
      if (key) dyn[key] = device.currentProperties?.[key] ?? "";
    });
    setDynamicPropValues(dyn);
  }, [device?.hardwareId]);

  const fetchHistory = async () => {
    if (!device) return;
    setIsLoadingHistory(true);
    try {
      const res = await customerApi.get(
        `/api/devices/${encodeURIComponent(device.hardwareId)}/history`
      );
      const list = res.history || res.logs || res.data?.history || [];
      if (Array.isArray(list)) setRemoteHistory(list);
    } catch {
      // ignore
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeMainTab === "history" && device) {
      fetchHistory();
    }
  }, [activeMainTab, device?.hardwareId]);

  const cameraDevices = useMemo(
    () => allDevicesWithEnergySamples.filter((d) => d.category === "camera"),
    [allDevicesWithEnergySamples]
  );

  if (!device) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-3">
        <AlertTriangle className="w-8 h-8 text-amber-500" strokeWidth={1.5} />
        <p className="text-sm font-semibold">Không tìm thấy thiết bị ({hardwareId})</p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
          >
            Đóng
          </button>
        ) : (
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium"
          >
            Quay về bảng điều khiển
          </Link>
        )}
      </div>
    );
  }

  const isBms =
    device.hardwareId.toUpperCase().includes("BMS") ||
    device.modelCode.toUpperCase().includes("BMS");
  const isSmartMeter =
    !isBms &&
    (device.category === "energyManage" ||
      device.hardwareId.toUpperCase().includes("SMARTMETTER") ||
      device.modelCode.includes("SmartMetter"));
  const allowed = canPerformControl(device);
  const blockedReason = getScheduleBlockedReason(device, language);

  const runAction = async (action: string, parameters?: Record<string, any>) => {
    setIsBusy(true);
    try {
      const res = await sendCommand(device.hardwareId, action, parameters);
      if (res.success) {
        toast.success(`${res.message} (${res.latencyMs}ms)`);
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    try {
      if (editName.trim() && editName.trim() !== device.name) {
        await updateDeviceName(device.hardwareId, editName.trim());
      }
      if (editRoom.trim() && editRoom.trim() !== device.roomName) {
        await updateDeviceLocation(device.hardwareId, editRoom.trim());
      }
      await updateDeviceProperties(device.hardwareId, {
        open_timeout: Number(openTimeout),
        close_timeout: Number(closeTimeout),
        is_auto_schedule: autoSchedule,
        access_limit: accessLimit,
        access_start: accessStart,
        access_end: accessEnd,
        access_days: accessDays,
        schedules,
        ...dynamicPropValues,
      });
      toast.success("Đã lưu cài đặt thiết bị");
    } finally {
      setIsBusy(false);
    }
  };

  const handleAddSchedule = () => {
    const activeLabels = DAY_LABELS.filter((_, i) => newSchedDays[i]);
    const daysSummary =
      activeLabels.length === 7
        ? "Hàng ngày"
        : activeLabels.length === 0
          ? "Chưa chọn ngày"
          : activeLabels.join(", ");
    const item = {
      id: `sch-${Date.now()}`,
      time: newSchedTime,
      action: newSchedAction,
      type: newSchedType,
      days: [...newSchedDays],
      daysLabel: daysSummary,
      enabled: true,
    };
    setSchedules((prev) => [item, ...prev]);
    setAutoSchedule(true);
    toast.success(`Đã thêm lịch ${newSchedTime} · ${newSchedAction}`);
  };

  const handleSaveBmsProtection = async () => {
    const cfgCmd = `CFG:COV=${ovCutoff.toFixed(3)},CUV=${uvCutoff.toFixed(
      3
    )},CHG=${chargeOcpRms.toFixed(1)},DSG=${dischargeOcpRms.toFixed(1)}`;
    await runAction(cfgCmd, {
      ovCutoff,
      ovRecover,
      uvCutoff,
      uvRecover,
      balanceDelta,
      activeBalance,
      chargeOcpRms,
      chargeOcpPeak,
      dischargeOcpRms,
      dischargeOcpPeak,
      ratedCapacityAh,
      tempChargeMax,
      tempDischargeMax,
      tempCutLow,
    });
  };

  const handleLinkCamera = async (camHwId: string | null) => {
    await updateDeviceProperties(device.hardwareId, { linked_camera_hw_id: camHwId });
    setShowLinkCamModal(false);
    toast.success(camHwId ? `Đã gắn Camera ${camHwId}` : "Đã gỡ liên kết Camera");
  };

  const handleOpenSupportChat = () => {
    if (onClose) onClose();
    router.push(
      `/chat?device=${encodeURIComponent(device.hardwareId)}&deviceName=${encodeURIComponent(
        device.name
      )}`
    );
  };

  const bmsCells: Array<{ cell: number; v: number; a: number; r: number; status: string }> =
    Array.isArray(device.currentProperties?.cells)
      ? device.currentProperties.cells
      : Array.from({ length: 16 }, (_, i) => ({
          cell: i + 1,
          v: 3.301,
          a: -0.45,
          r: 3.52,
          status: i === 5 || i === 11 ? "WARN" : "NORMAL",
        }));

  const bmsFaults: Array<any> = Array.isArray(device.currentProperties?.faults)
    ? device.currentProperties.faults
    : [];

  const meterChart = [
    { time: "00:00", kw: 1.1 },
    { time: "04:00", kw: 0.9 },
    { time: "08:00", kw: 2.4 },
    { time: "12:00", kw: 3.5 },
    { time: "16:00", kw: 2.9 },
    { time: "20:00", kw: 3.8 },
    { time: "Hiện tại", kw: Number(device.currentProperties?.power_kw ?? 2.73) },
  ];

  const mergedHistory = [
    ...device.auditLogs.map((l) => ({
      time: l.time,
      action: l.action,
      actor: l.triggeredBy,
      status: "SUCCESS",
    })),
    ...remoteHistory.map((h: any) => ({
      time: h.createdAt || h.created_at || h.time || "",
      action: h.actionType || h.action_type || h.action || "COMMAND",
      actor: h.actorName || h.actor_id || "Gia chủ",
      status: h.ackStatus || h.ack_status || "SUCCESS",
    })),
  ].filter((item) =>
    historyDateFilter ? String(item.time).includes(historyDateFilter) : true
  );

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#F6F7F9] dark:bg-[#0D1015] text-[#11161F] dark:text-[#F3F5F8] overflow-hidden">
      {/* Unified Header — Left-aligned Device Name + Vertical-aligned Online Status (matches Mobile standard) */}
      <div className="px-4 py-3 border-b border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {!isModal && (
            <Link
              href="/"
              className="p-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-[#525D6F] dark:text-[#9BA4B2]"
              title="Quay lại"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            </Link>
          )}
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold leading-tight truncate">
              {device.name}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11.5px]">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  device.isOnline ? "bg-emerald-500" : "bg-[#7B8596]"
                }`}
              />
              <span
                className={`font-medium ${
                  device.isOnline ? "text-emerald-500" : "text-[#7B8596]"
                }`}
              >
                {device.isOnline ? "Trực tuyến" : "Ngoại tuyến"}
              </span>
              <span className="text-[#7B8596]">·</span>
              <span className="text-[#7B8596] font-mono text-[11px] truncate">
                {device.hardwareId}
              </span>
              {device.roomName && (
                <>
                  <span className="text-[#7B8596] hidden sm:inline">·</span>
                  <span className="text-[#7B8596] hidden sm:inline truncate">
                    {device.roomName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Controls: 3 Tabs + Support CSKH Button + Close (if modal) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#EEF1F5] dark:bg-[#1C232E] border border-black/[0.06] dark:border-white/[0.06]">
            {[
              { id: "control" as const, label: "Điều khiển", icon: Sliders },
              { id: "history" as const, label: "Lịch sử", icon: History },
              { id: "settings" as const, label: "Cài đặt", icon: Settings },
            ].map((t) => {
              const Icon = t.icon;
              const active = activeMainTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveMainTab(t.id)}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    active
                      ? "bg-white dark:bg-[#151A22] text-[#11161F] dark:text-[#F3F5F8] shadow-xs"
                      : "text-[#525D6F] dark:text-[#9BA4B2] hover:text-[#11161F] dark:hover:text-[#F3F5F8]"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleOpenSupportChat}
            title="Hỗ trợ CSKH cho thiết bị này"
            className="h-8 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5 cursor-pointer"
          >
            <Headphones className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="hidden sm:inline">CSKH</span>
          </button>

          {isModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] flex items-center justify-center text-[#7B8596] hover:text-[#11161F] dark:hover:text-[#F3F5F8] cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Inner Content Area (Strictly inside container, tight spacing) */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3">
        {!allowed && blockedReason && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>{blockedReason}</span>
          </div>
        )}

        {/* ================= TAB 1: CONTROL ================= */}
        {activeMainTab === "control" && (
          <>
            {/* 1. ROLLER DOOR */}
            {device.category === "rollerDoor" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                <div className="lg:col-span-7 flex flex-col gap-3">
                  <div className="p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-[#7B8596] block">Trạng thái cửa</span>
                        <span className="text-sm font-semibold">
                          {getDeviceStateSummary(device, language)}
                        </span>
                      </div>
                      <span className="text-2xl font-mono font-semibold tabular-nums text-blue-500">
                        {device.positionPercent}%
                      </span>
                    </div>

                    {/* Door Visual Simulator */}
                    <div className="relative h-44 w-full max-w-md mx-auto rounded-xl border-2 border-[#252D3A] bg-[#0D1015] overflow-hidden flex flex-col">
                      <div className="h-6 bg-[#1C232E] border-b border-white/[0.08] flex items-center justify-between px-3 text-[10px] font-mono text-[#9BA4B2]">
                        <span>Austec Roller Motor</span>
                        <span>
                          {device.openTimeoutSeconds}s / {device.closeTimeoutSeconds}s
                        </span>
                      </div>
                      <div className="relative flex-1 w-full bg-[#0D1015]">
                        <div
                          className="w-full bg-[#252D3A] border-b-2 border-blue-500 transition-[height] duration-150 flex flex-col justify-end overflow-hidden"
                          style={{ height: `${100 - device.positionPercent}%` }}
                        >
                          {Array.from({ length: 10 }).map((_, idx) => (
                            <div
                              key={idx}
                              className="w-full h-3.5 border-b border-white/[0.06]"
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Position Presets */}
                    <div className="flex items-center justify-center gap-1.5">
                      {[0, 25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          disabled={!allowed || device.isChildLockActive || isBusy}
                          onClick={() => runAction("SET_POSITION", { position: pct })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer disabled:opacity-40 ${
                            device.positionPercent === pct
                              ? "bg-blue-600 text-white border-blue-600"
                              : "border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E]"
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Linked Door Camera */}
                  <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-[#7B8596]" strokeWidth={1.5} />
                        <span>Camera quan sát cửa cuốn</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowLinkCamModal(true)}
                          className="px-2.5 py-1 rounded-lg bg-[#EEF1F5] dark:bg-[#1C232E] text-xs font-medium hover:bg-blue-600 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Link2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>{device.linkedCameraHwId ? "Đổi camera" : "Gắn camera"}</span>
                        </button>
                        {device.linkedCameraHwId && (
                          <button
                            type="button"
                            onClick={() => handleLinkCamera(null)}
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                          >
                            <Unlink className="w-3.5 h-3.5" strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </div>

                    {device.linkedCameraHwId ? (
                      <WebCameraPlayer
                        hardwareId={device.linkedCameraHwId}
                        deviceName={`Camera ${device.name}`}
                        className="h-48"
                      />
                    ) : (
                      <p className="text-xs text-[#7B8596] py-2">
                        Chưa gắn camera. Gắn 1 camera an ninh để quan sát trực tiếp khi đóng mở cửa.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Control Pad + RF */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-2.5">
                    <button
                      type="button"
                      disabled={isBusy || !allowed || device.isChildLockActive}
                      onClick={() => runAction("OPEN_DOOR")}
                      className="w-full h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" strokeWidth={1.75} />
                      <span>Mở cửa</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy || !allowed}
                      onClick={() => runAction("STOP_DOOR")}
                      className="w-full h-11 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Dừng cửa</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy || !allowed || device.isChildLockActive}
                      onClick={() => runAction("CLOSE_DOOR")}
                      className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" strokeWidth={1.75} />
                      <span>Đóng cửa</span>
                    </button>

                    <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                      <button
                        type="button"
                        disabled={isBusy || !device.canChildLock}
                        onClick={() => runAction("TOGGLE_CHILD_LOCK")}
                        className={`w-full h-10 px-3 rounded-lg border text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          device.isChildLockActive
                            ? "border-rose-500/50 bg-rose-500/10 text-rose-500"
                            : "border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E]"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {device.isChildLockActive ? (
                            <Lock className="w-4 h-4" strokeWidth={1.5} />
                          ) : (
                            <Unlock className="w-4 h-4" strokeWidth={1.5} />
                          )}
                          <span>Khóa an toàn trẻ em</span>
                        </span>
                        <span className="font-mono">
                          {device.isChildLockActive ? "Đang khóa" : "Đã mở"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Telemetry + RF Remotes */}
                  <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-3">
                    <span className="text-xs font-semibold block">Thông số & Tay cầm RF 433MHz</span>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
                      <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                        <span className="text-[11px] font-sans text-[#7B8596] block">Dòng mô tơ</span>
                        <span className="font-semibold">{device.motorCurrentA} A</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                        <span className="text-[11px] font-sans text-[#7B8596] block">Điện áp</span>
                        <span className="font-semibold">{device.acVoltage} V</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                        <span className="text-[11px] font-sans text-[#7B8596] block">Mã bảo hành</span>
                        <span className="font-medium text-[11px]">{device.warrantyCode}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                        <span className="text-[11px] font-sans text-[#7B8596] block">Hạn bảo hành</span>
                        <span className="font-medium">{device.warrantyUntil}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isBusy || !device.canConfig}
                        onClick={() => runAction("RF_SETUP")}
                        className="h-9 rounded-lg border border-blue-500/35 bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-500 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Radio className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Học tay cầm RF</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy || !device.canConfig}
                        onClick={() => {
                          if (window.confirm("Xóa toàn bộ tay cầm RF đã học?")) {
                            runAction("RF_CLEAR");
                          }
                        }}
                        className="h-9 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-600 hover:text-white text-rose-500 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        <span>Xóa hết RF</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. LIGHT & SWITCH (Balanced 2-column Socket Plate + Telemetry & Quick Summary) */}
            {device.category === "lightSwitch" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                <div className="lg:col-span-6 p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">Bảng công tắc & ổ cắm vật lý</span>
                    <span
                      className={`font-medium ${
                        device.isRelayOn
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-[#7B8596]"
                      }`}
                    >
                      {device.isRelayOn ? "Đang cấp điện" : "Đã ngắt nguồn"}
                    </span>
                  </div>

                  <div
                    onClick={() =>
                      allowed &&
                      !device.isChildLockActive &&
                      runAction(device.isRelayOn ? "TURN_OFF" : "TURN_ON")
                    }
                    className={`w-full h-44 rounded-xl border-2 p-3.5 bg-[#151A22] flex items-center gap-3.5 transition-colors ${
                      allowed && !device.isChildLockActive ? "cursor-pointer" : "opacity-60"
                    } ${device.isRelayOn ? "border-emerald-500/50" : "border-rose-500/40"}`}
                  >
                    {/* Left 3-pin Socket Graphic */}
                    <div className="flex-1 h-full rounded-lg bg-[#0D1015] border border-white/[0.08] flex flex-col items-center justify-center gap-2">
                      <span className="text-[10px] font-mono text-[#7B8596]">Austec Power 16A</span>
                      <div className="w-16 h-16 rounded-full bg-[#151A22] border-2 border-[#252D3A] flex flex-col items-center justify-center gap-1.5">
                        <div className="w-1.5 h-2 rounded-xs bg-[#525D6F]" />
                        <div className="flex items-center gap-4">
                          <div className="w-2.5 h-2.5 rounded-full bg-black border border-white/10" />
                          <div className="w-2.5 h-2.5 rounded-full bg-black border border-white/10" />
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#7B8596]">220V · 50Hz</span>
                    </div>

                    {/* Right Mechanical Rocker Switch */}
                    <div className="w-32 h-full rounded-lg bg-[#0D1015] border border-white/[0.08] flex flex-col items-center justify-center gap-2">
                      <div className="w-16 h-24 rounded-lg border border-white/10 overflow-hidden flex flex-col">
                        <div
                          className={`flex-1 flex items-center justify-center text-xs font-mono font-semibold transition-colors ${
                            device.isRelayOn
                              ? "bg-emerald-600 text-white"
                              : "bg-[#1C232E] text-[#7B8596]"
                          }`}
                        >
                          Bật
                        </div>
                        <div
                          className={`flex-1 flex items-center justify-center text-xs font-mono font-semibold transition-colors ${
                            !device.isRelayOn
                              ? "bg-rose-600 text-white"
                              : "bg-[#1C232E] text-[#7B8596]"
                          }`}
                        >
                          Tắt
                        </div>
                      </div>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          device.isRelayOn ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isBusy || !allowed || device.isChildLockActive}
                      onClick={() => runAction("TURN_ON")}
                      className={`h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors ${
                        device.isRelayOn
                          ? "bg-emerald-600 text-white"
                          : "bg-[#F6F7F9] dark:bg-[#1C232E] hover:bg-emerald-600 hover:text-white border border-black/[0.08] dark:border-white/[0.08]"
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Bật nguồn</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy || !allowed || device.isChildLockActive}
                      onClick={() => runAction("TURN_OFF")}
                      className={`h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors ${
                        !device.isRelayOn
                          ? "bg-rose-600 text-white"
                          : "bg-[#F6F7F9] dark:bg-[#1C232E] hover:bg-rose-600 hover:text-white border border-black/[0.08] dark:border-white/[0.08]"
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>Ngắt nguồn</span>
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-6 p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-col justify-between gap-3">
                  <div className="space-y-3">
                    <span className="text-xs font-semibold block">An toàn & thông số vận hành</span>
                    <button
                      type="button"
                      disabled={isBusy || !device.canChildLock}
                      onClick={() => runAction("TOGGLE_CHILD_LOCK")}
                      className={`w-full h-10 px-3 rounded-lg border text-xs font-medium flex items-center justify-between cursor-pointer ${
                        device.isChildLockActive
                          ? "border-rose-500/50 bg-rose-500/10 text-rose-500"
                          : "border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {device.isChildLockActive ? (
                          <Lock className="w-4 h-4" strokeWidth={1.5} />
                        ) : (
                          <Unlock className="w-4 h-4" strokeWidth={1.5} />
                        )}
                        <span>Khóa an toàn trẻ em</span>
                      </span>
                      <span className="font-mono">
                        {device.isChildLockActive ? "Đang khóa" : "Đã mở"}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
                      <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                        <span className="text-[11px] font-sans text-[#7B8596] block">Công suất tức thời</span>
                        <span className="font-semibold text-sm text-blue-500">
                          {device.isRelayOn ? `${device.powerWatt} W` : "0 W"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                        <span className="text-[11px] font-sans text-[#7B8596] block">Điện áp lưới</span>
                        <span className="font-semibold text-sm">{device.acVoltage} V</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                        <span className="text-[11px] font-sans text-[#7B8596] block">Mã bảo hành</span>
                        <span className="font-medium text-[11px] truncate block">{device.warrantyCode}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                        <span className="text-[11px] font-sans text-[#7B8596] block">Hạn bảo hành</span>
                        <span className="font-medium">{device.warrantyUntil}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                        <span className="text-[11px] font-sans text-[#7B8596] block">Địa chỉ IP</span>
                        <span className="font-medium">{device.deviceIp}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                        <span className="text-[11px] font-sans text-[#7B8596] block">Lịch trình tự động</span>
                        <span className="font-sans font-medium">
                          {schedules.length > 0 ? `${schedules.length} lịch hẹn` : "Chưa thiết lập"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-[11px] text-[#7B8596]">
                    <span>Chủ sở hữu: <strong className="text-[#11161F] dark:text-[#F3F5F8] font-medium">{device.ownerName}</strong></span>
                    <button
                      type="button"
                      onClick={() => setActiveMainTab("settings")}
                      className="text-blue-500 hover:underline font-medium cursor-pointer"
                    >
                      Cài đặt hẹn giờ &rarr;
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. SMART METER PRO */}
            {isSmartMeter && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-5 p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-4">
                  <div className="p-4 rounded-xl bg-[#0D1015] border border-white/[0.08] font-mono tabular-nums space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-[#9BA4B2]">Điện năng lũy kế</span>
                      <span className="text-2xl font-semibold text-emerald-400">
                        {Number(device.currentProperties?.kwh ?? 123.45).toFixed(2)} kWh
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.08] text-center">
                      <div>
                        <span className="text-[10px] text-[#7B8596] block">Điện áp</span>
                        <span className="text-sm font-semibold text-white">
                          {Number(device.currentProperties?.voltage_v ?? 220.5).toFixed(1)} V
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#7B8596] block">Dòng điện</span>
                        <span className="text-sm font-semibold text-blue-400">
                          {Number(device.currentProperties?.current_a ?? 12.4).toFixed(1)} A
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#7B8596] block">Công suất</span>
                        <span className="text-sm font-semibold text-amber-400">
                          {Number(device.currentProperties?.power_kw ?? 2.73).toFixed(2)} kW
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Power limit (sends power_limit matching backend command.service.ts) */}
                  <div className="p-3 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">Giới hạn công suất an toàn</span>
                      <span className="font-mono font-semibold tabular-nums text-amber-500">
                        {powerLimitW} W
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={500}
                        max={10000}
                        step={100}
                        value={powerLimitW}
                        onChange={(e) => setPowerLimitW(Number(e.target.value))}
                        className="flex-1"
                      />
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          runAction("CONFIG_POWER_LIMIT", {
                            power_limit: powerLimitW,
                            power_limit_w: powerLimitW,
                          })
                        }
                        className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
                      >
                        Áp dụng
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => runAction("METER_POWER_ON")}
                      className="h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer"
                    >
                      Bật điện
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        if (window.confirm("Xác nhận ngắt rơ-le công tơ điện tổng?")) {
                          runAction("METER_POWER_OFF");
                        }
                      }}
                      className="h-9 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium cursor-pointer"
                    >
                      Ngắt điện
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => runAction("RESET")}
                      className="h-9 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium cursor-pointer"
                    >
                      Reset lỗi
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-7 p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">Biểu đồ phụ tải công suất (kW)</span>
                    <span className="text-[11px] font-mono text-[#7B8596]">Chu kỳ 24 giờ</span>
                  </div>
                  <div className="flex-1 min-h-[210px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={meterChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(155,164,178,0.15)" />
                        <XAxis dataKey="time" stroke="#7B8596" fontSize={11} />
                        <YAxis stroke="#7B8596" fontSize={11} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#151A22",
                            borderColor: "#252D3A",
                            borderRadius: 10,
                            fontSize: 12,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="kw"
                          name="Công suất (kW)"
                          stroke="#3B82F6"
                          fill="#3B82F6"
                          fillOpacity={0.18}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06] text-xs font-mono tabular-nums">
                    <div className="p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                      <span className="text-[10px] font-sans text-[#7B8596] block">Mã bảo hành</span>
                      <span className="font-medium text-[11px] truncate block">{device.warrantyCode}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                      <span className="text-[10px] font-sans text-[#7B8596] block">Hạn bảo hành</span>
                      <span className="font-medium">{device.warrantyUntil}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                      <span className="text-[10px] font-sans text-[#7B8596] block">Địa chỉ IP</span>
                      <span className="font-medium">{device.deviceIp}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. BMS 16S LITHIUM (4 Sub-tabs + Real Firmware CFG Commands) */}
            {isBms && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 font-mono tabular-nums">
                  {[
                    { label: "SoC", val: `${device.currentProperties?.soc_percent ?? 95}%`, cls: "text-emerald-500" },
                    { label: "Điện áp tổng", val: `${device.currentProperties?.total_voltage ?? 52.8} V`, cls: "text-blue-500" },
                    { label: "Dòng điện", val: `${device.currentProperties?.current_a ?? -68.5} A`, cls: "text-amber-500" },
                    { label: "Công suất", val: `${device.currentProperties?.power_kw ?? 3.62} kW`, cls: "" },
                    { label: "Lệch áp ΔV", val: `${device.currentProperties?.delta_v ?? 0.012} V`, cls: "" },
                    { label: "Nhiệt MOS", val: `${device.currentProperties?.temp_c ?? 34.5}°C`, cls: "" },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="p-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22]"
                    >
                      <span className="text-[11px] font-sans text-[#7B8596] block">{m.label}</span>
                      <span className={`text-base font-semibold ${m.cls}`}>{m.val}</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-black/[0.06] dark:border-white/[0.06]">
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: "cells" as const, label: "16 Cell" },
                        { id: "chart" as const, label: "Biểu đồ" },
                        { id: "faults" as const, label: `Sự cố (${bmsFaults.length})` },
                        { id: "config" as const, label: "Cài đặt bảo vệ" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setBmsSubTab(t.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                            bmsSubTab === t.id
                              ? "bg-blue-600 text-white"
                              : "bg-[#EEF1F5] dark:bg-[#1C232E] text-[#525D6F] dark:text-[#9BA4B2]"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {bmsSubTab === "cells" && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono tabular-nums">
                      {bmsCells.map((c) => (
                        <div
                          key={c.cell}
                          className={`p-2.5 rounded-lg border ${
                            c.status === "WARN"
                              ? "border-amber-500/50 bg-amber-500/10"
                              : "border-black/[0.06] dark:border-white/[0.06] bg-[#F6F7F9] dark:bg-[#1C232E]"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold">Cell {String(c.cell).padStart(2, "0")}</span>
                            <span className="text-[10px] text-[#7B8596]">
                              {c.status === "WARN" ? "Lệch áp" : "Ổn định"}
                            </span>
                          </div>
                          <div className="text-sm font-semibold text-blue-500 mt-0.5">
                            {Number(c.v).toFixed(3)} V
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-[#7B8596] mt-0.5">
                            <span>{c.a} A</span>
                            <span>{c.r} mΩ</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {bmsSubTab === "chart" && (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bmsCells}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(155,164,178,0.15)" />
                          <XAxis dataKey="cell" stroke="#7B8596" fontSize={11} />
                          <YAxis domain={[3.0, 3.6]} stroke="#7B8596" fontSize={11} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#151A22",
                              borderColor: "#252D3A",
                              borderRadius: 10,
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="v" name="Điện áp (V)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {bmsSubTab === "faults" && (
                    <div className="space-y-2">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => runAction("CLEAR_LOG")}
                          className="px-3 py-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer"
                        >
                          Xóa nhật ký lỗi BMS (CLEAR_LOG)
                        </button>
                      </div>
                      {bmsFaults.map((f, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-mono font-semibold text-rose-500 mr-2">
                              {f.code}
                            </span>
                            <span>{f.desc}</span>
                            <span className="block text-[11px] font-mono text-[#7B8596] mt-0.5">
                              {f.time} · {f.level}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-amber-500">{f.status}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {bmsSubTab === "config" && (
                    <div className="space-y-4">
                      {/* Battery chemistry presets */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-[#7B8596]">Hệ hóa học pin:</span>
                        {[
                          { cmd: "SET_LFP", label: "LiFePO4 (LFP)" },
                          { cmd: "SET_LIION", label: "Lithium-Ion" },
                          { cmd: "SET_LTO", label: "LTO" },
                        ].map((chem) => (
                          <button
                            key={chem.cmd}
                            type="button"
                            onClick={() => runAction(chem.cmd)}
                            className="px-2.5 py-1 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] hover:border-blue-500 text-xs font-medium cursor-pointer"
                          >
                            {chem.label}
                          </button>
                        ))}
                      </div>

                      {/* 13 Protection Parameters matching bms_landscape_screen.dart */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
                        {[
                          { label: "Quá áp ngắt sạc (V)", val: ovCutoff, set: setOvCutoff, step: 0.05 },
                          { label: "Quá áp phục hồi (V)", val: ovRecover, set: setOvRecover, step: 0.05 },
                          { label: "Thấp áp ngắt xả (V)", val: uvCutoff, set: setUvCutoff, step: 0.05 },
                          { label: "Thấp áp phục hồi (V)", val: uvRecover, set: setUvRecover, step: 0.05 },
                          { label: "Lệch áp cân bằng (V)", val: balanceDelta, set: setBalanceDelta, step: 0.005 },
                          { label: "Quá dòng sạc RMS (A)", val: chargeOcpRms, set: setChargeOcpRms, step: 5 },
                          { label: "Quá dòng sạc đỉnh (A)", val: chargeOcpPeak, set: setChargeOcpPeak, step: 5 },
                          { label: "Quá dòng xả RMS (A)", val: dischargeOcpRms, set: setDischargeOcpRms, step: 5 },
                          { label: "Quá dòng xả đỉnh (A)", val: dischargeOcpPeak, set: setDischargeOcpPeak, step: 5 },
                          { label: "Dung lượng định mức (Ah)", val: ratedCapacityAh, set: setRatedCapacityAh, step: 10 },
                          { label: "Nhiệt sạc tối đa (°C)", val: tempChargeMax, set: setTempChargeMax, step: 1 },
                          { label: "Nhiệt xả tối đa (°C)", val: tempDischargeMax, set: setTempDischargeMax, step: 1 },
                          { label: "Nhiệt ngắt thấp (°C)", val: tempCutLow, set: setTempCutLow, step: 1 },
                        ].map((item) => (
                          <div key={item.label} className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                            <label className="text-[11px] text-[#7B8596] block mb-1">
                              {item.label}
                            </label>
                            <input
                              type="number"
                              step={item.step}
                              value={item.val}
                              onChange={(e) => item.set(Number(e.target.value))}
                              className="w-full px-2 py-1 rounded border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] font-mono text-xs tabular-nums"
                            />
                          </div>
                        ))}
                        <label className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] flex items-center justify-between cursor-pointer">
                          <span className="text-[11px] text-[#7B8596]">Cân bằng chủ động</span>
                          <input
                            type="checkbox"
                            checked={activeBalance}
                            onChange={(e) => setActiveBalance(e.target.checked)}
                          />
                        </label>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setOvCutoff(3.65);
                            setOvRecover(3.55);
                            setUvCutoff(2.5);
                            setUvRecover(2.8);
                            setBalanceDelta(0.015);
                            setChargeOcpRms(100);
                            setDischargeOcpRms(150);
                            toast.info("Đã khôi phục thông số mặc định nhà máy");
                          }}
                          className="px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium cursor-pointer"
                        >
                          Khôi phục mặc định
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={handleSaveBmsProtection}
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
                          <span>Lưu cấu hình BMS</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. CAMERA / ENVIRONMENT / LOCK / OTHERS (Balanced 2-column density) */}
            {device.category !== "rollerDoor" &&
              device.category !== "lightSwitch" &&
              !isSmartMeter &&
              !isBms && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                  <div className="lg:col-span-8 flex flex-col gap-3">
                    {device.category === "camera" ? (
                      <WebCameraPlayer
                        hardwareId={device.hardwareId}
                        deviceName={device.name}
                        className="h-[360px]"
                      />
                    ) : device.category === "environment" ? (
                      <>
                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22]">
                            <Thermometer className="w-4 h-4 text-amber-500 mb-1.5" strokeWidth={1.5} />
                            <span className="text-xs text-[#7B8596] block">Nhiệt độ</span>
                            <span className="text-2xl font-mono font-semibold tabular-nums">
                              {device.temperature.toFixed(1)}°C
                            </span>
                          </div>
                          <div className="p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22]">
                            <Droplets className="w-4 h-4 text-blue-500 mb-1.5" strokeWidth={1.5} />
                            <span className="text-xs text-[#7B8596] block">Độ ẩm</span>
                            <span className="text-2xl font-mono font-semibold tabular-nums">
                              {device.humidity.toFixed(0)}%
                            </span>
                          </div>
                          <div className="p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22]">
                            <Wind className="w-4 h-4 text-emerald-500 mb-1.5" strokeWidth={1.5} />
                            <span className="text-xs text-[#7B8596] block">Chất lượng AQI</span>
                            <span className="text-2xl font-mono font-semibold tabular-nums text-emerald-500">
                              {device.airQualityAqi}
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-2 flex-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold">Đánh giá không khí trong phòng</span>
                            <span className="font-mono text-emerald-500">
                              {device.airQualityAqi <= 50
                                ? "Trong lành"
                                : device.airQualityAqi <= 100
                                  ? "Trung bình"
                                  : "Cần thông gió"}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[#EEF1F5] dark:bg-[#1C232E] overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${Math.min(100, Math.max(12, device.airQualityAqi))}%` }}
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] text-[#7B8596]">
                            <span>Pin cảm biến: <strong className="font-mono text-[#11161F] dark:text-[#F3F5F8]">{device.batteryPercent}%</strong></span>
                            <span>Khu vực: <strong className="text-[#11161F] dark:text-[#F3F5F8]">{device.roomName}</strong></span>
                            <span>Chu kỳ đọc: <strong className="font-mono text-[#11161F] dark:text-[#F3F5F8]">1s Realtime</strong></span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-col justify-between gap-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-[#7B8596] block">Trạng thái vận hành</span>
                            <div className="text-base font-semibold mt-0.5">
                              {getDeviceStateSummary(device, language)}
                            </div>
                          </div>
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                              device.isLocked
                                ? "bg-blue-600/12 text-blue-500"
                                : "bg-emerald-500/12 text-emerald-500"
                            }`}
                          >
                            {device.isLocked ? (
                              <Lock className="w-5 h-5" />
                            ) : (
                              <Unlock className="w-5 h-5" />
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            disabled={isBusy || !allowed}
                            onClick={() => runAction("UNLOCK")}
                            className="h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Unlock className="w-4 h-4" />
                            <span>Mở khóa</span>
                          </button>
                          <button
                            type="button"
                            disabled={isBusy || !allowed}
                            onClick={() => runAction("LOCK")}
                            className="h-11 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Lock className="w-4 h-4" />
                            <span>Khóa lại</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                          <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                            <span className="text-[11px] text-[#7B8596] block">Lần mở gần nhất</span>
                            <span className="font-medium">{device.lastUnlockUser || device.ownerName}</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                            <span className="text-[11px] text-[#7B8596] block">Pin thiết bị</span>
                            <span className="font-mono font-semibold">{device.batteryPercent}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-4 p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-col justify-between gap-3">
                    <div className="space-y-2.5">
                      <span className="text-xs font-semibold block">Thông số & bảo hành</span>
                      <div className="text-xs space-y-2">
                        <div className="p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] flex justify-between gap-2">
                          <span className="text-[#7B8596]">Model</span>
                          <span className="font-medium text-right truncate">{device.modelName}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] flex justify-between gap-2">
                          <span className="text-[#7B8596]">Khu vực</span>
                          <span className="font-medium text-right truncate">{device.roomName}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] flex justify-between gap-2">
                          <span className="text-[#7B8596]">Mã bảo hành</span>
                          <span className="font-mono text-[11px]">{device.warrantyCode}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] flex justify-between gap-2">
                          <span className="text-[#7B8596]">Hạn bảo hành</span>
                          <span className="font-mono">{device.warrantyUntil}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] flex justify-between gap-2">
                          <span className="text-[#7B8596]">Địa chỉ IP</span>
                          <span className="font-mono">{device.deviceIp}</span>
                        </div>
                        <div className="p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] flex justify-between gap-2">
                          <span className="text-[#7B8596]">Chủ sở hữu</span>
                          <span className="font-medium">{device.ownerName}</span>
                        </div>
                      </div>
                    </div>

                    {device.category === "camera" && (
                      <button
                        type="button"
                        disabled={isBusy || !allowed}
                        onClick={() => runAction("TOGGLE_ALARM")}
                        className={`w-full h-9 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                          device.isAlarmActive
                            ? "border-rose-500/50 bg-rose-500/15 text-rose-500"
                            : "border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] hover:border-amber-500"
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{device.isAlarmActive ? "Đang bật còi báo động" : "Còi cảnh báo an ninh"}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
          </>
        )}

        {/* ================= TAB 2: HISTORY ================= */}
        {activeMainTab === "history" && (
          <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold">Lịch sử vận hành</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={historyDateFilter}
                  onChange={(e) => setHistoryDateFilter(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={fetchHistory}
                  className="h-8 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? "animate-spin" : ""}`} />
                  <span>Làm mới</span>
                </button>
              </div>
            </div>

            {mergedHistory.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#7B8596]">
                Chưa có bản ghi lịch sử nào
              </div>
            ) : (
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {mergedHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.5} />
                      <div>
                        <span className="font-medium">{item.action}</span>
                        <span className="block text-[11px] text-[#7B8596]">
                          Thực hiện: {item.actor}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-[#7B8596] tabular-nums">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: SETTINGS (Incl. Automation Schedules & Dynamic Props) ================= */}
        {activeMainTab === "settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <form
              onSubmit={handleSaveSettings}
              className="lg:col-span-8 p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#525D6F] dark:text-[#9BA4B2] mb-1">
                    Tên thiết bị
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#525D6F] dark:text-[#9BA4B2] mb-1">
                    Khu vực / Phòng
                  </label>
                  <input
                    type="text"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                  />
                </div>
              </div>

              {device.category === "rollerDoor" && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                  <div>
                    <label className="block text-xs text-[#7B8596] mb-1">
                      Thời gian mở (giây)
                    </label>
                    <input
                      type="number"
                      min={6}
                      max={120}
                      value={openTimeout}
                      onChange={(e) => setOpenTimeout(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#7B8596] mb-1">
                      Thời gian đóng (giây)
                    </label>
                    <input
                      type="number"
                      min={6}
                      max={120}
                      value={closeTimeout}
                      onChange={(e) => setCloseTimeout(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Automation Schedules (Full parity with mobile device_settings_screen.dart) */}
              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.5} />
                    <span>Lịch trình tự động ({schedules.length})</span>
                  </span>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <span className="text-[#7B8596]">Kích hoạt</span>
                    <input
                      type="checkbox"
                      checked={autoSchedule}
                      onChange={(e) => setAutoSchedule(e.target.checked)}
                    />
                  </label>
                </div>

                <div className="p-3 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="time"
                      value={newSchedTime}
                      onChange={(e) => setNewSchedTime(e.target.value)}
                      className="h-8 px-2 rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] text-xs font-mono"
                    />
                    <select
                      value={newSchedAction}
                      onChange={(e) => setNewSchedAction(e.target.value)}
                      className="h-8 px-2 rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] text-xs"
                    >
                      {device.category === "lightSwitch" ? (
                        <>
                          <option value="Bật công tắc">Bật công tắc</option>
                          <option value="Tắt công tắc">Tắt công tắc</option>
                        </>
                      ) : (
                        <>
                          <option value="Mở 100%">Mở 100%</option>
                          <option value="Đóng kín 0%">Đóng kín 0%</option>
                          <option value="Bật khóa trẻ em">Bật khóa trẻ em</option>
                        </>
                      )}
                    </select>
                    <select
                      value={newSchedType}
                      onChange={(e) => setNewSchedType(e.target.value as any)}
                      className="h-8 px-2 rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] text-xs"
                    >
                      <option value="weekly">Hàng tuần</option>
                      <option value="this_week">Chỉ tuần này</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1 flex-1">
                      {DAY_LABELS.map((d, idx) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            setNewSchedDays((prev) =>
                              prev.map((v, i) => (i === idx ? !v : v))
                            )
                          }
                          className={`flex-1 h-7 rounded text-[11px] font-medium cursor-pointer ${
                            newSchedDays[idx]
                              ? "bg-blue-600 text-white"
                              : "bg-white dark:bg-[#151A22] text-[#7B8596]"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSchedule}
                      className="h-7 px-2.5 rounded-md bg-blue-600 text-white text-xs font-medium flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm</span>
                    </button>
                  </div>
                </div>

                {schedules.length > 0 && (
                  <div className="space-y-1.5">
                    {schedules.map((s, idx) => (
                      <div
                        key={s.id || idx}
                        className="px-3 py-2 rounded-lg border border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono font-semibold mr-2">{s.time}</span>
                          <span>{s.action}</span>
                          <span className="text-[11px] text-[#7B8596] ml-2">
                            ({s.daysLabel || "Hàng ngày"})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setSchedules((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-rose-500 hover:underline text-[11px] cursor-pointer"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Access Time Limit + 7 Days Matrix */}
              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
                <label className="flex items-center justify-between text-xs cursor-pointer">
                  <span className="font-semibold">Giới hạn khung giờ cho Thành viên / Khách</span>
                  <input
                    type="checkbox"
                    checked={accessLimit}
                    onChange={(e) => setAccessLimit(e.target.checked)}
                  />
                </label>
                {accessLimit && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={accessStart}
                        onChange={(e) => setAccessStart(e.target.value)}
                        className="h-8 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono"
                      />
                      <input
                        type="time"
                        value={accessEnd}
                        onChange={(e) => setAccessEnd(e.target.value)}
                        className="h-8 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      {DAY_LABELS.map((d, idx) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            setAccessDays((prev) =>
                              prev.map((v, i) => (i === idx ? !v : v))
                            )
                          }
                          className={`flex-1 h-7 rounded text-[11px] font-medium cursor-pointer ${
                            accessDays[idx]
                              ? "bg-blue-600 text-white"
                              : "bg-[#EEF1F5] dark:bg-[#1C232E] text-[#7B8596]"
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Dynamic Schema Properties from Device Model */}
              {device.assignedProperties && device.assignedProperties.length > 0 && (
                <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2">
                  <span className="text-xs font-semibold block">
                    Thuộc tính mở rộng theo Mẫu thiết bị
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {device.assignedProperties.map((p: any, idx: number) => {
                      const key = String(p.propertyKey || `prop_${idx}`);
                      return (
                        <div key={key} className="text-xs">
                          <label className="text-[11px] text-[#7B8596] block mb-1">
                            {p.displayName || key} {p.unit ? `(${p.unit})` : ""}
                          </label>
                          <input
                            type="text"
                            disabled={!p.isControllable}
                            value={String(dynamicPropValues[key] ?? "")}
                            onChange={(e) =>
                              setDynamicPropValues((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="w-full h-8 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-mono disabled:opacity-50"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isBusy || !device.canConfig}
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Lưu cài đặt</span>
                </button>
              </div>
            </form>

            {/* Right Sidebar inside Settings: Family & Unpair */}
            <div className="lg:col-span-4 space-y-3">
              <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Users className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
                  <span>Chia sẻ gia đình</span>
                </div>
                <p className="text-xs text-[#7B8596]">
                  Cấp quyền cho người thân hoặc tạo mã OTP chuyển nhượng thiết bị.
                </p>
                <Link
                  href={`/family?device=${encodeURIComponent(device.hardwareId)}`}
                  onClick={() => onClose && onClose()}
                  className="block w-full py-2 text-center rounded-lg bg-[#EEF1F5] dark:bg-[#1C232E] hover:bg-blue-600 hover:text-white text-xs font-medium transition-colors"
                >
                  Quản lý thành viên
                </Link>
              </div>

              <div className="p-4 rounded-xl border border-rose-500/25 bg-rose-500/5 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-500">
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  <span>Hủy liên kết thiết bị</span>
                </div>
                <p className="text-xs text-[#7B8596]">
                  Xóa thiết bị khỏi tài khoản (yêu cầu xác thực OTP nếu bạn là chủ sở hữu).
                </p>
                <button
                  type="button"
                  onClick={() => setShowUnpairStepUp(true)}
                  className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium cursor-pointer"
                >
                  Xóa thiết bị
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Link Camera */}
      {showLinkCamModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#151A22] p-4 space-y-3">
            <h3 className="text-sm font-semibold">Chọn Camera liên kết với {device.name}</h3>
            {cameraDevices.length === 0 ? (
              <p className="text-xs text-[#7B8596]">Chưa có camera nào trong tài khoản.</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {cameraDevices.map((cam) => (
                  <button
                    key={cam.hardwareId}
                    type="button"
                    onClick={() => handleLinkCamera(cam.hardwareId)}
                    className="w-full p-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] hover:border-blue-500 text-left text-xs flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-medium">{cam.name}</div>
                      <div className="text-[11px] font-mono text-[#7B8596]">{cam.hardwareId}</div>
                    </div>
                    <span className="text-blue-500 font-medium">Chọn</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowLinkCamModal(false)}
                className="px-3 py-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step-up OTP Unpair */}
      <CustomerStepUpModal
        isOpen={showUnpairStepUp}
        purpose="UNPAIR_DEVICE"
        title={`Xác thực xóa ${device.name}`}
        description="Nhập mã OTP gửi về Gmail hoặc Zalo để xác nhận hủy liên kết thiết bị."
        onClose={() => setShowUnpairStepUp(false)}
        onVerified={async (stepUpToken) => {
          setShowUnpairStepUp(false);
          const ok = await unpairDevice(device.hardwareId, stepUpToken);
          if (ok) {
            toast.success("Đã gỡ liên kết thiết bị");
            if (onClose) onClose();
            else router.push("/");
          } else {
            toast.error("Không thể gỡ thiết bị");
          }
        }}
      />
    </div>
  );
}

