"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  CheckCircle2, 
  AlertCircle,
  Users,
  RotateCcw,
  Save,
  Clock,
  X
} from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";
import { usePermissions } from "../../../context/PermissionContext";
import { AccessDenied } from "../../../components/AccessDenied";

interface ModulePermission {
  id: string;
  name: string;
  all: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
  view: boolean;
}

interface RoleItem {
  id: number;
  name: string;
  userCount: number;
  isSystem: boolean;
  permissions: ModulePermission[];
}

const DEFAULT_MODULES: ModulePermission[] = [
  { id: "mod_dev", name: "Quản lý thiết bị (Device Management)", all: true, create: true, update: true, delete: true, view: true },
  { id: "mod_user", name: "Quản lý người dùng & Admin (User Management)", all: true, create: true, update: true, delete: true, view: true },
  { id: "mod_cskh", name: "Vận hành & Hỗ trợ khách hàng (Customer Ops)", all: true, create: true, update: true, delete: true, view: true },
  { id: "mod_noti", name: "Trung tâm thông báo (Notification Center)", all: true, create: true, update: true, delete: true, view: true },
  { id: "mod_audit", name: "Hộp đen kiểm toán SHA-256 (Audit Blackbox)", all: false, create: false, update: false, delete: false, view: true },
  { id: "mod_setting", name: "Cài đặt hệ thống (System Settings)", all: true, create: true, update: true, delete: true, view: true },
  { id: "mod_ota", name: "Quản lý Firmware OTA (Firmware Release)", all: true, create: true, update: true, delete: false, view: true },
];

const INITIAL_ROLES: RoleItem[] = [
  {
    id: 1,
    name: "Administrator",
    userCount: 2,
    isSystem: true,
    permissions: DEFAULT_MODULES.map(m => ({ ...m, all: true, create: true, update: true, delete: true, view: true }))
  },
  {
    id: 2,
    name: "Device Admin",
    userCount: 4,
    isSystem: false,
    permissions: [
      { id: "mod_dev", name: "Quản lý thiết bị (Device Management)", all: true, create: true, update: true, delete: true, view: true },
      { id: "mod_user", name: "Quản lý người dùng & Admin (User Management)", all: false, create: false, update: false, delete: false, view: true },
      { id: "mod_cskh", name: "Vận hành & Hỗ trợ khách hàng (Customer Ops)", all: false, create: false, update: false, delete: false, view: true },
      { id: "mod_noti", name: "Trung tâm thông báo (Notification Center)", all: false, create: false, update: false, delete: false, view: true },
      { id: "mod_audit", name: "Hộp đen kiểm toán SHA-256 (Audit Blackbox)", all: false, create: false, update: false, delete: false, view: true },
      { id: "mod_setting", name: "Cài đặt hệ thống (System Settings)", all: false, create: false, update: false, delete: false, view: false },
      { id: "mod_ota", name: "Quản lý Firmware OTA (Firmware Release)", all: true, create: true, update: true, delete: false, view: true },
    ]
  },
  {
    id: 3,
    name: "CSKH Support",
    userCount: 8,
    isSystem: false,
    permissions: [
      { id: "mod_dev", name: "Quản lý thiết bị (Device Management)", all: false, create: false, update: false, delete: false, view: true },
      { id: "mod_user", name: "Quản lý người dùng & Admin (User Management)", all: false, create: false, update: false, delete: false, view: true },
      { id: "mod_cskh", name: "Vận hành & Hỗ trợ khách hàng (Customer Ops)", all: true, create: true, update: true, delete: false, view: true },
      { id: "mod_noti", name: "Trung tâm thông báo (Notification Center)", all: false, create: true, update: false, delete: false, view: true },
      { id: "mod_audit", name: "Hộp đen kiểm toán SHA-256 (Audit Blackbox)", all: false, create: false, update: false, delete: false, view: false },
      { id: "mod_setting", name: "Cài đặt hệ thống (System Settings)", all: false, create: false, update: false, delete: false, view: false },
      { id: "mod_ota", name: "Quản lý Firmware OTA (Firmware Release)", all: false, create: false, update: false, delete: false, view: false },
    ]
  },
  {
    id: 4,
    name: "Kỹ Thuật Kho",
    userCount: 3,
    isSystem: false,
    permissions: [
      { id: "mod_dev", name: "Quản lý thiết bị (Device Management)", all: false, create: true, update: true, delete: false, view: true },
      { id: "mod_user", name: "Quản lý người dùng & Admin (User Management)", all: false, create: false, update: false, delete: false, view: false },
      { id: "mod_cskh", name: "Vận hành & Hỗ trợ khách hàng (Customer Ops)", all: false, create: false, update: false, delete: false, view: false },
      { id: "mod_noti", name: "Trung tâm thông báo (Notification Center)", all: false, create: false, update: false, delete: false, view: false },
      { id: "mod_audit", name: "Hộp đen kiểm toán SHA-256 (Audit Blackbox)", all: false, create: false, update: false, delete: false, view: false },
      { id: "mod_setting", name: "Cài đặt hệ thống (System Settings)", all: false, create: false, update: false, delete: false, view: false },
      { id: "mod_ota", name: "Quản lý Firmware OTA (Firmware Release)", all: false, create: false, update: false, delete: false, view: false },
    ]
  }
];

