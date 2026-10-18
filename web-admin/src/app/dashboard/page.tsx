"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLanguage } from "../../context/LanguageContext";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";
import { DeviceGeoMap } from "../../components/DeviceGeoMap";
import { 
  Radio, 
  AlertTriangle, 
  Headphones, 
  Layers, 
  Cpu, 
  Sliders, 
  Box, 
  FileSpreadsheet, 
  CheckCircle2, 
  ArrowUpRight,
  RefreshCw,
  TrendingUp,
  MapPin,
  ShieldCheck,
  Activity,
  Server,
  Zap,
  Globe2,
  Package,
  Power,
  Clock
} from "lucide-react";

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { canView } = usePermissions();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const formatNum = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  // Device fleet numbers: ON / OFF / TỒN KHO
  const stats = {
    total: 10950,
    online: 10315,
    offline: 95,
    inStock: 540,
    onlinePct: "94.2%",
    offlinePct: "0.8%",
    inStockPct: "5.0%",
  };

  // RBAC Gating
  if (!canView("mod_dash")) {
    return (
      <AccessDenied 
        moduleName="Dashboard Giám Sát Thời Gian Thực"
        requiredModule="mod_dash"
      />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2 overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {language === "vi" ? "Bảng Điều Khiển Giám Sát Thiết Bị Tập Trung" : "Real-Time Telemetry Dashboard"}
          </h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            MQTT Live Sync &lt; 0.5s
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-500" : "text-slate-400"}`} />
            <span>{isRefreshing ? (language === "vi" ? "Đang đồng bộ..." : "Syncing...") : (language === "vi" ? "Làm mới dữ liệu" : "Refresh Data")}</span>
          </button>

          <Link
            href="/devices?tab=import"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 dark:bg-cyan-600 text-white hover:bg-slate-800 dark:hover:bg-cyan-500 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{language === "vi" ? "Nhập kho Excel" : "Import Batch"}</span>
          </Link>
        </div>
      </div>

      {/* Scrollable Dashboard Body */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1">
        {/* ============================================================== */}
        {/* KHỐI 1: TỔNG QUAN 4 DÒNG TRẠNG THÁI + BIỂU ĐỒ TRÒN + BIỂU ĐỒ CỘT */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
          {/* CỘT 1: KHỐI 4 DÒNG TỔNG QUAN TRẠNG THÁI (4 COLS) */}
          <div className="lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-500" />
                <span>Trạng Thái Thiết Bị Toàn Mạng</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {formatNum(stats.total)} TB
              </span>
            </div>

            {/* 4 compact rows */}
            <div className="space-y-1.5 my-2 text-xs">
              {/* Dòng 1: Online */}
              <Link
                href="/devices?tab=list&status=online"
                className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 hover:border-emerald-500/40 flex items-center justify-between transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-semibold text-emerald-800 dark:text-emerald-300">Trực Tuyến (Online)</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatNum(stats.online)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">{stats.onlinePct}</span>
                </div>
              </Link>

              {/* Dòng 2: Offline */}
              <Link
                href="/devices?tab=list&status=offline"
                className="p-2 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-500/20 hover:border-rose-500/40 flex items-center justify-between transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="font-semibold text-rose-800 dark:text-rose-300">Ngoại Tuyến (Offline)</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-rose-700 dark:text-rose-300">{formatNum(stats.offline)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold">{stats.offlinePct}</span>
                </div>
              </Link>

              {/* Dòng 3: Tồn kho */}
              <Link
                href="/devices?tab=list&status=in_stock"
                className="p-2 rounded-lg bg-sky-50/50 dark:bg-sky-950/20 border border-sky-500/20 hover:border-sky-500/40 flex items-center justify-between transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  <span className="font-semibold text-sky-800 dark:text-sky-300">Tồn Kho (In Stock)</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-sky-700 dark:text-sky-300">{formatNum(stats.inStock)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-700 dark:text-sky-300 font-bold">{stats.inStockPct}</span>
                </div>
              </Link>

              {/* Dòng 4: SLA */}
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Độ Sẵn Sàng (SLA)</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-slate-900 dark:text-white">99.2%</span>
                  <span className="text-[10px] text-slate-400">142ms</span>
                </div>
              </div>
            </div>

            {/* Visual Mini Progress Bar */}
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: stats.onlinePct }} title="Online"></div>
              <div className="bg-rose-500 h-full" style={{ width: stats.offlinePct }} title="Offline"></div>
              <div className="bg-sky-500 h-full" style={{ width: stats.inStockPct }} title="Tồn kho"></div>
            </div>
          </div>

          {/* CỘT 2: BIỂU ĐỒ TRÒN (DONUT CHART) PHÂN BỔ TRẠNG THÁI (4 COLS) */}
          <div className="lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-500" />
                <span>Biểu Đồ Tròn Tỷ Lệ Toàn Mạng</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Live Donut
              </span>
            </div>

            <div className="flex items-center justify-around py-1 gap-2">
              {/* SVG Donut Chart */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  {/* Background Track */}
                  <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-100 dark:text-slate-800" />
                  {/* Online Segment: 94.2% of 289 = 272.2 */}
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray="272.2 289"
                    strokeDashoffset="0"
                    className="transition-all duration-700"
                  />
                  {/* Stock Segment: 5.0% of 289 = 14.5 */}
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="12"
                    strokeDasharray="14.5 289"
                    strokeDashoffset="-272.2"
                    className="transition-all duration-700"
                  />
                  {/* Offline Segment: 0.8% of 289 = 2.3 */}
                  <circle
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="12"
                    strokeDasharray="2.3 289"
                    strokeDashoffset="-286.7"
                    className="transition-all duration-700"
                  />
                </svg>
                {/* Center Value */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-white leading-none">94.2%</span>
                  <span className="text-[9px] text-slate-400 mt-0.5 font-medium">Online</span>
                </div>
              </div>

              {/* Donut Legend */}
              <div className="space-y-1.5 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                    <span className="text-slate-600 dark:text-slate-300">Online</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">10,315 ({stats.onlinePct})</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-500"></span>
                    <span className="text-slate-600 dark:text-slate-300">Tồn kho</span>
                  </div>
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">540 ({stats.inStockPct})</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
                    <span className="text-slate-600 dark:text-slate-300">Offline</span>
                  </div>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">95 ({stats.offlinePct})</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 dark:border-slate-800 pt-1 font-mono">
              Chu kỳ quét viễn thám: 30s/lần
            </div>
          </div>

          {/* CỘT 3: BIỂU ĐỒ CỘT PHÂN BỔ THEO NHÓM DÒNG MÁY (4 COLS) */}
          <div className="lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-500" />
                <span>Phân Bổ Theo Dòng Sản Phẩm</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">5 Nhóm</span>
            </div>

            {/* Horizontal Bar Breakdown for 5 Product Groups */}
            <div className="space-y-2 py-1 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Cửa cuốn nhôm Đức (Titadoor)</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">5,570 TB (99.4%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  <div className="bg-emerald-500 h-full w-[99.4%]"></div>
                  <div className="bg-rose-500 h-full w-[0.6%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Lưu điện AC 220V Sóng Sin</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">2,300 TB (99.5%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  <div className="bg-emerald-500 h-full w-[99.5%]"></div>
                  <div className="bg-rose-500 h-full w-[0.5%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Cửa cuốn tấm liền Úc</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">1,750 TB (99.0%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  <div className="bg-emerald-500 h-full w-[99.0%]"></div>
                  <div className="bg-rose-500 h-full w-[1.0%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Khóa thông minh Masaru</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">890 TB (99.2%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  <div className="bg-emerald-500 h-full w-[99.2%]"></div>
                  <div className="bg-rose-500 h-full w-[0.8%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">GSHT &amp; Xe máy điện</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">440 TB (98.4%)</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                  <div className="bg-emerald-500 h-full w-[98.4%]"></div>
                  <div className="bg-rose-500 h-full w-[1.6%]"></div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-right border-t border-slate-100 dark:border-slate-800 pt-1 font-mono">
              Tổng 100% đạt chuẩn chất lượng
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PHẦN 2: BẢN ĐỒ PHÂN BỐ CỤM THIẾT BỊ SỬ DỤNG LEAFLET MAP */}
        {/* ============================================================== */}
        <DeviceGeoMap />

        {/* ============================================================== */}
        {/* PHẦN 3: SỨC KHỎE HẠ TẦNG, CẢNH BÁO KỸ THUẬT & SLA */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 pb-2">
          {/* Cảnh báo kỹ thuật khẩn cấp (7 cols) */}
          <div className="lg:col-span-7 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Cảnh Báo Kỹ Thuật Khẩn Cấp (Realtime Alerts)</span>
              </span>
              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                12 Thiết Bị Cần Kiểm Tra
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="p-2 rounded-md border border-rose-500/20 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="font-mono text-rose-600 dark:text-rose-400">AT-DOOR-33019F</span>
                    <span>• Cửa Cuốn Gara Đức Mạnh (Hà Nội)</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dòng điện động cơ tăng vọt 4.8A (Ngưỡng an toàn &lt; 4.0A). Nghi vấn kẹt ray trượt.
                  </span>
                </div>
                <Link
                  href="/cskh"
                  className="px-2 py-1 rounded text-[10px] font-bold bg-rose-600 text-white shrink-0"
                >
                  Xử lý CSKH ➔
                </Link>
              </div>

              <div className="p-2 rounded-md border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="font-mono text-amber-600 dark:text-amber-400">UPS-220V-99411E</span>
                    <span>• Bộ Lưu Điện Chợ Lớn (TP.HCM)</span>
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ắc quy báo dung lượng pin dưới 15%. Cần kiểm tra chu kỳ sạc xả tự động.
                  </span>
                </div>
                <Link
                  href="/devices?tab=list&search=UPS-220V-99411E"
                  className="px-2 py-1 rounded text-[10px] font-bold bg-amber-600 text-white shrink-0"
                >
                  Soi viễn thám ➔
                </Link>
              </div>
            </div>
          </div>

          {/* SLA Hạ Tầng IoT & Broker MQTT (5 cols) */}
          <div className="lg:col-span-5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-500" />
                <span>Hạ Tầng Broker & SLA</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                MQTT TLS: ONLINE
              </span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Độ trễ trung bình:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">142 ms (SLA &lt; 250ms)</span>
              </div>
              <div className="flex justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Thông điệp viễn thám hôm nay:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">14,295 msg / 24h</span>
              </div>
              <div className="flex justify-between p-1.5 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Mã hóa SHA-256 Hộp Đen:</span>
                <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">100% Immutable Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
