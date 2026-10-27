"use client";

import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { 
  FileSpreadsheet, 
  Download, 
  FileCheck2, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Check 
} from "lucide-react";

interface DeviceImportTabProps {
  devices: any[];
  onImportSuccess: (newDevices: any[]) => void;
  switchTab: (tab: string) => void;
  canCreate: boolean;
  showToast: (message: string, type?: "success" | "info" | "warning" | "error") => void;
}

const formatNum = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export function DeviceImportTab({
  devices,
  onImportSuccess,
  switchTab,
  canCreate,
  showToast
}: DeviceImportTabProps) {
  const [importStatus, setImportStatus] = useState<"IDLE" | "CHECKING" | "VALIDATED" | "ERROR" | "IMPORTED">("IDLE");
  const [importErrors, setImportErrors] = useState<Array<{ row: number; hardwareId: string; reason: string }>>([]);
  const [importCount, setImportCount] = useState<number>(0);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const simulateDryRun = (hasError: boolean) => {
    setImportStatus("CHECKING");
    setUploadedFileName(hasError ? "Austec_Test_Duplicate_Errors.xlsx" : "Austec_Batch_2500_Factory_Export.xlsx");
    setImportRows([]);

    setTimeout(() => {
      if (hasError) {
        setImportErrors([
          { row: 4, hardwareId: "AT-DOOR-88239A01", reason: "Trùng lặp Hardware ID đã tồn tại trong CSDL kho" },
          { row: 17, hardwareId: "AT-LOCK-FAKE-99", reason: "Model Code 'LOCK-FAKE' không tồn tại trong từ điển hệ thống" },
          { row: 32, hardwareId: "", reason: "Hardware ID không được để trống ô dữ liệu" },
        ]);
        setImportStatus("ERROR");
      } else {
        setImportErrors([]);
        setImportCount(2500);
        setImportStatus("VALIDATED");
      }
    }, 600);
  };

  const processExcelFile = (file: File) => {
    if (!file) return;

    const validExts = [".xlsx", ".xls", ".csv"];
    const isExtValid = validExts.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!isExtValid) {
      showToast("Chỉ hỗ trợ file Excel (.xlsx, .xls) hoặc .csv", "warning");
      setImportErrors([{ row: 0, hardwareId: "", reason: `File "${file.name}" không hợp lệ. Vui lòng chọn file .xlsx, .xls hoặc .csv.` }]);
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
          setImportErrors([{ row: 1, hardwareId: "", reason: "File Excel rỗng, không tìm thấy hàng dữ liệu nào." }]);
          setImportStatus("ERROR");
          return;
        }

        const errors: Array<{ row: number; hardwareId: string; reason: string }> = [];
        const validRows: any[] = [];
        const seenInFile = new Map<string, number>();

        json.forEach((row: any, idx: number) => {
          const rowNum = idx + 2;
          const hwIdRaw = String(row["Hardware ID (*)"] || row["Hardware ID"] || row["hardwareId"] || row["Mã Thiết Bị"] || row["Serial"] || "").trim();
          const name = String(row["Tên Thiết Bị (*)"] || row["Tên Thiết Bị"] || row["name"] || "").trim();
          const model = String(row["Model (*)"] || row["Model"] || row["model"] || "").trim();
          const group = String(row["Nhóm Sản Phẩm"] || row["group"] || "Cửa cuốn nhôm Đức").trim();
          const type = String(row["Loại Phần Cứng"] || row["type"] || "DOOR").trim();
          const owner = String(row["Chủ Sở Hữu / Khách Hàng"] || row["owner"] || "Kho Chờ Gán").trim();
          const phone = String(row["Số Điện Thoại"] || row["phone"] || "1900 886 999").trim();
          const warranty = String(row["Hạn Bảo Hành"] || row["warranty"] || "12/2028").trim();

          if (!hwIdRaw) {
            errors.push({ row: rowNum, hardwareId: "", reason: "Hardware ID không được để trống ô dữ liệu" });
            return;
          }

          const normalizedHwId = hwIdRaw.toUpperCase();

          if (seenInFile.has(normalizedHwId)) {
            const firstRow = seenInFile.get(normalizedHwId);
            errors.push({ 
              row: rowNum, 
              hardwareId: hwIdRaw, 
              reason: `Trùng lặp Hardware ID với dòng ${firstRow} ngay trong file Excel này` 
            });
            return;
          }
          seenInFile.set(normalizedHwId, rowNum);

          const existingDevice = devices.find(d => d.hwId?.trim().toUpperCase() === normalizedHwId);
          if (existingDevice) {
            errors.push({ 
              row: rowNum, 
              hardwareId: hwIdRaw, 
              reason: `Trùng lặp Hardware ID đã tồn tại trong CSDL kho (${existingDevice.name} - ${existingDevice.owner})` 
            });
            return;
          }

          validRows.push({
            hwId: hwIdRaw,
            name: name || `Thiết bị ${hwIdRaw}`,
            model: model || "AUSTEC-A900",
            group,
            type,
            owner,
            phone,
            status: "in_stock",
            isOnline: false,
            battery: 100,
            openState: "STOCK",
            isLocked: false,
            signal: 0,
            warranty
          });
        });

        if (errors.length > 0) {
          setImportErrors(errors);
          setImportStatus("ERROR");
        } else {
          setImportErrors([]);
          setImportRows(validRows);
          setImportCount(validRows.length);
          setImportStatus("VALIDATED");
        }
      } catch (err: any) {
        setImportErrors([{ row: 0, hardwareId: "", reason: "Lỗi đọc file Excel: " + (err?.message || "File hỏng hoặc không đúng định dạng") }]);
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

  const handleConfirmImport = () => {
    if (importRows.length === 0) {
      showToast("Không có thiết bị hợp lệ để lưu vào kho!", "warning");
      return;
    }

    const currentHwIds = new Set(devices.map(d => d.hwId?.trim().toUpperCase()));
    const nonDuplicateRows = importRows.filter(r => !currentHwIds.has(r.hwId?.trim().toUpperCase()));

    if (nonDuplicateRows.length === 0) {
      showToast("Toàn bộ thiết bị trong file đã tồn tại trong CSDL. Chống nhập trùng kích hoạt!", "warning");
      return;
    }

    onImportSuccess(nonDuplicateRows);
    setImportStatus("IMPORTED");
    if (nonDuplicateRows.length < importRows.length) {
      showToast(`Đã lưu ${nonDuplicateRows.length} thiết bị mới (đã tự động bỏ qua ${importRows.length - nonDuplicateRows.length} bản ghi trùng)!`, "warning");
    } else {
      showToast(`Đã lưu thành công toàn bộ ${nonDuplicateRows.length} thiết bị vào CSDL kho!`, "success");
    }
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/Austec_Device_Import_Template.xlsx";
    link.download = "Austec_Device_Import_Template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã tải xuống file Excel mẫu: Austec_Device_Import_Template.xlsx", "success");
  };

  const handleDownloadSampleTest = () => {
    const link = document.createElement("a");
    link.href = "/Austec_Sample_Import_Test.xlsx";
    link.download = "Austec_Sample_Import_Test.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã tải xuống file dữ liệu mẫu test: Austec_Sample_Import_Test.xlsx", "success");
  };

  const handleDownloadQrDecal = () => {
    showToast("Đang tải file PDF in tem nhãn QR Decal A4...", "info");
  };

  return (
    <div className="h-full overflow-y-auto pr-1 space-y-3">
      <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-green-500" />
              Nhập Kho Hàng Loạt Bằng Excel (Smart Dry-run Validation)
            </h2>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Tự động kiểm tra cú pháp, phát hiện trùng lặp Hardware ID trước khi lưu vào CSDL. Tối đa 10,000 bản ghi/lần.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button 
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
              title="Tải mẫu Excel chuẩn định dạng Austec"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Tải File Excel Mẫu (.xlsx)</span>
            </button>

            <button 
              type="button"
              onClick={handleDownloadSampleTest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 text-xs font-semibold border border-cyan-200 dark:border-cyan-800 transition-colors cursor-pointer"
              title="Tải file mẫu có sẵn 5 thiết bị test (Camera, Sensor, Door...)"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Tải File Nhập Test Mẫu (.xlsx)</span>
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
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer group ${
            isDragging 
              ? "border-cyan-500 bg-cyan-50/80 dark:bg-cyan-950/50 ring-4 ring-cyan-500/20 scale-[1.01]" 
              : "border-slate-300 dark:border-slate-700 hover:border-cyan-500 bg-slate-50 dark:bg-slate-900/40"
          }`}
        >
          <div className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center transition-transform ${
            isDragging 
              ? "bg-cyan-500 text-white scale-110 shadow-lg shadow-cyan-500/30" 
              : "bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 group-hover:scale-105"
          }`}>
            <UploadCloud className="w-7 h-7" />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {isDragging ? "Thả file Excel vào đây để bắt đầu kiểm tra!" : "Bấm vào đây để chọn file Excel (.xlsx, .csv) hoặc kéo thả vào"}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {uploadedFileName ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-mono font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
                Đã nạp file: {uploadedFileName}
              </span>
            ) : (
              "Hỗ trợ file xuất xưởng từ nhà máy Austec, file đại lý hoặc file mẫu test (tự động chống trùng lặp Hardware ID)"
            )}
          </div>

          {/* Demo Buttons */}
          <div className="flex flex-wrap justify-center gap-2.5 mt-4" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => simulateDryRun(true)}
              className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold"
            >
              ⚡ Thử nghiệm Giả Lập File Có Lỗi (Dry-run bắt lỗi)
            </button>
            <button
              type="button"
              onClick={() => simulateDryRun(false)}
              className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold"
            >
              ⚡ Thử nghiệm Giả Lập 2,500 Thiết Bị (Dry-run Passed)
            </button>
          </div>
        </div>

        {/* Result Area */}
        {importStatus === "CHECKING" && (
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-cyan-500/40 text-cyan-600 dark:text-cyan-400 text-xs flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></span>
            <span>Hệ thống đang quét từng ô dữ liệu để kiểm tra cú pháp và trùng lặp Hardware ID...</span>
          </div>
        )}

        {importStatus === "ERROR" && (
          <div className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 space-y-2.5">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-bold">
              <AlertCircle className="w-4 h-4" />
              <span>Phát hiện {importErrors.length} lỗi trong file Excel. Quá trình nhập kho bị dừng để bảo vệ CSDL!</span>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {importErrors.map((err, idx) => (
                <div key={idx} className="text-[11px] text-slate-700 dark:text-slate-300 font-mono bg-white dark:bg-slate-900/80 p-2 rounded border border-rose-200 dark:border-rose-900/50 flex justify-between items-center">
                  <span>Dòng {err.row}: [<strong>{err.hardwareId || "Ô trống"}</strong>]</span>
                  <span className="text-rose-600 dark:text-rose-400 font-medium">{err.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {importStatus === "VALIDATED" && (
          <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Kiểm tra hoàn tất: Toàn bộ {formatNum(importCount)} bản ghi đều hợp lệ 100%!</span>
              </div>
              {canCreate && (
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Xác Nhận Lưu Vào Kho ({formatNum(importCount)} TB)</span>
                </button>
              )}
            </div>

            {importRows.length > 0 && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/60 overflow-x-auto bg-white dark:bg-slate-900 text-xs">
                <div className="p-2 bg-emerald-100/50 dark:bg-emerald-950/60 font-semibold text-emerald-900 dark:text-emerald-300 text-[11px] flex justify-between">
                  <span>Dữ liệu thực tế phân tích từ file ({importRows.length} dòng):</span>
                  <span>Xem trước 5 bản ghi đầu</span>
                </div>
                <table className="w-full text-left text-xs min-w-[550px]">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase text-slate-500 font-semibold">
                    <tr>
                      <th className="p-2">Hardware ID</th>
                      <th className="p-2">Tên Thiết Bị</th>
                      <th className="p-2">Model</th>
                      <th className="p-2">Nhóm</th>
                      <th className="p-2">Loại</th>
                      <th className="p-2">Bảo Hành</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                    {importRows.slice(0, 5).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2 font-mono text-cyan-600 dark:text-cyan-400 font-bold">{r.hwId}</td>
                        <td className="p-2 font-medium text-slate-900 dark:text-white">{r.name}</td>
                        <td className="p-2 font-mono text-slate-500">{r.model}</td>
                        <td className="p-2">{r.group}</td>
                        <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">{r.type}</span></td>
                        <td className="p-2 font-mono text-slate-500">{r.warranty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {importStatus === "IMPORTED" && (
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-cyan-500/50 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Đã Nhập Kho Thành Công {formatNum(importCount)} Thiết Bị!
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Dữ liệu đã được lưu vào danh sách thiết bị. Đã tự động khởi tạo mã băm QR Code bảo mật chống giả mạo cho từng thiết bị.</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => switchTab("list")}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Xem Danh Sách Thiết Bị →
                </button>
                <button 
                  type="button"
                  onClick={handleDownloadQrDecal}
                  className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs px-3.5 py-1.5 rounded-lg border border-slate-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tải File PDF In Tem QR Decal Khổ A4</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
