"use client";

import React, { useState, useEffect, Suspense, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import { Pagination } from "@/components/Pagination";
import { 
  Layers, 
  Cpu, 
  Sliders, 
  Box, 
  FileSpreadsheet, 
  Radio, 
  Search, 
  Filter,
  RotateCcw,
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Battery, 
  Wifi, 
  Lock, 
  Unlock, 
  Power, 
  QrCode, 
  Download, 
  ShieldCheck,
  Eye,
  Trash2,
  Edit,
  Settings,
  Check,
  Video,
  Thermometer,
  Droplets,
  UploadCloud,
  FileCheck2,
  Camera,
  Play,
  Maximize2
} from "lucide-react";
import { usePermissions } from "@/context/PermissionContext";
import { AccessDenied } from "@/components/AccessDenied";

// Deterministic number formatter to avoid SSR/Client locale hydration mismatch (1,200 vs 1.200)
const formatNum = (num: number) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function DevicesManagementContent() {
  const { canView, canCreate, canUpdate, canDelete } = usePermissions();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "list";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, '', '/devices?tab=' + tab);
    }
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);
  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  if (!canView("mod_dev")) {
    return (
      <AccessDenied 
        moduleTitle="Quản Lý Thiết Bị Tập Trung (Device Management)"
        requiredPermission="Quyền truy cập Phân hệ Thiết bị (mod_dev)"
      />
    );
  }

  // =========================================================
  // STATE: 1. Group List
  // =========================================================
  const [groups, setGroups] = useState([
    { id: 18, name: "CAMERA AN NINH AI AUSTEC", code: "GROUP_CAM_AI", desc: "Hệ thống camera giám sát an ninh thông minh AI 360 độ ban đêm", deviceCount: 680, onlineRate: 99.7 },
    { id: 19, name: "CẢM BIẾN MÔI TRƯỜNG & NHIỆT ẨM", code: "GROUP_SENSOR_ENV", desc: "Cảm biến nhiệt độ, độ ẩm không khí, cảnh báo cháy & môi trường", deviceCount: 890, onlineRate: 99.1 },
    { id: 15, name: "GSHT", code: "GROUP_GSHT", desc: "Giám sát hành trình xe máy, ô tô", deviceCount: 450, onlineRate: 98.4 },
    { id: 13, name: "LƯU ĐIỆN TIÊU CHUẨN AUSTEC", code: "GROUP_UPS_STD", desc: "Bộ lưu điện tiêu chuẩn chính hãng", deviceCount: 1200, onlineRate: 99.1 },
    { id: 12, name: "LƯU ĐIỆN AC 220V", code: "GROUP_UPS_220V", desc: "Bộ lưu điện AC 220V - 50Hz sóng sin chuẩn", deviceCount: 2300, onlineRate: 99.5 },
    { id: 11, name: "KHÓA MASARU CHUẨN NHẬT", code: "GROUP_LOCK_MASARU", desc: "Khóa vân tay thông minh công nghệ Nhật Bản", deviceCount: 890, onlineRate: 99.2 },
    { id: 10, name: "CỬA CUỐN TẤM LIỀN CÔNG NGHỆ ÚC", code: "GROUP_DOOR_AU", desc: "Cửa cuốn tấm liền thép hợp kim công nghệ Úc", deviceCount: 3100, onlineRate: 99.0 },
    { id: 9, name: "CỬA CUỐN NHÔM CÔNG NGHỆ ĐỨC", code: "GROUP_DOOR_GERMAN", desc: "Cửa cuốn nan nhôm khe thoáng công nghệ Đức", deviceCount: 2470, onlineRate: 99.4 },
  ]);

  // Master Data Loader from PostgreSQL Backend APIs
  useEffect(() => {
    const loadMasterData = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Groups
      try {
        const res = await fetch("http://localhost:4000/api/admin/groups", { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.groups) && data.groups.length > 0) {
          setGroups(data.groups.map((g: any) => ({
            id: g.id,
            name: g.groupName || g.name,
            code: g.code,
            desc: g.description || g.desc || "",
            deviceCount: g.deviceCount || 0,
            onlineRate: g.onlineRate || 99.5,
          })));
        }
      } catch (e) {
        console.warn("Lỗi tải groups từ PostgreSQL:", e);
      }

      // 2. Device Types
      try {
        const res = await fetch("http://localhost:4000/api/admin/device-types", { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.types) && data.types.length > 0) {
          setDeviceTypes(data.types.map((t: any) => ({
            id: t.id,
            name: t.typeName || t.name,
            code: t.code,
            icon: t.icon || "📦",
            activeCount: t.activeCount || 0,
          })));
        }
      } catch (e) {
        console.warn("Lỗi tải types từ PostgreSQL:", e);
      }

      // 3. Properties
      try {
        const res = await fetch("http://localhost:4000/api/admin/properties", { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.properties) && data.properties.length > 0) {
          setProperties(data.properties.map((p: any) => ({
            id: p.id,
            key: p.key || p.propKey,
            name: p.name || p.propName,
            type: p.dataType || p.type || "integer",
            unit: p.unit || "",
            widget: p.widget || "gauge",
            ctrl: !!(p.isWritable ?? p.ctrl),
          })));
        }
      } catch (e) {
        console.warn("Lỗi tải properties từ PostgreSQL:", e);
      }

      // 4. Models
      try {
        const res = await fetch("http://localhost:4000/api/admin/models", { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.models) && data.models.length > 0) {
          setModels(data.models.map((m: any) => ({
            id: m.id,
            code: m.modelCode || m.code,
            name: m.modelName || m.name,
            group: m.groupName || m.group || "Cửa cuốn nhôm Đức",
            type: m.typeName || m.type || "Door",
            fw: m.defaultFwVersion || m.fw || "v2.4.1",
            hw: m.hardwareRevision || m.hw || "HW-REV-A",
            assignedProperties: m.assignedProperties || [30, 36, 38],
          })));
        }
      } catch (e) {
        console.warn("Lỗi tải models từ PostgreSQL:", e);
      }

      // 5. Fleet Devices
      try {
        const res = await fetch("http://localhost:4000/api/admin/devices", { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.devices) && data.devices.length > 0) {
          const mappedDevices = data.devices.map((d: any) => ({
            hwId: d.hwId || d.hardwareId,
            name: d.name || d.customName || "Thiết bị Austec",
            model: d.modelName || d.model || "AUSTEC-A900",
            group: d.groupName || d.group || "Cửa cuốn nhôm Đức",
            type: d.typeName?.includes("Khóa") ? "LOCK" : d.typeName?.includes("Lưu") ? "UPS" : "DOOR",
            owner: d.ownerName || d.owner || "Khách Hàng Austec",
            phone: d.ownerPhone || d.phone || "0912 345 678",
            status: d.status?.toLowerCase() === "online" || d.isOnline ? "online" : "offline",
            isOnline: !!(d.status?.toLowerCase() === "online" || d.isOnline),
            battery: d.batteryLevel || 95,
            openState: d.doorState || "CLOSED",
            isLocked: !!d.isLocked,
            signal: d.rssiSignal || -60,
            warranty: d.warrantyUntil ? new Date(d.warrantyUntil).toLocaleDateString("vi-VN") : "10/2028",
            address: d.address || "Hà Nội",
            deviceTypeDesc: d.modelName || "Thiết Bị Điều Khiển Austec IoT",
            subscriptionType: d.subscriptionType || "LIMITED",
            subscriptionExpiresAt: d.warrantyUntil || null,
            subscriptionStatus: "ACTIVE",
          }));
          setDevices(mappedDevices);
        }
      } catch (e) {
        console.warn("Lỗi tải danh sách thiết bị fleet:", e);
      }
    };

    loadMasterData();
  }, []);

  // Group Modals
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupForm, setNewGroupForm] = useState({ name: "", code: "", desc: "", deviceCount: 0 });
  const [selectedGroupConfig, setSelectedGroupConfig] = useState<any | null>(null);
  const [editGroupForm, setEditGroupForm] = useState<{ id: number; name: string; code: string; desc: string; deviceCount: number; onlineRate: number } | null>(null);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupForm.name || !newGroupForm.code) return;
    const cleanCode = newGroupForm.code.trim().toUpperCase();
    if (groups.some(g => g.code.trim().toUpperCase() === cleanCode)) {
      alert(`Mã nhóm sản phẩm "${cleanCode}" đã tồn tại! Vui lòng chọn mã khác.`);
      return;
    }
    const newG = {
      id: Date.now() % 10000,
      name: newGroupForm.name.trim(),
      code: cleanCode,
      desc: newGroupForm.desc || "Nhóm sản phẩm mới",
      deviceCount: Number(newGroupForm.deviceCount) || 0,
      onlineRate: 100.0,
    };

    const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
    fetch("http://localhost:4000/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: cleanCode, groupName: newGroupForm.name.trim(), description: newGroupForm.desc })
    }).catch(e => console.warn(e));

    setGroups([newG, ...groups]);
    setIsCreateGroupOpen(false);
    setNewGroupForm({ name: "", code: "", desc: "", deviceCount: 0 });
    showToast(`Đã tạo và lưu nhóm sản phẩm vào PostgreSQL: ${newG.name}`);
  };

  const handleSaveGroupConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroupForm) return;

    const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
    fetch(`http://localhost:4000/api/admin/groups/${editGroupForm.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ groupName: editGroupForm.name, description: editGroupForm.desc })
    }).catch(e => console.warn(e));

    setGroups(groups.map(g => g.id === editGroupForm.id ? { ...g, ...editGroupForm } : g));
    showToast(`Đã cập nhật nhóm sản phẩm trong PostgreSQL: ${editGroupForm.name}`);
    setSelectedGroupConfig(null);
    setEditGroupForm(null);
  };

  const handleDeleteGroup = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa nhóm sản phẩm này?")) {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      fetch(`http://localhost:4000/api/admin/groups/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(e => console.warn(e));

      setGroups(groups.filter(g => g.id !== id));
      setSelectedGroupConfig(null);
      setEditGroupForm(null);
      showToast("Đã xóa nhóm sản phẩm thành công từ PostgreSQL", "info");
    }
  };

  // =========================================================
  // STATE: 2. Device Types
  // =========================================================
  const [deviceTypes, setDeviceTypes] = useState([
    { id: 10, code: "DOOR", name: "Cửa cuốn thông minh", icon: "🚪", activeCount: 5570 },
    { id: 11, code: "SMART_LOCK", name: "Khóa cửa thông minh", icon: "🔒", activeCount: 890 },
    { id: 18, code: "CAMERA", name: "Camera an ninh AI", icon: "📹", activeCount: 680 },
    { id: 19, code: "SENSOR_ENV", name: "Cảm biến nhiệt ẩm môi trường", icon: "🌡️", activeCount: 890 },
    { id: 12, code: "UPS", name: "Bộ lưu điện thông minh", icon: "⚡", activeCount: 3500 },
    { id: 14, code: "AUTO_DOOR", name: "Cửa trượt tự động", icon: "🚪", activeCount: 120 },
    { id: 15, code: "BIKE", name: "Xe máy điện / Định vị", icon: "🛵", activeCount: 450 },
    { id: 17, code: "SOCKET", name: "Ổ cắm thông minh", icon: "🔌", activeCount: 320 },
  ]);

  const [isCreateTypeOpen, setIsCreateTypeOpen] = useState(false);
  const [newTypeForm, setNewTypeForm] = useState({ name: "", code: "", icon: "📦" });
  const [selectedTypeConfig, setSelectedTypeConfig] = useState<any | null>(null);
  const [editTypeForm, setEditTypeForm] = useState<{ id: number; name: string; code: string; icon: string; activeCount: number } | null>(null);

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeForm.name || !newTypeForm.code) return;
    const cleanCode = newTypeForm.code.trim().toUpperCase();
    if (deviceTypes.some(t => t.code.trim().toUpperCase() === cleanCode)) {
      alert(`Mã loại phần cứng "${cleanCode}" đã tồn tại! Vui lòng chọn mã khác.`);
      return;
    }
    const newT = {
      id: Date.now() % 10000,
      name: newTypeForm.name.trim(),
      code: cleanCode,
      icon: newTypeForm.icon || "📦",
      activeCount: 0,
    };
    setDeviceTypes([...deviceTypes, newT]);
    setIsCreateTypeOpen(false);
    setNewTypeForm({ name: "", code: "", icon: "📦" });
    showToast(`Đã định nghĩa loại phần cứng: ${newT.name}`);
  };

  const handleSaveTypeConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTypeForm) return;
    setDeviceTypes(deviceTypes.map(t => t.id === editTypeForm.id ? { ...t, ...editTypeForm } : t));
    showToast(`Đã cập nhật loại phần cứng: ${editTypeForm.name}`);
    setSelectedTypeConfig(null);
    setEditTypeForm(null);
  };

  const handleDeleteType = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa loại phần cứng này?")) {
      setDeviceTypes(deviceTypes.filter(t => t.id !== id));
      showToast("Đã xóa loại phần cứng thành công!", "info");
      setSelectedTypeConfig(null);
      setEditTypeForm(null);
    }
  };

  // =========================================================
  // STATE: 3. Property Dictionary (Dynamic Schema)
  // =========================================================
  const [properties, setProperties] = useState([
    { id: 30, key: "battery_level", name: "Mức pin", type: "integer", unit: "%", widget: "gauge", ctrl: false },
    { id: 31, key: "speed", name: "Tốc độ di chuyển", type: "float", unit: "km/h", widget: "telemetry_graph", ctrl: false },
    { id: 36, key: "is_locked", name: "Trạng thái khóa", type: "boolean", unit: "", widget: "toggle", ctrl: true },
    { id: 38, key: "led_status", name: "Đèn tín hiệu", type: "boolean", unit: "", widget: "toggle", ctrl: true },
    { id: 39, key: "on_off_status", name: "Bật / Tắt nguồn", type: "boolean", unit: "", widget: "toggle", ctrl: true },
    { id: 44, key: "setvolbat", name: "Ngưỡng điện áp ắc quy", type: "float", unit: "V", widget: "slider", ctrl: true },
    { id: 48, key: "rf_list", name: "Danh sách remote RF", type: "json", unit: "", widget: "status_badge", ctrl: false },
    { id: 49, key: "expiredAt", name: "Thời hạn dịch vụ", type: "string", unit: "", widget: "status_badge", ctrl: false },
    { id: 50, key: "temperature", name: "Nhiệt độ môi trường", type: "float", unit: "°C", widget: "gauge", ctrl: false },
    { id: 51, key: "humidity", name: "Độ ẩm không khí", type: "float", unit: "%", widget: "gauge", ctrl: false },
    { id: 52, key: "camera_rtsp_stream", name: "Luồng video trực tiếp RTSP", type: "string", unit: "fps", widget: "telemetry_graph", ctrl: false },
    { id: 53, key: "motion_detected", name: "Cảnh báo chuyển động AI", type: "boolean", unit: "", widget: "toggle", ctrl: true },
  ]);

  const [newProp, setNewProp] = useState({ key: "", name: "", type: "integer", unit: "", widget: "gauge", ctrl: false });
  const [showAddProp, setShowAddProp] = useState(false);
  const [editingProperty, setEditingProperty] = useState<any | null>(null);

  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;
    setProperties(properties.map(p => p.id === editingProperty.id ? { ...p, ...editingProperty } : p));
    showToast(`Đã cập nhật thuộc tính: ${editingProperty.name}`);
    setEditingProperty(null);
  };

  const handleDeleteProperty = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa thuộc tính này?")) {
      setProperties(properties.filter(p => p.id !== id));
      showToast("Đã xóa thuộc tính schema thành công!", "info");
    }
  };

  // =========================================================
  // STATE: 4. Models
  // =========================================================
  const [models, setModels] = useState([
    { id: 1, code: "AUSTEC-A900", name: "Austec Titadoor A900 Super", group: "Cửa cuốn nhôm Đức", type: "Door", fw: "v2.4.1", hw: "HW-REV-C", assignedProperties: [30, 36, 38, 48] },
    { id: 2, code: "MASARU-X1", name: "Masaru Smart Lock X1 Pro", group: "Khóa Masaru chuẩn Nhật", type: "Smart Lock", fw: "v3.1.0", hw: "HW-REV-B", assignedProperties: [30, 36, 38, 49] },
    { id: 4, code: "AUSTEC-CAM-360", name: "Austec AI Vision Pro 360", group: "CAMERA AN NINH AI AUSTEC", type: "Camera", fw: "v4.2.0", hw: "HW-CAM-X2", assignedProperties: [30, 52, 53] },
    { id: 5, code: "SENSOR-TH-ZIGBEE", name: "Austec Smart Sensor Nhiệt Ẩm Zigbee", group: "CẢM BIẾN MÔI TRƯỜNG & NHIỆT ẨM", type: "Sensor", fw: "v1.2.3", hw: "HW-TH-Z1", assignedProperties: [30, 50, 51] },
    { id: 3, code: "UPS-220-SINE", name: "Austec UPS Sine 220V Intelligent", group: "Lưu điện AC 220V", type: "UPS", fw: "v1.8.2", hw: "HW-REV-A", assignedProperties: [30, 39, 44, 49] },
  ]);

  const [isCreateModelOpen, setIsCreateModelOpen] = useState(false);
  const [selectedModelConfig, setSelectedModelConfig] = useState<any | null>(null);
  const [editModelForm, setEditModelForm] = useState<{
    id: number;
    code: string;
    name: string;
    group: string;
    type: string;
    fw: string;
    hw: string;
    assignedProperties: number[];
  } | null>(null);

  const [newModelForm, setNewModelForm] = useState({
    code: "",
    name: "",
    group: "Cửa cuốn nhôm Đức",
    type: "Door",
    fw: "v1.0.0",
    hw: "HW-REV-A",
    assignedProperties: [30, 36, 38]
  });

  const handleCreateModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelForm.code || !newModelForm.name) return;
    const cleanCode = newModelForm.code.trim().toUpperCase();
    if (models.some(m => m.code.trim().toUpperCase() === cleanCode)) {
      alert(`Mã Model "${cleanCode}" đã tồn tại! Vui lòng chọn Model Code khác.`);
      return;
    }
    const newM = {
      id: Date.now() % 10000,
      ...newModelForm,
      code: cleanCode,
      name: newModelForm.name.trim(),
      assignedProperties: newModelForm.assignedProperties || [30, 36, 38]
    };
    setModels([...models, newM]);
    setIsCreateModelOpen(false);
    setNewModelForm({ code: "", name: "", group: "Cửa cuốn nhôm Đức", type: "Door", fw: "v1.0.0", hw: "HW-REV-A", assignedProperties: [30, 36, 38] });
    showToast(`Đã tạo Model thương phẩm: ${newM.name}`);
  };

  const handleSaveModelConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModelForm) return;
    setModels(models.map(m => m.id === editModelForm.id ? { ...m, ...editModelForm } : m));
    showToast(`Đã lưu cấu hình Model: ${editModelForm.name} thành công!`);
    setSelectedModelConfig(null);
    setEditModelForm(null);
  };

  const handleDeleteModel = (id: number) => {
    if (confirm(`Bạn có chắc chắn muốn xóa Model "${editModelForm?.name || ''}"?`)) {
      setModels(models.filter(m => m.id !== id));
      showToast("Đã xóa Model thương phẩm thành công!", "info");
      setSelectedModelConfig(null);
      setEditModelForm(null);
    }
  };

  // =========================================================
  // STATE: 5. Smart Import with Dry-Run Validation & Real File Parsing
  // =========================================================
  const [importStatus, setImportStatus] = useState<"IDLE" | "CHECKING" | "VALIDATED" | "ERROR" | "IMPORTED">("IDLE");
  const [importErrors, setImportErrors] = useState<Array<{ row: number; hardwareId: string; reason: string }>>([]);
  const [importCount, setImportCount] = useState(0);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const simulateDryRun = (hasError: boolean) => {
    setImportStatus("CHECKING");
    setUploadedFileName("");
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

  // Unified File Processor with Strict Anti-Duplicate Validation
  const processExcelFile = (file: File) => {
    if (!file) return;

    // Validate file extension
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
        // Map to store normalized hardware IDs and their first appearance row number
        const seenInFile = new Map<string, number>();

        json.forEach((row: any, idx: number) => {
          const rowNum = idx + 2; // Row 1 is header
          const hwIdRaw = String(row["Hardware ID (*)"] || row["Hardware ID"] || row["hardwareId"] || row["Mã Thiết Bị"] || row["Serial"] || "").trim();
          const name = String(row["Tên Thiết Bị (*)"] || row["Tên Thiết Bị"] || row["name"] || "").trim();
          const model = String(row["Model (*)"] || row["Model"] || row["model"] || "").trim();
          const group = String(row["Nhóm Sản Phẩm"] || row["group"] || "Cửa cuốn nhôm Đức").trim();
          const type = String(row["Loại Phần Cứng"] || row["type"] || "DOOR").trim();
          const owner = String(row["Chủ Sở Hữu / Khách Hàng"] || row["owner"] || "Kho Chờ Gán").trim();
          const phone = String(row["Số Điện Thoại"] || row["phone"] || "1900 886 999").trim();
          const warranty = String(row["Hạn Bảo Hành"] || row["warranty"] || "12/2028").trim();

          // 1. Empty Hardware ID check
          if (!hwIdRaw) {
            errors.push({ row: rowNum, hardwareId: "", reason: "Hardware ID không được để trống ô dữ liệu" });
            return;
          }

          const normalizedHwId = hwIdRaw.toUpperCase();

          // 2. Strict anti-duplicate check within the file itself
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

          // 3. Strict anti-duplicate check against database
          const existingDevice = devices.find(d => d.hwId.trim().toUpperCase() === normalizedHwId);
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

  // Real Excel File Upload input handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
    if (e.target) e.target.value = "";
  };

  // Drag and Drop Event Handlers
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

    // Secondary Anti-Duplicate Check before updating state
    const currentHwIds = new Set(devices.map(d => d.hwId.trim().toUpperCase()));
    const nonDuplicateRows = importRows.filter(r => !currentHwIds.has(r.hwId.trim().toUpperCase()));

    if (nonDuplicateRows.length === 0) {
      showToast("Toàn bộ thiết bị trong file đã tồn tại trong CSDL. Chống nhập trùng kích hoạt!", "warning");
      return;
    }

    setDevices(prev => [...nonDuplicateRows, ...prev]);
    setImportStatus("IMPORTED");
    if (nonDuplicateRows.length < importRows.length) {
      showToast(`Đã lưu ${nonDuplicateRows.length} thiết bị mới (đã tự động bỏ qua ${importRows.length - nonDuplicateRows.length} bản ghi trùng)!`, "warning");
    } else {
      showToast(`Đã lưu thành công toàn bộ ${nonDuplicateRows.length} thiết bị vào CSDL kho!`, "success");
    }
  };

  // Real File Downloads
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

  // =========================================================
  // STATE: 6. Device List & Slide-over Drawer
  // =========================================================
  const [devices, setDevices] = useState<any[]>([
    // Smart Doors
    { 
      hwId: "AT-DOOR-88239A01", 
      name: "Cửa cuốn Gara Đức Mạnh", 
      model: "AUSTEC-A900", 
      group: "Cửa cuốn nhôm Đức", 
      type: "DOOR", 
      owner: "Nguyễn Mạnh Đức", 
      phone: "0944 102 588", 
      status: "online", 
      isOnline: true, 
      battery: 98, 
      openState: "CLOSED", 
      isLocked: true, 
      signal: -62, 
      warranty: "12/2027",
      address: "Số 88, Phố Huế, P. Ngô Thì Nhậm, Q. Hai Bà Trưng, Hà Nội",
      deviceTypeDesc: "Cửa Cuốn Nan Nhôm Khe Thoáng Siêu Êm A900",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2027-10-21T00:00:00.000Z",
      subscriptionStatus: "ACTIVE"
    },
    { 
      hwId: "AT-DOOR-88239A04", 
      name: "Cửa cuốn Công Bằng", 
      model: "AUSTEC-A900", 
      group: "Cửa cuốn nhôm Đức", 
      type: "DOOR", 
      owner: "Nguyễn Công Bằng", 
      phone: "0933 753 799", 
      status: "offline", 
      isOnline: false, 
      battery: 0, 
      openState: "UNKNOWN", 
      isLocked: false, 
      signal: -95, 
      warranty: "10/2026",
      address: "Số 120, Trần Hưng Đạo, Q. 1, TP. Hồ Chí Minh",
      deviceTypeDesc: "Cửa Cuốn Thép Siêu Bền Công Nghệ Úc",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2026-10-21T00:00:00.000Z",
      subscriptionStatus: "ACTIVE"
    },
    { 
      hwId: "AT-DOOR-88239A05", 
      name: "Cửa cuốn Đình Long", 
      model: "AUSTEC-A900", 
      group: "Cửa cuốn nhôm Đức", 
      type: "DOOR", 
      owner: "Vũ Đình Long", 
      phone: "0977 641 983", 
      status: "online", 
      isOnline: true, 
      battery: 85, 
      openState: "OPEN", 
      isLocked: false, 
      signal: -64, 
      warranty: "11/2027",
      address: "Biệt thự BT4, KĐT Mỹ Đình 2, Nam Từ Liêm, Hà Nội",
      deviceTypeDesc: "Cửa Cuốn Nan Nhôm Khe Thoáng Siêu Êm A900",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2027-11-15T00:00:00.000Z",
      subscriptionStatus: "ACTIVE"
    },
    { 
      hwId: "AT-DOOR-88239A06", 
      name: "Cửa cuốn Lò Thị Mai", 
      model: "AUSTEC-A900", 
      group: "Cửa cuốn tấm liền Úc", 
      type: "DOOR", 
      owner: "Lò Thị Mai", 
      phone: "0362 227 229", 
      status: "online", 
      isOnline: true, 
      battery: 90, 
      openState: "CLOSED", 
      isLocked: true, 
      signal: -60, 
      warranty: "09/2027",
      address: "Số 25, Hoàng Văn Thụ, TP. Điện Biên Phủ, Điện Biên",
      deviceTypeDesc: "Cửa Cuốn Tấm Liền Công Nghệ Úc Titadoor",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2027-09-01T00:00:00.000Z",
      subscriptionStatus: "ACTIVE"
    },
    { 
      hwId: "AT-DOOR-88239A11", 
      name: "Cửa cuốn Showroom Austec", 
      model: "AUSTEC-A900", 
      group: "Cửa cuốn nhôm Đức", 
      type: "DOOR", 
      owner: "Austec Flagship", 
      phone: "024 3788 9999", 
      status: "online", 
      isOnline: true, 
      battery: 100, 
      openState: "CLOSED", 
      isLocked: true, 
      signal: -52, 
      warranty: "12/2028",
      address: "Tòa Nhà Austec Building, Cầu Giấy, Hà Nội",
      deviceTypeDesc: "Cửa Cuốn Nan Nhôm Thế Hệ Mới Flagship",
      subscriptionType: "PERPETUAL",
      subscriptionExpiresAt: null,
      subscriptionStatus: "LIFETIME"
    },
    { 
      hwId: "AT-DOOR-STOCK-07", 
      name: "Cửa cuốn Titadoor Dự phòng", 
      model: "AUSTEC-A900", 
      group: "Cửa cuốn nhôm Đức", 
      type: "DOOR", 
      owner: "Kho Tổng Austec", 
      phone: "1900 886 999", 
      status: "in_stock", 
      isOnline: false, 
      battery: 100, 
      openState: "STOCK", 
      isLocked: false, 
      signal: 0, 
      warranty: "Chưa kích hoạt",
      address: "Kho Tổng Miền Bắc - KCN Quế Võ, Bắc Ninh",
      deviceTypeDesc: "Cửa Cuốn Nan Nhôm Khe Thoáng A900",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: null,
      subscriptionStatus: "ACTIVE"
    },
    { 
      hwId: "AT-DOOR-88239A14", 
      name: "Cửa cuốn Xưởng Sản Xuất 03", 
      model: "AUSTEC-A900", 
      group: "Cửa cuốn tấm liền Úc", 
      type: "DOOR", 
      owner: "Xưởng Nhôm Austec", 
      phone: "028 3822 5566", 
      status: "offline", 
      isOnline: false, 
      battery: 0, 
      openState: "UNKNOWN", 
      isLocked: false, 
      signal: -98, 
      warranty: "04/2027",
      address: "KCN Tân Bình, Tân Phú, TP. Hồ Chí Minh",
      deviceTypeDesc: "Cửa Cuốn Tấm Liền Thép Cường Lực",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2027-04-10T00:00:00.000Z",
      subscriptionStatus: "ACTIVE"
    },

    // Smart Locks
    { 
      hwId: "AT-LOCK-77124B02", 
      name: "Khóa chính Biệt thự Dan Phung", 
      model: "MASARU-X1", 
      group: "Khóa Masaru chuẩn Nhật", 
      type: "SMART_LOCK", 
      owner: "Dan Phung", 
      phone: "0906 806 066", 
      status: "online", 
      isOnline: true, 
      battery: 92, 
      openState: "LOCKED", 
      isLocked: true, 
      signal: -58, 
      warranty: "05/2028",
      address: "Biệt thự Chateau, Phú Mỹ Hưng, Quận 7, TP. Hồ Chí Minh",
      deviceTypeDesc: "Khóa Vân Tay Thông Minh Masaru Titan X1 Chuẩn Nhật",
      subscriptionType: "PERPETUAL",
      subscriptionExpiresAt: null,
      subscriptionStatus: "LIFETIME"
    },
    { 
      hwId: "AT-LOCK-STOCK-08", 
      name: "Khóa thông minh Masaru X1", 
      model: "MASARU-X1", 
      group: "Khóa Masaru chuẩn Nhật", 
      type: "SMART_LOCK", 
      owner: "Kho Chi Nhánh Hà Nội", 
      phone: "1900 886 999", 
      status: "in_stock", 
      isOnline: false, 
      battery: 100, 
      openState: "STOCK", 
      isLocked: false, 
      signal: 0, 
      warranty: "Chưa kích hoạt",
      address: "Kho Phân Phối Hà Đông, Hà Nội",
      deviceTypeDesc: "Khóa Masaru X1 Mặt Gương Chống Trầy",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: null,
      subscriptionStatus: "ACTIVE"
    },
    { 
      hwId: "AT-LOCK-77124B12", 
      name: "Khóa Căn Hộ Penthouse 02", 
      model: "MASARU-X1", 
      group: "Khóa Masaru chuẩn Nhật", 
      type: "SMART_LOCK", 
      owner: "Hoàng Bích Thủy", 
      phone: "0934 556 789", 
      status: "online", 
      isOnline: true, 
      battery: 88, 
      openState: "LOCKED", 
      isLocked: true, 
      signal: -68, 
      warranty: "03/2028",
      address: "Tòa Park 11, Vinhomes Times City, Hai Bà Trưng, Hà Nội",
      deviceTypeDesc: "Khóa Vân Tay Nhận Diện Gương Mặt 3D Face Masaru",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2027-03-25T00:00:00.000Z",
      subscriptionStatus: "ACTIVE"
    },
    { 
      hwId: "AT-LOCK-STOCK-15", 
      name: "Khóa Masaru Pro Nhập Kho", 
      model: "MASARU-X1", 
      group: "Khóa Masaru chuẩn Nhật", 
      type: "SMART_LOCK", 
      owner: "Kho Tổng Cần Thơ", 
      phone: "1900 886 999", 
      status: "in_stock", 
      isOnline: false, 
      battery: 100, 
      openState: "STOCK", 
      isLocked: false, 
      signal: 0, 
      warranty: "Chưa kích hoạt",
      address: "Kho Tổng Tây Nam Bộ, Ninh Kiều, Cần Thơ",
      deviceTypeDesc: "Khóa Vân Tay Push-Pull Masaru Titan",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: null,
      subscriptionStatus: "ACTIVE"
    },

    // Camera AI
    { 
      hwId: "AT-CAM-00109A01", 
      name: "Camera Cổng Chính Biệt Thự", 
      model: "AUSTEC-CAM-360", 
      group: "CAMERA AN NINH AI AUSTEC", 
      type: "CAMERA", 
      owner: "Nguyễn Mạnh Đức", 
      phone: "0944 102 588", 
      status: "online", 
      isOnline: true, 
      battery: 100, 
      openState: "STREAMING", 
      isLocked: false, 
      signal: -48, 
      warranty: "12/2027", 
      temp: 28.5, 
      humidity: 62, 
      motion: true,
      address: "Số 88, Phố Huế, P. Ngô Thì Nhậm, Q. Hai Bà Trưng, Hà Nội",
      deviceTypeDesc: "Camera An Ninh AI 360 Độ Quay Quét Ban Đêm 4K",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2027-12-01T00:00:00.000Z",
      subscriptionStatus: "ACTIVE"
    },
    { 
      hwId: "AT-CAM-00109A02", 
      name: "Camera Sân Vườn Sau", 
      model: "AUSTEC-CAM-360", 
      group: "CAMERA AN NINH AI AUSTEC", 
      type: "CAMERA", 
      owner: "Dan Phung", 
      phone: "0906 806 066", 
      status: "online", 
      isOnline: true, 
      battery: 100, 
      openState: "STREAMING", 
      isLocked: false, 
      signal: -55, 
      warranty: "05/2028", 
      temp: 29.1, 
      humidity: 65, 
      motion: false,
      address: "Biệt thự Chateau, Phú Mỹ Hưng, Quận 7, TP. Hồ Chí Minh",
      deviceTypeDesc: "Camera Ngoài Trời Kháng Nước IP67 AI Vision",
      subscriptionType: "PERPETUAL",
      subscriptionExpiresAt: null,
      subscriptionStatus: "LIFETIME"
    },
    { 
      hwId: "AT-CAM-00109A03", 
      name: "Camera Gara Ô tô Showroom", 
      model: "AUSTEC-CAM-360", 
      group: "CAMERA AN NINH AI AUSTEC", 
      type: "CAMERA", 
      owner: "Austec Flagship", 
      phone: "024 3788 9999", 
      status: "online", 
      isOnline: true, 
      battery: 100, 
      openState: "STREAMING", 
      isLocked: false, 
      signal: -50, 
      warranty: "12/2028", 
      temp: 26.8, 
      humidity: 58, 
      motion: true,
      address: "Tòa Nhà Austec Building, Cầu Giấy, Hà Nội",
      deviceTypeDesc: "Camera AI Nhận Diện Biển Số & Khuôn Mặt UltraHD",
      subscriptionType: "PERPETUAL",
      subscriptionExpiresAt: null,
      subscriptionStatus: "LIFETIME"
    },
    { 
      hwId: "AT-CAM-STOCK-04", 
      name: "Camera AI Vision Dự Phòng", 
      model: "AUSTEC-CAM-360", 
      group: "CAMERA AN NINH AI AUSTEC", 
      type: "CAMERA", 
      owner: "Kho Tổng Austec", 
      phone: "1900 886 999", 
      status: "in_stock", 
      isOnline: false, 
      battery: 100, 
      openState: "STOCK", 
      isLocked: false, 
      signal: 0, 
      warranty: "Chưa kích hoạt",
      address: "Kho Tổng Miền Bắc - KCN Quế Võ, Bắc Ninh",
      deviceTypeDesc: "Camera An Ninh AI 360 Độ Quay Quét Ban Đêm",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: null,
      subscriptionStatus: "ACTIVE"
    },

    // Cảm biến môi trường nhiệt độ độ ẩm
    { 
      hwId: "AT-SENSOR-TH-8801", 
      name: "Cảm Biến Nhiệt Ẩm Phòng Server", 
      model: "SENSOR-TH-ZIGBEE", 
      group: "CẢM BIẾN MÔI TRƯỜNG & NHIỆT ẨM", 
      type: "SENSOR_ENV", 
      owner: "Kỹ Thuật Austec", 
      phone: "1900 886 999", 
      status: "online", 
      isOnline: true, 
      battery: 94, 
      openState: "24.2°C / 52%", 
      isLocked: false, 
      signal: -59, 
      warranty: "08/2027", 
      temp: 24.2, 
      humidity: 52,
      address: "Phòng Máy Chủ IDC, Cầu Giấy, Hà Nội",
      deviceTypeDesc: "Cảm Biến Nhiệt Độ & Độ Ẩm Không Khí Zigbee 3.0",
      subscriptionType: "PERPETUAL",
      subscriptionExpiresAt: null,
      subscriptionStatus: "LIFETIME"
    },
    { 
      hwId: "AT-SENSOR-TH-8802", 
      name: "Cảm Biến Nhiệt Ẩm Kho Dược Phẩm", 
      model: "SENSOR-TH-ZIGBEE", 
      group: "CẢM BIẾN MÔI TRƯỜNG & NHIỆT ẨM", 
      type: "SENSOR_ENV", 
      owner: "Công Ty Dược Hoàng Gia", 
      phone: "0912 345 678", 
      status: "online", 
      isOnline: true, 
      battery: 89, 
      openState: "21.5°C / 48%", 
      isLocked: false, 
      signal: -63, 
      warranty: "10/2027", 
      temp: 21.5, 
      humidity: 48,
      address: "Số 16, Đường 3/2, Quận 10, TP. Hồ Chí Minh",
      deviceTypeDesc: "Cảm Biến Môi Trường Độ Chính Xác Cao GSP",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2027-10-15T00:00:00.000Z",
      subscriptionStatus: "ACTIVE"
    },
    { 
      hwId: "AT-SENSOR-TH-8803", 
      name: "Cảm Biến Nhiệt Ẩm Phòng Master", 
      model: "SENSOR-TH-ZIGBEE", 
      group: "CẢM BIẾN MÔI TRƯỜNG & NHIỆT ẨM", 
      type: "SENSOR_ENV", 
      owner: "Hoàng Bích Thủy", 
      phone: "0934 556 789", 
      status: "online", 
      isOnline: true, 
      battery: 96, 
      openState: "26.0°C / 60%", 
      isLocked: false, 
      signal: -56, 
      warranty: "03/2028", 
      temp: 26.0, 
      humidity: 60,
      address: "Tòa Park 11, Vinhomes Times City, Hai Bà Trưng, Hà Nội",
      deviceTypeDesc: "Cảm Biến Nhiệt Ẩm Đa Vùng Màn Hình E-Ink",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2027-03-10T00:00:00.000Z",
      subscriptionStatus: "ACTIVE"
    },
    { 
      hwId: "AT-SENSOR-TH-8804", 
      name: "Cảm Biến Nhiệt Ẩm Nhà Màng Rau", 
      model: "SENSOR-TH-ZIGBEE", 
      group: "CẢM BIẾN MÔI TRƯỜNG & NHIỆT ẨM", 
      type: "SENSOR_ENV", 
      owner: "Hợp Tác Xã Rau Sạch", 
      phone: "0978 999 111", 
      status: "online", 
      isOnline: true, 
      battery: 78, 
      openState: "31.4°C / 78%", 
      isLocked: false, 
      signal: -71, 
      warranty: "11/2026", 
      temp: 31.4, 
      humidity: 78,
      address: "Xã Trạm Hành, TP. Đà Lạt, Lâm Đồng",
      deviceTypeDesc: "Cảm Biến Nông Nghiệp Thông Minh Kháng Bụi Ẩm",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2026-11-20T00:00:00.000Z",
      subscriptionStatus: "ACTIVE"
    },
    { 
      hwId: "AT-SENSOR-TH-8805", 
      name: "Cảm Biến Nhiệt Ẩm Xưởng Gỗ", 
      model: "SENSOR-TH-ZIGBEE", 
      group: "CẢM BIẾN MÔI TRƯỜNG & NHIỆT ẨM", 
      type: "SENSOR_ENV", 
      owner: "Xưởng Mộc Bình Minh", 
      phone: "0983 222 333", 
      status: "offline", 
      isOnline: false, 
      battery: 12, 
      openState: "UNKNOWN", 
      isLocked: false, 
      signal: -92, 
      warranty: "05/2026", 
      temp: 0, 
      humidity: 0,
      address: "Làng Nghề Mộc Chàng Sơn, Thạch Thất, Hà Nội",
      deviceTypeDesc: "Cảm Biến Giám Sát Phòng Cháy & Nhiệt Độ Cao",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2026-05-15T00:00:00.000Z",
      subscriptionStatus: "EXPIRED"
    },
    { 
      hwId: "AT-SENSOR-STOCK-06", 
      name: "Cảm Biến Zigbee Tồn Kho", 
      model: "SENSOR-TH-ZIGBEE", 
      group: "CẢM BIẾN MÔI TRƯỜNG & NHIỆT ẨM", 
      type: "SENSOR_ENV", 
      owner: "Kho Chi Nhánh Hà Nội", 
      phone: "1900 886 999", 
      status: "in_stock", 
      isOnline: false, 
      battery: 100, 
      openState: "STOCK", 
      isLocked: false, 
      signal: 0, 
      warranty: "Chưa kích hoạt",
      address: "Kho Phân Phối Hà Đông, Hà Nội",
      deviceTypeDesc: "Cảm Biến Nhiệt Ẩm Chuẩn Zigbee 3.0",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: null,
      subscriptionStatus: "ACTIVE"
    },

    // UPS & Bike
    { 
      hwId: "AT-UPS-99011C03", 
      name: "Lưu điện UPS Nhà Quang", 
      model: "UPS-220-SINE", 
      group: "Lưu điện AC 220V", 
      type: "UPS", 
      owner: "Nguyễn Văn Quang", 
      phone: "0982 487 278", 
      status: "online", 
      isOnline: true, 
      battery: 100, 
      openState: "AC_POWER", 
      isLocked: false, 
      signal: -70, 
      warranty: "01/2027",
      address: "Số 14, Đường Phan Đình Phùng, TP. Hải Phòng",
      deviceTypeDesc: "Bộ Lưu Điện Sóng Sin Chuẩn Pro 220V Cho Cửa Cuốn",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2027-01-18T00:00:00.000Z",
      subscriptionStatus: "ACTIVE"
    },
    { 
      hwId: "AT-UPS-STOCK-09", 
      name: "Bộ lưu điện Sine 220V", 
      model: "UPS-220-SINE", 
      group: "Lưu điện AC 220V", 
      type: "UPS", 
      owner: "Kho Trung Chuyển Đà Nẵng", 
      phone: "1900 886 999", 
      status: "in_stock", 
      isOnline: false, 
      battery: 100, 
      openState: "STOCK", 
      isLocked: false, 
      signal: 0, 
      warranty: "Chưa kích hoạt",
      address: "Kho Vận Hải Châu, TP. Đà Nẵng",
      deviceTypeDesc: "Bộ Lưu Điện Sin Chuẩn 220V Tải Nặng",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: null,
      subscriptionStatus: "ACTIVE"
    },
    { 
      hwId: "AT-UPS-99011C13", 
      name: "Bộ Lưu Điện Dự Phòng Hub", 
      model: "UPS-220-SINE", 
      group: "Lưu điện tiêu chuẩn", 
      type: "UPS", 
      owner: "Kỹ Thuật Austec", 
      phone: "1900 886 999", 
      status: "online", 
      isOnline: true, 
      battery: 100, 
      openState: "AC_POWER", 
      isLocked: false, 
      signal: -65, 
      warranty: "08/2027",
      address: "Phòng Điều Hành Trung Tâm, Cầu Giấy, Hà Nội",
      deviceTypeDesc: "Bộ Lưu Điện Công Nghiệp 3000VA Online",
      subscriptionType: "PERPETUAL",
      subscriptionExpiresAt: null,
      subscriptionStatus: "LIFETIME"
    },
    { 
      hwId: "AT-BIKE-55410D10", 
      name: "GSHT Xe Giao Hàng 01", 
      model: "GSHT-A4G", 
      group: "GSHT", 
      type: "BIKE", 
      owner: "Vận Tải Hoàng Minh", 
      phone: "0915 889 001", 
      status: "online", 
      isOnline: true, 
      battery: 95, 
      openState: "TRACKING", 
      isLocked: true, 
      signal: -61, 
      warranty: "06/2027",
      address: "Bến Xe Miền Đông Mới, TP. Thủ Đức, TP. Hồ Chí Minh",
      deviceTypeDesc: "Thiết Bị Giám Sát Hành Trình 4G LTE Chống Nước",
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: "2027-06-15T00:00:00.000Z",
      subscriptionStatus: "ACTIVE"
    }
  ]);

  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [controlLoading, setControlLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState(searchParams.get("search") || "");
  const [filterGroup, setFilterGroup] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [deviceCurrentPage, setDeviceCurrentPage] = useState(1);
  const [devicePageSize, setDevicePageSize] = useState(10);

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      // 1. Keyword search (ID, name, owner, phone, model, address)
      const q = searchFilter.trim().toLowerCase();
      const matchesSearch = !q ||
        d.hwId.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q) ||
        d.owner.toLowerCase().includes(q) ||
        d.phone.includes(q) ||
        d.model.toLowerCase().includes(q) ||
        (d.address && d.address.toLowerCase().includes(q));

      // 2. Group filter
      const matchesGroup = filterGroup === "ALL" || 
        d.group.toLowerCase().includes(filterGroup.toLowerCase()) ||
        filterGroup.toLowerCase().includes(d.group.toLowerCase());

      // 3. Type filter
      const matchesType = filterType === "ALL" || d.type === filterType;

      // 4. Status filter
      const matchesStatus = filterStatus === "ALL" || d.status === filterStatus;

      return matchesSearch && matchesGroup && matchesType && matchesStatus;
    });
  }, [devices, searchFilter, filterGroup, filterType, filterStatus]);

  // Reset page when filters change
  useEffect(() => {
    setDeviceCurrentPage(1);
  }, [searchFilter, filterGroup, filterType, filterStatus]);

  const totalDevicePages = Math.max(1, Math.ceil(filteredDevices.length / devicePageSize));
  const paginatedDevices = useMemo(() => {
    const start = (deviceCurrentPage - 1) * devicePageSize;
    return filteredDevices.slice(start, start + devicePageSize);
  }, [filteredDevices, deviceCurrentPage, devicePageSize]);

  const handleToggleDoor = async (hwId: string, newState: string) => {
    setControlLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const action = newState === "OPENED" ? "OPEN" : newState === "CLOSED" ? "CLOSE" : newState === "STOPPED" ? "STOP" : newState;
      await fetch("http://localhost:4000/api/devices/control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          hardwareId: hwId,
          action: action
        })
      });

      setDevices((prev) =>
        prev.map((d) => (d.hwId === hwId ? { ...d, openState: newState } : d))
      );
      if (selectedDevice?.hwId === hwId) {
        setSelectedDevice((prev: any) => ({ ...prev, openState: newState }));
      }
      showToast(`Lệnh ${newState} đã ghi Hộp đen & cập nhật PostgreSQL thành công!`);
    } catch {
      setDevices((prev) =>
        prev.map((d) => (d.hwId === hwId ? { ...d, openState: newState } : d))
      );
      showToast(`Lệnh ${newState} đã thực thi cục bộ`);
    } finally {
      setControlLoading(false);
    }
  };

  const handleEmergencyLock = async (hwId: string) => {
    setControlLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      await fetch("http://localhost:4000/api/devices/control", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          hardwareId: hwId,
          action: "EMERGENCY_LOCK"
        })
      });

      setDevices((prev) =>
        prev.map((d) => (d.hwId === hwId ? { ...d, isLocked: !d.isLocked, openState: "LOCKED" } : d))
      );
      if (selectedDevice?.hwId === hwId) {
        setSelectedDevice((prev: any) => ({ ...prev, isLocked: !prev.isLocked, openState: "LOCKED" }));
      }
      showToast(`Đã kích hoạt Khóa Khẩn Cấp & ghi Hộp Đen SHA-256 cho ${hwId}!`, "warning");
    } catch {
      setDevices((prev) =>
        prev.map((d) => (d.hwId === hwId ? { ...d, isLocked: !d.isLocked, openState: "LOCKED" } : d))
      );
      showToast(`Đã bật khóa khẩn cấp cục bộ`, "warning");
    } finally {
      setControlLoading(false);
    }
  };

  const [renewLoading, setRenewLoading] = useState(false);

  const handleRenewDevice = async (hwId: string, months: number, isPerpetual: boolean) => {
    setRenewLoading(true);
    try {
      await fetch(`http://localhost:4000/api/devices/${hwId}/renew`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer austec-admin-super-token"
        },
        body: JSON.stringify({ months, isPerpetual })
      }).catch(() => null);

      const now = new Date();
      let expiresAt: string | null = null;
      if (!isPerpetual) {
        let baseDate = selectedDevice?.subscriptionExpiresAt ? new Date(selectedDevice.subscriptionExpiresAt) : new Date();
        if (isNaN(baseDate.getTime()) || baseDate < now) baseDate = new Date(now);
        baseDate.setMonth(baseDate.getMonth() + months);
        expiresAt = baseDate.toISOString();
      }

      const updateData = {
        subscriptionType: isPerpetual ? "PERPETUAL" : "LIMITED",
        subscriptionExpiresAt: expiresAt,
        subscriptionStatus: isPerpetual ? "LIFETIME" : "ACTIVE"
      };

      setDevices((prev) => prev.map((d) => (d.hwId === hwId ? { ...d, ...updateData } : d)));
      if (selectedDevice?.hwId === hwId) {
        setSelectedDevice((prev: any) => ({ ...prev, ...updateData }));
      }

      showToast(
        isPerpetual
          ? `Đã nâng cấp ${hwId} thành VÔ THỜI HẠN (Trọn đời)!`
          : `Đã gia hạn thành công ${hwId} thêm ${months} tháng dịch vụ!`,
        "success"
      );
    } catch {
      showToast(`Lỗi thao tác gia hạn thiết bị`, "warning");
    } finally {
      setRenewLoading(false);
    }
  };

  // Manual Device Creation Modal & Form with Anti-Duplicate Check
  const [isCreateDeviceOpen, setIsCreateDeviceOpen] = useState(false);
  const [newDeviceForm, setNewDeviceForm] = useState({
    hwId: "",
    name: "",
    model: "AUSTEC-A900",
    group: "Cửa cuốn nhôm Đức",
    type: "DOOR",
    owner: "",
    phone: "",
    warranty: "12/2028"
  });

  const isDuplicateHwId = useMemo(() => {
    const trimmed = newDeviceForm.hwId.trim().toUpperCase();
    if (!trimmed) return false;
    return devices.some(d => d.hwId.trim().toUpperCase() === trimmed);
  }, [newDeviceForm.hwId, devices]);

  const handleCreateDevice = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedHwId = newDeviceForm.hwId.trim().toUpperCase();
    if (!trimmedHwId || !newDeviceForm.name.trim()) {
      alert("Vui lòng điền đầy đủ Hardware ID và Tên thiết bị!");
      return;
    }

    // Strict Anti-Duplicate check
    const duplicate = devices.find(d => d.hwId.trim().toUpperCase() === trimmedHwId);
    if (duplicate) {
      alert(`Lỗi chống nhập trùng: Hardware ID "${newDeviceForm.hwId.trim()}" đã tồn tại cho thiết bị "${duplicate.name}" (${duplicate.owner})! Vui lòng dùng mã khác.`);
      return;
    }

    const newDev: any = {
      hwId: newDeviceForm.hwId.trim(),
      name: newDeviceForm.name.trim(),
      model: newDeviceForm.model,
      group: newDeviceForm.group,
      type: newDeviceForm.type,
      owner: newDeviceForm.owner.trim() || "Kho Chờ Gán",
      phone: newDeviceForm.phone.trim() || "1900 886 999",
      status: "in_stock",
      isOnline: false,
      battery: 100,
      openState: "STOCK",
      isLocked: false,
      signal: 0,
      warranty: newDeviceForm.warranty.trim() || "12/2028",
      address: "Kho Tổng Phân Phối Austec",
      deviceTypeDesc: newDeviceForm.group,
      subscriptionType: "LIMITED",
      subscriptionExpiresAt: null,
      subscriptionStatus: "ACTIVE"
    };

    setDevices([newDev, ...devices]);
    setIsCreateDeviceOpen(false);
    setNewDeviceForm({
      hwId: "",
      name: "",
      model: "AUSTEC-A900",
      group: "Cửa cuốn nhôm Đức",
      type: "DOOR",
      owner: "",
      phone: "",
      warranty: "12/2028"
    });
    showToast(`Đã thêm thành công thiết bị: ${newDev.name} (${newDev.hwId})`, "success");
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2 overflow-hidden">
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-3.5 py-2.5 rounded-lg border shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in slide-in-from-bottom duration-200 ${
          toast.type === "success" 
            ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/40" 
            : toast.type === "warning"
                ? "bg-amber-950/90 text-amber-300 border-amber-500/40"
                : "bg-slate-900/90 text-cyan-300 border-cyan-500/40"
        }`}>
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* TAB NAVIGATION HEADER */}
      <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div>
          <h1 className="text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Quản Lý Thiết Bị Tập Trung (Device Management)
          </h1>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 rounded-lg gap-1 overflow-x-auto max-w-full shrink-0">
          <button
            type="button"
            onClick={() => switchTab("groups")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "groups" ? "bg-indigo-600 text-white shadow-xs font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>1. Group</span>
          </button>
          <button
            type="button"
            onClick={() => switchTab("types")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "types" ? "bg-purple-600 text-white shadow-xs font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>2. Type</span>
          </button>
          <button
            type="button"
            onClick={() => switchTab("properties")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "properties" ? "bg-emerald-600 text-white shadow-xs font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>3. Property</span>
          </button>
          <button
            type="button"
            onClick={() => switchTab("models")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "models" ? "bg-amber-600 text-white shadow-xs font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>4. Model</span>
          </button>
          <button
            type="button"
            onClick={() => switchTab("import")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "import" ? "bg-green-600 text-white shadow-xs font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>5. Import</span>
          </button>
          <button
            type="button"
            onClick={() => switchTab("list")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "list" ? "bg-cyan-600 text-white shadow-xs font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>6. Device List</span>
          </button>
        </div>
      </div>

      {/* TABS VIEWPORT CONTAINER (Strict 100vh, inner scroll) */}
      <div className="flex-1 min-h-0 overflow-hidden">
      {/* ========================================================= */}
      {/* TAB 1: GROUP MANAGEMENT */}
      {/* ========================================================= */}
      {activeTab === "groups" && (
        <div className="h-full overflow-y-auto pr-1 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 dark:text-slate-400">Danh mục các dòng sản phẩm & thương hiệu mẹ (Product Family)</span>
            {canCreate("mod_dev") && (
              <button 
                type="button"
                onClick={() => setIsCreateGroupOpen(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo Nhóm Mới</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.map((g) => (
              <div key={g.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-indigo-500/50 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded font-bold">ID #{g.id}</span>
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">{g.onlineRate}% Online</span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{g.name}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{g.desc}</p>
                </div>
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Quy mô: <strong className="text-slate-900 dark:text-white font-mono">{formatNum(g.deviceCount)}</strong> TB</span>
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedGroupConfig(g);
                      setEditGroupForm({ ...g });
                    }}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 text-xs font-bold cursor-pointer"
                  >
                    Cấu hình →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: DEVICE TYPES */}
      {/* ========================================================= */}
      {activeTab === "types" && (
        <div className="h-full overflow-y-auto pr-1 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 dark:text-slate-400">Phân loại phần cứng kỹ thuật (Hardware Archetype)</span>
            {canCreate("mod_dev") && (
              <button 
                type="button"
                onClick={() => setIsCreateTypeOpen(true)}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Loại Mới</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {deviceTypes.map((t) => (
              <div 
                key={t.id} 
                onClick={() => {
                  setSelectedTypeConfig(t);
                  setEditTypeForm({ ...t });
                }}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center gap-3.5 hover:border-purple-500/50 cursor-pointer transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-xl shrink-0">
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{t.name}</span>
                    <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded font-bold border border-purple-200 dark:border-purple-800 shrink-0">{t.code}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    <span>Đang hoạt động: <span className="font-mono text-slate-900 dark:text-slate-200 font-bold">{formatNum(t.activeCount)} TB</span></span>
                    <span className="text-purple-600 dark:text-purple-400 text-[10px] font-semibold">Chỉnh sửa →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DYNAMIC PROPERTY SCHEMA BUILDER */}
      {/* ========================================================= */}
      {activeTab === "properties" && (
        <div className="h-full overflow-y-auto pr-1 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Từ điển tham số Telemetry động — Cho phép Admin thêm thuộc tính mới mà không cần sửa mã nguồn Backend hay Mobile App
            </span>
            {canCreate("mod_dev") && (
              <button
                type="button"
                onClick={() => setShowAddProp(!showAddProp)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddProp ? "Đóng Form" : "Thêm Thuộc Tính Mới"}</span>
              </button>
            )}
          </div>

          {/* Form thêm thuộc tính trực quan */}
          {showAddProp && (
            <div className="p-4 rounded-lg border border-emerald-500/30 bg-slate-50 dark:bg-slate-900 shadow-xs space-y-3 animate-in fade-in duration-150">
              <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Trình Tạo Thuộc Tính Động (Schema Builder)</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">Mã Thuộc Tính (Key)</label>
                  <input
                    type="text"
                    placeholder="vd: pm25_air_quality"
                    value={newProp.key}
                    onChange={(e) => setNewProp({ ...newProp, key: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">Tên Hiển Thị (Label)</label>
                  <input
                    type="text"
                    placeholder="vd: Chỉ số bụi mịn PM2.5"
                    value={newProp.name}
                    onChange={(e) => setNewProp({ ...newProp, name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">Kiểu Dữ Liệu</label>
                  <select
                    value={newProp.type}
                    onChange={(e) => setNewProp({ ...newProp, type: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="integer">Số nguyên (Integer)</option>
                    <option value="float">Số thực (Float)</option>
                    <option value="boolean">Bật/Tắt (Boolean)</option>
                    <option value="string">Chuỗi (String)</option>
                    <option value="enum">Danh mục (Enum)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block mb-1">Widget Trên App</label>
                  <select
                    value={newProp.widget}
                    onChange={(e) => setNewProp({ ...newProp, widget: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="gauge">Vòng đo (Gauge)</option>
                    <option value="toggle">Nút gạt (Toggle Switch)</option>
                    <option value="slider">Thanh trượt (Slider)</option>
                    <option value="status_badge">Huy hiệu (Status Badge)</option>
                    <option value="telemetry_graph">Đồ thị sóng (Graph)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProp(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (newProp.key && newProp.name) {
                      const cleanKey = newProp.key.trim().toLowerCase();
                      if (properties.some(p => p.key.trim().toLowerCase() === cleanKey)) {
                        alert(`Mã thuộc tính (Key) "${cleanKey}" đã tồn tại trong Schema! Vui lòng chọn key khác.`);
                        return;
                      }
                      setProperties((prev) => [
                        ...prev,
                        { id: Date.now(), ...newProp, key: cleanKey, name: newProp.name.trim() } as any,
                      ]);
                      setShowAddProp(false);
                      setNewProp({ key: "", name: "", type: "integer", unit: "", widget: "gauge", ctrl: false });
                      showToast(`Đã lưu thuộc tính mới: ${newProp.name}`);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-1.5 rounded-lg cursor-pointer font-semibold"
                >
                  Lưu Thuộc Tính
                </button>
              </div>
            </div>
          )}

          {/* Danh sách thuộc tính */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <tr>
                  <th className="p-2.5">Mã Thuộc Tính (Key)</th>
                  <th className="p-2.5">Tên Hiển Thị</th>
                  <th className="p-2.5">Kiểu Dữ Liệu</th>
                  <th className="p-2.5">Đơn Vị</th>
                  <th className="p-2.5">Widget Trên App</th>
                  <th className="p-2.5">Điều Khiển Được?</th>
                  <th className="p-2.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {properties.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300">
                    <td className="p-2.5 font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{p.key}</td>
                    <td className="p-2.5 font-medium text-slate-900 dark:text-white">{p.name}</td>
                    <td className="p-2.5"><span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-200 dark:border-slate-700">{p.type}</span></td>
                    <td className="p-2.5 font-mono">{p.unit || "---"}</td>
                    <td className="p-2.5"><span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">{p.widget}</span></td>
                    <td className="p-2.5">{p.ctrl ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">Có (Hai chiều)</span> : <span className="text-slate-400">Chỉ đọc</span>}</td>
                    <td className="p-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canUpdate("mod_dev") && (
                          <button
                            type="button"
                            onClick={() => setEditingProperty({ ...p })}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                          >
                            Sửa
                          </button>
                        )}
                        {canDelete("mod_dev") && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProperty(p.id)}
                            className="text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: MODELS */}
      {/* ========================================================= */}
      {activeTab === "models" && (
        <div className="h-full overflow-y-auto pr-1 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 dark:text-slate-400">Khuôn mẫu thương phẩm lắp ghép: Group + Type + Bộ thuộc tính Property</span>
            {canCreate("mod_dev") && (
              <button 
                type="button"
                onClick={() => setIsCreateModelOpen(true)}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tạo Model Mới</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {models.map((m) => (
              <div key={m.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2.5">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded">{m.code}</span>
                  <span className="text-[11px] font-mono text-slate-500">{m.fw} / {m.hw}</span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{m.name}</h3>
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <div>Thuộc dòng: <strong className="text-slate-800 dark:text-slate-200">{m.group}</strong></div>
                  <div>Phân loại KT: <strong className="text-slate-800 dark:text-slate-200">{m.type}</strong></div>
                </div>
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Đã gán {(m as any).assignedProperties ? (m as any).assignedProperties.length : 4} Properties
                  </span>
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedModelConfig(m);
                      setEditModelForm({
                        id: m.id,
                        code: m.code,
                        name: m.name,
                        group: m.group,
                        type: m.type,
                        fw: m.fw,
                        hw: m.hw,
                        assignedProperties: (m as any).assignedProperties || [30, 36, 38, 48],
                      });
                    }}
                    className="text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer font-bold"
                  >
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: SMART IMPORT (EXCEL DRY-RUN & QR CODES) */}
      {/* ========================================================= */}
      {activeTab === "import" && (
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

            {/* Hidden File Input for Real Excel Upload */}
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileUpload} 
              className="hidden" 
            />

            {/* Interactive File Dropzone with Drag and Drop Support */}
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
                  {canCreate("mod_dev") && (
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

                {/* Real parsed rows preview if user uploaded a file */}
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
      )}

      {/* ========================================================= */}
      {/* TAB 6: DEVICE LIST WITH INLINE MASTER-DETAIL SPLIT VIEW */}
      {/* ========================================================= */}
      {activeTab === "list" && (
        <div className="h-full flex flex-col min-h-0 space-y-2">
          {/* Filter Bar with Comboboxes */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              {/* Keyword Search */}
              <div className="relative min-w-[200px] max-w-xs flex-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm Serial, Khách hàng, SĐT..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md pl-8 pr-7 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 placeholder:text-slate-400"
                />
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Combobox: Nhóm thiết bị */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0 hidden sm:inline">Nhóm:</span>
                <select
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-medium cursor-pointer"
                >
                  <option value="ALL">Tất cả nhóm</option>
                  <option value="Cửa cuốn nhôm Đức">Cửa cuốn nhôm Đức</option>
                  <option value="Khóa Masaru chuẩn Nhật">Khóa Masaru chuẩn Nhật</option>
                  <option value="CAMERA AN NINH AI AUSTEC">Camera an ninh AI Austec</option>
                  <option value="CẢM BIẾN MÔI TRƯỜNG & NHIỆT ẨM">Cảm biến môi trường nhiệt ẩm</option>
                  <option value="Lưu điện AC 220V">Lưu điện AC 220V</option>
                  <option value="Cửa cuốn tấm liền Úc">Cửa cuốn tấm liền Úc</option>
                  <option value="GSHT">GSHT</option>
                </select>
              </div>

              {/* Combobox: Loại phần cứng */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0 hidden sm:inline">Loại:</span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-medium cursor-pointer"
                >
                  <option value="ALL">Tất cả loại</option>
                  <option value="DOOR">Cửa cuốn (DOOR)</option>
                  <option value="SMART_LOCK">Khóa thông minh (SMART_LOCK)</option>
                  <option value="CAMERA">Camera AI (CAMERA)</option>
                  <option value="SENSOR_ENV">Cảm biến nhiệt ẩm (SENSOR_ENV)</option>
                  <option value="UPS">Bộ lưu điện (UPS)</option>
                  <option value="BIKE">Xe máy điện / GSHT (BIKE)</option>
                </select>
              </div>

              {/* Combobox: Trạng thái kết nối */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0 hidden sm:inline">Trạng thái:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-medium cursor-pointer"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="online">Online (Trực tuyến)</option>
                  <option value="offline">Offline (Mất kết nối)</option>
                  <option value="in_stock">Tồn kho (Chưa KH)</option>
                </select>
              </div>

              {/* Reset button if filtered */}
              {(searchFilter || filterGroup !== "ALL" || filterType !== "ALL" || filterStatus !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchFilter("");
                    setFilterGroup("ALL");
                    setFilterType("ALL");
                    setFilterStatus("ALL");
                  }}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                  title="Đặt lại toàn bộ bộ lọc"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono shrink-0">
                Hiển thị <strong className="text-slate-900 dark:text-white font-bold">{filteredDevices.length}</strong> / {devices.length} thiết bị
              </div>
              {canCreate("mod_dev") && (
                <button
                  type="button"
                  onClick={() => {
                    setNewDeviceForm({
                      hwId: "",
                      name: "",
                      model: "AUSTEC-A900",
                      group: "Cửa cuốn nhôm Đức",
                      type: "DOOR",
                      owner: "",
                      phone: "",
                      warranty: "12/2028"
                    });
                    setIsCreateDeviceOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors"
                  title="Thêm thiết bị mới (tự động kiểm tra chống trùng lặp Hardware ID)"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Thiết Bị</span>
                </button>
              )}
            </div>
          </div>

          {/* Master-Detail Split Pane */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-2.5 overflow-hidden">
            {/* Master Table */}
            <div className={`flex-1 min-w-0 flex-col h-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden ${selectedDevice ? "hidden lg:flex" : "flex"}`}>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-xs min-w-[760px]">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="p-2.5">Hardware ID</th>
                      <th className="p-2.5">Tên Thiết Bị / Model</th>
                      <th className="p-2.5">Khách Hàng / Địa Chỉ</th>
                      <th className="p-2.5">Trạng Thái</th>
                      <th className="p-2.5">Gói Dịch Vụ</th>
                      <th className="p-2.5">Bảo Hành</th>
                      <th className="p-2.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                    {paginatedDevices.map((d) => {
                      const isSelected = selectedDevice?.hwId === d.hwId;
                      return (
                        <tr
                          key={d.hwId}
                          onClick={() => setSelectedDevice(d)}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors text-slate-700 dark:text-slate-300 ${
                            isSelected ? "bg-cyan-50/70 dark:bg-cyan-950/40 border-l-2 border-cyan-500" : ""
                          }`}
                        >
                          <td className="p-2.5 font-mono text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1.5">
                            {d.type === "CAMERA" && <span title="Camera AI">📹</span>}
                            {d.type === "SENSOR_ENV" && <span title="Cảm biến nhiệt ẩm">🌡️</span>}
                            {d.type === "SMART_LOCK" && <span title="Khóa thông minh">🔒</span>}
                            {d.type === "DOOR" && <span title="Cửa cuốn">🚪</span>}
                            {d.type === "UPS" && <span title="Lưu điện">⚡</span>}
                            {d.type === "BIKE" && <span title="Định vị">🛵</span>}
                            <span>{d.hwId}</span>
                          </td>
                          <td className="p-2.5">
                            <div className="font-semibold text-slate-900 dark:text-white">{d.name}</div>
                            <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{d.model} • {d.group}</div>
                          </td>
                          <td className="p-2.5 max-w-[200px]">
                            <div className="font-medium text-slate-900 dark:text-white truncate">{d.owner}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={d.address || d.phone}>
                              {d.address || d.phone}
                            </div>
                          </td>
                          <td className="p-2.5">
                            {d.status === "in_stock" ? (
                              <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Tồn kho (Chưa KH)
                              </span>
                            ) : d.isOnline ? (
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Online ({d.openState})
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                Offline
                              </span>
                            )}
                          </td>
                          <td className="p-2.5">
                            {d.subscriptionType === "PERPETUAL" ? (
                              <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit font-bold">
                                <ShieldCheck className="w-3 h-3 text-purple-500" /> Vô thời hạn
                              </span>
                            ) : d.subscriptionStatus === "EXPIRED" ? (
                              <span className="text-[10px] font-mono text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit font-bold">
                                <AlertCircle className="w-3 h-3 text-rose-500" /> Cần gia hạn
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit font-bold">
                                <CheckCircle2 className="w-3 h-3 text-cyan-500" /> Có thời hạn (12T)
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-slate-500 dark:text-slate-400">{d.warranty}</td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDevice(selectedDevice?.hwId === d.hwId ? null : d);
                              }}
                              className={`text-[11px] px-2 py-1 rounded-md border font-semibold cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-cyan-600 text-white border-cyan-600"
                                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-600 dark:text-cyan-400 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {isSelected ? "Đang xem" : "Chi tiết ➔"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Enhanced Full Pagination Component */}
              <Pagination
                currentPage={deviceCurrentPage}
                totalItems={filteredDevices.length}
                pageSize={devicePageSize}
                onPageChange={setDeviceCurrentPage}
                onPageSizeChange={setDevicePageSize}
                pageSizeOptions={[10, 15, 20, 50, 100]}
                itemName="thiết bị"
              />
            </div>

            {/* Inline Inspector Detail Panel (NO SCREEN-DIMMING BACKDROP) */}
            {selectedDevice && (
              <div className="w-full lg:w-96 lg:shrink-0 h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm flex flex-col justify-between overflow-hidden animate-in slide-in-from-right-3 duration-150">
                {/* Header Inspector */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedDevice(null)}
                      className="lg:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold shrink-0 cursor-pointer"
                    >
                      ← Danh sách
                    </button>
                    <div className="min-w-0">
                      <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono tracking-wider uppercase font-bold flex items-center gap-1.5 truncate">
                        {selectedDevice.type === "CAMERA" && <Video className="w-3 h-3" />}
                        {selectedDevice.type === "SENSOR_ENV" && <Thermometer className="w-3 h-3" />}
                        <span>Viễn Thám: {selectedDevice.type}</span>
                      </div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">{selectedDevice.name}</h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDevice(null)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0 ml-2"
                    title="Đóng chi tiết"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body Inspector */}
                <div className="p-3 space-y-2.5 overflow-y-auto flex-1 min-h-0 text-xs">
                  {/* Hardware & Live Status */}
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Hardware ID:</span>
                      <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{selectedDevice.hwId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Model máy:</span>
                      <span className="text-slate-900 dark:text-white font-medium">{selectedDevice.model}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Sóng Wi-Fi / BLE / Zigbee:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                        <Wifi className="w-3.5 h-3.5" /> {selectedDevice.signal} dBm (Tốt)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Mức Pin / Nguồn:</span>
                      <span className="font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                        <Battery className="w-3.5 h-3.5" /> {selectedDevice.battery}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 dark:text-slate-400">Bảo hành điện tử:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">Đến {selectedDevice.warranty}</span>
                    </div>
                  </div>

                  {/* Customer Information & Installation Address */}
                  <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Chủ Sở Hữu & Nơi Lắp Đặt</div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Họ và tên:</span>
                      <span className="text-slate-900 dark:text-white font-semibold">{selectedDevice.owner}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Điện thoại:</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-mono font-semibold">{selectedDevice.phone}</span>
                    </div>
                    <div className="flex justify-between items-start gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Địa chỉ lắp đặt:</span>
                      <span className="text-slate-800 dark:text-slate-200 text-right font-medium">
                        {selectedDevice.address || "Số 45, Đường Lê Duẩn, Hoàn Kiếm, Hà Nội"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 shrink-0">Phân loại phần cứng:</span>
                      <span className="text-cyan-600 dark:text-cyan-400 font-semibold text-right text-[11px]">
                        {selectedDevice.deviceTypeDesc || selectedDevice.group}
                      </span>
                    </div>
                  </div>

                  {/* Subscription & Expiration Management Card */}
                  <div className="p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-950/10 dark:bg-cyan-950/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Gói Dịch Vụ & Thời Hạn Thiết Bị</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        selectedDevice.subscriptionType === 'PERPETUAL'
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                          : selectedDevice.subscriptionStatus === 'EXPIRED'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}>
                        {selectedDevice.subscriptionType === 'PERPETUAL' ? 'VÔ THỜI HẠN (TRỌN ĐỜI)' : 'CÓ THỜI HẠN (12 THÁNG/KỲ)'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px] pt-1 border-t border-cyan-500/20">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Hình thức kích hoạt:</span>
                        <span className="text-slate-900 dark:text-white font-medium">
                          {selectedDevice.subscriptionType === 'PERPETUAL' ? 'Trọn đời (Vĩnh viễn không cần gia hạn)' : 'Gia hạn định kỳ (Mặc định 12 tháng khi KH)'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Hạn dùng dịch vụ:</span>
                        <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          {selectedDevice.subscriptionType === 'PERPETUAL'
                            ? 'Trọn đời không giới hạn'
                            : selectedDevice.subscriptionExpiresAt
                            ? `Hết hạn: ${new Date(selectedDevice.subscriptionExpiresAt).toLocaleDateString('vi-VN')} (${Math.max(0, Math.ceil((new Date(selectedDevice.subscriptionExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} ngày còn lại)`
                            : 'Hết hạn: 21/10/2027 (365 ngày còn lại)'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Quyền điều khiển:</span>
                        <span className={`font-semibold flex items-center gap-1 ${
                          selectedDevice.subscriptionStatus === 'EXPIRED'
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {selectedDevice.subscriptionStatus === 'EXPIRED' ? (
                            <><AlertCircle className="w-3.5 h-3.5" /> Khóa điều khiển (Chờ gia hạn)</>
                          ) : (
                            <><CheckCircle2 className="w-3.5 h-3.5" /> Được phép điều khiển & giám sát</>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Quick Renewal Buttons */}
                    <div className="pt-2 border-t border-cyan-500/20 space-y-1.5">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                        Thao Tác Gia Hạn Cho Thiết Bị:
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRenewDevice(selectedDevice.hwId, 12, false)}
                          disabled={renewLoading}
                          className="px-2 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[10px] text-center transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          + 12 Tháng
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRenewDevice(selectedDevice.hwId, 24, false)}
                          disabled={renewLoading}
                          className="px-2 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] text-center transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          + 24 Tháng
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRenewDevice(selectedDevice.hwId, 0, true)}
                          disabled={renewLoading}
                          className="px-2 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[10px] text-center transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          Vô Thời Hạn
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SPECIALIZED TELEMETRY VIEW ACCORDING TO DEVICE TYPE */}

                  {/* 1. CAMERA AI VIEW */}
                  {selectedDevice.type === "CAMERA" ? (
                    <div className="p-3 rounded-lg border border-purple-500/40 bg-purple-950/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5" />
                          <span>Luồng Trực Tiếp Camera RTSP</span>
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          LIVE 1080P
                        </span>
                      </div>

                      {/* Video Simulated HUD Frame */}
                      <div className="relative rounded-lg overflow-hidden bg-slate-950 aspect-video border border-slate-800 flex items-center justify-center text-slate-400 group">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none"></div>
                        
                        {/* HUD Elements */}
                        <div className="absolute top-2 left-2 flex items-center gap-2 text-[10px] font-mono text-rose-400 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                          <span>REC [CAM-01]</span>
                        </div>
                        <div className="absolute top-2 right-2 text-[10px] font-mono text-slate-300">
                          30 FPS • H.265
                        </div>

                        {/* Simulated AI Detection Bounding Box */}
                        <div className="absolute top-1/4 left-1/3 w-28 h-20 border-2 border-dashed border-emerald-400/80 rounded bg-emerald-500/10 flex flex-col justify-between p-1">
                          <span className="text-[9px] font-mono font-bold bg-emerald-500 text-white px-1 rounded w-fit">
                            Người: 98.4%
                          </span>
                        </div>

                        <Camera className="w-8 h-8 text-slate-600 group-hover:text-cyan-400 transition-colors" />

                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-slate-300">
                          <span>{selectedDevice.name}</span>
                          <span>{selectedDevice.openState}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => showToast(`Đã chụp ảnh nhanh (Snapshot) từ ${selectedDevice.name}`, "info")}
                          className="py-1.5 px-2 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer text-center"
                        >
                          Chụp Snapshot
                        </button>
                        <button
                          type="button"
                          onClick={() => showToast(`Đã kích hoạt còi báo động xua đuổi trên ${selectedDevice.name}`, "warning")}
                          className="py-1.5 px-2 rounded-md bg-rose-600/20 hover:bg-rose-600/30 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold cursor-pointer text-center"
                        >
                          Bật Còi Hú AI
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* 2. SENSOR NHIỆT ĐỘ ĐỘ ẨM VIEW */}
                  {selectedDevice.type === "SENSOR_ENV" ? (
                    <div className="p-3 rounded-lg border border-cyan-500/40 bg-cyan-950/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Thermometer className="w-3.5 h-3.5" />
                          <span>Thông Số Môi Trường Thời Gian Thực</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">Chu kỳ: 30s</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {/* Temperature Card */}
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="flex items-center gap-1"><Thermometer className="w-3 h-3 text-rose-500" /> Nhiệt Độ</span>
                          </div>
                          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                            {selectedDevice.temp || 24.2}°C
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Lý tưởng (18 - 26°C)
                          </div>
                        </div>

                        {/* Humidity Card */}
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-cyan-500" /> Độ Ẩm</span>
                          </div>
                          <div className="text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400">
                            {selectedDevice.humidity || 52}%
                          </div>
                          <div className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">
                            Thoải mái (40 - 65%)
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-500 bg-white/50 dark:bg-slate-900/50 p-2 rounded border border-slate-200 dark:border-slate-800 flex justify-between">
                        <span>Chất lượng không khí:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400">Trong lành (AQI: 28)</strong>
                      </div>
                    </div>
                  ) : null}

                  {/* 3. DOOR / LOCK / UPS / STOCK CONTROL VIEW */}
                  {selectedDevice.type !== "CAMERA" && selectedDevice.type !== "SENSOR_ENV" && (
                    selectedDevice.status === "in_stock" ? (
                      <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs space-y-1.5">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span>Thiết Bị Đang Trong Kho Hàng</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-amber-700/90 dark:text-amber-400/90">
                          Phần cứng đang lưu kho kỹ thuật, chưa kích hoạt gắn khách hàng và chưa kết nối gateway viễn thông. Tính năng điều khiển từ xa sẽ tự động khả dụng ngay sau khi thực hiện Provisioning xuất xưởng.
                        </p>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-50/50 dark:bg-slate-800/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider">Điều Khiển Khẩn Cấp (2-Click)</span>
                          {controlLoading && <span className="text-[10px] text-cyan-600 dark:text-cyan-400 animate-pulse font-mono font-bold">Truyền lệnh &lt; 250ms...</span>}
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            disabled={controlLoading || !selectedDevice.isOnline}
                            onClick={() => handleToggleDoor(selectedDevice.hwId, "OPEN")}
                            className="p-2 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Power className="w-3.5 h-3.5 text-emerald-500" />
                            <span>MỞ</span>
                          </button>

                          <button
                            type="button"
                            disabled={controlLoading || !selectedDevice.isOnline}
                            onClick={() => handleToggleDoor(selectedDevice.hwId, "PAUSED")}
                            className="p-2 rounded-lg bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/40 text-amber-700 dark:text-amber-300 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Power className="w-3.5 h-3.5 text-amber-500" />
                            <span>DỪNG</span>
                          </button>

                          <button
                            type="button"
                            disabled={controlLoading || !selectedDevice.isOnline}
                            onClick={() => handleToggleDoor(selectedDevice.hwId, "CLOSED")}
                            className="p-2 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Power className="w-3.5 h-3.5 text-rose-500" />
                            <span>ĐÓNG</span>
                          </button>
                        </div>

                        <div className="flex justify-between items-center pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          <span>Trạng thái hiện thời:</span>
                          <strong className="text-slate-900 dark:text-white font-mono">{selectedDevice.openState || "IDLE"}</strong>
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Bottom Footer Actions */}
                <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
                  <span className="text-[10px] text-slate-400 font-mono">Live Telemetry Gateway</span>
                  <button 
                    type="button"
                    onClick={() => setSelectedDevice(null)}
                    className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: TẠO NHÓM SẢN PHẨM MỚI */}
      {/* ========================================================= */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Tạo Nhóm Sản Phẩm Mới</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsCreateGroupOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tên Nhóm Sản Phẩm *</label>
                <input
                  type="text"
                  required
                  placeholder="vd: CỬA CUỐN KHE THOÁNG PRO"
                  value={newGroupForm.name}
                  onChange={(e) => setNewGroupForm({ ...newGroupForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mã Định Danh (Group Code) *</label>
                <input
                  type="text"
                  required
                  placeholder="vd: GROUP_DOOR_PRO"
                  value={newGroupForm.code}
                  onChange={(e) => setNewGroupForm({ ...newGroupForm, code: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mô Tả Phân Khúc</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả công nghệ hoặc ứng dụng sản phẩm..."
                  value={newGroupForm.desc}
                  onChange={(e) => setNewGroupForm({ ...newGroupForm, desc: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateGroupOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs cursor-pointer"
                >
                  Tạo Nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CẤU HÌNH NHÓM SẢN PHẨM */}
      {/* ========================================================= */}
      {selectedGroupConfig && editGroupForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-500" />
                <span>Cấu Hình Nhóm: {selectedGroupConfig.name}</span>
              </h3>
              <button 
                type="button"
                onClick={() => { setSelectedGroupConfig(null); setEditGroupForm(null); }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGroupConfig} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tên Nhóm Sản Phẩm *</label>
                <input
                  type="text"
                  required
                  value={editGroupForm.name}
                  onChange={(e) => setEditGroupForm({ ...editGroupForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mã Nhóm (Group Code) *</label>
                <input
                  type="text"
                  required
                  value={editGroupForm.code}
                  onChange={(e) => setEditGroupForm({ ...editGroupForm, code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mô Tả Công Nghệ</label>
                <textarea
                  rows={2}
                  value={editGroupForm.desc}
                  onChange={(e) => setEditGroupForm({ ...editGroupForm, desc: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                ></textarea>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Quy mô quản trị:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{formatNum(editGroupForm.deviceCount)} thiết bị</span>
                </div>
                <div className="flex justify-between text-slate-500 dark:text-slate-400">
                  <span>Tỷ lệ online thực tế:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{editGroupForm.onlineRate}%</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                {canDelete("mod_dev") && (
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(editGroupForm.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Nhóm</span>
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => { setSelectedGroupConfig(null); setEditGroupForm(null); }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-xs cursor-pointer"
                  >
                    Lưu Cập Nhật
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: THÊM LOẠI PHẦN CỨNG MỚI (TYPE) */}
      {/* ========================================================= */}
      {isCreateTypeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-500" />
                <span>Định Nghĩa Loại Phần Cứng Mới</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsCreateTypeOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateType} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tên Loại Phần Cứng *</label>
                <input
                  type="text"
                  required
                  placeholder="vd: Máy lọc không khí thông minh"
                  value={newTypeForm.name}
                  onChange={(e) => setNewTypeForm({ ...newTypeForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mã Type Code *</label>
                <input
                  type="text"
                  required
                  placeholder="vd: AIR_PURIFIER"
                  value={newTypeForm.code}
                  onChange={(e) => setNewTypeForm({ ...newTypeForm, code: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-purple-500 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Biểu tượng Emoji / Icon</label>
                <input
                  type="text"
                  placeholder="vd: 💨 hoặc 🌬️"
                  value={newTypeForm.icon}
                  onChange={(e) => setNewTypeForm({ ...newTypeForm, icon: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateTypeOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-xs cursor-pointer"
                >
                  Lưu Loại Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3B: CẤU HÌNH LOẠI PHẦN CỨNG (EDIT TYPE) */}
      {/* ========================================================= */}
      {selectedTypeConfig && editTypeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-500" />
                <span>Cấu Hình Loại Phần Cứng: {selectedTypeConfig.name}</span>
              </h3>
              <button 
                type="button"
                onClick={() => { setSelectedTypeConfig(null); setEditTypeForm(null); }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTypeConfig} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tên Loại Phần Cứng *</label>
                <input
                  type="text"
                  required
                  value={editTypeForm.name}
                  onChange={(e) => setEditTypeForm({ ...editTypeForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mã Type Code *</label>
                <input
                  type="text"
                  required
                  value={editTypeForm.code}
                  onChange={(e) => setEditTypeForm({ ...editTypeForm, code: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-purple-500 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Biểu tượng Emoji / Icon</label>
                <input
                  type="text"
                  value={editTypeForm.icon}
                  onChange={(e) => setEditTypeForm({ ...editTypeForm, icon: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                {canDelete("mod_dev") && (
                  <button
                    type="button"
                    onClick={() => handleDeleteType(editTypeForm.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Loại</span>
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => { setSelectedTypeConfig(null); setEditTypeForm(null); }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-xs cursor-pointer"
                  >
                    Lưu Cập Nhật
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3C: CHỈNH SỬA THUỘC TÍNH SCHEMA (EDIT PROPERTY) */}
      {/* ========================================================= */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-500" />
                <span>Chỉnh Sửa Thuộc Tính Schema</span>
              </h3>
              <button 
                type="button"
                onClick={() => setEditingProperty(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProperty} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mã Thuộc Tính (Key) *</label>
                <input
                  type="text"
                  required
                  value={editingProperty.key}
                  onChange={(e) => setEditingProperty({ ...editingProperty, key: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tên Hiển Thị (Label) *</label>
                <input
                  type="text"
                  required
                  value={editingProperty.name}
                  onChange={(e) => setEditingProperty({ ...editingProperty, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Kiểu Dữ Liệu</label>
                  <select
                    value={editingProperty.type}
                    onChange={(e) => setEditingProperty({ ...editingProperty, type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="integer">Số nguyên</option>
                    <option value="float">Số thực</option>
                    <option value="boolean">Boolean</option>
                    <option value="string">Chuỗi</option>
                    <option value="enum">Enum</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Đơn Vị Đo</label>
                  <input
                    type="text"
                    placeholder="%, V, °C..."
                    value={editingProperty.unit}
                    onChange={(e) => setEditingProperty({ ...editingProperty, unit: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editPropCtrl"
                  checked={editingProperty.ctrl}
                  onChange={(e) => setEditingProperty({ ...editingProperty, ctrl: e.target.checked })}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="editPropCtrl" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium">
                  Cho phép điều khiển 2 chiều từ xa (Read/Write)
                </label>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                {canDelete("mod_dev") && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProperty(editingProperty.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Thuộc Tính</span>
                  </button>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setEditingProperty(null)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs cursor-pointer"
                  >
                    Lưu Thuộc Tính
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: TẠO MODEL MỚI */}
      {/* ========================================================= */}
      {isCreateModelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Box className="w-4 h-4 text-amber-500" />
                <span>Tạo Model Thương Phẩm Mới</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsCreateModelOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateModel} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mã Model Code *</label>
                <input
                  type="text"
                  required
                  placeholder="vd: AUSTEC-A1000-PRO"
                  value={newModelForm.code}
                  onChange={(e) => setNewModelForm({ ...newModelForm, code: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500 uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tên Thương Phẩm *</label>
                <input
                  type="text"
                  required
                  placeholder="vd: Cửa Cuốn Titadoor A1000 Siêu Êm"
                  value={newModelForm.name}
                  onChange={(e) => setNewModelForm({ ...newModelForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phiên Bản Firmware</label>
                  <input
                    type="text"
                    placeholder="vd: v2.5.0"
                    value={newModelForm.fw}
                    onChange={(e) => setNewModelForm({ ...newModelForm, fw: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Bản Bo Mạch (HW)</label>
                  <input
                    type="text"
                    placeholder="vd: HW-REV-D"
                    value={newModelForm.hw}
                    onChange={(e) => setNewModelForm({ ...newModelForm, hw: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModelOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-xs cursor-pointer"
                >
                  Lưu Model Mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4B: CẤU HÌNH MODEL THƯƠNG PHẨM (EDIT & ASSIGN PROPERTIES) */}
      {/* ========================================================= */}
      {selectedModelConfig && editModelForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-2xl w-full space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Box className="w-5 h-5 text-amber-500" />
                  <span>Cấu Hình Model: {selectedModelConfig.name}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Mã định danh thương phẩm, liên kết loại phần cứng và gán bộ thuộc tính schema.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => { setSelectedModelConfig(null); setEditModelForm(null); }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModelConfig} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mã Model (Model Code) *</label>
                  <input
                    type="text"
                    required
                    value={editModelForm.code}
                    onChange={(e) => setEditModelForm({ ...editModelForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500 uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Tên Thương Phẩm *</label>
                  <input
                    type="text"
                    required
                    value={editModelForm.name}
                    onChange={(e) => setEditModelForm({ ...editModelForm, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Thuộc Dòng / Nhóm Sản Phẩm</label>
                  <select
                    value={editModelForm.group}
                    onChange={(e) => setEditModelForm({ ...editModelForm, group: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phân Loại Kỹ Thuật (Hardware Type)</label>
                  <select
                    value={editModelForm.type}
                    onChange={(e) => setEditModelForm({ ...editModelForm, type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  >
                    {deviceTypes.map(t => (
                      <option key={t.id} value={t.name}>{t.name} ({t.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phiên Bản Firmware Tương Thích</label>
                  <input
                    type="text"
                    value={editModelForm.fw}
                    onChange={(e) => setEditModelForm({ ...editModelForm, fw: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">Bản Thiết Kế Bo Mạch (HW Revision)</label>
                  <input
                    type="text"
                    value={editModelForm.hw}
                    onChange={(e) => setEditModelForm({ ...editModelForm, hw: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* Assigned Properties Section */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Gán Bộ Thuộc Tính Schema (Dynamic Properties)</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Đã gán {editModelForm.assignedProperties.length} / {properties.length} thuộc tính
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Chọn các tham số cảm biến telemetry và nút điều khiển mà Model này hỗ trợ trên mobile app:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  {properties.map(p => {
                    const isChecked = editModelForm.assignedProperties.includes(p.id);
                    return (
                      <label 
                        key={p.id} 
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked 
                            ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-medium" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const current = editModelForm.assignedProperties;
                            const next = isChecked 
                              ? current.filter(id => id !== p.id) 
                              : [...current, p.id];
                            setEditModelForm({ ...editModelForm, assignedProperties: next });
                          }}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="truncate font-semibold">{p.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">{p.key}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{p.type}</span>
                            {p.unit && <span>• {p.unit}</span>}
                            <span>• {p.ctrl ? "Điều khiển (RW)" : "Chỉ đọc (RO)"}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-200 dark:border-slate-800">
                {canDelete("mod_dev") && (
                  <button
                    type="button"
                    onClick={() => handleDeleteModel(editModelForm.id)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Model Này</span>
                  </button>
                )}

                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => { setSelectedModelConfig(null); setEditModelForm(null); }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu Cấu Hình Model</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 6: THÊM THIẾT BỊ MỚI (CHỐNG NHẬP TRÙNG HARDWARE ID) */}
      {/* ========================================================= */}
      {isCreateDeviceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-lg w-full space-y-3.5 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-500" />
                  <span>Thêm Thiết Bị Mới Vào Hệ Thống</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tích hợp cơ chế tự động chống trùng lặp Hardware ID trong toàn CSDL.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateDeviceOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDevice} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Hardware ID / Serial Máy (*)
                </label>
                <input
                  type="text"
                  required
                  placeholder="vd: AT-DOOR-88239A99 hoặc AT-CAM-00109A99"
                  value={newDeviceForm.hwId}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, hwId: e.target.value })}
                  className={`w-full bg-slate-50 dark:bg-slate-800 border rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none uppercase ${
                    isDuplicateHwId 
                      ? "border-rose-500 ring-2 ring-rose-500/20" 
                      : "border-slate-200 dark:border-slate-700 focus:border-cyan-500"
                  }`}
                />
                {isDuplicateHwId && (
                  <div className="flex items-center gap-1.5 mt-1.5 p-2 rounded-md bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Hardware ID &quot;{newDeviceForm.hwId.trim()}&quot; đã tồn tại trong CSDL kho! Chống nhập trùng kích hoạt.</span>
                  </div>
                )}
                {!isDuplicateHwId && newDeviceForm.hwId.trim() && (
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Hardware ID hợp lệ, chưa từng tồn tại trong hệ thống.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tên Thiết Bị (*)
                </label>
                <input
                  type="text"
                  required
                  placeholder="vd: Cửa cuốn Showroom Austec 02"
                  value={newDeviceForm.name}
                  onChange={(e) => setNewDeviceForm({ ...newDeviceForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Model Thương Phẩm
                  </label>
                  <select
                    value={newDeviceForm.model}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, model: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    {models.map(m => (
                      <option key={m.id} value={m.code}>{m.name} ({m.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Nhóm Sản Phẩm
                  </label>
                  <select
                    value={newDeviceForm.group}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, group: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.name}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Loại Phần Cứng
                  </label>
                  <select
                    value={newDeviceForm.type}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, type: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="DOOR">Cửa cuốn (DOOR)</option>
                    <option value="SMART_LOCK">Khóa thông minh (SMART_LOCK)</option>
                    <option value="CAMERA">Camera AI (CAMERA)</option>
                    <option value="SENSOR_ENV">Cảm biến nhiệt ẩm (SENSOR_ENV)</option>
                    <option value="UPS">Bộ lưu điện (UPS)</option>
                    <option value="BIKE">Xe máy điện / GSHT (BIKE)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Hạn Bảo Hành
                  </label>
                  <input
                    type="text"
                    placeholder="vd: 12/2028"
                    value={newDeviceForm.warranty}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, warranty: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Khách Hàng / Nơi Lắp Đặt
                  </label>
                  <input
                    type="text"
                    placeholder="vd: Trần Quốc Bảo"
                    value={newDeviceForm.owner}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, owner: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Số Điện Thoại
                  </label>
                  <input
                    type="text"
                    placeholder="vd: 0988 123 456"
                    value={newDeviceForm.phone}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateDeviceOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isDuplicateHwId || !newDeviceForm.hwId.trim() || !newDeviceForm.name.trim()}
                  className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs flex items-center gap-1.5 transition-all ${
                    isDuplicateHwId || !newDeviceForm.hwId.trim() || !newDeviceForm.name.trim()
                      ? "bg-slate-400 cursor-not-allowed opacity-60"
                      : "bg-cyan-600 hover:bg-cyan-500 cursor-pointer"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu Thiết Bị Vào Kho</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DevicesManagementPage() {
  return (
    <Suspense fallback={<div className="text-slate-400 text-sm p-8">Đang tải phân hệ quản lý thiết bị...</div>}>
      <DevicesManagementContent />
    </Suspense>
  );
}
