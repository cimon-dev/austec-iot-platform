"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Loader2, Image as ImageIcon } from "lucide-react";
import { getApiBaseUrl } from "@/context/apiConfig";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { ImageUploader } from "@/components/ImageUploader";

export interface DeviceModelItem {
  id: number;
  modelCode: string;
  modelName: string;
  groupId?: number;
  typeId?: number;
  firmwareVersionLatest?: string;
  hardwareVersion?: string;
  supplier?: string;
  imageUrl?: string;
  propertiesConfig?: any[];
  assignedProperties?: number[];
  createdAt?: string;
}

interface DeviceModelTabProps {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function DeviceModelTab({
  canCreate,
  canUpdate,
  canDelete,
  showToast,
}: DeviceModelTabProps) {
  const [models, setModels] = useState<DeviceModelItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    modelCode: "",
    modelName: "",
    fw: "v1.0.0",
    hw: "HW-REV-A",
    supplier: "Austec Factory",
    imageUrl: "",
  });

  // Modal Edit
  const [editItem, setEditItem] = useState<DeviceModelItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    modelCode: "",
    modelName: "",
    fw: "v1.0.0",
    hw: "HW-REV-A",
    supplier: "Austec Factory",
    imageUrl: "",
  });

  // Modal Delete
  const [deleteTarget, setDeleteTarget] = useState<DeviceModelItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchModels = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
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

  useEffect(() => {
    fetchModels();
  }, []);

  // Handle Create Model
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.modelName.trim() || !createForm.modelCode.trim()) {
      showToast("Vui lòng điền tên và mã khuôn mẫu!", "error");
      return;
    }

    const cleanCode = createForm.modelCode.trim().toUpperCase();
    if (models.some((m) => m.modelCode?.toUpperCase() === cleanCode)) {
      showToast(`Mã Model "${cleanCode}" đã tồn tại! Vui lòng chọn mã khác.`, "error");
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/models`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          modelCode: cleanCode,
          modelName: createForm.modelName.trim(),
          firmwareVersionLatest: createForm.fw.trim(),
          hardwareVersion: createForm.hw.trim(),
          supplier: createForm.supplier.trim(),
          imageUrl: createForm.imageUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Đã tạo khuôn mẫu "${createForm.modelName}" thành công!`);
        setIsCreateOpen(false);
        setCreateForm({
          modelCode: "",
          modelName: "",
          fw: "v1.0.0",
          hw: "HW-REV-A",
          supplier: "Austec Factory",
          imageUrl: "",
        });
        fetchModels();
      } else {
        showToast(data.error || "Lỗi tạo khuôn mẫu", "error");
      }
    } catch (err: any) {
      showToast("Lỗi kết nối: " + err.message, "error");
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
      fw: item.firmwareVersionLatest || "v1.0.0",
      hw: item.hardwareVersion || "HW-REV-A",
      supplier: item.supplier || "Austec Factory",
      imageUrl: item.imageUrl || "",
    });
  };

  // Handle Update Model
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    if (!editForm.modelName.trim()) {
      showToast("Vui lòng nhập tên khuôn mẫu!", "error");
      return;
    }

    setIsUpdating(true);
    try {
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/models/${editItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          modelCode: editForm.modelCode.trim().toUpperCase(),
          modelName: editForm.modelName.trim(),
          firmwareVersionLatest: editForm.fw.trim(),
          hardwareVersion: editForm.hw.trim(),
          supplier: editForm.supplier.trim(),
          imageUrl: editForm.imageUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Đã cập nhật khuôn mẫu "${editForm.modelName}"!`);
        setEditItem(null);
        fetchModels();
      } else {
        showToast(data.error || "Lỗi cập nhật", "error");
      }
    } catch (err: any) {
      showToast("Lỗi kết nối: " + err.message, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete Model
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/models/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Đã xóa khuôn mẫu "${deleteTarget.modelName}" khỏi hệ thống!`);
        setDeleteTarget(null);
        fetchModels();
      } else {
        showToast(data.error || "Lỗi khi xóa khuôn mẫu", "error");
      }
    } catch (err: any) {
      showToast("Lỗi kết nối: " + err.message, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-3">
      {/* Action Header */}
      <div className="flex justify-between items-center shrink-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Khuôn mẫu thương phẩm & định danh phần cứng thiết bị xuất xưởng
        </p>
        {canCreate && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
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
            <p className="text-xs text-slate-400">Chưa có khuôn mẫu sản phẩm nào được tạo.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {models.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center gap-3.5 hover:border-indigo-500/50 transition-all group"
              >
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
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded font-bold border border-indigo-200 dark:border-indigo-800 shrink-0">
                      {m.modelCode}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      FW: {m.firmwareVersionLatest || "v1.0.0"}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 mt-2">
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(m)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-3.5 h-3.5" />
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
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Thêm khuôn mẫu sản phẩm mới
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên khuôn mẫu sản phẩm *
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phiên bản Firmware
                  </label>
                  <input
                    type="text"
                    value={createForm.fw}
                    onChange={(e) => setCreateForm({ ...createForm, fw: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hardware Revision
                  </label>
                  <input
                    type="text"
                    value={createForm.hw}
                    onChange={(e) => setCreateForm({ ...createForm, hw: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Cloudflare R2 Image Uploader */}
              <ImageUploader
                label="Hình ảnh khuôn mẫu sản phẩm"
                folder="models"
                value={createForm.imageUrl}
                onChange={(url) => setCreateForm({ ...createForm, imageUrl: url })}
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Chỉnh sửa khuôn mẫu: {editItem.modelName}
              </h3>
              <button
                type="button"
                onClick={() => setEditItem(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên khuôn mẫu sản phẩm *
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phiên bản Firmware
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
                    Hardware Revision
                  </label>
                  <input
                    type="text"
                    value={editForm.hw}
                    onChange={(e) => setEditForm({ ...editForm, hw: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <ImageUploader
                label="Hình ảnh khuôn mẫu sản phẩm"
                folder="models"
                value={editForm.imageUrl}
                onChange={(url) => setEditForm({ ...editForm, imageUrl: url })}
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      <ConfirmDeleteModal
        isOpen={Boolean(deleteTarget)}
        title="Xóa khuôn mẫu sản phẩm"
        itemName={deleteTarget?.modelName}
        itemType="khuôn mẫu sản phẩm"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
