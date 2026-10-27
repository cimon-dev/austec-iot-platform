"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/context/apiConfig";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { ImageUploader } from "@/components/ImageUploader";

export interface DeviceTypeItem {
  id: number;
  typeCode: string;
  typeName: string;
  imageUrl?: string;
  description?: string;
  createdAt?: string;
  activeCount?: number;
}

interface DeviceTypeTabProps {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export function DeviceTypeTab({
  canCreate,
  canUpdate,
  canDelete,
}: DeviceTypeTabProps) {
  const [types, setTypes] = useState<DeviceTypeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    typeName: "",
    typeCode: "",
    imageUrl: "",
    description: "",
  });

  // Modal Edit
  const [editItem, setEditItem] = useState<DeviceTypeItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    typeName: "",
    typeCode: "",
    imageUrl: "",
    description: "",
  });

  // Modal Delete
  const [deleteTarget, setDeleteTarget] = useState<DeviceTypeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTypes = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
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

  useEffect(() => {
    fetchTypes();
  }, []);

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
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
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
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã tạo loại phần cứng "${createForm.typeName}" thành công!`);
        setIsCreateOpen(false);
        setCreateForm({ typeName: "", typeCode: "", imageUrl: "", description: "" });
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
    });
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
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
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
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
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

  return (
    <div className="h-full flex flex-col min-h-0 space-y-3">
      {/* Action Header */}
      <div className="flex justify-between items-center shrink-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Phân loại phần cứng kỹ thuật & thiết bị trong hệ sinh thái Austec
        </p>
        {canCreate && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold shadow-xs"
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
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : types.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400">Chưa có loại phần cứng nào được định nghĩa.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {types.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center gap-3.5 hover:border-indigo-500/50 transition-all group"
              >
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
                    <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded font-bold border border-indigo-200 dark:border-indigo-800 shrink-0">
                      {t.typeCode}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {t.description}
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-1.5 mt-2">
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(t)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-3.5 h-3.5" />
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
                Thêm loại phần cứng mới
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
                  Tên loại phần cứng *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cửa cuốn tự động, Khóa cửa thông minh"
                  value={createForm.typeName}
                  onChange={(e) => setCreateForm({ ...createForm, typeName: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
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
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                />
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
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
                  <span>Lưu loại thiết bị</span>
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
                Chỉnh sửa loại phần cứng
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
                  Tên loại phần cứng *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.typeName}
                  onChange={(e) => setEditForm({ ...editForm, typeName: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
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
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                />
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
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
                  <span>Cập nhật</span>
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
