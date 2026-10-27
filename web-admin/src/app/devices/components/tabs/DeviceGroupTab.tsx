"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Loader2, Image as ImageIcon } from "lucide-react";
import { getApiBaseUrl } from "@/context/apiConfig";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { ImageUploader } from "@/components/ImageUploader";

export interface DeviceGroupItem {
  id: number;
  code: string;
  name?: string;
  groupName?: string;
  imageUrl?: string;
  bannerUrl?: string;
  description?: string;
  displayOrder?: number;
  createdAt?: string;
}

interface DeviceGroupTabProps {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function DeviceGroupTab({
  canCreate,
  canUpdate,
  canDelete,
  showToast,
}: DeviceGroupTabProps) {
  const [groups, setGroups] = useState<DeviceGroupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    imageUrl: "",
    description: "",
  });

  // Modal Edit
  const [editItem, setEditItem] = useState<DeviceGroupItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    code: "",
    name: "",
    imageUrl: "",
    description: "",
  });

  // Modal Delete
  const [deleteTarget, setDeleteTarget] = useState<DeviceGroupItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/groups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        setGroups(
          data.groups.map((g: any) => ({
            id: g.id,
            code: g.code,
            name: g.name || g.groupName || g.group_name,
            imageUrl: g.imageUrl || g.image_url || "",
            description: g.description || "",
            displayOrder: g.displayOrder || g.display_order || 0,
          }))
        );
      }
    } catch (err: any) {
      console.warn("Lỗi nạp nhóm sản phẩm:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // Handle Create Group
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.code.trim()) {
      showToast("Vui lòng điền đầy đủ Tên và Mã nhóm!", "error");
      return;
    }

    const cleanCode = createForm.code.trim().toUpperCase();
    if (groups.some((g) => g.code.toUpperCase() === cleanCode)) {
      showToast(`Mã nhóm "${cleanCode}" đã tồn tại! Vui lòng chọn mã khác.`, "error");
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: cleanCode,
          name: createForm.name.trim(),
          imageUrl: createForm.imageUrl,
          description: createForm.description.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Đã tạo nhóm sản phẩm "${createForm.name}" thành công!`);
        setIsCreateOpen(false);
        setCreateForm({ code: "", name: "", imageUrl: "", description: "" });
        fetchGroups();
      } else {
        showToast(data.error || "Lỗi tạo nhóm", "error");
      }
    } catch (err: any) {
      showToast("Lỗi kết nối: " + err.message, "error");
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: DeviceGroupItem) => {
    setEditItem(item);
    setEditForm({
      code: item.code,
      name: item.name || "",
      imageUrl: item.imageUrl || "",
      description: item.description || "",
    });
  };

  // Handle Update Group
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    setIsUpdating(true);
    try {
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/groups/${editItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: editForm.code.trim().toUpperCase(),
          name: editForm.name.trim(),
          imageUrl: editForm.imageUrl,
          description: editForm.description.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Đã cập nhật nhóm sản phẩm "${editForm.name}"!`);
        setEditItem(null);
        fetchGroups();
      } else {
        showToast(data.error || "Lỗi cập nhật", "error");
      }
    } catch (err: any) {
      showToast("Lỗi kết nối: " + err.message, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete Group (via ConfirmDeleteModal)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/groups/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Đã xóa nhóm sản phẩm "${deleteTarget.name}" khỏi hệ thống!`);
        setDeleteTarget(null);
        fetchGroups();
      } else {
        showToast(data.error || "Lỗi khi xóa nhóm", "error");
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
          Danh mục nhóm sản phẩm & dải thiết bị phần cứng trong hệ sinh thái
        </p>
        {canCreate && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm nhóm mới</span>
          </button>
        )}
      </div>

      {/* Grid List */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400">Chưa có nhóm sản phẩm nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.map((g) => (
              <div
                key={g.id}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex items-center gap-3.5 hover:border-indigo-500/50 transition-all group"
              >
                {/* Image */}
                <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                  {g.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.imageUrl} alt={g.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {g.name}
                    </span>
                    <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded font-bold border border-indigo-200 dark:border-indigo-800 shrink-0">
                      {g.code}
                    </span>
                  </div>
                  {g.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {g.description}
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-1.5 mt-2">
                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(g)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(g)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Xóa nhóm"
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
                Thêm nhóm sản phẩm mới
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
                  Tên nhóm sản phẩm *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cửa cuốn nhôm Đức Titadoor"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã nhóm (Group Code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: GRP_DOOR, GRP_LOCK"
                  value={createForm.code}
                  onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Cloudflare R2 Image Uploader */}
              <ImageUploader
                label="Hình ảnh đại diện nhóm"
                folder="groups"
                value={createForm.imageUrl}
                onChange={(url) => setCreateForm({ ...createForm, imageUrl: url })}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả nhóm
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả danh mục sản phẩm này..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

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
                Chỉnh sửa nhóm: {editItem.name}
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
                  Tên nhóm sản phẩm *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã nhóm (Group Code) *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.code}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                />
              </div>

              <ImageUploader
                label="Hình ảnh đại diện nhóm"
                folder="groups"
                value={editForm.imageUrl}
                onChange={(url) => setEditForm({ ...editForm, imageUrl: url })}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả nhóm
                </label>
                <textarea
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

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
        title="Xóa nhóm sản phẩm"
        itemName={deleteTarget?.name}
        itemType="nhóm sản phẩm"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
