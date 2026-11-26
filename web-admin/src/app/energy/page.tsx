"use client";

import React, { useState } from "react";
import { useCustomerIoT } from "@/customer/context/CustomerIoTContext";
import { DeviceDetailModal } from "@/customer/components/DeviceDetailModal";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Zap, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function CustomerEnergyDashboardPage() {
  const { getDevicesByCategory, sendCommand } = useCustomerIoT();
  const energyDevices = getDevicesByCategory("energyManage");

  const meterDevice =
    energyDevices.find(
      (d) =>
        d.hardwareId.toUpperCase().includes("SMARTMETTER") ||
        d.modelCode.includes("SmartMetter")
    ) || energyDevices[0];

  const bmsDevice =
    energyDevices.find(
      (d) =>
        d.hardwareId.toUpperCase().includes("BMS") ||
        d.modelCode.toUpperCase().includes("BMS")
    ) || energyDevices[1];

  const [powerLimitW, setPowerLimitW] = useState<number>(
    Number(meterDevice?.currentProperties?.power_limit_w ?? 4500)
  );
  const [isBusy, setIsBusy] = useState(false);
  const [detailHwId, setDetailHwId] = useState<string | null>(null);

  const runAction = async (
    hwId: string,
    action: string,
    params?: Record<string, any>
  ) => {
    setIsBusy(true);
    try {
      const res = await sendCommand(hwId, action, params);
      res.success ? toast.success(res.message) : toast.error(res.message);
    } finally {
      setIsBusy(false);
    }
  };

  const bmsCells: Array<{
    cell: number;
    v: number;
    a: number;
    r: number;
    status: string;
  }> = Array.isArray(bmsDevice?.currentProperties?.cells)
    ? bmsDevice.currentProperties.cells
    : [];

  const loadHistory = [
    { time: "00:00", kw: 1.05, soc: 98 },
    { time: "04:00", kw: 0.85, soc: 96 },
    { time: "08:00", kw: 2.35, soc: 92 },
    { time: "12:00", kw: 3.65, soc: 89 },
    { time: "16:00", kw: 2.8, soc: 93 },
    { time: "20:00", kw: 3.45, soc: 95 },
    {
      time: "Hiện tại",
      kw: Number(meterDevice?.currentProperties?.power_kw ?? 2.73),
      soc: Number(bmsDevice?.currentProperties?.soc_percent ?? 95),
    },
  ];

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
      {/* Top Energy Toolbar */}
      <div className="shrink-0 p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-500/12 text-amber-500 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">
              Quản lý năng lượng & lưu trữ Pin BMS 16S
            </h1>
            <p className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2]">
              Giám sát đồng thời công tơ điện tử SmartMetter và hệ thống pin Lithium 16S
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {energyDevices.map((dev) => (
            <button
              key={dev.hardwareId}
              type="button"
              onClick={() => setDetailHwId(dev.hardwareId)}
              className="h-7 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] hover:border-blue-500 text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <span>{dev.name}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Inner Energy Workspace */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-3">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          {/* Left: SmartMetter Pro Panel */}
          {meterDevice && (
            <div className="xl:col-span-5 p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-col justify-between gap-3">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold truncate">
                      {meterDevice.name}
                    </h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          meterDevice.isOnline ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      <span
                        className={`text-[11px] font-medium ${
                          meterDevice.isOnline
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-500"
                        }`}
                      >
                        {meterDevice.isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                      </span>
                      <span className="text-[11px] font-mono text-[#7B8596]">
                        · {meterDevice.hardwareId}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailHwId(meterDevice.hardwareId)}
                    className="text-xs font-medium text-blue-500 hover:underline cursor-pointer shrink-0"
                  >
                    Chi tiết
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-[#0D1015] border border-white/[0.08] flex items-center justify-between font-mono tabular-nums">
                  <div>
                    <span className="text-[10px] text-[#9BA4B2] block">
                      Điện năng tích lũy
                    </span>
                    <span className="text-xl font-semibold text-emerald-400">
                      {Number(meterDevice.currentProperties?.kwh ?? 123.45).toFixed(2)}{" "}
                      kWh
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#9BA4B2] block">
                      Công suất tức thời
                    </span>
                    <span className="text-lg font-semibold text-amber-400">
                      {Number(meterDevice.currentProperties?.power_kw ?? 2.73).toFixed(2)}{" "}
                      kW
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center font-mono tabular-nums">
                  <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                    <span className="text-[10px] text-[#7B8596] block">
                      Điện áp (U)
                    </span>
                    <span className="text-xs font-semibold">
                      {meterDevice.currentProperties?.voltage_v ?? 220.5} V
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                    <span className="text-[10px] text-[#7B8596] block">
                      Dòng tải (I)
                    </span>
                    <span className="text-xs font-semibold text-blue-500">
                      {meterDevice.currentProperties?.current_a ?? 12.4} A
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E]">
                    <span className="text-[10px] text-[#7B8596] block">
                      Ngưỡng cắt
                    </span>
                    <span className="text-xs font-semibold text-amber-500">
                      {meterDevice.currentProperties?.power_limit_w ?? powerLimitW} W
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">Giới hạn công suất an toàn</span>
                    <span className="font-mono font-semibold text-amber-500 tabular-nums">
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
                        runAction(meterDevice.hardwareId, "CONFIG_POWER_LIMIT", {
                          power_limit: powerLimitW,
                          power_limit_w: powerLimitW,
                        })
                      }
                      className="h-7 px-3 rounded-md bg-blue-600 text-white text-xs font-medium cursor-pointer"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => runAction(meterDevice.hardwareId, "TURN_ON")}
                  className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium cursor-pointer"
                >
                  Bật công tơ
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    if (window.confirm("Ngắt rơ-le nguồn điện công tơ tổng?")) {
                      runAction(meterDevice.hardwareId, "TURN_OFF");
                    }
                  }}
                  className="h-8 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium cursor-pointer"
                >
                  Ngắt công tơ
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => runAction(meterDevice.hardwareId, "RESET")}
                  className="h-8 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium cursor-pointer"
                >
                  Reset lỗi
                </button>
              </div>
            </div>
          )}

          {/* Right: BMS 16S 150A Matrix */}
          {bmsDevice && (
            <div className="xl:col-span-7 p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">{bmsDevice.name}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        bmsDevice.isOnline ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    <span
                      className={`text-[11px] font-medium ${
                        bmsDevice.isOnline
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-500"
                      }`}
                    >
                      {bmsDevice.isOnline ? "Trực tuyến" : "Ngoại tuyến"}
                    </span>
                    <span className="text-[11px] font-mono text-[#7B8596]">
                      · {bmsDevice.hardwareId}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/12 text-emerald-500 font-medium">
                    SoC {bmsDevice.currentProperties?.soc_percent ?? 95}%
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-600/12 text-blue-500 font-medium">
                    {bmsDevice.currentProperties?.total_voltage ?? 52.8}V
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/12 text-amber-500 font-medium">
                    {bmsDevice.currentProperties?.current_a ?? -68.5}A
                  </span>
                  <button
                    type="button"
                    onClick={() => setDetailHwId(bmsDevice.hardwareId)}
                    className="text-blue-500 hover:underline font-sans font-medium cursor-pointer"
                  >
                    Chi tiết
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono tabular-nums">
                {bmsCells.map((c) => (
                  <div
                    key={c.cell}
                    className={`p-2 rounded-lg border ${
                      c.status === "WARN"
                        ? "border-amber-500/50 bg-amber-500/10"
                        : "border-black/[0.06] dark:border-white/[0.06] bg-[#F6F7F9] dark:bg-[#1C232E]"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-semibold">
                        Cell #{String(c.cell).padStart(2, "0")}
                      </span>
                      <span
                        className={
                          c.status === "WARN"
                            ? "text-amber-500"
                            : "text-emerald-500"
                        }
                      >
                        {c.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-blue-500 mt-0.5">
                      {Number(c.v).toFixed(3)} V
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#7B8596]">
                      <span>{c.a}A</span>
                      <span>{c.r}mΩ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Combined Analytics Chart */}
        <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold">
              Biểu đồ phụ tải tiêu thụ (kW) & dung lượng pin lưu trữ (SoC %)
            </h3>
            <span className="text-[11px] font-mono text-[#7B8596]">
              Chu kỳ 24 giờ
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={loadHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252D3A" />
                <XAxis dataKey="time" stroke="#9BA4B2" fontSize={11} />
                <YAxis stroke="#9BA4B2" fontSize={11} />
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
                  name="Công suất tải (kW)"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.18}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <DeviceDetailModal
        hardwareId={detailHwId}
        onClose={() => setDetailHwId(null)}
      />
    </div>
  );
}
