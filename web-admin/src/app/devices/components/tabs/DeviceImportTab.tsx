"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import { 
  Download, 
  FileCheck2, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Check,
  Loader2,
  Printer,
  QrCode,
  X
} from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/context/apiConfig";

interface DeviceImportTabProps {
  devices: any[];
  models?: any[];
  groups?: any[];
  deviceTypes?: any[];
  onImportSuccess: (newDevices: any[]) => void;
  switchTab: (tab: string) => void;
  canCreate: boolean;
}

export interface ValidatedImportRow {
  hardwareId: string;
  customName: string;
  modelName: string;
  group: string;
  deviceType: string;
  warrantyEndAt: string;
  owner: string;
  phone: string;
  addressDisplay: string;
  batchNumber: string;
  macAddress: string;
  productionDate: string;
  notes: string;
  status: "in_stock" | "offline";
  qrDataUrl?: string;
}

export interface ImportErrorItem {
  row: number;
  hardwareId: string;
  reasons: string[];
}

const formatNum = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function DeviceImportTab({
  devices,
  models = [],
  groups = [],
  deviceTypes = [],
  onImportSuccess,
  switchTab,
  canCreate,
}: DeviceImportTabProps) {
  const [importStatus, setImportStatus] = useState<"IDLE" | "CHECKING" | "VALIDATED" | "ERROR" | "SAVING" | "IMPORTED">("IDLE");
  const [importErrors, setImportErrors] = useState<ImportErrorItem[]>([]);
  const [importCount, setImportCount] = useState<number>(0);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [importRows, setImportRows] = useState<ValidatedImportRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // QR Modal State
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [qrRowsWithImage, setQrRowsWithImage] = useState<ValidatedImportRow[]>([]);
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);

  // Generate QR images when opening modal
  const openQrDecalModal = async (targetRows: ValidatedImportRow[]) => {
    setIsGeneratingQr(true);
    setIsQrModalOpen(true);
    try {
      const rowsWithQr = await Promise.all(
        targetRows.map(async (row) => {
          const qrPayload = `austec://pair?id=${encodeURIComponent(row.hardwareId)}&model=${encodeURIComponent(row.modelName)}&batch=${encodeURIComponent(row.batchNumber || "")}`;
          const qrDataUrl = await QRCode.toDataURL(qrPayload, {
            width: 140,
            margin: 1,
            color: {
              dark: "#0f172a",
              light: "#ffffff"
            }
          });
          return { ...row, qrDataUrl };
        })
      );
      setQrRowsWithImage(rowsWithQr);
    } catch (e: any) {
      toast.error("Lỗi khi tạo mã QR: " + e.message);
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const handlePrintDecals = () => {
    window.print();
  };

  // Dry-run simulation
  const simulateDryRun = (hasError: boolean) => {
    setImportStatus("CHECKING");
    setUploadedFileName(hasError ? "Austec_Mau_Thu_Loi.xlsx" : "Austec_Mau_Thu_Hop_Le.xlsx");
    setImportRows([]);

    setTimeout(() => {
      if (hasError) {
        setImportErrors([
          { 
            row: 3, 
            hardwareId: "AT-DOOR-88239A01", 
            reasons: ["Mã Model không được để trống"] 
          },
          { 
            row: 4, 
            hardwareId: "AT-LOCK-FAKE-99", 
            reasons: [
              "Tên thiết bị không được để trống",
              "Hạn bảo hành không được để trống"
            ] 
          },
          { 
            row: 6, 
            hardwareId: "", 
            reasons: ["Mã thiết bị (Hardware ID) không được để trống"] 
          },
          { 
            row: 8, 
            hardwareId: "AT-DOOR-88239A20", 
            reasons: ["Mã thiết bị [AT-DOOR-88239A20] đã tồn tại trong kho"] 
          }
        ]);
        setImportStatus("ERROR");
      } else {
        const sampleRows: ValidatedImportRow[] = [
          {
            hardwareId: "AT-DOOR-SIM-001",
            customName: "Cửa Cuốn Austec Master Pro 01",
            modelName: "DOOR2026",
            group: "Cửa cuốn tự động - Dữ liệu test",
            deviceType: "DOOR_AUTOMATIC",
            warrantyEndAt: "24 tháng",
            owner: "",
            phone: "",
            addressDisplay: "Kho tổng Austec",
            batchNumber: "LOT-2026-Q1",
            macAddress: "FC:B4:67:88:23:01",
            productionDate: "2026-11-04",
            notes: "Kiểm tra KCS đạt chuẩn",
            status: "in_stock"
          },
          {
            hardwareId: "AT-LOCK-SIM-002",
            customName: "Khóa Vân Tay Masaru X1 Pro 02",
            modelName: "MASARU-X1",
            group: "Khóa Masaru chuẩn Nhật",
            deviceType: "SMART_LOCK",
            warrantyEndAt: "36 tháng",
            owner: "Trần Anh Tuấn",
            phone: "0912345678",
            addressDisplay: "Khu đô thị Ecopark Hưng Yên",
            batchNumber: "LOT-2026-Q1",
            macAddress: "FC:B4:67:88:23:02",
            productionDate: "2026-11-04",
            notes: "Đã bàn giao đại lý",
            status: "offline"
          },
          {
            hardwareId: "AT-CAM-SIM-003",
            customName: "Camera AI Vision 360 Austec",
            modelName: "AUSTEC-CAM-360",
            group: "CAMERA AN NINH AI AUSTEC",
            deviceType: "CAM",
            warrantyEndAt: "24 tháng",
            owner: "",
            phone: "",
            addressDisplay: "Kho tổng Austec",
            batchNumber: "LOT-2026-Q1",
            macAddress: "FC:B4:67:88:23:03",
            productionDate: "2026-11-04",
            notes: "Cảm biến AI Sony",
            status: "in_stock"
          },
          {
            hardwareId: "AT-UPS-SIM-004",
            customName: "Bộ Lưu Điện Sin Chuẩn 220V",
            modelName: "UPS-220-SINE",
            group: "Lưu điện AC 220V",
            deviceType: "UPS",
            warrantyEndAt: "24 tháng",
            owner: "",
            phone: "",
            addressDisplay: "Kho tổng Austec",
            batchNumber: "LOT-2026-Q1",
            macAddress: "FC:B4:67:88:23:04",
            productionDate: "2026-11-04",
            notes: "Ắc quy tiêu chuẩn 12V",
            status: "in_stock"
          }
        ];
        setImportErrors([]);
        setImportRows(sampleRows);
        setImportCount(sampleRows.length);
        setImportStatus("VALIDATED");
      }
    }, 350);
  };

  // Main Excel Parser
  const processExcelFile = (file: File) => {
    if (!file) return;

    const validExts = [".xlsx", ".xls", ".csv"];
    const isExtValid = validExts.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!isExtValid) {
      toast.warning("Chỉ hỗ trợ file Excel (.xlsx, .xls) hoặc .csv");
      setImportErrors([{ row: 0, hardwareId: "", reasons: [`File "${file.name}" không hợp lệ. Vui lòng chọn file .xlsx, .xls hoặc .csv.`] }]);
      setImportStatus("ERROR");
      return;
    }

    setUploadedFileName(file.name);
    setImportStatus("CHECKING");
    setImportErrors([]);
    setImportRows([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (json.length === 0) {
          setImportErrors([{ row: 1, hardwareId: "", reasons: ["File Excel rỗng, không có dữ liệu."] }]);
          setImportStatus("ERROR");
          return;
        }

        const errors: ImportErrorItem[] = [];
        const validRows: ValidatedImportRow[] = [];
        const seenInFile = new Map<string, number>();

        json.forEach((row: any, idx: number) => {
          const rowNum = idx + 2;

          // 1. EXTRACT DATA EXPLICITLY ACROSS RECOGNIZED SYNONYMS
          const hwIdRaw = String(
            row["Hardware ID (*)"] || row["Hardware ID"] || row["hardwareId"] || 
            row["Mã Thiết Bị"] || row["Mã Phần Cứng"] || row["Serial"] || ""
          ).trim();

          const nameRaw = String(
            row["Tên Thiết Bị (*)"] || row["Tên Thiết Bị"] || row["customName"] || 
            row["name"] || row["Tên Thiết Bị / Vị Trí"] || ""
          ).trim();

          const modelRaw = String(
            row["Mã Model (*)"] || row["Mã Model"] || row["Model (*)"] || 
            row["Model"] || row["modelName"] || row["modelCode"] || ""
          ).trim();

          const groupRaw = String(
            row["Nhóm Sản Phẩm (*)"] || row["Nhóm Sản Phẩm"] || 
            row["group"] || row["groupName"] || ""
          ).trim();

          const typeRaw = String(
            row["Loại Phần Cứng (*)"] || row["Loại Phần Cứng"] || 
            row["deviceType"] || row["type"] || ""
          ).trim();

          const warrantyRaw = String(
            row["Hạn Bảo Hành (*)"] || row["Hạn Bảo Hành"] || 
            row["Thời Hạn Bảo Hành (*)"] || row["Thời Hạn Bảo Hành"] || 
            row["warrantyEndAt"] || row["warranty"] || ""
          ).trim();

          // Optional fields
          const ownerRaw = String(
            row["Chủ Sở Hữu / Khách Hàng"] || row["Chủ Sở Hữu"] || 
            row["Khách Hàng"] || row["owner"] || row["ownerName"] || ""
          ).trim();

          const phoneRaw = String(
            row["Số Điện Thoại"] || row["SĐT"] || 
            row["phone"] || row["ownerPhone"] || ""
          ).trim();

          const addressRaw = String(
            row["Địa Chỉ Lắp Đặt"] || row["Địa Chỉ"] || 
            row["address"] || row["addressDisplay"] || ""
          ).trim();

          const batchRaw = String(
            row["Số Lô Sản Xuất"] || row["Số Lô"] || 
            row["Lô Sản Xuất"] || row["batchNumber"] || row["batch"] || ""
          ).trim();

          const macRaw = String(
            row["Địa Chỉ MAC"] || row["MAC"] || row["macAddress"] || ""
          ).trim();

          const prodDateRaw = String(
            row["Ngày Sản Xuất"] || row["Ngày Xuất Xưởng"] || row["productionDate"] || ""
          ).trim();

          const notesRaw = String(
            row["Ghi Chú"] || row["notes"] || row["note"] || ""
          ).trim();

          // 2. CHECK REQUIRED FIELDS
          const rowReasons: string[] = [];

          if (!hwIdRaw) {
            rowReasons.push("Mã thiết bị (Hardware ID) không được để trống");
          }
          if (!nameRaw) {
            rowReasons.push("Tên thiết bị không được để trống");
          }
          if (!modelRaw) {
            rowReasons.push("Mã Model không được để trống");
          }
          if (!groupRaw) {
            rowReasons.push("Nhóm sản phẩm không được để trống");
          }
          if (!typeRaw) {
            rowReasons.push("Loại phần cứng không được để trống");
          }
          if (!warrantyRaw) {
            rowReasons.push("Hạn bảo hành không được để trống");
          }

          // 3. DUPLICATION CHECK
          if (hwIdRaw) {
            const normalizedHwId = hwIdRaw.toUpperCase();

            // Check duplicate in file
            if (seenInFile.has(normalizedHwId)) {
              const firstRow = seenInFile.get(normalizedHwId);
              rowReasons.push(`Trùng mã thiết bị [${hwIdRaw}] với dòng ${firstRow} trong file`);
            } else {
              seenInFile.set(normalizedHwId, rowNum);
            }

            // Check duplicate in Database
            const existingDevice = devices.find(d => (d.hardwareId || d.hwId)?.trim().toUpperCase() === normalizedHwId);
            if (existingDevice) {
              rowReasons.push(`Mã thiết bị [${hwIdRaw}] đã tồn tại trong kho (${existingDevice.customName || existingDevice.name || "Thiết bị cũ"})`);
            }
          }

          if (rowReasons.length > 0) {
            errors.push({
              row: rowNum,
              hardwareId: hwIdRaw || "(Chưa có mã)",
              reasons: rowReasons
            });
          } else {
            validRows.push({
              hardwareId: hwIdRaw.toUpperCase(),
              customName: nameRaw,
              modelName: modelRaw,
              group: groupRaw,
              deviceType: typeRaw,
              warrantyEndAt: warrantyRaw,
              owner: ownerRaw,
              phone: phoneRaw,
              addressDisplay: addressRaw,
              batchNumber: batchRaw,
              macAddress: macRaw,
              productionDate: prodDateRaw,
              notes: notesRaw,
              status: ownerRaw ? "offline" : "in_stock"
            });
          }
        });

        if (errors.length > 0) {
          setImportErrors(errors);
          setImportStatus("ERROR");
          toast.error(`Phát hiện ${errors.length} dòng có lỗi. Vui lòng kiểm tra lại.`);
        } else {
          setImportErrors([]);
          setImportRows(validRows);
          setImportCount(validRows.length);
          setImportStatus("VALIDATED");
          toast.success(`Đã kiểm tra xong: ${validRows.length} thiết bị hợp lệ.`);
        }
      } catch (err: any) {
        setImportErrors([{ row: 0, hardwareId: "", reasons: ["Lỗi đọc file: " + (err?.message || "File không đúng định dạng")] }]);
        setImportStatus("ERROR");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processExcelFile(file);
    if (e.target) e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      processExcelFile(e.dataTransfer.files[0]);
    }
  };

  // Submit to Backend Batch API
  const handleConfirmImport = async () => {
    if (importRows.length === 0) {
      toast.warning("Không có thiết bị để lưu!");
      return;
    }

    const currentHwIds = new Set(devices.map(d => (d.hardwareId || d.hwId)?.trim().toUpperCase()));
    const nonDuplicateRows = importRows.filter(r => !currentHwIds.has(r.hardwareId.trim().toUpperCase()));

    if (nonDuplicateRows.length === 0) {
      toast.warning("Toàn bộ thiết bị trong file đã tồn tại trong kho.");
      return;
    }

    setImportStatus("SAVING");
    try {
      const apiBase = getApiBaseUrl();
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      
      const payload = nonDuplicateRows.map(r => ({
        hwId: r.hardwareId,
        hardwareId: r.hardwareId,
        name: r.customName,
        customName: r.customName,
        model: r.modelName,
        modelName: r.modelName,
        group: r.group,
        groupName: r.group,
        type: r.deviceType,
        deviceType: r.deviceType,
        owner: r.owner || "Chưa gán",
        ownerName: r.owner || "Chưa gán",
        phone: r.phone || "---",
        ownerPhone: r.phone || "---",
        warranty: r.warrantyEndAt,
        warrantyEndAt: r.warrantyEndAt,
        address: r.addressDisplay || (r.owner ? "" : "Kho tổng Austec"),
        addressDisplay: r.addressDisplay || (r.owner ? "" : "Kho tổng Austec"),
        batchNumber: r.batchNumber,
        macAddress: r.macAddress,
        productionDate: r.productionDate,
        notes: r.notes,
        status: r.owner ? "offline" : "in_stock"
      }));

      const res = await fetch(`${apiBase}/api/admin/devices/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        const savedDevices = data.devices || payload;
        onImportSuccess(savedDevices);
        setImportStatus("IMPORTED");
        toast.success(`Đã nhập kho thành công ${savedDevices.length} thiết bị!`);
      } else {
        setImportStatus("ERROR");
        toast.error(data.error || "Không thể lưu dữ liệu");
      }
    } catch (err: any) {
      setImportStatus("ERROR");
      toast.error("Lỗi kết nối máy chủ: " + err.message);
    }
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/Austec_Device_Import_Template.xlsx";
    link.download = "Austec_Device_Import_Template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Đã tải xuống file mẫu: Austec_Device_Import_Template.xlsx");
  };

  const handleDownloadSampleTest = () => {
    const link = document.createElement("a");
    link.href = "/Austec_Sample_Import_Test.xlsx";
    link.download = "Austec_Sample_Import_Test.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Đã tải xuống file mẫu test: Austec_Sample_Import_Test.xlsx");
  };

  return (
    <div className="h-full overflow-y-auto pr-1 space-y-3">
      {/* Print Styles for Decals */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-decal-area, #print-decal-area * {
            visibility: visible !important;
          }
          #print-decal-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 10mm !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Nhập kho Excel & Tem QR
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Nhập danh sách thiết bị xuất xưởng và in tem nhãn QR dán sản phẩm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button 
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Tải file Excel mẫu (.xlsx)</span>
            </button>

            <button 
              type="button"
              onClick={handleDownloadSampleTest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-200 dark:border-cyan-800 transition-colors cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Tải file nhập thử (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Hidden File Input */}
        <input 
          ref={fileInputRef} 
          type="file" 
          accept=".xlsx, .xls, .csv" 
          onChange={handleFileUpload} 
          className="hidden" 
        />

        {/* Interactive File Dropzone */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer group ${
            isDragging 
              ? "border-cyan-500 bg-cyan-50/80 dark:bg-cyan-950/50 ring-4 ring-cyan-500/20 scale-[1.01]" 
              : "border-slate-300 dark:border-slate-700 hover:border-cyan-500 bg-slate-50 dark:bg-slate-900/40"
          }`}
        >
          <div className={`w-11 h-11 mx-auto mb-2 rounded-full flex items-center justify-center transition-transform ${
            isDragging 
              ? "bg-cyan-500 text-white scale-110 shadow-lg shadow-cyan-500/30" 
              : "bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 group-hover:scale-105"
          }`}>
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {isDragging ? "Thả file vào đây để kiểm tra" : "Bấm để chọn file Excel (.xlsx, .csv) hoặc kéo thả vào đây"}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {uploadedFileName ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-mono font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
                Đã chọn: {uploadedFileName}
              </span>
            ) : (
              "Hỗ trợ file danh sách thiết bị xuất xưởng. Tự động kiểm tra trùng lặp mã thiết bị."
            )}
          </div>

          {/* Quick Simulation Buttons */}
          <div className="flex flex-wrap justify-center gap-2 mt-3.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => simulateDryRun(true)}
              className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs px-3 py-1 rounded-lg transition-colors cursor-pointer font-medium"
            >
              Thử mẫu có lỗi
            </button>
            <button
              type="button"
              onClick={() => simulateDryRun(false)}
              className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 text-xs px-3 py-1 rounded-lg transition-colors cursor-pointer font-medium"
            >
              Thử mẫu hợp lệ
            </button>
          </div>
        </div>

        {/* Status: Checking */}
        {importStatus === "CHECKING" && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-cyan-500/40 text-cyan-600 dark:text-cyan-400 text-xs flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></span>
            <span>Đang kiểm tra dữ liệu file Excel...</span>
          </div>
        )}

        {/* Status: Saving */}
        {importStatus === "SAVING" && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2.5">
            <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-300" />
            <span className="font-semibold">Đang lưu danh sách thiết bị vào kho...</span>
          </div>
        )}

        {/* Status: Error Display */}
        {importStatus === "ERROR" && (
          <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Phát hiện {importErrors.length} dòng có lỗi. Vui lòng kiểm tra lại trước khi lưu.</span>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-[11px] underline text-rose-700 dark:text-rose-300 font-semibold cursor-pointer"
              >
                Tải lại file mẫu →
              </button>
            </div>
            
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {importErrors.map((err, idx) => (
                <div key={idx} className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/80 p-2 rounded border border-rose-200 dark:border-rose-900/50 space-y-0.5">
                  <div className="flex justify-between items-center font-mono">
                    <span className="font-bold text-slate-900 dark:text-white">Dòng {err.row}: [<strong>{err.hardwareId}</strong>]</span>
                    <span className="text-[10px] font-semibold text-rose-500">{err.reasons.length} lỗi</span>
                  </div>
                  <ul className="list-disc list-inside text-rose-600 dark:text-rose-400 text-[11px]">
                    {err.reasons.map((r, rIdx) => (
                      <li key={rIdx}>{r}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status: Validated Display */}
        {importStatus === "VALIDATED" && (
          <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Đã kiểm tra: {formatNum(importCount)} thiết bị hợp lệ, sẵn sàng nhập kho.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openQrDecalModal(importRows)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Xem tem QR ({importRows.length})</span>
                </button>

                {canCreate && (
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    <span>Lưu vào kho ({formatNum(importCount)} thiết bị)</span>
                  </button>
                )}
              </div>
            </div>

            {/* Preview Table */}
            {importRows.length > 0 && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 overflow-x-auto bg-white dark:bg-slate-900 text-xs">
                <div className="p-2 bg-emerald-100/50 dark:bg-emerald-950/60 font-semibold text-emerald-900 dark:text-emerald-300 text-[11px] flex justify-between items-center">
                  <span>Danh sách xem trước ({importRows.length} thiết bị):</span>
                  <span className="text-[10px] text-slate-500">Hiển thị 10 bản ghi đầu</span>
                </div>
                <table className="w-full text-left text-xs min-w-[800px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase text-slate-500 font-semibold">
                    <tr>
                      <th className="p-2.5">Hardware ID</th>
                      <th className="p-2.5">Loại</th>
                      <th className="p-2.5">Tên Thiết Bị & Model</th>
                      <th className="p-2.5">Nhóm Sản Phẩm</th>
                      <th className="p-2.5">Khách Hàng / SĐT</th>
                      <th className="p-2.5">Địa Chỉ Lắp Đặt</th>
                      <th className="p-2.5">Hạn Bảo Hành</th>
                      <th className="p-2.5">Số Lô / MAC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                    {importRows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-mono text-slate-900 dark:text-white font-bold">{r.hardwareId}</td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-semibold">
                            {r.deviceType}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-900 dark:text-white">{r.customName}</div>
                          <div className="text-[10px] font-mono text-slate-500">{r.modelName}</div>
                        </td>
                        <td className="p-2.5 text-slate-700 dark:text-slate-300">{r.group}</td>
                        <td className="p-2.5">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {r.owner || <span className="text-slate-400 italic">Chưa gán</span>}
                          </div>
                          {r.phone && <div className="text-[10px] text-slate-500 font-mono">{r.phone}</div>}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400 max-w-[150px] truncate" title={r.addressDisplay}>
                          {r.addressDisplay || <span className="text-slate-400 italic">---</span>}
                        </td>
                        <td className="p-2.5 font-mono text-slate-700 dark:text-slate-300 font-medium">
                          {r.warrantyEndAt}
                        </td>
                        <td className="p-2.5 font-mono text-[10px] text-slate-500">
                          {r.batchNumber && <div>Lô: {r.batchNumber}</div>}
                          {r.macAddress && <div>MAC: {r.macAddress}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Status: Imported Successfully */}
        {importStatus === "IMPORTED" && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Đã nhập kho thành công {formatNum(importCount)} thiết bị!
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                  Thiết bị đã được thêm vào danh sách quản lý.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => switchTab("list")}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Xem danh sách thiết bị →
                </button>
                <button 
                  type="button"
                  onClick={() => openQrDecalModal(importRows)}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-1.5 rounded-lg border border-indigo-700 cursor-pointer shadow-xs font-semibold"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>In tem QR Decal ({importRows.length})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QR DECAL MODAL & PRINT VIEW */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Tem Nhãn QR Decal
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Khổ in A4 tiêu chuẩn (24 tem/tờ)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintDecals}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In tem (Print)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: Decal Matrix Preview */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-950">
              {isGeneratingQr ? (
                <div className="flex flex-col items-center justify-center p-12 gap-2 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="text-xs">Đang tạo mã QR cho từng thiết bị...</span>
                </div>
              ) : (
                <div id="print-decal-area" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {qrRowsWithImage.map((dev, idx) => (
                    <div 
                      key={idx} 
                      className="bg-white text-slate-900 border-2 border-slate-300 rounded-lg p-2.5 flex flex-col justify-between shadow-xs print:border print:border-black print:shadow-none"
                      style={{ pageBreakInside: "avoid" }}
                    >
                      {/* Brand Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-[12px] tracking-tight text-blue-700">AUSTEC</span>
                          <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">SMART IOT</span>
                        </div>
                        <span className="text-[9px] font-mono font-semibold px-1 py-0.5 rounded bg-slate-100 text-slate-700">
                          {dev.deviceType}
                        </span>
                      </div>

                      {/* Main Decal Content: QR + Specs */}
                      <div className="flex items-center gap-2">
                        {dev.qrDataUrl ? (
                          <img 
                            src={dev.qrDataUrl} 
                            alt={`QR ${dev.hardwareId}`} 
                            className="w-20 h-20 rounded border border-slate-200 shrink-0" 
                          />
                        ) : (
                          <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                            QR Code
                          </div>
                        )}

                        <div className="flex-1 min-w-0 space-y-0.5 text-[10px]">
                          <div className="font-bold font-mono text-[11px] text-slate-900 truncate" title={dev.hardwareId}>
                            {dev.hardwareId}
                          </div>
                          <div className="font-semibold text-slate-800 truncate" title={dev.customName}>
                            {dev.customName}
                          </div>
                          <div className="text-slate-600 font-mono">
                            Model: <strong className="text-slate-900">{dev.modelName}</strong>
                          </div>
                          <div className="text-slate-600">
                            Bảo hành: <strong className="text-slate-900">{dev.warrantyEndAt}</strong>
                          </div>
                          {dev.batchNumber && (
                            <div className="text-slate-500 text-[9px] font-mono">
                              Lô: {dev.batchNumber}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Note */}
                      <div className="mt-2 pt-1 border-t border-dashed border-slate-200 flex justify-between items-center text-[8px] text-slate-500 font-sans">
                        <span>Quét mã bằng Austec App để kích hoạt</span>
                        <span>Hotline: 1900 886 999</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