export default function RolesManagementPage() {
  const { t } = useLanguage();
  const { canView, canCreate, canUpdate, canDelete } = usePermissions();

  const [roles, setRoles] = useState<RoleItem[]>(INITIAL_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(1);
  const [searchRole, setSearchRole] = useState("");
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameText, setEditNameText] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "warning" } | null>(null);
  const showToast = (msg: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load persisted roles from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("austec_user_roles");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRoles(parsed);
            setSelectedRoleId(parsed[0].id);
            setLastSavedTime("Đã đồng bộ từ CSDL");
          }
        } catch (e) {
          console.error("Failed to parse saved roles", e);
        }
      }
    }
  }, []);

  // Helper to persist roles to localStorage and broadcast event
  const persistRoles = (updatedRoles: RoleItem[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("austec_user_roles", JSON.stringify(updatedRoles));
      window.dispatchEvent(new Event("austec_roles_updated"));
    }
  };

  const selectedRole = roles.find(r => r.id === selectedRoleId) || roles[0];

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(searchRole.toLowerCase())
  );

  const handleOpenCreateRole = () => {
    setNewRoleName("");
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const newId = Date.now() % 10000;
    const newRole: RoleItem = {
      id: newId,
      name: newRoleName.trim(),
      userCount: 0,
      isSystem: false,
      permissions: DEFAULT_MODULES.map(m => ({ ...m, all: false, create: false, update: false, delete: false, view: true }))
    };

    const updated = [...roles, newRole];
    setRoles(updated);
    setSelectedRoleId(newId);
    persistRoles(updated);
    setIsCreateModalOpen(false);
    showToast(`Đã tạo thành công vai trò mới: "${newRole.name}"!`);
  };

  const handleTogglePermission = (moduleId: string, field: "all" | "create" | "update" | "delete" | "view") => {
    if (!canUpdate("mod_user")) {
      showToast("Bạn không có quyền chỉnh sửa ma trận phân quyền!", "warning");
      return;
    }

    const updatedPermissions = selectedRole.permissions.map(p => {
      if (p.id !== moduleId) return p;

      if (field === "all") {
        const nextAll = !p.all;
        return {
          ...p,
          all: nextAll,
          create: nextAll,
          update: nextAll,
          delete: nextAll,
          view: nextAll
        };
      }

      const nextVal = !p[field];
      const newPerm = { ...p, [field]: nextVal };
      newPerm.all = newPerm.create && newPerm.update && newPerm.delete && newPerm.view;
      if (field !== "view" && nextVal) {
        newPerm.view = true;
      }
      return newPerm;
    });

    const updatedRoles = roles.map(r => r.id === selectedRole.id ? { ...r, permissions: updatedPermissions } : r);
    setRoles(updatedRoles);
    persistRoles(updatedRoles);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      persistRoles(roles);
      setIsSaving(false);
      const timeStr = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setLastSavedTime(timeStr);
      showToast(`Đã lưu thành công ma trận phân quyền cho vai trò "${selectedRole.name}" vào cơ sở dữ liệu!`);
    }, 250);
  };

  const handleDeleteRole = (id: number) => {
    if (selectedRole.isSystem) {
      alert("Không thể xóa vai trò mặc định của hệ thống!");
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa vai trò "${selectedRole.name}"? Mọi người dùng thuộc vai trò này sẽ cần được gán lại vai trò mới.`)) {
      const remaining = roles.filter(r => r.id !== id);
      setRoles(remaining);
      setSelectedRoleId(remaining[0].id);
      persistRoles(remaining);
      showToast(`Đã xóa vai trò "${selectedRole.name}" thành công!`, "info");
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Bạn có chắc chắn muốn khôi phục ma trận phân quyền về mặc định hệ thống ban đầu? Mọi tùy chỉnh sẽ được thiết lập lại.")) {
      setRoles(INITIAL_ROLES);
      setSelectedRoleId(INITIAL_ROLES[0].id);
      persistRoles(INITIAL_ROLES);
      showToast("Đã khôi phục toàn bộ phân quyền về mặc định thành công!");
    }
  };

  // RBAC Gating
  if (!canView("mod_user")) {
    return (
      <AccessDenied 
        moduleName="Vai Trò & Ma Trận Phân Quyền (Roles & Permissions)"
        requiredModule="mod_user"
      />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2 overflow-hidden">
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg border backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom ${
          toast.type === "success" 
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
            : "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
        }`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" />
            <span>Vai Trò & Ma Trận Phân Quyền (Role & Permissions)</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {canUpdate("mod_user") && (
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Khôi phục phân quyền gốc của hệ thống"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi Phục Mặc Định</span>
            </button>
          )}

          {canCreate("mod_user") && (
            <button
              type="button"
              onClick={handleOpenCreateRole}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer w-fit"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Vai Trò Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Master - Detail Split Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden">
        {/* Left Pane: Roles List (4 cols) */}
        <div className="lg:col-span-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm vai trò..."
                value={searchRole}
                onChange={e => setSearchRole(e.target.value)}
                className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-y-auto">
            {filteredRoles.map((r) => {
              const isSelected = r.id === selectedRole.id;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRoleId(r.id);
                    setIsEditingName(false);
                  }}
                  className={`w-full text-left p-2.5 flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected 
                      ? "bg-purple-500/10 border-l-4 border-purple-600 dark:border-purple-400 font-semibold text-purple-700 dark:text-purple-300" 
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div>
                    <span className="text-xs block font-bold">{r.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {r.userCount} nhân sự đảm nhiệm
                    </span>
                  </div>

                  {r.isSystem && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                      Hệ Thống
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Role Details & Matrix (8 cols) */}
        <div className="lg:col-span-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col overflow-hidden">
          {/* Role Header */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tên vai trò:</span>
                {isEditingName ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editNameText}
                      onChange={e => setEditNameText(e.target.value)}
                      className="text-xs font-bold px-2 py-1 rounded border border-purple-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (editNameText.trim()) {
                          const updated = roles.map(r => r.id === selectedRole.id ? { ...r, name: editNameText.trim() } : r);
                          setRoles(updated);
                          persistRoles(updated);
                          showToast(`Đã đổi tên vai trò thành: "${editNameText.trim()}"`);
                        }
                        setIsEditingName(false);
                      }}
                      className="p-1 rounded bg-purple-600 text-white hover:bg-purple-500 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">{selectedRole.name}</h2>
                    {!selectedRole.isSystem && canUpdate("mod_user") && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditNameText(selectedRole.name);
                          setIsEditingName(true);
                        }}
                        className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer p-0.5"
                        title="Đổi tên vai trò"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span>Áp dụng cho: <strong className="text-slate-900 dark:text-white">{selectedRole.userCount}</strong> người dùng</span>
                </div>
                {lastSavedTime && (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                    <Clock className="w-3 h-3" />
                    <span>{lastSavedTime}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!selectedRole.isSystem && canDelete("mod_user") && (
                <button
                  type="button"
                  onClick={() => handleDeleteRole(selectedRole.id)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 px-2 py-1 rounded-md transition-colors border border-rose-200 dark:border-rose-900/50 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Xóa Vai Trò</span>
                </button>
              )}

              {canUpdate("mod_user") && (
                <button
                  type="button"
                  onClick={handleSaveRole}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Đang lưu..." : "Lưu Phân Quyền"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Permission Matrix Form */}
          <div className="flex-1 min-h-0 flex flex-col p-3 space-y-2 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Ma Trận Quyền Hạn (CRUD Access Matrix)
              </span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                Tự động lưu vào CSDL
              </span>
            </div>

            <div className="flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-slate-800 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 text-[11px] sticky top-0 z-10">
                  <tr>
                    <th className="p-2 w-10 text-center">STT</th>
                    <th className="p-2">Phân hệ / Module</th>
                    <th className="p-2 text-center w-14">Tất Cả</th>
                    <th className="p-2 text-center w-14">Xem</th>
                    <th className="p-2 text-center w-14">Tạo</th>
                    <th className="p-2 text-center w-14">Sửa</th>
                    <th className="p-2 text-center w-14">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {selectedRole.permissions.map((perm, idx) => (
                    <tr key={perm.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="p-2 text-center text-slate-400 font-mono text-[10px]">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="p-2 font-medium text-slate-900 dark:text-white text-xs">
                        {perm.name}
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.all}
                          onChange={() => handleTogglePermission(perm.id, "all")}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.view}
                          onChange={() => handleTogglePermission(perm.id, "view")}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.create}
                          onChange={() => handleTogglePermission(perm.id, "create")}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.update}
                          onChange={() => handleTogglePermission(perm.id, "update")}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={perm.delete}
                          onChange={() => handleTogglePermission(perm.id, "delete")}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create Role Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Thêm Vai Trò Người Dùng Mới
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCreateRole} className="p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tên Vai Trò (Role Name) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Kỹ Thuật Lắp Đặt, Trưởng Ca CSKH..."
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  autoFocus
                />
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-sm cursor-pointer"
                >
                  Tạo Vai Trò
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
