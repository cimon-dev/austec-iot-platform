"use client";

import React from "react";
import {
  DeviceCategory,
  DeviceItem,
  canPerformControl,
  getDeviceStateSummary,
} from "../types/device";
import { WebCameraPlayer } from "./WebCameraPlayer";
import {
  DoorOpen,
  Video,
  Zap,
  Power,
  Thermometer,
  BarChart3,
  Lock,
  Unlock,
  ArrowUp,
  Square,
  ArrowDown,
  History,
  Settings,
  Sliders,
  BatteryCharging,
  AlertTriangle,
  Activity,
  Grid2x2,
} from "lucide-react";

export type DetailModalTab = "control" | "history" | "settings";
export type BmsModalTab = "cells" | "chart" | "faults" | "config";

interface CompactDeviceCardProps {
  device: DeviceItem;
  language: "vi" | "en";
  isBusy: boolean;
  onQuickAction: (
    e: React.MouseEvent,
    dev: DeviceItem,
    action: string,
    params?: Record<string, any>
  ) => void;
  onOpenDetail: (
    hardwareId: string,
    tab?: DetailModalTab,
    bmsTab?: BmsModalTab
  ) => void;
}

export function renderCategoryGlyph(cat: DeviceCategory, className = "w-4 h-4") {
  switch (cat) {
    case "rollerDoor":
      return <DoorOpen className={className} />;
    case "camera":
      return <Video className={className} />;
    case "energyManage":
      return <Zap className={className} />;
    case "lightSwitch":
      return <Power className={className} />;
    case "environment":
      return <Thermometer className={className} />;
    case "dataAnalytics":
      return <BarChart3 className={className} />;
    default:
      return <Lock className={className} />;
  }
}

function getCategoryAccentClasses(cat: DeviceCategory, isOnline: boolean) {
  if (!isOnline) {
    return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  }
  switch (cat) {
    case "camera":
      return "bg-cyan-500/10 text-cyan-500 border-cyan-500/20";
    case "rollerDoor":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "lightSwitch":
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    case "energyManage":
      return "bg-amber-500/10 text-amber-500 border-amber-500/20";
    case "environment":
      return "bg-teal-500/10 text-teal-500 border-teal-500/20";
    case "dataAnalytics":
      return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
    default:
      return "bg-violet-500/10 text-violet-500 border-violet-500/20";
  }
}

