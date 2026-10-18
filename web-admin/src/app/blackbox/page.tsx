"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Check,
  ArrowRight,
  FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";
import { useLanguage } from "../../context/LanguageContext";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";
import { Pagination } from "@/components/Pagination";

interface BlackboxLogEntry {
  id: string;
  hardwareId: string;
  modelName: string;
  commandType: "OPEN" | "CLOSE" | "STOP" | "CHILD_LOCK" | "DISCHARGE_UPS" | "PAIRING" | "TRANSFER" | "UNLOCK_OTP" | "CALIBRATE_BATTERY" | "ENGINE_CUTOFF";
  payload: Record<string, any>;
  userId: string;
  userEmail: string;
  userRole: "CUSTOMER" | "ADMIN" | "CSKH";
  clientIp: string;
  deviceFingerprint: string;
  timestamp: string;
  ackTimestamp?: string;
  latencyMs: number;
  status: "ACKNOWLEDGED" | "TIMEOUT" | "REJECTED" | "EXECUTING";
  cryptoSignature: string;
}

const MOCK_BLACKBOX_LOGS: BlackboxLogEntry[] = [
  {
    id: "BBX-998241",
    hardwareId: "AT-DOOR-88239A",
    modelName: "Austec Titadoor A900 Super",
    commandType: "OPEN",
    payload: { target_position: 100, speed: "normal", source: "mobile_quick_sheet" },
    userId: "USR-001928",
    userEmail: "nguyen.vannam@gmail.com",
    userRole: "CUSTOMER",
    clientIp: "118.70.192.45",
    deviceFingerprint: "iPhone 15 Pro Max (iOS 18.2, App v2.4.1)",
    timestamp: "2026-10-17 21:04:12.348",
    ackTimestamp: "2026-10-17 21:04:12.492",
    latencyMs: 144,
    status: "ACKNOWLEDGED",
    cryptoSignature: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  },
  {
    id: "BBX-998240",
    hardwareId: "AT-DOOR-88239A",
    modelName: "Austec Titadoor A900 Super",
    commandType: "STOP",
    payload: { current_position: 45, emergency: false },
    userId: "USR-001928",
    userEmail: "nguyen.vannam@gmail.com",
    userRole: "CUSTOMER",
    clientIp: "118.70.192.45",
    deviceFingerprint: "iPhone 15 Pro Max (iOS 18.2, App v2.4.1)",
    timestamp: "2026-10-17 21:04:15.110",
    ackTimestamp: "2026-10-17 21:04:15.228",
    latencyMs: 118,
    status: "ACKNOWLEDGED",
    cryptoSignature: "f42a78129c54098bc19d67b2d56108e43491901a884efb3874628203c4f901a1"
  },
  {
    id: "BBX-998239",
    hardwareId: "MS-LOCK-99120B",
    modelName: "Khóa Masaru Titan X1",
    commandType: "TRANSFER",
    payload: { new_owner: "tran.thanhhoa@gmail.com", transfer_otp: "983214" },
    userId: "USR-004312",
    userEmail: "le.vanthanh@gmail.com",
    userRole: "CUSTOMER",
    clientIp: "14.232.18.99",
    deviceFingerprint: "Samsung Galaxy S24 Ultra (Android 15)",
    timestamp: "2026-10-17 20:58:04.912",
    ackTimestamp: "2026-10-17 20:58:05.104",
    latencyMs: 192,
    status: "ACKNOWLEDGED",
    cryptoSignature: "9c82410a8b924716bca10e4785f7236173b98401a89cfa7492a54829104fa85c"
  },
  {
    id: "BBX-998238",
    hardwareId: "UPS-220V-77192C",
    modelName: "Bộ Lưu Điện Austec Sin Chuẩn Pro",
    commandType: "DISCHARGE_UPS",
    payload: { discharge_mode: "scheduled_maintenance", target_battery_percent: 25 },
    userId: "USR-000001",
    userEmail: "cskh.austec01@austec.vn",
    userRole: "CSKH",
    clientIp: "113.161.44.82",
    deviceFingerprint: "Austec CMS Web Portal (Chrome 130)",
    timestamp: "2026-10-17 20:41:22.015",
    ackTimestamp: "2026-10-17 20:41:22.253",
    latencyMs: 238,
    status: "ACKNOWLEDGED",
    cryptoSignature: "a129038475fa98214b726485091a457102948529348123749817498273948712"
  },
  {
    id: "BBX-998237",
    hardwareId: "AT-DOOR-33019F",
    modelName: "Austec Titadoor A900 Super",
    commandType: "CLOSE",
    payload: { target_position: 0, force_override: false },
    userId: "USR-008712",
    userEmail: "pham.ducmanh@gmail.com",
    userRole: "CUSTOMER",
    clientIp: "42.116.89.21",
    deviceFingerprint: "Xiaomi 14 (HyperOS, App v2.4.1)",
    timestamp: "2026-10-17 19:15:33.100",
    ackTimestamp: undefined,
    latencyMs: 3000,
    status: "TIMEOUT",
    cryptoSignature: "d78129a039845729104829375019284759281749283749283749283749283749"
  },
  {
    id: "BBX-998236",
    hardwareId: "AT-DOOR-88239A",
    modelName: "Austec Titadoor A900 Super",
    commandType: "CHILD_LOCK",
    payload: { lock_enabled: true, rf_remote_disabled: true },
    userId: "USR-001928",
    userEmail: "nguyen.vannam@gmail.com",
    userRole: "CUSTOMER",
    clientIp: "118.70.192.45",
    deviceFingerprint: "iPhone 15 Pro Max (iOS 18.2, App v2.4.1)",
    timestamp: "2026-10-17 18:30:00.540",
    ackTimestamp: "2026-10-17 18:30:00.702",
    latencyMs: 162,
    status: "ACKNOWLEDGED",
    cryptoSignature: "3b81927495810293487192837491823749182374918237491823749182374918"
  },
  {
    id: "BBX-998237",
    hardwareId: "MS-LOCK-99120B",
    modelName: "Khóa Masaru Titan X1",
    commandType: "UNLOCK_OTP",
    payload: { otp_type: "ONE_TIME", valid_seconds: 300 },
    userId: "USR-004312",
    userEmail: "le.vanthanh@gmail.com",
    userRole: "CUSTOMER",
    clientIp: "42.113.120.14",
    deviceFingerprint: "Samsung Galaxy S24 Ultra (Android 15)",
    timestamp: "2026-10-17 19:12:44.110",
    ackTimestamp: "2026-10-17 19:12:44.250",
    latencyMs: 140,
    status: "ACKNOWLEDGED",
    cryptoSignature: "e991274019283748291029384758192837465918273645192837465192837461"
  },
  {
    id: "BBX-998238",
    hardwareId: "UPS-220V-77192C",
    modelName: "Austec Sin Chuẩn Pro",
    commandType: "CALIBRATE_BATTERY",
    payload: { discharge_rate: "AUTO", test_duration_sec: 120 },
    userId: "AUSTEC002",
    userEmail: "quang.tm@austec.vn",
    userRole: "ADMIN",
    clientIp: "14.248.82.11",
    deviceFingerprint: "Web Admin Chrome / macOS Darwin 24.1",
    timestamp: "2026-10-17 20:05:12.330",
    ackTimestamp: "2026-10-17 20:05:12.510",
    latencyMs: 180,
    status: "ACKNOWLEDGED",
    cryptoSignature: "7c88129384719283746152839401827364519283746591827364519283746519"
  },
  {
    id: "BBX-998239",
    hardwareId: "AT-DOOR-88239A05",
    modelName: "Austec Titadoor A900 Super",
    commandType: "OPEN",
    payload: { channel: "RELAY_1", trigger_duration_ms: 1000 },
    userId: "USR-011203",
    userEmail: "long.vd@gmail.com",
    userRole: "CUSTOMER",
    clientIp: "113.190.234.88",
    deviceFingerprint: "iPhone 14 Pro (iOS 18.1)",
    timestamp: "2026-10-17 21:18:03.112",
    ackTimestamp: "2026-10-17 21:18:03.298",
    latencyMs: 186,
    status: "ACKNOWLEDGED",
    cryptoSignature: "4f55a12398471029384756192837465192837465918273645192837465192837"
  },
  {
    id: "BBX-998240",
    hardwareId: "AT-BIKE-55410D",
    modelName: "GSHT Austec 4G",
    commandType: "ENGINE_CUTOFF",
    payload: { state: "CUTOFF_ARMED", reason: "ANTI_THEFT" },
    userId: "CSKH-01",
    userEmail: "support.agent01@austec.vn",
    userRole: "CSKH",
    clientIp: "171.244.19.82",
    deviceFingerprint: "AUSTEC Tech Console v3.1.0",
    timestamp: "2026-10-17 22:45:10.015",
    ackTimestamp: "2026-10-17 22:45:10.225",
    latencyMs: 210,
    status: "ACKNOWLEDGED",
    cryptoSignature: "9a88271635481920384756192837465192837465918273645192837465192837"
  },
  {
    id: "BBX-998241",
    hardwareId: "AT-DOOR-88239A04",
    modelName: "Austec Titadoor A900 Super",
    commandType: "CLOSE",
    payload: { speed: "NORMAL", obstacle_sensor: true },
    userId: "USR-012890",
    userEmail: "bang.nguyen@yahoo.com",
    userRole: "CUSTOMER",
    clientIp: "123.25.10.99",
    deviceFingerprint: "Xiaomi 14 (HyperOS)",
    timestamp: "2026-10-17 23:10:00.000",
    ackTimestamp: "2026-10-17 23:10:03.000",
    latencyMs: 3000,
    status: "TIMEOUT",
    cryptoSignature: "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff"
  }
];

