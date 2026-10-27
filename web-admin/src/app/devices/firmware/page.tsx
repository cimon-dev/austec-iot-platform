"use client";

import React, { useState, useEffect } from "react";
import { 
  UploadCloud, 
  Cpu, 
  RotateCw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Play, 
  Plus, 
  Search, 
  Filter, 
  FileCode, 
  Check, 
  Copy, 
  WifiOff, 
  ArrowUpRight,
  Server
} from "lucide-react";
import { getApiBaseUrl } from "@/context/apiConfig";

interface FirmwareRelease {
  id: number;
  version: string;
  modelCode: string;
  binaryFilename: string;
  binaryUrl: string;
  fileSizeBytes: number;
  sha256Checksum: string;
  releaseType: string;
  isActive: boolean;
  changelog: string;
  releasedBy: string;
  createdAt: string;
}

interface OtaCampaign {
  id: number;
  campaignName: string;
  targetModel: string;
  targetVersion: string;
  rolloutType: string;
  status: string;
  totalDevices: number;
  successCount: number;
  failedCount: number;
  inProgressCount: number;
  startedAt: string;
  completedAt?: string;
}

interface OtaDeviceRecord {
  id: number;
  campaignId: number;
  hardwareId: string;
  customerName: string;
  currentVersion: string;
  targetVersion: string;
  status: "SUCCESS" | "DOWNLOADING" | "PENDING" | "FAILED_OFFLINE" | "FAILED_CHECKSUM" | "SKIPPED";
  progressPct: number;
  lastAttemptAt: string;
  errorReason: string | null;
  retryCount: number;
}

