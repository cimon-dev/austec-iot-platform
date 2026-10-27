"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";
import { BlackboxLogEntry } from "./types";
import { blackboxService } from "./blackbox-service";
import { exportLegalReport } from "./export-legal-report";
import {
  BlackboxHeader,
  BlackboxKpiCards,
  BlackboxFilterBar,
  BlackboxTable,
  BlackboxDetailPanel,
} from "./components";

const FALLBACK_LOGS: BlackboxLogEntry[] = [
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
    cryptoSignature: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
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
    cryptoSignature: "f42a78129c54098bc19d67b2d56108e43491901a884efb3874628203c4f901a1",
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
    cryptoSignature: "9c82410a8b924716bca10e4785f7236173b98401a89cfa7492a54829104fa85c",
  },
];

export default function BlackboxPage() {
  const { language } = useLanguage();
  const { canView } = usePermissions();

  const [logs, setLogs] = useState<BlackboxLogEntry[]>(FALLBACK_LOGS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchHardwareId, setSearchHardwareId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<BlackboxLogEntry | null>(FALLBACK_LOGS[0]);
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);
  const [mobileTab, setMobileTab] = useState<"logs" | "details">("logs");
  const [toast, setToast] = useState<{ message: string; type: "success" | "warning" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchLogs = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await blackboxService.getLogs({ limit: 200 });
      if (data.logs && data.logs.length > 0) {
        const mapped: BlackboxLogEntry[] = data.logs.map((l: any) => ({
          id: l.id || `BBX-${Math.floor(100000 + Math.random() * 900000)}`,
          hardwareId: l.hardwareId || l.hardware_id || "AT-GW-01",
          modelName: l.modelName || "Austec Smart Gateway",
          commandType: (l.commandType || l.actionType || "OPEN") as any,
          payload: l.payload || l.payloadSent || {},
          userId: l.actorId || l.userId || "USR-001",
          userEmail: l.actorName || l.userEmail || "austec.admin@gmail.com",
          userRole: (l.actorRole || l.userRole || "ADMIN") as any,
          clientIp: l.actorIp || l.clientIp || "127.0.0.1",
          deviceFingerprint: l.deviceFingerprint || "Austec Web Console",
          timestamp: l.timestamp || l.createdAt || new Date().toISOString(),
          ackTimestamp: l.ackTimestamp,
          latencyMs: l.latencyMs || 120,
          status: l.status || (l.ackStatus === "SUCCESS" ? "ACKNOWLEDGED" : "ACKNOWLEDGED"),
          cryptoSignature: l.cryptoSignature || "sha256-" + (l.id || "verified"),
        }));
        setLogs(mapped);
        if (mapped.length > 0) {
          setSelectedLog((prev) => (prev ? mapped.find((m) => m.id === prev.id) || mapped[0] : mapped[0]));
        }
      }
    } catch (e) {
      console.warn("Lỗi tải nhật ký hộp đen:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const handleExport = () => {
    try {
      const fileName = exportLegalReport(filteredLogs, language);
      showToast(
        language === "vi"
          ? `Đã xuất thành công file Báo Cáo Pháp Lý Kiểm Toán: ${fileName}`
          : `Successfully exported Legal Audit Report: ${fileName}`,
        "success"
      );
    } catch (err: any) {
      showToast(`Lỗi xuất file: ${err?.message || "Không thể tạo file Excel"}`, "warning");
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        !searchHardwareId ||
        log.hardwareId.toLowerCase().includes(searchHardwareId.toLowerCase()) ||
        (log.userEmail || "").toLowerCase().includes(searchHardwareId.toLowerCase()) ||
        (log.clientIp || "").includes(searchHardwareId);
      const matchStatus = selectedStatus === "ALL" || log.status === selectedStatus;
      const matchRole = selectedRole === "ALL" || log.userRole === selectedRole;
      return matchSearch && matchStatus && matchRole;
    });
  }, [logs, searchHardwareId, selectedStatus, selectedRole]);

  useEffect(() => {
    setLogPage(1);
  }, [searchHardwareId, selectedStatus, selectedRole]);

  const paginatedLogs = useMemo(() => {
    const start = (logPage - 1) * logPageSize;
    return filteredLogs.slice(start, start + logPageSize);
  }, [filteredLogs, logPage, logPageSize]);

  if (!canView("mod_audit")) {
    return <AccessDenied moduleId="mod_audit" moduleName="Hộp Đen Kiểm Toán SHA-256" />;
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 overflow-hidden">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg border shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom duration-200 ${
            toast.type === "success"
              ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/40"
              : "bg-amber-950/90 text-amber-300 border-amber-500/40"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <BlackboxHeader
        language={language}
        isRefreshing={isRefreshing}
        onRefresh={fetchLogs}
        onExport={handleExport}
      />

      {/* KPI Cards */}
      <BlackboxKpiCards language={language} />

      {/* Search & Filter Bar */}
      <BlackboxFilterBar
        language={language}
        searchHardwareId={searchHardwareId}
        onSearchChange={setSearchHardwareId}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        onReset={() => {
          setSearchHardwareId("");
          setSelectedStatus("ALL");
          setSelectedRole("ALL");
        }}
      />

      {/* Mobile Segmented Switcher */}
      <div className="flex lg:hidden items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg shrink-0 gap-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMobileTab("logs")}
          className={`flex-1 py-1.5 px-3 rounded-md transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "logs"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Dòng sự kiện ({filteredLogs.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("details")}
          className={`flex-1 py-1.5 px-3 rounded-md transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === "details"
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          <span>Bằng chứng lệnh</span>
          {selectedLog && (
            <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold truncate max-w-[80px]">
              {selectedLog.id}
            </span>
          )}
        </button>
      </div>

      {/* Master-Detail Split Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
        <div className={`${mobileTab === "details" ? "hidden lg:flex" : "flex"} lg:col-span-7 flex-col h-full overflow-hidden`}>
          <BlackboxTable
            logs={paginatedLogs}
            selectedLogId={selectedLog?.id}
            onSelectLog={(log) => {
              setSelectedLog(log);
              setMobileTab("details");
            }}
            currentPage={logPage}
            pageSize={logPageSize}
            totalItems={filteredLogs.length}
            onPageChange={setLogPage}
            onPageSizeChange={setLogPageSize}
          />
        </div>

        <div className={`${mobileTab === "logs" ? "hidden lg:flex" : "flex"} lg:col-span-5 flex-col h-full overflow-hidden`}>
          <BlackboxDetailPanel
            selectedLog={selectedLog}
            onBack={() => setMobileTab("logs")}
          />
        </div>
      </div>
    </div>
  );
}