function MiniSocGauge({ soc }: { soc: number }) {
  const clamped = Math.max(0, Math.min(100, soc));
  const r = 24;
  const cx = 32;
  const cy = 32;
  const circumference = Math.PI * r;
  const dashOffset = circumference * (1 - clamped / 100);
  const strokeColor =
    clamped > 50 ? "#10B981" : clamped > 20 ? "#F59E0B" : "#EF4444";

  return (
    <div className="relative w-16 h-10 shrink-0 flex items-end justify-center">
      <svg viewBox="0 0 64 38" className="w-16 h-10 overflow-visible">
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="currentColor"
          className="text-black/[0.08] dark:text-white/[0.1]"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={strokeColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="absolute bottom-0 text-[12px] font-mono font-semibold tabular-nums leading-none">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

export function CompactDeviceCard({
  device: dev,
  language,
  isBusy,
  onQuickAction,
  onOpenDetail,
}: CompactDeviceCardProps) {
  const allowed = canPerformControl(dev);
  const isBms =
    dev.hardwareId.toUpperCase().includes("BMS") ||
    dev.modelCode.toUpperCase().includes("BMS");
  const isSmartMeter =
    dev.category === "energyManage" && !isBms;

  const props = dev.currentProperties || {};
  const soc = Number(props.soc_percent ?? dev.batteryPercent ?? 0);
  const totalVoltage = Number(props.total_voltage ?? dev.batteryVoltage ?? 0);
  const bmsCurrent = Number(props.current_a ?? dev.motorCurrentA ?? 0);
  const bmsPowerKw = Number(props.power_kw ?? dev.currentPowerKw ?? 0);
  const bmsTemp = Number(props.temp_c ?? dev.temperature ?? 0);
  const bmsDeltaV = Number(props.delta_v ?? 0);
  const bmsFaultsCount = Array.isArray(props.faults)
    ? props.faults.filter((f: any) => f.status !== "Đã khắc phục").length
    : 0;

  const meterKwh = Number(props.kwh ?? 0);
  const meterV = Number(props.voltage_v ?? dev.acVoltage ?? 220);
  const meterA = Number(props.current_a ?? dev.motorCurrentA ?? 0);
  const meterKw = Number(props.power_kw ?? dev.currentPowerKw ?? 0);
  const isMeterOn =
    props.is_meter_on !== undefined
      ? Boolean(props.is_meter_on)
      : props.power_status !== "OFF" && dev.isRelayOn;

  const statusText = dev.isOnline
    ? language === "vi"
      ? "Trực tuyến"
      : "Online"
    : language === "vi"
      ? "Ngoại tuyến"
      : "Offline";

  return (
    <div
      onClick={() => onOpenDetail(dev.hardwareId, "control")}
      className={`rounded-xl border p-2.5 flex flex-col gap-2 cursor-pointer transition-colors ${
        !dev.isOnline
          ? "border-rose-500/30 bg-rose-500/[0.03] dark:bg-[#191317] hover:border-rose-500/50"
          : "border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] hover:border-blue-500/45"
      }`}
    >
      {/* Unified BMS-style Preview Header: Icon + Name + Status directly vertically below Name (NO ON/OFF tags) */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${getCategoryAccentClasses(
              dev.category,
              dev.isOnline
            )}`}
          >
            {isBms ? (
              <BatteryCharging className="w-4 h-4" />
            ) : (
              renderCategoryGlyph(dev.category, "w-4 h-4")
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[13px] font-semibold leading-tight truncate text-[#11161F] dark:text-[#F3F5F8]">
              {dev.name}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  dev.isOnline ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              <span
                className={`text-[11px] font-medium leading-none ${
                  dev.isOnline
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {statusText}
              </span>
              {dev.roomName && (
                <>
                  <span className="text-[10px] text-[#7B8596]">•</span>
                  <span className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2] truncate">
                    {dev.roomName}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <span className="text-[10px] font-mono text-[#7B8596] shrink-0 pt-0.5 hidden sm:inline">
          #{dev.deviceNumber}
        </span>
      </div>

      {/* Category-specific Compact Body */}
      {dev.category === "camera" && (
        <div onClick={(e) => e.stopPropagation()}>
          <WebCameraPlayer
            hardwareId={dev.hardwareId}
            deviceName={dev.name}
            className="h-32"
            compact
            onExpandFullscreen={() => onOpenDetail(dev.hardwareId, "control")}
          />
        </div>
      )}

      {dev.category === "rollerDoor" && (
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#525D6F] dark:text-[#9BA4B2] truncate">
                {getDeviceStateSummary(dev, language)}
              </span>
              <span className="font-mono font-semibold tabular-nums text-[#11161F] dark:text-[#F3F5F8]">
                {dev.positionPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#EEF1F5] dark:bg-[#1C232E] overflow-hidden">
              <div
                className={`h-full transition-[width] duration-150 ${
                  dev.isChildLockActive
                    ? "bg-amber-500"
                    : dev.isMoving
                      ? "bg-emerald-500"
                      : "bg-blue-600"
                }`}
                style={{ width: `${dev.positionPercent}%` }}
              />
            </div>
          </div>

          {/* 4 Mobile-parity Action Buttons: Child Lock, Open, Stop, Close */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              disabled={isBusy || !dev.canChildLock}
              onClick={(e) => onQuickAction(e, dev, "TOGGLE_CHILD_LOCK")}
              title={
                dev.isChildLockActive
                  ? "Đang khóa trẻ em (bấm để mở)"
                  : "Khóa trẻ em"
              }
              className={`h-8 rounded-lg border text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 ${
                dev.isChildLockActive
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400"
                  : "bg-[#F6F7F9] dark:bg-[#1C232E] border-black/[0.06] dark:border-white/[0.06] text-[#525D6F] dark:text-[#9BA4B2] hover:text-[#11161F] dark:hover:text-white"
              }`}
            >
              {dev.isChildLockActive ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              disabled={isBusy || !allowed || dev.isChildLockActive}
              onClick={(e) => onQuickAction(e, dev, "OPEN_DOOR")}
              className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>{language === "vi" ? "Mở" : "Open"}</span>
            </button>
            <button
              type="button"
              disabled={isBusy || !allowed}
              onClick={(e) => onQuickAction(e, dev, "STOP_DOOR")}
              className="h-8 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              <span>{language === "vi" ? "Dừng" : "Stop"}</span>
            </button>
            <button
              type="button"
              disabled={isBusy || !allowed || dev.isChildLockActive}
              onClick={(e) => onQuickAction(e, dev, "CLOSE_DOOR")}
              className="h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>{language === "vi" ? "Đóng" : "Close"}</span>
            </button>
          </div>
        </div>
      )}

      {dev.category === "lightSwitch" && (
        <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] border border-black/[0.05] dark:border-white/[0.05]">
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-[#11161F] dark:text-[#F3F5F8]">
              {dev.isRelayOn
                ? language === "vi"
                  ? "Đang cấp nguồn"
                  : "Power active"
                : language === "vi"
                  ? "Đã ngắt nguồn"
                  : "Power off"}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-[#525D6F] dark:text-[#9BA4B2]">
              {dev.isRelayOn ? `${dev.powerWatt} W` : "0 W"}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={isBusy || !dev.canChildLock}
              onClick={(e) => onQuickAction(e, dev, "TOGGLE_CHILD_LOCK")}
              title={dev.isChildLockActive ? "Đang khóa trẻ em" : "Khóa trẻ em"}
              className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 ${
                dev.isChildLockActive
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-500"
                  : "bg-white dark:bg-[#151A22] border-black/[0.08] dark:border-white/[0.08] text-[#525D6F] dark:text-[#9BA4B2]"
              }`}
            >
              {dev.isChildLockActive ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              disabled={isBusy || !allowed || dev.isChildLockActive}
              onClick={(e) => onQuickAction(e, dev, "TOGGLE_RELAY")}
              className={`h-8 px-3 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 ${
                dev.isRelayOn
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-white dark:bg-[#151A22] border border-black/[0.1] dark:border-white/[0.1] hover:border-blue-500 text-[#11161F] dark:text-white"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>
                {dev.isRelayOn
                  ? language === "vi"
                    ? "Tắt"
                    : "Turn off"
                  : language === "vi"
                    ? "Bật"
                    : "Turn on"}
              </span>
            </button>
          </div>
        </div>
      )}

      {isSmartMeter && (
        <div className="space-y-2">
          <div className="rounded-lg bg-[#0D1117] border border-white/[0.08] px-2.5 py-2 font-mono tabular-nums">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-[#9BA4B2]">Điện năng</span>
              <span className="text-[14px] font-semibold text-emerald-400">
                {meterKwh.toFixed(2)}{" "}
                <span className="text-[10px] text-emerald-400/70">kWh</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1.5 mt-1.5 border-t border-white/[0.07] text-center">
              <div>
                <div className="text-[9px] text-[#7B8596]">Điện áp</div>
                <div className="text-[11px] font-semibold text-white">
                  {meterV.toFixed(1)}V
                </div>
              </div>
              <div>
                <div className="text-[9px] text-[#7B8596]">Dòng</div>
                <div className="text-[11px] font-semibold text-cyan-400">
                  {meterA.toFixed(1)}A
                </div>
              </div>
              <div>
                <div className="text-[9px] text-[#7B8596]">Công suất</div>
                <div className="text-[11px] font-semibold text-amber-400">
                  {meterKw.toFixed(2)}kW
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              disabled={isBusy || !dev.canChildLock}
              onClick={(e) => onQuickAction(e, dev, "TOGGLE_CHILD_LOCK")}
              className={`h-7 px-2 rounded-lg border text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 ${
                dev.isChildLockActive
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-500"
                  : "bg-[#F6F7F9] dark:bg-[#1C232E] border-black/[0.06] dark:border-white/[0.06] text-[#525D6F] dark:text-[#9BA4B2]"
              }`}
            >
              {dev.isChildLockActive ? (
                <Lock className="w-3 h-3" />
              ) : (
                <Unlock className="w-3 h-3" />
              )}
              <span>Khóa</span>
            </button>
            <button
              type="button"
              disabled={isBusy || !allowed || dev.isChildLockActive}
              onClick={(e) =>
                onQuickAction(e, dev, isMeterOn ? "TURN_OFF" : "TURN_ON")
              }
              className={`flex-1 h-7 px-2.5 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 ${
                isMeterOn
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                  : "bg-[#EEF1F5] dark:bg-[#1C232E] hover:bg-blue-600 hover:text-white text-[#11161F] dark:text-white"
              }`}
            >
              <Power className="w-3 h-3" />
              <span>
                {isMeterOn
                  ? language === "vi"
                    ? "Đang cấp tải • Ngắt"
                    : "Active • Cut off"
                  : language === "vi"
                    ? "Đang ngắt • Cấp tải"
                    : "Cut off • Restore"}
              </span>
            </button>
          </div>
        </div>
      )}

      {isBms && (
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] border border-black/[0.05] dark:border-white/[0.05]">
            <MiniSocGauge soc={soc} />
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 flex-1 min-w-0 font-mono tabular-nums">
              <div>
                <div className="text-[9px] text-[#7B8596]">Điện áp</div>
                <div className="text-[11px] font-semibold">
                  {totalVoltage.toFixed(1)}V
                </div>
              </div>
              <div>
                <div className="text-[9px] text-[#7B8596]">Dòng điện</div>
                <div className="text-[11px] font-semibold text-amber-500">
                  {bmsCurrent.toFixed(1)}A
                </div>
              </div>
              <div>
                <div className="text-[9px] text-[#7B8596]">Công suất</div>
                <div className="text-[11px] font-semibold text-blue-500">
                  {bmsPowerKw.toFixed(2)}kW
                </div>
              </div>
              <div>
                <div className="text-[9px] text-[#7B8596]">Nhiệt / ΔV</div>
                <div className="text-[11px] font-semibold truncate">
                  {bmsTemp.toFixed(0)}°C · {bmsDeltaV.toFixed(3)}V
                </div>
              </div>
            </div>
          </div>

          {/* 4 BMS Quick Launcher Buttons matching Mobile BMS preview */}
          <div
            className="grid grid-cols-4 gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onOpenDetail(dev.hardwareId, "control", "cells")}
              className="h-7 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] hover:bg-blue-600 hover:text-white border border-black/[0.06] dark:border-white/[0.06] text-[10px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Grid2x2 className="w-3 h-3" />
              <span>16 Cell</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenDetail(dev.hardwareId, "control", "chart")}
              className="h-7 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] hover:bg-blue-600 hover:text-white border border-black/[0.06] dark:border-white/[0.06] text-[10px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Activity className="w-3 h-3" />
              <span>Biểu đồ</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenDetail(dev.hardwareId, "control", "faults")}
              className={`h-7 rounded-lg border text-[10px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                bmsFaultsCount > 0
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-600 hover:text-white"
                  : "bg-[#F6F7F9] dark:bg-[#1C232E] border-black/[0.06] dark:border-white/[0.06] hover:bg-blue-600 hover:text-white"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Sự cố{bmsFaultsCount > 0 ? ` (${bmsFaultsCount})` : ""}</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenDetail(dev.hardwareId, "control", "config")}
              className="h-7 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] hover:bg-blue-600 hover:text-white border border-black/[0.06] dark:border-white/[0.06] text-[10px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Settings className="w-3 h-3" />
              <span>Cài đặt</span>
            </button>
          </div>
        </div>
      )}

      {dev.category === "environment" && (
        <div className="grid grid-cols-3 gap-1.5 font-mono tabular-nums text-center">
          <div className="py-1.5 px-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
            <div className="text-[9px] text-[#7B8596]">Nhiệt độ</div>
            <div className="text-[12px] font-semibold">
              {dev.temperature.toFixed(1)}°C
            </div>
          </div>
          <div className="py-1.5 px-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
            <div className="text-[9px] text-[#7B8596]">Độ ẩm</div>
            <div className="text-[12px] font-semibold text-cyan-500">
              {dev.humidity.toFixed(0)}%
            </div>
          </div>
          <div className="py-1.5 px-2 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
            <div className="text-[9px] text-[#7B8596]">AQI</div>
            <div className="text-[12px] font-semibold text-emerald-500">
              {dev.airQualityAqi}
            </div>
          </div>
        </div>
      )}

      {dev.category === "othersControl" && (
        <div className="flex items-center justify-between gap-1.5">
          <button
            type="button"
            disabled={isBusy || !allowed}
            onClick={(e) => onQuickAction(e, dev, "UNLOCK")}
            className={`flex-1 h-7 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 ${
              !dev.isLocked
                ? "bg-emerald-600 text-white"
                : "bg-[#F6F7F9] dark:bg-[#1C232E] hover:bg-emerald-600 hover:text-white"
            }`}
          >
            <Unlock className="w-3 h-3" />
            <span>{language === "vi" ? "Mở khóa" : "Unlock"}</span>
          </button>
          <button
            type="button"
            disabled={isBusy || !allowed}
            onClick={(e) => onQuickAction(e, dev, "LOCK")}
            className={`flex-1 h-7 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-40 ${
              dev.isLocked
                ? "bg-blue-600 text-white"
                : "bg-[#F6F7F9] dark:bg-[#1C232E] hover:bg-blue-600 hover:text-white"
            }`}
          >
            <Lock className="w-3 h-3" />
            <span>{language === "vi" ? "Khóa lại" : "Lock"}</span>
          </button>
        </div>
      )}

      {dev.category === "dataAnalytics" && (
        <div className="px-2.5 py-1.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] flex items-center justify-between text-[11px]">
          <span className="text-[#525D6F] dark:text-[#9BA4B2]">Trạng thái AI</span>
          <span className="font-mono font-semibold text-indigo-500">
            {dev.aiStatus}
          </span>
        </div>
      )}

      {/* Unified Compact Footer: Chi tiết / Lịch sử / Cài đặt (hidden for BMS since BMS has 4 dedicated buttons above, or compact link row) */}
      {!isBms && (
        <div
          className="pt-1.5 border-t border-black/[0.06] dark:border-white/[0.06] grid grid-cols-3 gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => onOpenDetail(dev.hardwareId, "control")}
            className="h-6 rounded-md text-[11px] font-medium text-[#525D6F] dark:text-[#9BA4B2] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/[0.08] flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Sliders className="w-3 h-3" />
            <span>{language === "vi" ? "Chi tiết" : "Detail"}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenDetail(dev.hardwareId, "history")}
            className="h-6 rounded-md text-[11px] font-medium text-[#525D6F] dark:text-[#9BA4B2] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/[0.08] flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <History className="w-3 h-3" />
            <span>{language === "vi" ? "Lịch sử" : "History"}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenDetail(dev.hardwareId, "settings")}
            className="h-6 rounded-md text-[11px] font-medium text-[#525D6F] dark:text-[#9BA4B2] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/[0.08] flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Settings className="w-3 h-3" />
            <span>{language === "vi" ? "Cài đặt" : "Settings"}</span>
          </button>
        </div>
      )}
    </div>
  );
}

