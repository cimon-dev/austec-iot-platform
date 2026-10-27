"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, Loader2 } from "lucide-react";
import { getApiBaseUrl } from "@/context/apiConfig";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

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

interface DevicePropertyTabProps {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function DevicePropertyTab({
  canCreate,
  canUpdate,
  canDelete,
  showToast,
}: DevicePropertyTabProps) {
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Create
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    propertyKey: "",
    displayName: "",
    dataType: "string",
    unit: "",
    uiWidgetType: "status_badge",
    isControllable: false,
    description: "",
  });

  // Modal Edit
  const [editItem, setEditItem] = useState<PropertyItem | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    propertyKey: "",
    displayName: "",
    dataType: "string",
    unit: "",
    uiWidgetType: "status_badge",
    isControllable: false,
    description: "",
  });

  // Modal Delete
  const [deleteTarget, setDeleteTarget] = useState<PropertyItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/properties`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.properties)) {
        setProperties(
          data.properties.map((p: any) => ({
            id: p.id,
            propertyKey: p.propertyKey || p.key,
            displayName: p.displayName || p.name,
            dataType: p.dataType || p.type || "string",
            unit: p.unit || "",
            uiWidgetType: p.uiWidgetType || p.widget || "status_badge",
            isControllable: p.isControllable ?? p.ctrl ?? false,
            description: p.description || "",
          }))
        );
      }
    } catch (err: any) {
      console.warn("Lỗi nạp thuộc tính schema:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Handle Create Property
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.displayName.trim() || !createForm.propertyKey.trim()) {
      showToast("Vui lòng nhập tên và khóa thuộc tính!", "error");
      return;
    }

    const cleanKey = createForm.propertyKey.trim().toLowerCase().replace(/\s+/g, "_");
    if (properties.some((p) => p.propertyKey.toLowerCase() === cleanKey)) {
      showToast(`Thuộc tính "${cleanKey}" đã tồn tại! Vui lòng chọn khóa khác.`, "error");
      return;
    }

    setIsCreating(true);
    try {
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/properties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          propertyKey: cleanKey,
          displayName: createForm.displayName.trim(),
          dataType: createForm.dataType,
          unit: createForm.unit.trim(),
          uiWidgetType: createForm.uiWidgetType,
          isControllable: createForm.isControllable,
          description: createForm.description.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Đã thêm thuộc tính "${createForm.displayName}" vào PostgreSQL!`);
        setIsCreateOpen(false);
        setCreateForm({
          propertyKey: "",
          displayName: "",
          dataType: "string",
          unit: "",
          uiWidgetType: "status_badge",
          isControllable: false,
          description: "",
        });
        fetchProperties();
      } else {
        showToast(data.error || "Lỗi tạo thuộc tính", "error");
      }
    } catch (err: any) {
      showToast("Lỗi kết nối: " + err.message, "error");
    } finally {
      setIsCreating(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: PropertyItem) => {
    setEditItem(item);
    setEditForm({
      propertyKey: item.propertyKey,
      displayName: item.displayName,
      dataType: item.dataType,
      unit: item.unit || "",
      uiWidgetType: item.uiWidgetType,
      isControllable: Boolean(item.isControllable),
      description: item.description || "",
    });
  };

  // Handle Update Property
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    setIsUpdating(true);
    try {
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/properties/${editItem.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          propertyKey: editForm.propertyKey.trim().toLowerCase(),
          displayName: editForm.displayName.trim(),
          dataType: editForm.dataType,
          unit: editForm.unit.trim(),
          uiWidgetType: editForm.uiWidgetType,
          isControllable: editForm.isControllable,
          description: editForm.description.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Đã cập nhật thuộc tính "${editForm.displayName}"!`);
        setEditItem(null);
        fetchProperties();
      } else {
        showToast(data.error || "Lỗi cập nhật", "error");
      }
    } catch (err: any) {
      showToast("Lỗi kết nối: " + err.message, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete Property (via ConfirmDeleteModal)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const token = localStorage.getItem("austec_auth_token") || "austec-admin-super-token";
      const res = await fetch(`${getApiBaseUrl()}/api/admin/properties/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Đã xóa thuộc tính "${deleteTarget.displayName}" khỏi PostgreSQL!`);
        setDeleteTarget(null);
        fetchProperties();
      } else {
        showToast(data.error || "Lỗi khi xóa thuộc tính", "error");
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
          Từ điển thuộc tính & telemetry động (Dynamic Schema) kết nối thiết bị IoT
        </p>
        {canCreate && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm thuộc tính</span>
          </button>
        )}
      </div>

      {/* Grid List */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
            <p className="text-xs text-slate-400">Chưa có thuộc tính nào trong từ điển.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {properties.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col justify-between hover:border-indigo-500/50 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {p.displayName}
                    </span>
                    <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded font-bold border border-indigo-200 dark:border-indigo-800 shrink-0">
                      {p.propertyKey}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px]">
                      {p.dataType} {p.unit ? `(${p.unit})` : ""}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px]">
                      Widget: {p.uiWidgetType}
                    </span>
                    {p.isControllable && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        • Điều khiển được
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {canUpdate && (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(p)}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(p)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Xóa thuộc tính"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
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
                Thêm thuộc tính schema mới
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
                  Tên thuộc tính (Display Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nhiệt độ động cơ"
                  value={createForm.displayName}
                  onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã khóa (Property Key) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: motor_temp"
                  value={createForm.propertyKey}
                  onChange={(e) => setCreateForm({ ...createForm, propertyKey: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono lowercase focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kiểu dữ liệu
                  </label>
                  <select
                    value={createForm.dataType}
                    onChange={(e) => setCreateForm({ ...createForm, dataType: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="string">String (Chuỗi)</option>
                    <option value="integer">Integer (Số nguyên)</option>
                    <option value="float">Float (Số thực)</option>
                    <option value="boolean">Boolean (True/False)</option>
                    <option value="json">JSON Object</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Đơn vị đo (Unit)
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: °C, %, V, kW"
                    value={createForm.unit}
                    onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="prop_ctrl_create"
                  checked={createForm.isControllable}
                  onChange={(e) => setCreateForm({ ...createForm, isControllable: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="prop_ctrl_create" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Thuộc tính có thể gửi lệnh điều khiển (Controllable)
                </label>
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
                  {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Tạo thuộc tính"}
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
                Chỉnh sửa thuộc tính: {editItem.displayName}
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
                  Tên thuộc tính (Display Name) *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mã khóa (Property Key) *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.propertyKey}
                  onChange={(e) => setEditForm({ ...editForm, propertyKey: e.target.value })}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono lowercase focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Kiểu dữ liệu
                  </label>
                  <select
                    value={editForm.dataType}
                    onChange={(e) => setEditForm({ ...editForm, dataType: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="string">String (Chuỗi)</option>
                    <option value="integer">Integer (Số nguyên)</option>
                    <option value="float">Float (Số thực)</option>
                    <option value="boolean">Boolean (True/False)</option>
                    <option value="json">JSON Object</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Đơn vị đo (Unit)
                  </label>
                  <input
                    type="text"
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="prop_ctrl_edit"
                  checked={editForm.isControllable}
                  onChange={(e) => setEditForm({ ...editForm, isControllable: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="prop_ctrl_edit" className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  Thuộc tính có thể gửi lệnh điều khiển (Controllable)
                </label>
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
        title="Xóa thuộc tính schema"
        itemName={deleteTarget?.displayName}
        itemType="thuộc tính schema"
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
