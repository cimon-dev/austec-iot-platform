"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Layers, 
  Cpu, 
  Sliders, 
  Box, 
  FileSpreadsheet, 
  Radio, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { usePermissions } from "@/context/PermissionContext";
import { AccessDenied } from "@/components/AccessDenied";
import { getApiBaseUrl } from "@/context/apiConfig";

// Modular Feature Tabs
import { 
  DeviceGroupTab,
  DeviceTypeTab,
  DevicePropertyTab,
  DeviceModelTab,
  DeviceImportTab,
  DeviceListTab,
  CreateDeviceModal
} from "./components";

const INITIAL_GROUPS = [
  { id: 18, name: "CAMERA AN NINH AI AUSTEC", code: "GROUP_CAM_AI", desc: "Hệ thống camera giám sát an ninh thông minh AI 360 độ ban đêm", deviceCount: 680, onlineRate: 99.7 },
  { id: 19, name: "CẢM BIẾN MÔI TRƯỜNG & NHIỆT ẨM", code: "GROUP_SENSOR_ENV", desc: "Cảm biến nhiệt độ, độ ẩm không khí, cảnh báo cháy & môi trường", deviceCount: 890, onlineRate: 99.1 },
  { id: 15, name: "GSHT", code: "GROUP_GSHT", desc: "Giám sát hành trình xe máy, ô tô", deviceCount: 450, onlineRate: 98.4 },
  { id: 13, name: "LƯU ĐIỆN TIÊU CHUẨN AUSTEC", code: "GROUP_UPS_STD", desc: "Bộ lưu điện tiêu chuẩn chính hãng", deviceCount: 1200, onlineRate: 99.1 },
  { id: 12, name: "LƯU ĐIỆN AC 220V", code: "GROUP_UPS_220V", desc: "Bộ lưu điện AC 220V - 50Hz sóng sin chuẩn", deviceCount: 2300, onlineRate: 99.5 },
  { id: 11, name: "KHÓA MASARU CHUẨN NHẬT", code: "GROUP_LOCK_MASARU", desc: "Khóa vân tay thông minh công nghệ Nhật Bản", deviceCount: 890, onlineRate: 99.2 },
  { id: 10, name: "CỬA CUỐN TẤM LIỀN CÔNG NGHỆ ÚC", code: "GROUP_DOOR_AU", desc: "Cửa cuốn tấm liền thép hợp kim công nghệ Úc", deviceCount: 3100, onlineRate: 99.0 },
  { id: 9, name: "CỬA CUỐN NHÔM CÔNG NGHỆ ĐỨC", code: "GROUP_DOOR_GERMAN", desc: "Cửa cuốn nan nhôm khe thoáng công nghệ Đức", deviceCount: 2470, onlineRate: 99.4 },
];

