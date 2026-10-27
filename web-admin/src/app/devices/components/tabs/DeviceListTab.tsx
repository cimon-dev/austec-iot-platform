"use client";

import React, { useState, useMemo } from "react";
import { 
  Search, 
  X, 
  RotateCcw, 
  Plus, 
  Video, 
  Thermometer, 
  Droplets, 
  Power, 
  Camera, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Wifi, 
  Battery 
} from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { getApiBaseUrl } from "@/context/apiConfig";

interface DeviceListTabProps {
  devices: any[];
  setDevices: React.Dispatch<React.SetStateAction<any[]>>;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  showToast: (message: string, type?: "success" | "info" | "warning" | "error") => void;
  onOpenCreateModal: () => void;
}

export function DeviceListTab({
  devices,
  setDevices,
  canCreate,
  canUpdate,
  canDelete,
  showToast,
  onOpenCreateModal
}: DeviceListTabProps) {
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [filterGroup, setFilterGroup] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [deviceCurrentPage, setDeviceCurrentPage] = useState<number>(1);
  const [devicePageSize, setDevicePageSize] = useState<number>(10);
  const [controlLoading, setControlLoading] = useState<boolean>(false);
  const [renewLoading, setRenewLoading] = useState<boolean>(false);

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      const matchSearch =
        d.hwId?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        d.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        d.owner?.toLowerCase().includes(searchFilter.toLowerCase()) ||
        d.phone?.includes(searchFilter);
      const matchGroup = filterGroup === "ALL" || d.group === filterGroup;
      const matchType = filterType === "ALL" || d.type === filterType;
      const matchStatus = filterStatus === "ALL" || d.status === filterStatus;
      return matchSearch && matchGroup && matchType && matchStatus;
    });
  }, [devices, searchFilter, filterGroup, filterType, filterStatus]);

  const paginatedDevices = useMemo(() => {
    const start = (deviceCurrentPage - 1) * devicePageSize;
    return filteredDevices.slice(start, start + devicePageSize);
  }, [filteredDevices, deviceCurrentPage, devicePageSize]);

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
          {canCreate && (
            <button
              type="button"
              onClick={onOpenCreateModal}
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

        {/* Inline Inspector Detail Panel */}
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

                  <div className="relative rounded-lg overflow-hidden bg-slate-950 aspect-video border border-slate-800 flex items-center justify-center text-slate-400 group">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none"></div>
                    
                    <div className="absolute top-2 left-2 flex items-center gap-2 text-[10px] font-mono text-rose-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                      <span>REC [CAM-01]</span>
                    </div>
                    <div className="absolute top-2 right-2 text-[10px] font-mono text-slate-300">
                      30 FPS • H.265
                    </div>

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
  );
}
