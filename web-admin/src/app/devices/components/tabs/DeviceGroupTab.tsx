"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/context/apiConfig";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { ImageUploader } from "@/components/ImageUploader";

export interface DeviceGroupItem {
  id: number;
  code: string;
  groupName: string;
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
}

export function DeviceGroupTab({
  canCreate,
  canUpdate,
  canDelete,
}: DeviceGroupTabProps) {
  const [groups, setGroups] = useState<DeviceGroupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: "",
    groupName: "",
    imageUrl: "",
    description: "",
  });

  // Modal Edit
  const [editItem, setEditItem] = useState<DeviceGroupItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    code: "",
    groupName: "",
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
        setGroups(data.groups);
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
    if (!createForm.groupName.trim() || !createForm.code.trim()) {
      toast.error("Vui lòng điền đầy đủ Tên và Mã nhóm!");
      return;
    }

    const cleanCode = createForm.code.trim().toUpperCase();
    if (groups.some((g) => g.code.toUpperCase() === cleanCode)) {
      toast.error(`Mã nhóm "${cleanCode}" đã tồn tại! Vui lòng chọn mã khác.`);
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
          groupName: createForm.groupName.trim(),
          imageUrl: createForm.imageUrl,
          description: createForm.description.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã tạo nhóm sản phẩm "${createForm.groupName}" thành công!`);
        setIsCreateOpen(false);
        setCreateForm({ code: "", groupName: "", imageUrl: "", description: "" });
        fetchGroups();
      } else {
        toast.error(data.error || "Lỗi tạo nhóm");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: DeviceGroupItem) => {
    setEditItem(item);
    setEditForm({
      code: item.code,
      groupName: item.groupName || "",
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
          groupName: editForm.groupName.trim(),
          imageUrl: editForm.imageUrl,
          description: editForm.description.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã cập nhật nhóm sản phẩm "${editForm.groupName}"!`);
        setEditItem(null);
        fetchGroups();
      } else {
        toast.error(data.error || "Lỗi cập nhật");
      }
    } catch (err: any) {
      toast.error("Lỗi kết nối: " + err.message);
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
        toast.success(`Đã xóa nhóm sản phẩm "${deleteTarget.groupName}" khỏi hệ thống!`);
        setDeleteTarget(null);
        fetchGroups();
      } else {
        toast.error(data.error || "Lỗi khi xóa nhóm");
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
            <p className="text-xs text-slate-400">Chưa có nhóm sản phẩm nào trong CSDL.</p>
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
                    <img src={g.imageUrl} alt={g.groupName} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {g.groupName}
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
                  value={createForm.groupName}
                  onChange={(e) => setCreateForm({ ...createForm, groupName: e.target.value })}
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
                value={createForm.imageUrl}
                onChange={(url) => setCreateForm({ ...createForm, imageUrl: url })}
                label="Ảnh đại diện nhóm sản phẩm"
                folder="groups"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chi tiết
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả nhóm sản phẩm..."
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
                  <span>Lưu nhóm</span>
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
                Chỉnh sửa nhóm sản phẩm
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
                  value={editForm.groupName}
                  onChange={(e) => setEditForm({ ...editForm, groupName: e.target.value })}
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

              {/* Cloudflare R2 Image Uploader */}
              <ImageUploader
                value={editForm.imageUrl}
                onChange={(url) => setEditForm({ ...editForm, imageUrl: url })}
                label="Ảnh đại diện nhóm sản phẩm"
                folder="groups"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chi tiết
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
        title="Xóa nhóm sản phẩm"
        itemName={deleteTarget?.groupName}
        itemType="nhóm sản phẩm"
        description={`Bạn có chắc chắn muốn xóa nhóm sản phẩm "${deleteTarget?.groupName}" (${deleteTarget?.code})? Hành động này sẽ được ghi vào nhật ký hệ thống.`}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
