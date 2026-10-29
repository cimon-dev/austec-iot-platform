"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  Image as ImageIcon,
  Sliders,
  Search,
  Sparkles,
  Cpu,
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

export interface DeviceTypeItem {
  id: number;
  typeCode: string;
  typeName: string;
  imageUrl?: string;
  description?: string;
  createdAt?: string;
  activeCount?: number;
  assignedProperties?: (number | string)[];
}

interface DeviceTypeTabProps {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  properties?: PropertyItem[];
}

export function DeviceTypeTab({
  canCreate,
  canUpdate,
  canDelete,
  properties: externalProperties,
}: DeviceTypeTabProps) {
  const [types, setTypes] = useState<DeviceTypeItem[]>([]);
  const [properties, setProperties] = useState<PropertyItem[]>(externalProperties || []);
  const [isLoading, setIsLoading] = useState(true);
  const [propertySearchQuery, setPropertySearchQuery] = useState("");

  // Modal Create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    typeName: "",
    typeCode: "",
    imageUrl: "",
    description: "",
    assignedProperties: [] as (number | string)[],
  });

  // Modal Edit
  const [editItem, setEditItem] = useState<DeviceTypeItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    typeName: "",
    typeCode: "",
    imageUrl: "",
    description: "",
    assignedProperties: [] as (number | string)[],
  });

  // Modal Delete
  const [deleteTarget, setDeleteTarget] = useState<DeviceTypeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTypes = async () => {
    setIsLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/device-types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.deviceTypes)) {
        setTypes(data.deviceTypes);
      }
    } catch (err: any) {
      console.warn("Lỗi nạp loại phần cứng:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

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

  useEffect(() => {
    fetchTypes();
    fetchProperties();
  }, []);

  useEffect(() => {
    if (externalProperties && externalProperties.length > 0) {
      setProperties(externalProperties);
    }
  }, [externalProperties]);

  // Filter properties by search query
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

  const isPropSelected = (assignedList: (number | string)[], prop: PropertyItem) => {
    return assignedList.some(
      (item) => item === prop.id || String(item) === String(prop.id) || item === prop.propertyKey
    );
  };

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

  // Handle Create Type
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.typeName.trim() || !createForm.typeCode.trim()) {
      toast.error("Vui lòng điền đầy đủ Tên và Mã loại!");
      return;
    }

    const cleanCode = createForm.typeCode.trim().toUpperCase();
    if (types.some((t) => t.typeCode?.toUpperCase() === cleanCode)) {
      toast.error(`Mã loại "${cleanCode}" đã tồn tại! Vui lòng chọn mã khác.`);
      return;
    }

    setIsCreating(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/device-types`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          typeName: createForm.typeName.trim(),
          typeCode: cleanCode,
          imageUrl: createForm.imageUrl,
          description: createForm.description.trim(),
          assignedProperties: createForm.assignedProperties,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã tạo loại phần cứng "${createForm.typeName}" thành công!`);
        setIsCreateOpen(false);
        setCreateForm({
          typeName: "",
          typeCode: "",
          imageUrl: "",
          description: "",
          assignedProperties: [],
        });
        fetchTypes();
      } else {
        toast.error(data.error || "Lỗi tạo loại phần cứng");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối máy chủ: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: DeviceTypeItem) => {
    setEditItem(item);
    setEditForm({
      typeName: item.typeName,
      typeCode: item.typeCode,
      imageUrl: item.imageUrl || "",
      description: item.description || "",
      assignedProperties: Array.isArray(item.assignedProperties) ? item.assignedProperties : [],
    });
    setPropertySearchQuery("");
  };

  // Handle Update Type
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    if (!editForm.typeName.trim()) {
      toast.error("Vui lòng nhập tên loại phần cứng!");
      return;
    }

    setIsUpdating(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/device-types/${editItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          typeName: editForm.typeName.trim(),
          typeCode: editForm.typeCode.trim().toUpperCase(),
          imageUrl: editForm.imageUrl,
          description: editForm.description.trim(),
          assignedProperties: editForm.assignedProperties,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã cập nhật loại phần cứng "${editForm.typeName}"!`);
        setEditItem(null);
        fetchTypes();
      } else {
        toast.error(data.error || "Lỗi cập nhật");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete Type (via ConfirmDeleteModal)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("austec_auth_token") || "austec-admin-super-token" : "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/device-types/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa loại phần cứng "${deleteTarget.typeName}" khỏi hệ thống!`);
        setDeleteTarget(null);
        fetchTypes();
      } else {
        toast.error(data.error || "Lỗi khi xóa loại phần cứng");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to preview assigned properties
  const getTypePropertyDetails = (assigned?: (number | string)[]) => {
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
            Phân loại thiết bị phần cứng & cấu hình bộ thuộc tính mặc định
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setPropertySearchQuery("");
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm loại mới</span>
          </button>
        )}
      </div>

      {/* Grid List */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          </div>
        ) : types.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400">Chưa có loại phần cứng nào trong CSDL.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {types.map((t) => {
              const propDetails = getTypePropertyDetails(t.assignedProperties);
              const propCount = Array.isArray(t.assignedProperties) ? t.assignedProperties.length : 0;

              return (
                <div
                  key={t.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between hover:border-purple-500/50 hover:shadow-md transition-all group"
                >
                  <div>
                    {/* Top Row */}
                    <div className="flex items-start gap-3">
                      {/* Image / Thumbnail */}
                      <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                        {t.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.imageUrl} alt={t.typeName} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {t.typeName}
                          </span>
                          <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded font-bold border border-purple-200 dark:border-purple-800 shrink-0">
                            {t.typeCode}
                          </span>
                        </div>
                        {t.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {t.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Assigned Properties Summary */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-purple-500" />
                          <span>Thuộc tính mặc định:</span>
                        </span>
                        {propCount > 0 ? (
                          <span className="text-[9px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                            {propCount} thuộc tính
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic">Mặc định rỗng</span>
                        )}
                      </div>

                      {propDetails.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          {propDetails.slice(0, 3).map((p) => (
                            <span
                              key={p.id}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono"
                            >
                              {p.displayName}
                            </span>
                          ))}
                          {propCount > 3 && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 font-semibold border border-purple-200 dark:border-purple-800">
                              +{propCount - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(t)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Chỉnh sửa & Gán thuộc tính"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Sửa & Gán TT</span>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(t)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Xóa loại phần cứng"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg">
                  <Cpu className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Thêm loại phần cứng mới
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

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên loại phần cứng *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Cửa cuốn tự động, Khóa thông minh"
                    value={createForm.typeName}
                    onChange={(e) => setCreateForm({ ...createForm, typeName: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mã loại (Type Code) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: DOOR, SMART_LOCK, UPS"
                    value={createForm.typeCode}
                    onChange={(e) => setCreateForm({ ...createForm, typeCode: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Cloudflare R2 Image Uploader */}
              <ImageUploader
                value={createForm.imageUrl}
                onChange={(url) => setCreateForm({ ...createForm, imageUrl: url })}
                label="Ảnh minh họa loại phần cứng"
                folder="device-types"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chức năng
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả công năng của dòng phần cứng này..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* SECTION: GÁN THUỘC TÍNH MẶC ĐỊNH */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-purple-600" />
                      <span>Gán Thuộc Tính Mặc Định Cho Loại Thiết Bị</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Các thiết bị thuộc loại này sẽ tự động kế thừa bộ thuộc tính được chọn
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(true)}
                      className="text-[11px] font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded hover:bg-purple-50 dark:hover:bg-slate-800 cursor-pointer"
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

                {/* Filter and Counter */}
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm thuộc tính..."
                      value={propertySearchQuery}
                      onChange={(e) => setPropertySearchQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 shrink-0 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
                    Đã gán: {createForm.assignedProperties.length} / {properties.length}
                  </span>
                </div>

                {/* Properties Checkbox Grid */}
                <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  {filteredProperties.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      Không tìm thấy thuộc tính nào phù hợp.
                    </div>
                  ) : (
                    filteredProperties.map((prop) => {
                      const selected = isPropSelected(createForm.assignedProperties, prop);
                      return (
                        <div
                          key={prop.id}
                          onClick={() => handleToggleProperty(prop, true)}
                          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all select-none ${
                            selected
                              ? "bg-purple-50/90 dark:bg-purple-950/50 border-purple-300 dark:border-purple-700 shadow-xs"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer pointer-events-none"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {prop.displayName}
                                </span>
                                {prop.unit && (
                                  <span className="text-[10px] text-slate-400 font-mono">({prop.unit})</span>
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
                                  ? "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                              }`}
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
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs px-4 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold disabled:opacity-50"
                >
                  {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Lưu loại phần cứng</span>
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
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg">
                  <Edit className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Chỉnh sửa loại phần cứng & Thuộc tính mặc định
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

            <form onSubmit={handleUpdateSubmit} className="flex-1 overflow-y-auto p-5 space-y-3.5 min-h-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tên loại phần cứng *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.typeName}
                    onChange={(e) => setEditForm({ ...editForm, typeName: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mã loại (Type Code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.typeCode}
                    onChange={(e) => setEditForm({ ...editForm, typeCode: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Cloudflare R2 Image Uploader */}
              <ImageUploader
                value={editForm.imageUrl}
                onChange={(url) => setEditForm({ ...editForm, imageUrl: url })}
                label="Ảnh minh họa loại phần cứng"
                folder="device-types"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chức năng
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* SECTION: GÁN THUỘC TÍNH MẶC ĐỊNH */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-purple-600" />
                      <span>Gán Thuộc Tính Mặc Định Cho Loại Thiết Bị</span>
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Các thiết bị thuộc loại này sẽ tự động kế thừa bộ thuộc tính được chọn
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectAll(false)}
                      className="text-[11px] font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded hover:bg-purple-50 dark:hover:bg-slate-800 cursor-pointer"
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

                {/* Filter and Counter */}
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm thuộc tính..."
                      value={propertySearchQuery}
                      onChange={(e) => setPropertySearchQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 shrink-0 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
                    Đã gán: {editForm.assignedProperties.length} / {properties.length}
                  </span>
                </div>

                {/* Properties Checkbox Grid */}
                <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  {filteredProperties.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      Không tìm thấy thuộc tính nào phù hợp.
                    </div>
                  ) : (
                    filteredProperties.map((prop) => {
                      const selected = isPropSelected(editForm.assignedProperties, prop);
                      return (
                        <div
                          key={prop.id}
                          onClick={() => handleToggleProperty(prop, false)}
                          className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all select-none ${
                            selected
                              ? "bg-purple-50/90 dark:bg-purple-950/50 border-purple-300 dark:border-purple-700 shadow-xs"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => {}}
                              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer pointer-events-none"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  {prop.displayName}
                                </span>
                                {prop.unit && (
                                  <span className="text-[10px] text-slate-400 font-mono">({prop.unit})</span>
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
                                  ? "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                              }`}
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
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs px-4 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold disabled:opacity-50"
                >
                  {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Cập nhật loại phần cứng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Xóa loại phần cứng"
        itemName={deleteTarget?.typeName}
        itemType="loại phần cứng"
        description={`Bạn có chắc chắn muốn xóa loại phần cứng "${deleteTarget?.typeName}" (${deleteTarget?.typeCode})?`}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