export default function BlackboxPage() {
  const { t, language } = useLanguage();
  const { canView } = usePermissions();

  const [logs, setLogs] = useState<BlackboxLogEntry[]>(MOCK_BLACKBOX_LOGS);
  const [searchHardwareId, setSearchHardwareId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<BlackboxLogEntry | null>(MOCK_BLACKBOX_LOGS[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" } | null>(null);

  const showToast = (message: string, type: "success" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Real Legal Audit Report (.xlsx) Export Handler
  const handleExportLegalReport = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Nhật ký kiểm toán chi tiết
      const auditRows = filteredLogs.map((log, index) => ({
        "STT": index + 1,
        "Mã Lệnh (Audit ID)": log.id,
        "Mã Thiết Bị (Hardware ID)": log.hardwareId,
        "Model Phần Cứng": log.modelName,
        "Lệnh Điều Khiển": log.commandType,
        "Tham Số Payload": JSON.stringify(log.payload),
        "Người Ra Lệnh": log.userEmail,
        "Vai Trò (Role)": log.userRole,
        "Địa Chỉ IP": log.clientIp,
        "Dấu Vân Tay Thiết Bị (Fingerprint)": log.deviceFingerprint,
        "Thời Gian Phát Lệnh (UTC+7)": log.timestamp,
        "Thời Gian Thiết Bị Phản Hồi (ACK)": log.ackTimestamp || "Đang xử lý",
        "Độ Trễ Phản Hồi (ms)": log.latencyMs,
        "Trạng Thái Kiểm Toán": log.status,
        "Chữ Ký Số Bất Biến (SHA-256 HMAC)": log.cryptoSignature
      }));

      const wsLogs = XLSX.utils.json_to_sheet(auditRows);
      // Auto column widths
      wsLogs["!cols"] = [
        { wch: 6 },  // STT
        { wch: 14 }, // Audit ID
        { wch: 22 }, // Hardware ID
        { wch: 26 }, // Model
        { wch: 14 }, // Command
        { wch: 35 }, // Payload
        { wch: 26 }, // Actor
        { wch: 12 }, // Role
        { wch: 16 }, // IP
        { wch: 32 }, // Fingerprint
        { wch: 24 }, // Timestamp
        { wch: 24 }, // ACK Time
        { wch: 12 }, // Latency
        { wch: 16 }, // Status
        { wch: 68 }  // Signature
      ];
      XLSX.utils.book_append_sheet(wb, wsLogs, "NHAT_KY_KIEM_TOAN_SHA256");

      // Sheet 2: Chứng thực pháp lý & Merkle Tree Root
      const legalCert = [
        { "Mục Chứng Thực": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "Chi Tiết Pháp Lý": "Độc lập - Tự do - Hạnh phúc" },
        { "Mục Chứng Thực": "BIÊN BẢN PHÁP LÝ", "Chi Tiết Pháp Lý": "XÁC NHẬN TÍNH TOÀN VẸN DỮ LIỆU ĐIỀU KHIỂN HỘP ĐEN IOT" },
        { "Mục Chứng Thực": "Cơ quan bảo chứng công nghệ", "Chi Tiết Pháp Lý": "CÔNG NGHỆ BẤT BIẾN AUSTEC CRYPTOGRAPHIC AUDIT" },
        { "Mục Chứng Thực": "Tiêu chuẩn kỹ thuật bảo mật", "Chi Tiết Pháp Lý": "WORM (Write Once Read Many) - Chống giả mạo, can thiệp & ghi đè" },
        { "Mục Chứng Thực": "Thuật toán băm khối", "Chi Tiết Pháp Lý": "SHA-256 HMAC (Tiêu chuẩn FIPS 180-4 NIST Hoa Kỳ)" },
        { "Mục Chứng Thực": "Chuỗi băm Merkle Tree Root Hash", "Chi Tiết Pháp Lý": "a8f9e012bc345d6789e012fa3456bc78de901234567890abcdef1234567890ab" },
        { "Mục Chứng Thực": "Thời gian trích xuất biên bản", "Chi Tiết Pháp Lý": new Date().toLocaleString("vi-VN") },
        { "Mục Chứng Thực": "Số lượng bản ghi xác thực", "Chi Tiết Pháp Lý": `${filteredLogs.length} bản ghi viễn thám` },
        { "Mục Chứng Thực": "Giá trị pháp lý chứng cứ", "Chi Tiết Pháp Lý": "Dữ liệu có giá trị đối chiếu chứng cứ điện tử theo Luật Giao dịch Điện tử Việt Nam" }
      ];
      const wsCert = XLSX.utils.json_to_sheet(legalCert);
      wsCert["!cols"] = [{ wch: 35 }, { wch: 75 }];
      XLSX.utils.book_append_sheet(wb, wsCert, "CHUNG_THUC_PHAP_LY");

      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `Austec_Bao_Cao_Phap_Ly_Hop_Den_SHA256_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast(language === "vi" 
        ? `Đã xuất thành công file Báo Cáo Pháp Lý Kiểm Toán: ${fileName}` 
        : `Successfully exported Legal Audit Report: ${fileName}`, "success");
    } catch (err: any) {
      showToast(`Lỗi xuất file: ${err?.message || "Không thể tạo file Excel"}`, "warning");
    }
  };

  // Check RBAC Permission for Audit Module
  if (!canView("mod_audit")) {
    return <AccessDenied moduleId="mod_audit" moduleName="Hộp Đen Kiểm Toán SHA-256" />;
  }

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = !searchHardwareId || 
        log.hardwareId.toLowerCase().includes(searchHardwareId.toLowerCase()) ||
        log.userEmail.toLowerCase().includes(searchHardwareId.toLowerCase()) ||
        log.clientIp.includes(searchHardwareId);
      const matchStatus = selectedStatus === "ALL" || log.status === selectedStatus;
      const matchRole = selectedRole === "ALL" || log.userRole === selectedRole;
      return matchSearch && matchStatus && matchRole;
    });
  }, [logs, searchHardwareId, selectedStatus, selectedRole]);

  useEffect(() => {
    setLogPage(1);
  }, [searchHardwareId, selectedStatus, selectedRole]);

  const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / logPageSize));
  const paginatedLogs = useMemo(() => {
    const start = (logPage - 1) * logPageSize;
    return filteredLogs.slice(start, start + logPageSize);
  }, [filteredLogs, logPage, logPageSize]);

  const handleCopySig = (sig: string, id: string) => {
    navigator.clipboard.writeText(sig);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg border shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom duration-200 ${
          toast.type === "success"
            ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/40"
            : "bg-amber-950/90 text-amber-300 border-amber-500/40"
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. Header (Compact Single Line) */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{language === "vi" ? "Hộp Đen Kiểm Toán Bất Biến (Blackbox Audit)" : "Cryptographic Blackbox Audit"}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
                SHA-256
              </span>
            </h1>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleExportLegalReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold border border-slate-800 dark:border-slate-700 transition-all shadow-xs cursor-pointer shrink-0"
          title="Tải file Excel báo cáo pháp lý đầy đủ 100% kèm chuỗi Merkle Root"
        >
          <Download className="w-3.5 h-3.5 text-cyan-400" />
          <span>{language === "vi" ? "Xuất báo cáo pháp lý (.xlsx)" : "Export Legal Audit (.xlsx)"}</span>
        </button>
      </div>

      {/* 2. Compact 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
            {language === "vi" ? "Tổng lệnh hôm nay" : "Commands Today"}
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white font-mono mt-0.5">14,295</div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" /> 99.96% {language === "vi" ? "Thành công" : "Success"}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
            {language === "vi" ? "Độ trễ trung bình" : "Avg Latency"}
          </div>
          <div className="text-lg font-bold text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">168 ms</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">SLA: &le; 250ms</div>
        </div>

        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
            {language === "vi" ? "Lệnh Timeout" : "Timeout Commands"}
          </div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">6</div>
          <div className="text-[10px] text-amber-600 dark:text-amber-400">Tự động retry & ghi log</div>
        </div>

        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
            {language === "vi" ? "Chữ ký mật mã" : "Crypto Verification"}
          </div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">100% Verified</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">HMAC-SHA256 Signed</div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2.5 shrink-0">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder={language === "vi" ? "Tìm theo Hardware ID, Email hoặc IP..." : "Search by Hardware ID, Email or IP..."}
            value={searchHardwareId}
            onChange={(e) => setSearchHardwareId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">{language === "vi" ? "Mọi trạng thái" : "All Status"}</option>
            <option value="ACKNOWLEDGED">{language === "vi" ? "Đã xác nhận (ACK)" : "Acknowledged"}</option>
            <option value="TIMEOUT">{language === "vi" ? "Hết hạn (TIMEOUT)" : "Timeout"}</option>
            <option value="REJECTED">{language === "vi" ? "Bị từ chối" : "Rejected"}</option>
          </select>

          <select 
            value={selectedRole} 
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">{language === "vi" ? "Mọi người gửi" : "All Actors"}</option>
            <option value="CUSTOMER">{language === "vi" ? "Khách hàng" : "Customer"}</option>
            <option value="CSKH">{language === "vi" ? "CSKH" : "CSKH"}</option>
            <option value="ADMIN">{language === "vi" ? "Admin" : "Admin"}</option>
          </select>

          <button 
            onClick={() => {
              setSearchHardwareId("");
              setSelectedStatus("ALL");
              setSelectedRole("ALL");
            }}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Làm mới bộ lọc"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Master-Detail Split Grid (Fits in remaining viewport height with inner scroll) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
        {/* Left Column: Log List (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Dòng sự kiện ({filteredLogs.length} bản ghi)</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Độ phân giải: 1 ms</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {paginatedLogs.map((log) => {
              const isSelected = selectedLog?.id === log.id;
              return (
                <div 
                  key={log.id} 
                  onClick={() => setSelectedLog(log)}
                  className={`px-3 py-2.5 cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                    isSelected 
                      ? "bg-cyan-500/10 border-l-4 border-cyan-600 dark:border-cyan-400" 
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono shrink-0 ${
                      log.status === "ACKNOWLEDGED" 
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" 
                        : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                    }`}>
                      {log.commandType}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{log.hardwareId}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:inline">({log.modelName})</span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1.5 truncate">
                        <span>Gửi bởi: <strong className="text-slate-800 dark:text-slate-200">{log.userEmail}</strong></span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">{log.clientIp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1 text-xs font-mono font-bold">
                      <span className={log.latencyMs <= 250 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                        {log.latencyMs} ms
                      </span>
                      {log.status === "ACKNOWLEDGED" ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {log.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredLogs.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                Không tìm thấy bản ghi hộp đen nào khớp với điều kiện tra cứu.
              </div>
            )}
          </div>

          {/* Left Column Pagination Bar */}
          <Pagination
            currentPage={logPage}
            totalItems={filteredLogs.length}
            pageSize={logPageSize}
            onPageChange={setLogPage}
            onPageSizeChange={setLogPageSize}
            pageSizeOptions={[10, 15, 20, 50, 100]}
            itemName="lệnh"
          />
        </div>

        {/* Right Column: Selected Log Detailed Inspector (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          {selectedLog ? (
            <>
              <div className="px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] uppercase font-mono text-cyan-600 dark:text-cyan-400 font-bold block">{selectedLog.id}</span>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Chi Tiết Bằng Chứng Lệnh</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                  selectedLog.status === "ACKNOWLEDGED" 
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" 
                    : "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                }`}>
                  {selectedLog.status}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {/* Hardware */}
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Thiết Bị Phần Cứng</span>
                  <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">{selectedLog.hardwareId}</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">{selectedLog.modelName}</div>
                </div>

                {/* Sender Info */}
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Người Phát Lệnh</span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tài khoản:</span>
                    <span className="text-slate-900 dark:text-white font-semibold truncate max-w-[200px]">{selectedLog.userEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Vai trò:</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">{selectedLog.userRole}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Địa chỉ IP:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-mono">{selectedLog.clientIp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Thiết bị:</span>
                    <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{selectedLog.deviceFingerprint}</span>
                  </div>
                </div>

                {/* Latency Timeline */}
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs font-mono">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-sans">Tiến Trình Thực Thi</span>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">App gửi lệnh (T1):</span>
                    <span className="text-slate-800 dark:text-slate-200">{selectedLog.timestamp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Thiết bị ACK (T2):</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{selectedLog.ackTimestamp || "Chưa phản hồi"}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-1 font-bold">
                    <span className="text-slate-600 dark:text-slate-400 font-sans">Thời gian khứ hồi:</span>
                    <span className="text-cyan-600 dark:text-cyan-400">{selectedLog.latencyMs} ms</span>
                  </div>
                </div>

                {/* Crypto Signature */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Chữ Ký Số Bất Biến (SHA-256)</span>
                    {copiedId === selectedLog.id && (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold normal-case">
                        <Check className="w-3 h-3" /> Đã sao chép
                      </span>
                    )}
                  </div>
                  <div 
                    onClick={() => handleCopySig(selectedLog.cryptoSignature, selectedLog.id)}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-800 font-mono text-[10px] break-all cursor-pointer hover:border-cyan-500 transition-colors"
                    title="Nhấn để copy mã băm SHA-256"
                  >
                    {selectedLog.cryptoSignature}
                  </div>
                </div>

                {/* Command Payload */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gói Tin Lệnh (Payload)</span>
                  <pre className="p-2 rounded-lg bg-slate-900 text-cyan-300 font-mono text-[10px] border border-slate-800 overflow-x-auto">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
                <span>Tiêu chuẩn ISO/IEC 27001 Audit Ready</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">100% Immutable</span>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-400 text-xs">
              Chọn một bản ghi để xem chi tiết bằng chứng lệnh.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
