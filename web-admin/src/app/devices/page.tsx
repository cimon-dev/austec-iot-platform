"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Layers, 
  Cpu, 
  Sliders, 
  Box, 
  FileSpreadsheet, 
  Radio 
} from "lucide-react";
import { toast } from "sonner";
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

  // Master Data (100% PostgreSQL DB backed)
  const [groups, setGroups] = useState<any[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [isCreateDeviceOpen, setIsCreateDeviceOpen] = useState(false);

  // Load from PostgreSQL Backend APIs on mount
  const loadMasterData = async () => {
    const apiBase = getApiBaseUrl();
    const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
    const headers = { Authorization: `Bearer ${token}` };

    // 1. Groups
    try {
      const res = await fetch(`${apiBase}/api/admin/groups`, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        setGroups(data.groups);
      }
    } catch (e) {
      console.warn("Lỗi tải groups từ PostgreSQL:", e);
    }

    // 2. Device Types
    try {
      const res = await fetch(`${apiBase}/api/admin/device-types`, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.deviceTypes)) {
        setDeviceTypes(data.deviceTypes);
      }
    } catch (e) {
      console.warn("Lỗi tải device types từ PostgreSQL:", e);
    }

    // 3. Models
    try {
      const res = await fetch(`${apiBase}/api/admin/models`, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.models)) {
        setModels(data.models);
      }
    } catch (e) {
      console.warn("Lỗi tải models từ PostgreSQL:", e);
    }

    // 4. Devices (PostgreSQL)
    try {
      const res = await fetch(`${apiBase}/api/admin/devices`, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.devices)) {
        setDevices(data.devices);
      }
    } catch (e) {
      console.warn("Lỗi tải devices từ PostgreSQL:", e);
    }
  };

  useEffect(() => {
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
          />
        )}

        {activeTab === "types" && (
          <DeviceTypeTab 
            canCreate={canCreate("mod_dev")}
            canUpdate={canUpdate("mod_dev")}
            canDelete={canDelete("mod_dev")}
          />
        )}

        {activeTab === "properties" && (
          <DevicePropertyTab 
            canCreate={canCreate("mod_dev")}
            canUpdate={canUpdate("mod_dev")}
            canDelete={canDelete("mod_dev")}
          />
        )}

        {activeTab === "models" && (
          <DeviceModelTab 
            canCreate={canCreate("mod_dev")}
            canUpdate={canUpdate("mod_dev")}
            canDelete={canDelete("mod_dev")}
          />
        )}

        {activeTab === "import" && (
          <DeviceImportTab 
            devices={devices}
            onImportSuccess={(newDevs) => setDevices(prev => [...newDevs, ...prev])}
            switchTab={switchTab}
            canCreate={canCreate("mod_dev")}
          />
        )}

        {activeTab === "list" && (
          <DeviceListTab 
            devices={devices}
            setDevices={setDevices}
            canCreate={canCreate("mod_dev")}
            canUpdate={canUpdate("mod_dev")}
            canDelete={canDelete("mod_dev")}
            onOpenCreateModal={() => setIsCreateDeviceOpen(true)}
            models={models}
            groups={groups}
            onDeviceUpdated={(updated) => {
              setDevices(prev => prev.map(d => (d.hardwareId === updated.hardwareId || d.hwId === updated.hwId) ? { ...d, ...updated } : d));
              toast.success(`Đã cập nhật thiết bị ${updated.customName || updated.name} (${updated.hardwareId || updated.hwId}) thành công!`);
            }}
            onDeviceDeleted={(hardwareId) => {
              setDevices(prev => prev.filter(d => (d.hardwareId !== hardwareId && d.hwId !== hardwareId)));
              toast.success(`Đã xóa thiết bị ${hardwareId} khỏi hệ thống!`);
            }}
          />
        )}
      </div>

      {/* Create Device Modal */}
      <CreateDeviceModal 
        isOpen={isCreateDeviceOpen}
        onClose={() => setIsCreateDeviceOpen(false)}
        onCreated={(newDev) => {
          setDevices(prev => [newDev, ...prev]);
          toast.success(`Đã thêm thiết bị ${newDev.customName || newDev.name} (${newDev.hardwareId || newDev.hwId}) thành công!`);
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
