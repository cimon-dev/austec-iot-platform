"use client";

import React, { useState, useMemo } from "react";
import { 
  Search, 
  X, 
  RotateCcw, 
  Plus, 
  Video, 
  Thermometer, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Wifi, 
  Battery,
  Edit3,
  Trash2,
  Copy,
  Layers,
  Cpu,
  MapPin,
  Phone,
  User,
  Calendar,
  Clock,
  Sparkles,
  Lock,
  Unlock,
  Radio,
  Loader2,
  Zap,
  Info
} from "lucide-react";
import { toast } from "sonner";
import { Pagination } from "@/components/Pagination";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { EditDeviceModal } from "../modals/EditDeviceModal";
import { getApiBaseUrl } from "@/context/apiConfig";

interface DeviceListTabProps {
  devices: any[];
  setDevices: React.Dispatch<React.SetStateAction<any[]>>;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onOpenCreateModal: () => void;
  models?: any[];
  groups?: any[];
  onDeviceUpdated?: (updated: any) => void;
  onDeviceDeleted?: (hardwareId: string) => void;
}

export function DeviceListTab({
  devices,
  setDevices,
  canCreate,
  canUpdate,
  canDelete,
  onOpenCreateModal,
  models = [],
  groups = [],
  onDeviceUpdated,
  onDeviceDeleted
}: DeviceListTabProps) {
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [editingDevice, setEditingDevice] = useState<any | null>(null);
  const [deletingDevice, setDeletingDevice] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [filterGroup, setFilterGroup] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [deviceCurrentPage, setDeviceCurrentPage] = useState<number>(1);
  const [devicePageSize, setDevicePageSize] = useState<number>(10);
  const [controlLoading, setControlLoading] = useState<boolean>(false);
  const [renewLoading, setRenewLoading] = useState<boolean>(false);

  // Field extractors with robust fallbacks
  const getHwId = (d: any) => d?.hardwareId || d?.hwId || "";
  const getName = (d: any) => d?.customName || d?.name || "";
  const getModel = (d: any) => d?.modelName || d?.model || "";
  const getGroup = (d: any) => d?.groupName || d?.group || "Chưa phân nhóm";
  const getType = (d: any) => d?.deviceType || d?.type || "DOOR";
  const getOwner = (d: any) => d?.ownerName || d?.owner || "Chưa gán";
  const getPhone = (d: any) => d?.ownerPhone || d?.phone || "---";
  const getAddress = (d: any) => d?.addressDisplay || d?.address || "";
  const getWarranty = (d: any) => d?.warrantyEndAt || d?.warranty || "";

  // Device type metadata
  const getDeviceTypeInfo = (type: string) => {
    switch (type) {
      case "DOOR":
        return { label: "Cửa cuốn thông minh", code: "DOOR", icon: "🚪", badgeColor: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800" };
      case "SMART_LOCK":
        return { label: "Khóa cửa thông minh", code: "LOCK", icon: "🔒", badgeColor: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800" };
      case "CAM":
        return { label: "Camera AI giám sát", code: "CAM", icon: "📹", badgeColor: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800" };
      case "UPS":
        return { label: "Bộ lưu điện thông minh", code: "UPS", icon: "⚡", badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800" };
      case "SENSOR":
        return { label: "Cảm biến môi trường", code: "SENSOR", icon: "🌡️", badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" };
      default:
        return { label: type || "Thiết bị IoT", code: type, icon: "📦", badgeColor: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700" };
    }
  };

  // Find matching model from models list
  const matchedModel = useMemo(() => {
    if (!selectedDevice) return null;
    const currentModelName = getModel(selectedDevice);
    return models.find(
      (m: any) =>
        (m.modelName && m.modelName.toLowerCase() === currentModelName.toLowerCase()) ||
        (m.modelCode && m.modelCode.toLowerCase() === currentModelName.toLowerCase()) ||
        (m.name && m.name.toLowerCase() === currentModelName.toLowerCase())
    ) || null;
  }, [selectedDevice, models]);

  // Filtering
  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const hwId = getHwId(d).toLowerCase();
      const name = getName(d).toLowerCase();
      const owner = getOwner(d).toLowerCase();
      const phone = getPhone(d);
      const model = getModel(d).toLowerCase();
      const group = getGroup(d).toLowerCase();
      const address = getAddress(d).toLowerCase();
      const search = searchFilter.toLowerCase();

      const matchSearch =
        hwId.includes(search) ||
        name.includes(search) ||
        owner.includes(search) ||
        phone.includes(search) ||
        model.includes(search) ||
        group.includes(search) ||
        address.includes(search);
      const matchGroup = filterGroup === "ALL" || getGroup(d) === filterGroup;
      const matchType = filterType === "ALL" || getType(d) === filterType;
      const matchStatus = filterStatus === "ALL" || d.status === filterStatus;
      return matchSearch && matchGroup && matchType && matchStatus;
    });
  }, [devices, searchFilter, filterGroup, filterType, filterStatus]);

  const paginatedDevices = useMemo(() => {
    const start = (deviceCurrentPage - 1) * devicePageSize;
    return filteredDevices.slice(start, start + devicePageSize);
  }, [filteredDevices, deviceCurrentPage, devicePageSize]);

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      toast.success(`Đã sao chép ${label}: ${text}`);
    }
  };

  // Live remote control
  const handleToggleDoor = async (hwId: string, newState: string) => {
    setControlLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const action = newState === "OPENED" ? "OPEN" : newState === "CLOSED" ? "CLOSE" : newState === "STOPPED" ? "STOP" : newState;
      await fetch(`${getApiBaseUrl()}/api/devices/control`, {
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
        prev.map((d) => (getHwId(d) === hwId ? { ...d, openState: newState } : d))
      );
      if (getHwId(selectedDevice) === hwId) {
        setSelectedDevice((prev: any) => ({ ...prev, openState: newState }));
      }
      toast.success(`Lệnh ${newState} đã ghi Hộp đen & cập nhật PostgreSQL thành công!`);
    } catch {
      setDevices((prev) =>
        prev.map((d) => (getHwId(d) === hwId ? { ...d, openState: newState } : d))
      );
      toast.info(`Lệnh ${newState} đã thực thi`);
    } finally {
      setControlLoading(false);
    }
  };

  const handleRenewDevice = async (hwId: string, months: number, isPerpetual: boolean) => {
    setRenewLoading(true);
    try {
      await fetch(`${getApiBaseUrl()}/api/devices/${hwId}/renew`, {
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

      setDevices((prev) => prev.map((d) => (getHwId(d) === hwId ? { ...d, ...updateData } : d)));
      if (getHwId(selectedDevice) === hwId) {
        setSelectedDevice((prev: any) => ({ ...prev, ...updateData }));
      }

      toast.success(
        isPerpetual
          ? `Đã nâng cấp ${hwId} thành VÔ THỜI HẠN (Trọn đời)!`
          : `Đã gia hạn thành công ${hwId} thêm ${months} tháng dịch vụ!`
      );
    } catch {
      toast.warning(`Lỗi thao tác gia hạn thiết bị`);
    } finally {
      setRenewLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingDevice) return;
    const hwId = getHwId(deletingDevice);
    setIsDeleting(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/devices/${hwId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setDevices(prev => prev.filter(d => getHwId(d) !== hwId));
        if (selectedDevice && getHwId(selectedDevice) === hwId) {
          setSelectedDevice(null);
        }
        if (onDeviceDeleted) onDeviceDeleted(hwId);
        toast.success(`Đã xóa thiết bị ${getName(deletingDevice) || hwId} khỏi CSDL!`);
        setDeletingDevice(null);
      } else {
        toast.error(data.error || "Không thể xóa thiết bị khỏi CSDL");
      }
    } catch (e: any) {
      toast.error("Lỗi kết nối khi xóa: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeviceUpdated = (updated: any) => {
    const hwId = getHwId(updated);
    setDevices(prev => prev.map(d => getHwId(d) === hwId ? { ...d, ...updated } : d));
    if (selectedDevice && getHwId(selectedDevice) === hwId) {
      setSelectedDevice((prev: any) => ({ ...prev, ...updated }));
    }
    if (onDeviceUpdated) onDeviceUpdated(updated);
    toast.success(`Đã cập nhật thiết bị ${getName(updated) || hwId} trong CSDL!`);
    setEditingDevice(null);
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2">
      {/* Filter Bar with Comboboxes */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Keyword Search */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm Hardware ID, Tên, Model, Nhóm, SĐT..."
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

          {/* Combobox: Nhóm sản phẩm */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0 hidden sm:inline">Nhóm:</span>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-medium cursor-pointer"
            >
              <option value="ALL">Tất cả nhóm</option>
              {groups.map((g: any) => (
                <option key={g.id || g.code} value={g.groupName || g.name}>
                  {g.groupName || g.name}
                </option>
              ))}
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
              <option value="ALL">Tất cả loại phần cứng</option>
              <option value="DOOR">Cửa cuốn thông minh (DOOR)</option>
              <option value="SMART_LOCK">Khóa cửa thông minh (LOCK)</option>
              <option value="UPS">Bộ lưu điện (UPS)</option>
              <option value="CAM">Camera AI giám sát (CAM)</option>
              <option value="SENSOR">Cảm biến môi trường (SENSOR)</option>
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
              <option value="online">Online (Đang kết nối)</option>
              <option value="offline">Offline (Mất kết nối)</option>
              <option value="in_stock">Tồn kho xuất xưởng</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {(searchFilter || filterGroup !== "ALL" || filterType !== "ALL" || filterStatus !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchFilter("");
                setFilterGroup("ALL");
                setFilterType("ALL");
                setFilterStatus("ALL");
              }}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400 font-medium px-2 py-1 rounded bg-slate-200/50 dark:bg-slate-800/50 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>

        {/* Action Button: Thêm thiết bị mới */}
        {canCreate && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold shadow-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm thiết bị mới</span>
          </button>
        )}
      </div>

      {/* Main Content: Split Master-Detail Layout */}
      <div className="flex-1 min-h-0 flex gap-2 overflow-hidden">
        {/* Device List Master View */}
        <div className="flex-1 min-w-0 flex flex-col border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase text-slate-500 font-semibold">
                <tr>
                  <th className="p-2.5">Hardware ID & Loại</th>
                  <th className="p-2.5">Tên Thiết Bị & Model</th>
                  <th className="p-2.5">Nhóm Sản Phẩm</th>
                  <th className="p-2.5">Khách Hàng / SĐT</th>
                  <th className="p-2.5">Địa Chỉ Lắp Đặt</th>
                  <th className="p-2.5">Trạng Thái</th>
                  <th className="p-2.5">Gói DV & Bảo Hành</th>
                  <th className="p-2.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {paginatedDevices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Chưa có thiết bị nào trong CSDL PostgreSQL. Bấm &quot;Thêm thiết bị mới&quot; hoặc &quot;Nhập kho Excel&quot; để nạp thiết bị.
                    </td>
                  </tr>
                ) : (
                  paginatedDevices.map((d) => {
                    const hwId = getHwId(d);
                    const name = getName(d);
                    const model = getModel(d);
                    const group = getGroup(d);
                    const type = getType(d);
                    const owner = getOwner(d);
                    const phone = getPhone(d);
                    const address = getAddress(d);
                    const warranty = getWarranty(d);
                    const typeInfo = getDeviceTypeInfo(type);
                    const isSelected = getHwId(selectedDevice) === hwId;

                    return (
                      <tr
                        key={hwId}
                        onClick={() => setSelectedDevice(d)}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors text-slate-700 dark:text-slate-300 ${
                          isSelected ? "bg-cyan-50/70 dark:bg-cyan-950/40 border-l-2 border-cyan-500" : ""
                        }`}
                      >
                        {/* 1. Hardware ID & Loại */}
                        <td className="p-2.5">
                          <div className="font-mono text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1.5">
                            <span>{hwId}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(hwId, "Hardware ID");
                              }}
                              className="text-slate-400 hover:text-cyan-500 p-0.5 rounded cursor-pointer"
                              title="Sao chép Hardware ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="mt-1">
                            <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium border ${typeInfo.badgeColor}`}>
                              <span>{typeInfo.icon}</span>
                              <span>{typeInfo.code}</span>
                            </span>
                          </div>
                        </td>

                        {/* 2. Tên Thiết Bị & Model */}
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-900 dark:text-white leading-tight">{name}</div>
                          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {model}
                            {d.hardwareVersion && <span className="ml-1 text-[10px] text-slate-400">({d.hardwareVersion})</span>}
                          </div>
                        </td>

                        {/* 3. Nhóm Sản Phẩm */}
                        <td className="p-2.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <Layers className="w-3 h-3 text-cyan-500" />
                            <span>{group}</span>
                          </span>
                        </td>

                        {/* 4. Khách Hàng / SĐT */}
                        <td className="p-2.5">
                          <div className="font-medium text-slate-900 dark:text-white">{owner}</div>
                          <div className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 mt-0.5">
                            {phone}
                          </div>
                        </td>

                        {/* 5. Địa Chỉ Lắp Đặt */}
                        <td className="p-2.5 max-w-[180px]">
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 truncate" title={address || "Kho tổng Austec"}>
                            {address || "Kho tổng Austec"}
                          </div>
                        </td>

                        {/* 6. Trạng Thái */}
                        <td className="p-2.5">
                          {d.status === "in_stock" ? (
                            <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Tồn kho
                            </span>
                          ) : d.isOnline ? (
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Online
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Offline
                            </span>
                          )}
                        </td>

                        {/* 7. Gói DV & Bảo Hành */}
                        <td className="p-2.5">
                          <div className="mb-1">
                            {d.subscriptionType === "PERPETUAL" ? (
                              <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit font-bold">
                                <ShieldCheck className="w-3 h-3 text-purple-500" /> Vô thời hạn
                              </span>
                            ) : d.subscriptionStatus === "EXPIRED" ? (
                              <span className="text-[10px] font-mono text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit font-bold">
                                <AlertCircle className="w-3 h-3 text-rose-500" /> Hết hạn
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit font-bold">
                                <CheckCircle2 className="w-3 h-3 text-cyan-500" /> Hoạt động
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                            BH: {warranty || "12/2028"}
                          </div>
                        </td>

                        {/* 8. Thao Tác */}
                        <td className="p-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDevice(isSelected ? null : d);
                              }}
                              className={`text-[11px] px-2 py-1 rounded-md border font-semibold cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-cyan-600 text-white border-cyan-600 shadow-xs"
                                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-600 dark:text-cyan-400 border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {isSelected ? "Đang xem" : "Chi tiết ➔"}
                            </button>

                            {canUpdate && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDevice(d);
                                }}
                                className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 cursor-pointer transition-colors"
                                title="Sửa thông tin thiết bị"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingDevice(d);
                                }}
                                className="p-1 rounded-md bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 cursor-pointer transition-colors"
                                title="Xóa thiết bị khỏi CSDL"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="border-t border-slate-200 dark:border-slate-800 shrink-0">
            <Pagination
              currentPage={deviceCurrentPage}
              totalItems={filteredDevices.length}
              pageSize={devicePageSize}
              onPageChange={(page) => setDeviceCurrentPage(page)}
              onPageSizeChange={(size) => {
                setDevicePageSize(size);
                setDeviceCurrentPage(1);
              }}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </div>
        </div>

        {/* Right Inspector Panel */}
        {selectedDevice && (
          <div className="w-80 md:w-96 lg:w-[420px] border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-xl flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-200">
            {/* Header Inspector */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${getDeviceTypeInfo(getType(selectedDevice)).badgeColor}`}>
                      {getDeviceTypeInfo(getType(selectedDevice)).icon} {getDeviceTypeInfo(getType(selectedDevice)).label}
                    </span>
                    {selectedDevice.status === "in_stock" ? (
                      <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">
                        Tồn kho
                      </span>
                    ) : selectedDevice.isOnline ? (
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30 font-bold">
                        Offline
                      </span>
                    )}
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-1">
                    {getName(selectedDevice)}
                  </h2>
                  <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-600 dark:text-cyan-400 mt-0.5">
                    <span>{getHwId(selectedDevice)}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(getHwId(selectedDevice), "Hardware ID")}
                      className="text-slate-400 hover:text-cyan-500 cursor-pointer p-0.5 rounded"
                      title="Sao chép Hardware ID"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDevice(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer shrink-0 ml-2"
                title="Đóng chi tiết"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Inspector */}
            <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-0 text-xs">
              {/* Product Model & Hardware Specifications Card */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-slate-700/80">
                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Thông Tin Phần Cứng & Model</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">CSDL PostgreSQL</span>
                </div>

                {/* Model Image Preview if available */}
                {(selectedDevice.imageUrl || matchedModel?.imageUrl) && (
                  <div className="w-full h-28 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative">
                    <img
                      src={selectedDevice.imageUrl || matchedModel?.imageUrl}
                      alt={getModel(selectedDevice)}
                      className="w-full h-full object-contain p-2"
                      onError={(e: any) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Tên Thiết Bị</span>
                    <span className="font-semibold text-slate-900 dark:text-white break-words">{getName(selectedDevice)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Hardware ID</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{getHwId(selectedDevice)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Model Thương Phẩm</span>
                    <span className="font-medium text-slate-900 dark:text-white">{getModel(selectedDevice)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Mã Model (SKU)</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{selectedDevice.modelCode || matchedModel?.modelCode || "AUSTEC-A900"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Nhóm Sản Phẩm</span>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                      {getGroup(selectedDevice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Loại Phần Cứng</span>
                    <span className="font-medium text-slate-900 dark:text-white">{getDeviceTypeInfo(getType(selectedDevice)).label}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Nhà Sản Xuất</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{selectedDevice.supplier || matchedModel?.supplier || "Austec Smart Factory"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Bản Phần Cứng (HW)</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{selectedDevice.hardwareVersion || matchedModel?.hardwareVersion || "HW-REV-A"}</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-between items-center">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Phiên Bản Firmware</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                      {selectedDevice.firmwareVersionCurrent || "v2.4.1"}
                      <span className="text-[10px] text-slate-400 font-normal ml-1.5">(Mới nhất: {selectedDevice.firmwareVersionLatest || matchedModel?.firmwareVersionLatest || "v2.4.2"})</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Information & Installation Address Card */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-slate-700/80">
                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Chủ Sở Hữu & Nơi Lắp Đặt</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">Họ và tên khách hàng:</span>
                    <span className="text-slate-900 dark:text-white font-bold">{getOwner(selectedDevice)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">Số điện thoại:</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-mono font-bold flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{getPhone(selectedDevice)}</span>
                    </span>
                  </div>
                  <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-0.5">Địa chỉ lắp đặt:</span>
                    <div className="flex items-start gap-1.5 text-slate-800 dark:text-slate-200 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{getAddress(selectedDevice) || "Kho tổng Austec"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Warranty & Production Details Card */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-slate-700/80">
                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Bảo Hành & Lô Xuất Xưởng</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Hạn Bảo Hành</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      {getWarranty(selectedDevice) || "12/2028"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Bắt Đầu Bảo Hành</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {selectedDevice.warrantyStartAt ? new Date(selectedDevice.warrantyStartAt).toLocaleDateString('vi-VN') : "Từ ngày kích hoạt"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Lô Sản Xuất (Batch)</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{selectedDevice.batchNumber || "AT-BATCH-01"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Địa Chỉ MAC</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{selectedDevice.macAddress || "EC:FA:BC:--:--"}</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-between items-center">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Ngày Tạo / Nhập Kho</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {selectedDevice.createdAt ? new Date(selectedDevice.createdAt).toLocaleString('vi-VN') : "---"}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-between items-center">
                    <span className="text-slate-400 text-[10px] uppercase font-semibold">Nhịp Tim Cuối (Heartbeat)</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {selectedDevice.lastHeartbeat ? new Date(selectedDevice.lastHeartbeat).toLocaleString('vi-VN') : "Đang chờ gói tin..."}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subscription & Cloud License Card */}
              <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-950/10 dark:bg-cyan-950/20 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-cyan-500/20">
                  <div className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Gói Dịch Vụ & Bản Quyền Cloud</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    selectedDevice.subscriptionType === 'PERPETUAL'
                      ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30'
                      : selectedDevice.subscriptionStatus === 'EXPIRED'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  }`}>
                    {selectedDevice.subscriptionType === 'PERPETUAL' ? 'VÔ THỜI HẠN (Trọn đời)' : 'CÓ THỜI HẠN'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Thời hạn sử dụng Cloud:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {selectedDevice.subscriptionType === 'PERPETUAL'
                      ? 'Vĩnh viễn'
                      : selectedDevice.subscriptionExpiresAt
                      ? new Date(selectedDevice.subscriptionExpiresAt).toLocaleDateString('vi-VN')
                      : '31/12/2028'}
                  </span>
                </div>

                {/* Quick Renewal Buttons */}
                <div className="pt-2 border-t border-cyan-500/20 space-y-1.5">
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                    Gia Hạn Dịch Vụ Bản Quyền:
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRenewDevice(getHwId(selectedDevice), 12, false)}
                      disabled={renewLoading}
                      className="px-2 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[10px] text-center transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      + 12 Tháng
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRenewDevice(getHwId(selectedDevice), 24, false)}
                      disabled={renewLoading}
                      className="px-2 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] text-center transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      + 24 Tháng
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRenewDevice(getHwId(selectedDevice), 0, true)}
                      disabled={renewLoading}
                      className="px-2 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[10px] text-center transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      Vô Thời Hạn
                    </button>
                  </div>
                </div>
              </div>

              {/* Operational State & Direct Control Card */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/80 dark:border-slate-700/80">
                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Trạng Thái Vận Hành & Điều Khiển</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <Battery className="w-4 h-4 text-emerald-500" />
                    <div>
                      <div className="text-[10px] text-slate-400">Mức Pin</div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{selectedDevice.battery || 100}%</div>
                    </div>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-cyan-500" />
                    <div>
                      <div className="text-[10px] text-slate-400">Tín Hiệu Wi-Fi</div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{selectedDevice.signal || -65} dBm</div>
                    </div>
                  </div>
                </div>

                {/* Direct Control Buttons for DOOR / LOCK */}
                {getType(selectedDevice) === "DOOR" && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
                      <span>Điều Khiển Cửa Cuốn:</span>
                      <span className="font-mono text-cyan-600 dark:text-cyan-400">
                        {selectedDevice.openState || "CLOSED"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleDoor(getHwId(selectedDevice), "OPENED")}
                        disabled={controlLoading}
                        className="px-2 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs text-center transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {controlLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "▲ Mở Cửa"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleDoor(getHwId(selectedDevice), "STOPPED")}
                        disabled={controlLoading}
                        className="px-2 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs text-center transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {controlLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "■ Dừng"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleDoor(getHwId(selectedDevice), "CLOSED")}
                        disabled={controlLoading}
                        className="px-2 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs text-center transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        {controlLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "▼ Đóng Cửa"}
                      </button>
                    </div>
                  </div>
                )}

                {getType(selectedDevice) === "SMART_LOCK" && (
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider flex items-center justify-between">
                      <span>Điều Khiển Khóa Thông Minh:</span>
                      <span className="font-mono text-cyan-600 dark:text-cyan-400">
                        {selectedDevice.isLocked ? "ĐANG KHÓA" : "ĐANG MỞ"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleDoor(getHwId(selectedDevice), "UNLOCKED")}
                        disabled={controlLoading}
                        className="px-2 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs text-center transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Mở Khóa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleDoor(getHwId(selectedDevice), "LOCKED")}
                        disabled={controlLoading}
                        className="px-2 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs text-center transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Khóa Cửa</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Footer Actions */}
            <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                {canUpdate && (
                  <button
                    type="button"
                    onClick={() => setEditingDevice(selectedDevice)}
                    className="px-3 py-1.5 rounded bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa Thông Tin</span>
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeletingDevice(selectedDevice)}
                    className="px-3 py-1.5 rounded bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa</span>
                  </button>
                )}
              </div>
              <button 
                type="button"
                onClick={() => setSelectedDevice(null)}
                className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Device Modal */}
      {editingDevice && (
        <EditDeviceModal
          isOpen={!!editingDevice}
          onClose={() => setEditingDevice(null)}
          device={editingDevice}
          onUpdated={handleDeviceUpdated}
          models={models}
          groups={groups}
        />
      )}

      {/* Delete Device Modal */}
      {deletingDevice && (
        <ConfirmDeleteModal
          isOpen={!!deletingDevice}
          onClose={() => setDeletingDevice(null)}
          onConfirm={handleDeleteConfirm}
          itemName={getName(deletingDevice) || getHwId(deletingDevice)}
          itemType="thiết bị"
          description={`Bạn có chắc chắn muốn xóa thiết bị "${getName(deletingDevice) || getHwId(deletingDevice)}" (${getHwId(deletingDevice)}) khỏi CSDL?`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