const INITIAL_DEVICES = [
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
    subscriptionExpiresAt: "2027-09-10T00:00:00.000Z",
    subscriptionStatus: "ACTIVE"
  }
];

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

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "info" | "warning" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Master Data
  const [groups, setGroups] = useState<any[]>(INITIAL_GROUPS);
  const [deviceTypes, setDeviceTypes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([
    { id: 1, name: "AUSTEC TITADOOR SUPER A900", code: "AUSTEC-A900", typeCode: "DOOR", price: 18500000, status: "active", propertiesCount: 8, image: "" },
    { id: 2, name: "KHÓA CỬA THÔNG MINH MASARU M8", code: "MASARU-M8", typeCode: "SMART_LOCK", price: 6800000, status: "active", propertiesCount: 6, image: "" },
    { id: 3, name: "BỘ LƯU ĐIỆN AUSTEC SINE PRO 2000VA", code: "UPS-SINE-2000", typeCode: "UPS", price: 4200000, status: "active", propertiesCount: 5, image: "" },
  ]);
  const [devices, setDevices] = useState<any[]>(INITIAL_DEVICES);
  const [isCreateDeviceOpen, setIsCreateDeviceOpen] = useState(false);

  // Load from PostgreSQL Backend APIs on mount
  useEffect(() => {
    const loadMasterData = async () => {
      const apiBase = getApiBaseUrl();
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Groups
      try {
        const res = await fetch(`${apiBase}/api/admin/groups`, { headers });
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
        const res = await fetch(`${apiBase}/api/admin/device-types`, { headers });
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
        console.warn("Lỗi tải device types từ PostgreSQL:", e);
      }

      // 3. Models
      try {
        const res = await fetch(`${apiBase}/api/admin/models`, { headers });
        const data = await res.json();
        if (data.success && Array.isArray(data.models) && data.models.length > 0) {
          setModels(data.models);
        }
      } catch (e) {
        console.warn("Lỗi tải models từ PostgreSQL:", e);
      }
    };

    loadMasterData();
  }, []);

  if (!canView("mod_dev")) {
    return (
      <AccessDenied 
        moduleName="Quản Lý Thiết Bị Tập Trung (Device Management)"
        requiredModule="mod_dev"
      />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2 overflow-hidden">
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg border backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom ${
          toast.type === "error"
            ? "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
            : toast.type === "warning"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : toast.type === "info"
            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        }`}>
          {toast.type === "error" || toast.type === "warning" ? (
            <AlertCircle className="w-4 h-4 text-rose-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Modern Compact Sub-navigation Tab Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
          <button
            type="button"
            onClick={() => switchTab("groups")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
              activeTab === "groups" ? "bg-indigo-600 text-white shadow-xs font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Nhóm sản phẩm</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("types")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
              activeTab === "types" ? "bg-purple-600 text-white shadow-xs font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Loại phần cứng</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("properties")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
              activeTab === "properties" ? "bg-emerald-600 text-white shadow-xs font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Từ điển thuộc tính</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("models")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
              activeTab === "models" ? "bg-amber-600 text-white shadow-xs font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Mẫu thương phẩm</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("import")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
              activeTab === "import" ? "bg-green-600 text-white shadow-xs font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Nhập kho Excel</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all cursor-pointer ${
              activeTab === "list" ? "bg-cyan-600 text-white shadow-xs font-semibold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Danh sách thiết bị</span>
          </button>
        </div>
      </div>

      {/* Main Tab Render Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "groups" && (
          <DeviceGroupTab 
            canCreate={canCreate("mod_dev")}
            canUpdate={canUpdate("mod_dev")}
            canDelete={canDelete("mod_dev")}
            showToast={showToast}
          />
        )}

        {activeTab === "types" && (
          <DeviceTypeTab 
            canCreate={canCreate("mod_dev")}
            canUpdate={canUpdate("mod_dev")}
            canDelete={canDelete("mod_dev")}
            showToast={showToast}
          />
        )}

        {activeTab === "properties" && (
          <DevicePropertyTab 
            canCreate={canCreate("mod_dev")}
            canUpdate={canUpdate("mod_dev")}
            canDelete={canDelete("mod_dev")}
            showToast={showToast}
          />
        )}

        {activeTab === "models" && (
          <DeviceModelTab 
            canCreate={canCreate("mod_dev")}
            canUpdate={canUpdate("mod_dev")}
            canDelete={canDelete("mod_dev")}
            showToast={showToast}
          />
        )}

        {activeTab === "import" && (
          <DeviceImportTab 
            devices={devices}
            onImportSuccess={(newDevs) => setDevices(prev => [...newDevs, ...prev])}
            switchTab={switchTab}
            canCreate={canCreate("mod_dev")}
            showToast={showToast}
          />
        )}

        {activeTab === "list" && (
          <DeviceListTab 
            devices={devices}
            setDevices={setDevices}
            canCreate={canCreate("mod_dev")}
            canUpdate={canUpdate("mod_dev")}
            canDelete={canDelete("mod_dev")}
            showToast={showToast}
            onOpenCreateModal={() => setIsCreateDeviceOpen(true)}
          />
        )}
      </div>

      {/* Create Device Modal */}
      <CreateDeviceModal 
        isOpen={isCreateDeviceOpen}
        onClose={() => setIsCreateDeviceOpen(false)}
        onCreated={(newDev) => {
          setDevices(prev => [newDev, ...prev]);
          showToast(`Đã thêm thiết bị ${newDev.name} (${newDev.hwId}) thành công!`);
        }}
        models={models}
        groups={groups}
        devices={devices}
      />
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
