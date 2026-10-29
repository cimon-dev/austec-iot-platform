"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  Image as ImageIcon,
  Search,
  Sliders,
  Check,
  Cpu,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/context/apiConfig";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { ImageUploader } from "@/components/ImageUploader";

export interface PropertyItem {
  id: number;
  propertyKey: string;
  displayName: string;
  dataType: string;
  unit?: string;
  uiWidgetType: string;
  isControllable?: boolean;
  description?: string;
}

export interface DeviceModelItem {
  id: number;
  modelCode: string;
  modelName: string;
  groupId?: number | null;
  typeId?: number | null;
  groupName?: string;
  typeName?: string;
  firmwareVersionLatest?: string;
  hardwareVersion?: string;
  supplier?: string;
  imageUrl?: string;
  propertiesConfig?: any[];
  assignedProperties?: (number | string)[];
  controlCapabilities?: string[];
  createdAt?: string;
}

interface DeviceModelTabProps {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  properties?: PropertyItem[];
  deviceTypes?: any[];
  groups?: any[];
}

export function DeviceModelTab({
  canCreate,
  canUpdate,
  canDelete,
  properties: externalProperties,
  deviceTypes: externalTypes,
  groups: externalGroups,
}: DeviceModelTabProps) {
  const [models, setModels] = useState<DeviceModelItem[]>([]);
  const [properties, setProperties] = useState<PropertyItem[]>(externalProperties || []);
  const [deviceTypes, setDeviceTypes] = useState<any[]>(externalTypes || []);
  const [groups, setGroups] = useState<any[]>(externalGroups || []);
  const [isLoading, setIsLoading] = useState(true);

  // Property Search & Filter
  const [propertySearchQuery, setPropertySearchQuery] = useState("");

  // Modal Create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    modelCode: "",
    modelName: "",
    groupId: "" as string | number,
    typeId: "" as string | number,
    fw: "v1.0.0",
    hw: "HW-REV-A",
    supplier: "Austec Factory",
    imageUrl: "",
    assignedProperties: [] as (number | string)[],
  });

  // Modal Edit
  const [editItem, setEditItem] = useState<DeviceModelItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    modelCode: "",
    modelName: "",
    groupId: "" as string | number,
    typeId: "" as string | number,
    fw: "v1.0.0",
    hw: "HW-REV-A",
    supplier: "Austec Factory",
    imageUrl: "",
    assignedProperties: [] as (number | string)[],
  });

  // Modal Delete
  const [deleteTarget, setDeleteTarget] = useState<DeviceModelItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Models
  const fetchModels = async () => {
    setIsLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/models`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.models)) {
        setModels(data.models);
      }
    } catch (err: any) {
      console.warn("Lỗi nạp khuôn mẫu sản phẩm:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Properties Dictionary
  const fetchProperties = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/properties`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.properties)) {
        setProperties(data.properties);
      }
    } catch (err: any) {
      console.warn("Lỗi nạp danh sách thuộc tính:", err.message);
    }
  };

  // Fetch Types & Groups
  const fetchSupportingData = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/device-types`, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.deviceTypes)) {
        setDeviceTypes(data.deviceTypes);
      }
    } catch (e: any) {
      console.warn("Lỗi nạp device types:", e.message);
    }

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/groups`, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        setGroups(data.groups);
      }
    } catch (e: any) {
      console.warn("Lỗi nạp groups:", e.message);
    }
  };

  useEffect(() => {
    fetchModels();
    fetchProperties();
    fetchSupportingData();
  }, []);

  useEffect(() => {
    if (externalProperties && externalProperties.length > 0) {
      setProperties(externalProperties);
    }
  }, [externalProperties]);

  useEffect(() => {
    if (externalTypes && externalTypes.length > 0) {
      setDeviceTypes(externalTypes);
    }
  }, [externalTypes]);

  useEffect(() => {
    if (externalGroups && externalGroups.length > 0) {
      setGroups(externalGroups);
    }
  }, [externalGroups]);

  // Filter properties by search keyword
  const filteredProperties = useMemo(() => {
    if (!propertySearchQuery.trim()) return properties;
    const q = propertySearchQuery.toLowerCase();
    return properties.filter(
      (p) =>
        p.displayName?.toLowerCase().includes(q) ||
        p.propertyKey?.toLowerCase().includes(q) ||
        p.unit?.toLowerCase().includes(q)
    );
  }, [properties, propertySearchQuery]);

  // Check if property is selected
  const isPropSelected = (assignedList: (number | string)[], prop: PropertyItem) => {
    return assignedList.some(
      (item) => item === prop.id || String(item) === String(prop.id) || item === prop.propertyKey
    );
  };

  // Toggle Property Selection
  const handleToggleProperty = (prop: PropertyItem, isCreate: boolean) => {
    const propVal = prop.id;
    if (isCreate) {
      setCreateForm((prev) => {
        const exists = isPropSelected(prev.assignedProperties, prop);
        return {
          ...prev,
          assignedProperties: exists
            ? prev.assignedProperties.filter(
                (item) => item !== prop.id && String(item) !== String(prop.id) && item !== prop.propertyKey
              )
            : [...prev.assignedProperties, propVal],
        };
      });
    } else {
      setEditForm((prev) => {
        const exists = isPropSelected(prev.assignedProperties, prop);
        return {
          ...prev,
          assignedProperties: exists
            ? prev.assignedProperties.filter(
                (item) => item !== prop.id && String(item) !== String(prop.id) && item !== prop.propertyKey
              )
            : [...prev.assignedProperties, propVal],
        };
      });
    }
  };

  // Select / Deselect All
  const handleSelectAll = (isCreate: boolean) => {
    const allIds = properties.map((p) => p.id);
    if (isCreate) {
      setCreateForm((prev) => ({ ...prev, assignedProperties: allIds }));
    } else {
      setEditForm((prev) => ({ ...prev, assignedProperties: allIds }));
    }
  };

  const handleDeselectAll = (isCreate: boolean) => {
    if (isCreate) {
      setCreateForm((prev) => ({ ...prev, assignedProperties: [] }));
    } else {
      setEditForm((prev) => ({ ...prev, assignedProperties: [] }));
    }
  };

  // Tự động kế thừa và check các thuộc tính mặc định của Loại phần cứng khi được chọn
  const handleTypeSelect = (selectedTypeId: string | number, isCreate: boolean) => {
    const matchedType = deviceTypes.find((t) => String(t.id) === String(selectedTypeId));
    const typeProps = (matchedType?.assignedProperties || (matchedType as any)?.default_properties || []) as (number | string)[];

    if (isCreate) {
      setCreateForm((prev) => {
        // Hợp nhất các thuộc tính mặc định của loại phần cứng vào danh sách thuộc tính của mẫu
        const merged = Array.from(new Set([...prev.assignedProperties, ...typeProps]));
        return {
          ...prev,
          typeId: selectedTypeId,
          assignedProperties: merged,
        };
      });
    } else {
      setEditForm((prev) => {
        const merged = Array.from(new Set([...prev.assignedProperties, ...typeProps]));
        return {
          ...prev,
          typeId: selectedTypeId,
          assignedProperties: merged,
        };
      });
    }
  };

  // Handle Create Model
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.modelName.trim() || !createForm.modelCode.trim()) {
      toast.error("Vui lòng điền tên và mã khuôn mẫu!");
      return;
    }

    const cleanCode = createForm.modelCode.trim().toUpperCase();
    if (models.some((m) => m.modelCode?.toUpperCase() === cleanCode)) {
      toast.error(`Mã Model "${cleanCode}" đã tồn tại! Vui lòng chọn mã khác.`);
      return;
    }

    setIsCreating(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/models`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          modelCode: cleanCode,
          modelName: createForm.modelName.trim(),
          groupId: createForm.groupId ? Number(createForm.groupId) : null,
          typeId: createForm.typeId ? Number(createForm.typeId) : null,
          firmwareVersionLatest: createForm.fw.trim(),
          hardwareVersion: createForm.hw.trim(),
          supplier: createForm.supplier.trim(),
          imageUrl: createForm.imageUrl,
          assignedProperties: createForm.assignedProperties,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã tạo khuôn mẫu "${createForm.modelName}" thành công!`);
        setIsCreateOpen(false);
        setCreateForm({
          modelCode: "",
          modelName: "",
          groupId: "",
          typeId: "",
          fw: "v1.0.0",
          hw: "HW-REV-A",
          supplier: "Austec Factory",
          imageUrl: "",
          assignedProperties: [],
        });
        fetchModels();
      } else {
        toast.error(data.error || "Lỗi tạo khuôn mẫu");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: DeviceModelItem) => {
    setEditItem(item);
    setEditForm({
      modelCode: item.modelCode,
      modelName: item.modelName,
      groupId: item.groupId ?? "",
      typeId: item.typeId ?? "",
      fw: item.firmwareVersionLatest || "v1.0.0",
      hw: item.hardwareVersion || "HW-REV-A",
      supplier: item.supplier || "Austec Factory",
      imageUrl: item.imageUrl || "",
      assignedProperties: Array.isArray(item.assignedProperties) ? item.assignedProperties : [],
    });
    setPropertySearchQuery("");
  };

  // Handle Update Model
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    if (!editForm.modelName.trim()) {
      toast.error("Vui lòng nhập tên khuôn mẫu!");
      return;
    }

    setIsUpdating(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/models/${editItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          modelCode: editForm.modelCode.trim().toUpperCase(),
          modelName: editForm.modelName.trim(),
          groupId: editForm.groupId ? Number(editForm.groupId) : null,
          typeId: editForm.typeId ? Number(editForm.typeId) : null,
          firmwareVersionLatest: editForm.fw.trim(),
          hardwareVersion: editForm.hw.trim(),
          supplier: editForm.supplier.trim(),
          imageUrl: editForm.imageUrl,
          assignedProperties: editForm.assignedProperties,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã cập nhật khuôn mẫu "${editForm.modelName}"!`);
        setEditItem(null);
        fetchModels();
      } else {
        toast.error(data.error || "Lỗi cập nhật");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete Model
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/models/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa khuôn mẫu "${deleteTarget.modelName}" khỏi hệ thống!`);
        setDeleteTarget(null);
        fetchModels();
      } else {
        toast.error(data.error || "Lỗi khi xóa khuôn mẫu");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to get property previews
  const getModelPropertyDetails = (assigned?: (number | string)[]) => {
    if (!assigned || !Array.isArray(assigned) || assigned.length === 0) return [];
    return assigned
      .map((keyOrId) =>
        properties.find(
          (p) => p.id === keyOrId || String(p.id) === String(keyOrId) || p.propertyKey === keyOrId
        )
      )
      .filter((p): p is PropertyItem => !!p);
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-3">
      {/* Action Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Khuôn mẫu thương phẩm (Model Assembly) & Bộ cấu hình thuộc tính phần cứng (Dynamic Schema)
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => {
              fetchSupportingData();
              fetchProperties();
              setPropertySearchQuery("");
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm mẫu mới</span>
          </button>
        )}
      </div>

      {/* Grid List */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : models.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400">Chưa có khuôn mẫu sản phẩm nào được tạo trong CSDL.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {models.map((m) => {
              const matchedGroup = groups.find((g) => g.id === m.groupId);
              const matchedType = deviceTypes.find((t) => t.id === m.typeId);
              const propDetails = getModelPropertyDetails(m.assignedProperties);
              const propCount = Array.isArray(m.assignedProperties) ? m.assignedProperties.length : 0;

              return (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-md transition-all group"
                >
                  <div>
                    {/* Top row: Image & main info */}
                    <div className="flex items-start gap-3">
                      {/* Image */}
                      <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                        {m.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.imageUrl} alt={m.modelName} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-slate-400" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {m.modelName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded font-bold border border-indigo-200 dark:border-indigo-800 shrink-0">
                            {m.modelCode}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            FW: {m.firmwareVersionLatest || "v1.0.0"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            HW: {m.hardwareVersion || "REV-A"}
                          </span>
                        </div>

                        {/* Associated Type & Group */}
                        {(matchedType || matchedGroup) && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {matchedType && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                <Cpu className="w-2.5 h-2.5" />
                                <span>{matchedType.typeName}</span>
                              </span>
                            )}
                            {matchedGroup && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                <Layers className="w-2.5 h-2.5" />
                                <span>{matchedGroup.groupName}</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assigned Properties Section */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-emerald-500" />
                          <span>Thuộc tính gán ({propCount}):</span>
                        </span>
                        {propCount > 0 ? (
                          <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                            Đã kích hoạt {propCount} thuộc tính
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">
                            Chưa gán thuộc tính
                          </span>
                        )}
                      </div>

                      {/* Property Chips */}
                      {propDetails.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {propDetails.slice(0, 4).map((p) => (
                            <span
                              key={p.id}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono"
                              title={`${p.displayName} (${p.propertyKey}) - ${p.dataType}${p.unit ? ` [${p.unit}]` : ""}`}
                            >
                              {p.displayName}
                            </span>
                          ))}
                          {propCount > 4 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200 dark:border-indigo-800">
                              +{propCount - 4} khác
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400">
                          Nhấp chỉnh sửa để gán các telemetry & lệnh điều khiển
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between gap-1.5 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                      {m.supplier || "Austec"}
                    </span>
                    <div className="flex items-center gap-1">
                      {canUpdate && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(m)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Chỉnh sửa & Gán thuộc tính"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Sửa & Gán TT</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(m)}
                          className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Xóa khuôn mẫu"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Thêm khuôn mẫu thương phẩm mới
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên thương phẩm *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Austec Titadoor A900 Super"
                    value={createForm.modelName}
                    onChange={(e) => setCreateForm({ ...createForm, modelName: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mã Model (Model Code) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: AUSTEC-A900"
                    value={createForm.modelCode}
                    onChange={(e) => setCreateForm({ ...createForm, modelCode: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Loại phần cứng (Device Type)
                  </label>
                  <select
                    value={createForm.typeId}
                    onChange={(e) => handleTypeSelect(e.target.value, true)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Chưa gán loại phần cứng --</option>
                    {deviceTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.typeName} ({t.typeCode})
                      </option>
                    ))}
                  </select>
                  {createForm.typeId && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      * Mẫu sẽ tự động có các thuộc tính của loại phần cứng đã chọn.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nhóm sản phẩm (Group)
                  </label>
                  <select
                    value={createForm.groupId}
                    onChange={(e) => setCreateForm({ ...createForm, groupId: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Chưa gán nhóm sản phẩm --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.groupName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phiên bản Firmware
                  </label>
                  <input
                    type="text"
                    placeholder="v1.0.0"
                    value={createForm.fw}
                    onChange={(e) => setCreateForm({ ...createForm, fw: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phiên bản Phần cứng
                  </label>
                  <input
                    type="text"
                    placeholder="HW-REV-A"
                    value={createForm.hw}
                    onChange={(e) => setCreateForm({ ...createForm, hw: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nhà máy / Nhà cung ứng
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Austec Smart Factory"
                  value={createForm.supplier}
                  onChange={(e) => setCreateForm({ ...createForm, supplier: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Cloudflare R2 Image Uploader */}
              <ImageUploader
                value={createForm.imageUrl}
                onChange={(url) => setCreateForm({ ...createForm, imageUrl: url })}
                label="Ảnh minh họa khuôn mẫu"
                folder="models"
              />

              {/* SECTION: GÁN BỘ THUỘC TÍNH SCHEMA (DYNAMIC PROPERTIES) */}
              {(() => {
                const selectedCreateType = deviceTypes.find((t) => String(t.id) === String(createForm.typeId));
                const createTypeProps = (selectedCreateType?.assignedProperties || (selectedCreateType as any)?.default_properties || []) as (number | string)[];

                return (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Gán Bộ Thuộc Tính Schema (Dynamic Properties)</span>
                        </label>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {selectedCreateType 
                            ? `Đã tự động chọn các thuộc tính của loại "${selectedCreateType.typeName}". Bạn có thể tích thêm hoặc bỏ bớt cho mẫu này.`
                            : "Chọn các chỉ số vi điều khiển thu thập hoặc nhận lệnh điều khiển trực tiếp từ xa"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSelectAll(true)}
                          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={() => handleDeselectAll(true)}
                          className="text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>

                    {/* Filter and Counter Bar */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Tìm kiếm thuộc tính theo tên, mã key..."
                          value={propertySearchQuery}
                          onChange={(e) => setPropertySearchQuery(e.target.value)}
                          className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        Đã gán: {createForm.assignedProperties.length} / {properties.length} thuộc tính
                      </span>
                    </div>

                    {/* Properties Checkbox Grid */}
                    <div className="max-h-56 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
                      {filteredProperties.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">
                          Không tìm thấy thuộc tính nào phù hợp.
                        </div>
                      ) : (
                        filteredProperties.map((prop) => {
                          const selected = isPropSelected(createForm.assignedProperties, prop);
                          const isInherited = createTypeProps.some(
                            (item) => item === prop.id || String(item) === String(prop.id) || item === prop.propertyKey
                          );
                          return (
                            <div
                              key={prop.id}
                              onClick={() => handleToggleProperty(prop, true)}
                              className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all select-none ${
                                selected
                                  ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 shadow-xs"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => {}}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer pointer-events-none"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                      {prop.displayName}
                                    </span>
                                    {prop.unit && (
                                      <span className="text-[10px] text-slate-400 font-mono">({prop.unit})</span>
                                    )}
                                    {isInherited && (
                                      <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
                                        Mặc định loại
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400 truncate">
                                    {prop.propertyKey}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700">
                                  {prop.dataType}
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                    prop.isControllable
                                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                                  }`}
                                  title={
                                    prop.isControllable
                                      ? "RW: Đọc & Ghi (Hỗ trợ nhận lệnh điều khiển)"
                                      : "RO: Chỉ đọc (Giám sát telemetry)"
                                  }
                                >
                                  {prop.isControllable ? "RW" : "RO"}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold disabled:opacity-50"
                >
                  {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu khuôn mẫu & Thuộc tính</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Edit className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Chỉnh sửa khuôn mẫu & Cấu hình thuộc tính
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUpdateSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên thương phẩm *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.modelName}
                    onChange={(e) => setEditForm({ ...editForm, modelName: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mã Model (Model Code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.modelCode}
                    onChange={(e) => setEditForm({ ...editForm, modelCode: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Loại phần cứng (Device Type)
                  </label>
                  <select
                    value={editForm.typeId}
                    onChange={(e) => handleTypeSelect(e.target.value, false)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Chưa gán loại phần cứng --</option>
                    {deviceTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.typeName} ({t.typeCode})
                      </option>
                    ))}
                  </select>
                  {editForm.typeId && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      * Mẫu sẽ tự động có các thuộc tính của loại phần cứng đã chọn.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nhóm sản phẩm (Group)
                  </label>
                  <select
                    value={editForm.groupId}
                    onChange={(e) => setEditForm({ ...editForm, groupId: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Chưa gán nhóm sản phẩm --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.groupName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phiên bản FW
                  </label>
                  <input
                    type="text"
                    value={editForm.fw}
                    onChange={(e) => setEditForm({ ...editForm, fw: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phiên bản HW
                  </label>
                  <input
                    type="text"
                    value={editForm.hw}
                    onChange={(e) => setEditForm({ ...editForm, hw: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nhà máy / Nhà cung ứng
                </label>
                <input
                  type="text"
                  value={editForm.supplier}
                  onChange={(e) => setEditForm({ ...editForm, supplier: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Cloudflare R2 Image Uploader */}
              <ImageUploader
                value={editForm.imageUrl}
                onChange={(url) => setEditForm({ ...editForm, imageUrl: url })}
                label="Ảnh minh họa khuôn mẫu"
                folder="models"
              />

              {/* SECTION: GÁN BỘ THUỘC TÍNH SCHEMA (DYNAMIC PROPERTIES) */}
              {(() => {
                const selectedEditType = deviceTypes.find((t) => String(t.id) === String(editForm.typeId));
                const editTypeProps = (selectedEditType?.assignedProperties || (selectedEditType as any)?.default_properties || []) as (number | string)[];

                return (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Gán Bộ Thuộc Tính Schema (Dynamic Properties)</span>
                        </label>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {selectedEditType 
                            ? `Đã tự động chọn các thuộc tính của loại "${selectedEditType.typeName}". Bạn có thể tích thêm hoặc bỏ bớt cho mẫu này.`
                            : "Chọn các chỉ số vi điều khiển thu thập hoặc nhận lệnh điều khiển trực tiếp từ xa"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSelectAll(false)}
                          className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={() => handleDeselectAll(false)}
                          className="text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>

                    {/* Filter and Counter Bar */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Tìm kiếm thuộc tính theo tên, mã key..."
                          value={propertySearchQuery}
                          onChange={(e) => setPropertySearchQuery(e.target.value)}
                          className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        Đã gán: {editForm.assignedProperties.length} / {properties.length} thuộc tính
                      </span>
                    </div>

                    {/* Properties Checkbox Grid */}
                    <div className="max-h-56 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
                      {filteredProperties.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">
                          Không tìm thấy thuộc tính nào phù hợp.
                        </div>
                      ) : (
                        filteredProperties.map((prop) => {
                          const selected = isPropSelected(editForm.assignedProperties, prop);
                          const isInherited = editTypeProps.some(
                            (item) => item === prop.id || String(item) === String(prop.id) || item === prop.propertyKey
                          );
                          return (
                            <div
                              key={prop.id}
                              onClick={() => handleToggleProperty(prop, false)}
                              className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all select-none ${
                                selected
                                  ? "bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-700 shadow-xs"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => {}}
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer pointer-events-none"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                      {prop.displayName}
                                    </span>
                                    {prop.unit && (
                                      <span className="text-[10px] text-slate-400 font-mono">({prop.unit})</span>
                                    )}
                                    {isInherited && (
                                      <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
                                        Mặc định loại
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400 truncate">
                                    {prop.propertyKey}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono border border-slate-200 dark:border-slate-700">
                                  {prop.dataType}
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                    prop.isControllable
                                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                                  }`}
                                  title={
                                    prop.isControllable
                                      ? "RW: Đọc & Ghi (Hỗ trợ nhận lệnh điều khiển)"
                                      : "RO: Chỉ đọc (Giám sát telemetry)"
                                  }
                                >
                                  {prop.isControllable ? "RW" : "RO"}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold disabled:opacity-50"
                >
                  {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Cập nhật khuôn mẫu & Thuộc tính</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Xóa khuôn mẫu"
        itemName={deleteTarget?.modelName}
        itemType="khuôn mẫu"
        description={`Bạn có chắc chắn muốn xóa khuôn mẫu "${deleteTarget?.modelName}" (${deleteTarget?.modelCode}) khỏi CSDL?`}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