export default function FirmwareOtaPage() {
  const [firmwares, setFirmwares] = useState<FirmwareRelease[]>([]);
  const [campaigns, setCampaigns] = useState<OtaCampaign[]>([]);
  const [records, setRecords] = useState<OtaDeviceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Modal states
  const [showDeployModal, setShowDeployModal] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [deployModel, setDeployModel] = useState<string>("DOOR_GERMAN_ALU");
  const [deployVersion, setDeployVersion] = useState<string>("v1.1.0");
  const [deployMode, setDeployMode] = useState<string>("ALL");
  const [deploying, setDeploying] = useState<boolean>(false);

  // Upload Form
  const [newVersion, setNewVersion] = useState<string>("v1.2.0");
  const [newModel, setNewModel] = useState<string>("DOOR_GERMAN_ALU");
  const [newChangelog, setNewChangelog] = useState<string>("");
  const [newType, setNewType] = useState<string>("STABLE");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fwRes, campRes] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/admin/firmware`),
        fetch(`${getApiBaseUrl()}/api/admin/ota/campaigns`)
      ]);
      const fwData = await fwRes.json();
      const campData = await campRes.json();

      if (fwData.success) setFirmwares(fwData.releases || []);
      if (campData.success && campData.campaigns && campData.campaigns.length > 0) {
        setCampaigns(campData.campaigns);
        // Lấy chi tiết campaign mới nhất
        const latestId = campData.campaigns[0].id;
        const detRes = await fetch(`${getApiBaseUrl()}/api/admin/ota/campaigns/${latestId}`);
        const detData = await detRes.json();
        if (detData.success) {
          setRecords(detData.records || []);
        }
      }
    } catch (e) {
      console.error("Lỗi nạp dữ liệu OTA:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleRetryDevice = async (recordId: number) => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/ota/retry/${recordId}`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: "DOWNLOADING", progressPct: 35, errorReason: null } : r));
      }
    } catch (e) {
      console.error("Lỗi khi retry:", e);
    }
  };

  const handleDeployCampaign = async () => {
    try {
      setDeploying(true);
      const res = await fetch(`${getApiBaseUrl()}/api/admin/ota/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Chiến dịch phát hành ${deployVersion} cho ${deployModel}`,
          targetModel: deployModel,
          targetVersion: deployVersion,
          rolloutType: deployMode
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowDeployModal(false);
        fetchData();
      }
    } catch (e) {
      console.error("Lỗi deploy chiến dịch:", e);
    } finally {
      setDeploying(false);
    }
  };

  const handleCreateRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/firmware`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: newVersion,
          modelCode: newModel,
          binaryFilename: `firmware_${newModel.toLowerCase()}_${newVersion}.bin`,
          binaryUrl: `${getApiBaseUrl()}/firmware/${newModel.toLowerCase()}_${newVersion}.bin`,
          fileSizeBytes: 1612000,
          sha256Checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          releaseType: newType,
          changelog: newChangelog || "Cập nhật tính năng & nâng cao độ ổn định"
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowUploadModal(false);
        setNewChangelog("");
        fetchData();
      }
    } catch (err) {
      console.error("Lỗi tạo bản release:", err);
    }
  };

  // Tính toán thống kê
  const total = records.length;
  const successCount = records.filter(r => r.status === "SUCCESS").length;
  const inProgressCount = records.filter(r => r.status === "DOWNLOADING" || r.status === "PENDING").length;
  const failedCount = records.filter(r => r.status === "FAILED_OFFLINE" || r.status === "FAILED_CHECKSUM").length;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;

  const filteredRecords = records.filter(r => {
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchSearch = r.hardwareId.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        r.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-0">
      {/* 1. Header Page */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 dark:border-cyan-500/30 font-mono">
              OTA CLOUD ENGINE
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">ESP32-C3 Dual-Partition</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            <UploadCloud className="w-7 h-7 text-cyan-500 dark:text-cyan-400" />
            Quản Trị Firmware & Cập Nhật OTA Từ Xa
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Quản lý mã nhị phân (.bin), điều phối chiến dịch nạp đồng bộ hàng loạt cho các thiết bị đã lắp đặt ngoài hiện trường
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            Tải Lên Bản .BIN Mới
          </button>
          <button
            onClick={() => setShowDeployModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4" />
            Nạp Đồng Bộ Hàng Loạt
          </button>
        </div>
      </div>

      {/* 2. Thẻ thống kê tổng quan (Overview Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tổng thiết bị trong đợt nạp</span>
            <Cpu className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{total}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span>Chiến dịch:</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-mono font-medium">v1.1.0 Titadoor</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-500/20 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Đã cập nhật thành công</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{successCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Tỷ lệ phủ sóng: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{successRate}%</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-amber-200 dark:border-amber-500/20 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Đang tải & xác thực</span>
            <RotateCw className="w-4 h-4 text-amber-500 dark:text-amber-400 animate-spin" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{inProgressCount}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Đang truyền chunk qua HTTP stream</div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-rose-200 dark:border-rose-500/20 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">Chưa cập nhật / Kẹt lỗi</span>
            <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">{failedCount}</div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400/90 mt-1">Cần thử lại hoặc kiểm tra nguồn WiFi</div>
        </div>
      </div>

      {/* 3. Tiến trình chiến dịch đang chạy (Active Campaign Banner) */}
      {campaigns.length > 0 && (
        <div className="p-5 rounded-xl bg-gradient-to-r from-cyan-50/70 via-white to-blue-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border border-cyan-200 dark:border-cyan-500/30 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                  Chiến dịch phát hành đang hoạt động
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono border border-slate-200 dark:border-slate-700">
                  ID: #{campaigns[0].id}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">{campaigns[0].campaignName}</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                <span>Model: <b className="text-slate-800 dark:text-white">{campaigns[0].targetModel}</b></span>
                <span>Phiên bản đích: <b className="text-cyan-600 dark:text-cyan-400 font-mono">{campaigns[0].targetVersion}</b></span>
                <span>Bắt đầu lúc: <span className="font-mono text-slate-700 dark:text-slate-300">{campaigns[0].startedAt}</span></span>
              </div>
            </div>

            <div className="w-full md:w-72 bg-white dark:bg-slate-950/80 p-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Tiến độ đợt nạp</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-bold font-mono">{successRate}% Hoàn thành</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${successRate}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>{successCount}/{total} Thiết bị</span>
                <span>{failedCount} Lỗi/Offline</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Kho Bản Phát Hành Firmware (Firmware Releases Catalog) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Kho Bản Phát Hành Firmware (.bin)</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700">
              {firmwares.length} bản
            </span>
          </div>
          <button 
            onClick={fetchData} 
            className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 font-medium">
                <th className="p-3">Phiên bản</th>
                <th className="p-3">Dòng Sản Phẩm</th>
                <th className="p-3">Tệp Binary</th>
                <th className="p-3">Dung lượng</th>
                <th className="p-3">Mã Băm SHA-256</th>
                <th className="p-3">Loại</th>
                <th className="p-3">Nhật ký thay đổi (Changelog)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {firmwares.map((fw) => (
                <tr key={fw.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-cyan-600 dark:text-cyan-400 whitespace-nowrap">
                    {fw.version}
                  </td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                    {fw.modelCode}
                  </td>
                  <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                    {fw.binaryFilename}
                  </td>
                  <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                    {(fw.fileSizeBytes / 1024 / 1024).toFixed(2)} MB
                  </td>
                  <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                    <button 
                      onClick={() => handleCopyHash(fw.sha256Checksum)}
                      className="flex items-center gap-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer group"
                      title="Bấm để sao chép SHA-256"
                    >
                      <span>{fw.sha256Checksum.slice(0, 10)}...{fw.sha256Checksum.slice(-6)}</span>
                      {copiedHash === fw.sha256Checksum ? (
                        <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                      )}
                    </button>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      fw.releaseType === "STABLE" 
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                    }`}>
                      {fw.releaseType}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={fw.changelog}>
                    {fw.changelog}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Ma Trận Thiết Bị & Tiến Độ Nạp Từng Máy (Devices Rollout Matrix) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Danh Sách Thiết Bị & Trạng Thái Phiên Bản Hiện Tại
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Theo dõi chi tiết từng thiết bị, xử lý các trường hợp không nạp được hoặc bị lỗi gián đoạn WiFi
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm mã phần cứng / Khách..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-48"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  statusFilter === "ALL" 
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Tất cả ({records.length})
              </button>
              <button
                onClick={() => setStatusFilter("SUCCESS")}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  statusFilter === "SUCCESS" 
                    ? "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Đã lên ({records.filter(r => r.status === "SUCCESS").length})
              </button>
              <button
                onClick={() => setStatusFilter("FAILED_OFFLINE")}
                className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  statusFilter === "FAILED_OFFLINE" 
                    ? "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20" 
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Kẹt lỗi ({records.filter(r => r.status.startsWith("FAILED")).length})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 font-medium">
                <th className="p-3">Mã Thiết Bị (Hardware ID)</th>
                <th className="p-3">Khách Hàng / Điểm Lắp</th>
                <th className="p-3">Phiên Bản Hiện Tại</th>
                <th className="p-3">Phiên Bản Đích</th>
                <th className="p-3">Tiến Độ Nạp</th>
                <th className="p-3">Trạng Thái</th>
                <th className="p-3">Chi Tiết / Lý Do</th>
                <th className="p-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 dark:text-slate-500">
                    Không tìm thấy thiết bị nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isSuccess = rec.status === "SUCCESS";
                  const isFailed = rec.status === "FAILED_OFFLINE" || rec.status === "FAILED_CHECKSUM";
                  const isDownloading = rec.status === "DOWNLOADING";

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Cpu className={`w-3.5 h-3.5 ${rec.hardwareId === 'amtuong1994' ? 'text-amber-500 dark:text-amber-400' : 'text-cyan-500 dark:text-cyan-400'}`} />
                        <span>{rec.hardwareId}</span>
                        {rec.hardwareId === 'amtuong1994' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-sans font-bold">
                            MẠCH THẬT
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">
                        {rec.customerName}
                      </td>
                      <td className="p-3 font-mono text-slate-500 dark:text-slate-400">
                        {rec.currentVersion}
                      </td>
                      <td className="p-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        {rec.targetVersion}
                      </td>
                      <td className="p-3 w-40">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            <span>{rec.progressPct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                isSuccess ? "bg-emerald-500" : isFailed ? "bg-rose-500" : "bg-cyan-500"
                              }`}
                              style={{ width: `${rec.progressPct}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {isSuccess && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Đã nâng cấp
                          </span>
                        )}
                        {isDownloading && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                            <RotateCw className="w-3 h-3 animate-spin" />
                            Đang tải {rec.progressPct}%
                          </span>
                        )}
                        {rec.status === "FAILED_OFFLINE" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <WifiOff className="w-3 h-3" />
                            Mất kết nối
                          </span>
                        )}
                        {rec.status === "FAILED_CHECKSUM" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Lỗi Checksum
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-xs truncate" title={rec.errorReason || "Cập nhật thành công không có lỗi"}>
                        {rec.errorReason ? (
                          <span className="text-rose-600 dark:text-rose-400 font-medium">{rec.errorReason}</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Hoạt động ổn định trên phân vùng App1</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {isFailed ? (
                          <button
                            onClick={() => handleRetryDevice(rec.id)}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                          >
                            <RotateCw className="w-3 h-3" />
                            Thử lại nạp
                          </button>
                        ) : isSuccess ? (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Rollback Sẵn Sàng</span>
                        ) : (
                          <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">Đang truyền...</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Modal: Nạp Đồng Bộ Hàng Loạt (Mass Deploy) */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Khởi Chạy Chiến Dịch Nạp Đồng Bộ Hàng Loạt
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Phát lệnh nạp OTA qua MQTT Broker tới toàn bộ thiết bị đang trực tuyến. Các thiết bị ngoại tuyến sẽ được nạp bù tự động khi kết nối lại mạng.
            </p>

            <div className="space-y-4 mt-5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Chọn Dòng Sản Phẩm Cần Nạp
                </label>
                <select
                  value={deployModel}
                  onChange={(e) => setDeployModel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="DOOR_GERMAN_ALU">Cửa cuốn nhôm công nghệ Đức (DOOR_GERMAN_ALU)</option>
                  <option value="DOOR_AU_STEEL">Cửa cuốn tấm liền Úc (DOOR_AU_STEEL)</option>
                  <option value="SMART_LOCK_MASARU">Khóa vân tay Masaru (SMART_LOCK_MASARU)</option>
                  <option value="UPS_AC_220V">Lưu điện Austec Sine 220V (UPS_AC_220V)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Phiên Bản Firmware Đích
                </label>
                <select
                  value={deployVersion}
                  onChange={(e) => setDeployVersion(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-cyan-600 dark:text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
                >
                  <option value="v1.1.0">v1.1.0 (Stable - Vật cản thông minh & Auto WiFi)</option>
                  <option value="v1.0.2">v1.0.2 (Stable - Xung kích rơ-le tối ưu)</option>
                  <option value="v2.0.1">v2.0.1 (Stable - FaceID 3D & Mã OTP)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Chế Độ Triển Khai
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeployMode("ALL")}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      deployMode === "ALL" 
                        ? "bg-cyan-500/10 border-cyan-500 text-slate-900 dark:text-white font-bold" 
                        : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="font-semibold text-cyan-600 dark:text-cyan-400">Tất cả thiết bị</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Nạp đồng loạt toàn bộ thiết bị đã lắp đặt</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeployMode("CANARY")}
                    className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                      deployMode === "CANARY" 
                        ? "bg-cyan-500/10 border-cyan-500 text-slate-900 dark:text-white font-bold" 
                        : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <div className="font-semibold text-cyan-600 dark:text-cyan-400">Canary Rollout</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Nạp thử nghiệm 5-10 thiết bị phòng Lab trước</div>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" />
                <span>
                  <b>Cơ chế an toàn Anti-Brick:</b> Thiết bị sẽ tự động tải file vào phân vùng dự phòng (App1). Nếu phát hiện lỗi hoặc không kết nối được WiFi sau 3 lần khởi động, chip sẽ tự động quay về bản cũ.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDeployModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeployCampaign}
                disabled={deploying}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
              >
                {deploying ? "Đang phát lệnh qua MQTT..." : "Xác Nhận & Bắt Đầu Nạp"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Tải Lên Bản Firmware Mới (Upload .bin) */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              Tải Lên Bản Phát Hành Firmware (.bin)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Thêm file nhị phân đã biên dịch từ Arduino / PlatformIO vào kho lưu trữ máy chủ
            </p>

            <form onSubmit={handleCreateRelease} className="space-y-4 mt-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Số Phiên Bản (SemVer)
                  </label>
                  <input
                    type="text"
                    required
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="vd: v1.2.0"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-cyan-600 dark:text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Dòng Thiết Bị Áp Dụng
                  </label>
                  <select
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="DOOR_GERMAN_ALU">Cửa cuốn Titadoor Đức</option>
                    <option value="DOOR_AU_STEEL">Cửa cuốn tấm liền Úc</option>
                    <option value="SMART_LOCK_MASARU">Khóa vân tay Masaru</option>
                    <option value="UPS_AC_220V">Lưu điện Austec Sine 220V</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Đính Kèm Tệp Binary (.bin)
                </label>
                <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-cyan-500/50 rounded-lg text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-950/50">
                  <FileCode className="w-8 h-8 text-cyan-500 dark:text-cyan-400 mx-auto mb-1" />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Kéo thả tệp .bin hoặc bấm chọn file</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Dung lượng tối đa 1.8MB cho phân vùng OTA ESP32</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Nhật Ký Thay Đổi (Changelog)
                </label>
                <textarea
                  rows={3}
                  required
                  value={newChangelog}
                  onChange={(e) => setNewChangelog(e.target.value)}
                  placeholder="Mô tả các lỗi đã fix hoặc tính năng mới bổ sung..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  Lưu & Đưa Vào Kho Firmware
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
