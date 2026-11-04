"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
    loadMasterData();
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
  const [isLoading, setIsLoading] = useState(true);

  // Load from PostgreSQL Backend APIs on mount
  const loadMasterData = async () => {
    setIsLoading(true);
    const apiBase = getApiBaseUrl();
    const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
    const headers = { Authorization: `Bearer ${token}` };

    try {
      await Promise.allSettled([
        fetch(`${apiBase}/api/admin/groups`, { headers }).then(r => r.json()).then(d => { if (d.success && Array.isArray(d.groups)) setGroups(d.groups); }),
        fetch(`${apiBase}/api/admin/device-types`, { headers }).then(r => r.json()).then(d => { if (d.success && Array.isArray(d.deviceTypes)) setDeviceTypes(d.deviceTypes); }),
        fetch(`${apiBase}/api/admin/models`, { headers }).then(r => r.json()).then(d => { if (d.success && Array.isArray(d.models)) setModels(d.models); }),
        fetch(`${apiBase}/api/admin/devices`, { headers }).then(r => r.json()).then(d => { if (d.success && Array.isArray(d.devices)) setDevices(d.devices); }),
      ]);
    } catch (e) {
      console.warn("Lỗi tải master data:", e);
    } finally {
      setIsLoading(false);
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
            deviceTypes={deviceTypes}
            groups={groups}
          />
        )}

        {activeTab === "import" && (
          <DeviceImportTab 
            devices={devices}
            models={models}
            groups={groups}
            deviceTypes={deviceTypes}
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
            deviceTypes={deviceTypes}
            isLoading={isLoading}
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
        deviceTypes={deviceTypes}
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
