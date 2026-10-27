"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { CheckCircle2 } from "lucide-react";
import { usePermissions } from "../../../context/PermissionContext";
import { AccessDenied } from "../../../components/AccessDenied";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { RoleItem, ModulePermission } from "./types";
import { rolesService } from "./roles-service";
import {
  RolesHeader,
  RoleListPanel,
  RolePermissionsMatrix,
  CreateRoleModal,
} from "./components";

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
    permissions: DEFAULT_MODULES.map((m) => ({ ...m, all: true, create: true, update: true, delete: true, view: true })),
  },
  {
    id: 2,
    name: "Device Admin",
    userCount: 4,
    isSystem: false,
    permissions: DEFAULT_MODULES.map((m) => ({
      ...m,
      all: m.id === "mod_dev" || m.id === "mod_ota",
      create: m.id === "mod_dev" || m.id === "mod_ota",
      update: m.id === "mod_dev" || m.id === "mod_ota",
      delete: m.id === "mod_dev",
      view: true,
    })),
  },
  {
    id: 3,
    name: "CSKH Support",
    userCount: 8,
    isSystem: false,
    permissions: DEFAULT_MODULES.map((m) => ({
      ...m,
      all: m.id === "mod_cskh",
      create: m.id === "mod_cskh" || m.id === "mod_noti",
      update: m.id === "mod_cskh",
      delete: false,
      view: m.id === "mod_dev" || m.id === "mod_user" || m.id === "mod_cskh" || m.id === "mod_noti",
    })),
  },
];

export default function RolesManagementPage() {
  const { canView, canCreate, canUpdate, canDelete } = usePermissions();

  const [roles, setRoles] = useState<RoleItem[]>(INITIAL_ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(1);
  const [searchRole, setSearchRole] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RoleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchRoles = useCallback(() => {
    rolesService.getRoles().then((data) => {
      if (data && data.length > 0) {
        setRoles(data);
      }
    });
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const currentRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || roles[0] || null;
  }, [roles, selectedRoleId]);

  const handleTogglePermission = (
    roleId: number,
    moduleId: string,
    field: "all" | "create" | "update" | "delete" | "view"
  ) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== roleId) return role;
        return {
          ...role,
          permissions: role.permissions.map((perm) => {
            if (perm.id !== moduleId) return perm;
            if (field === "all") {
              const nextAll = !perm.all;
              return {
                ...perm,
                all: nextAll,
                create: nextAll,
                update: nextAll,
                delete: nextAll,
                view: nextAll,
              };
            }
            const updated = { ...perm, [field]: !perm[field] };
            updated.all = updated.create && updated.update && updated.delete && updated.view;
            return updated;
          }),
        };
      })
    );
  };

  const handleRenameRole = (roleId: number, newName: string) => {
    setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, name: newName } : r)));
    showToast(`Đã đổi tên vai trò thành "${newName}"`);
  };

  const handleSaveRoles = async () => {
    setIsSaving(true);
    try {
      await rolesService.saveRoles(roles);
      showToast("Đã lưu thiết lập ma trận phân quyền vào PostgreSQL thành công!");
    } catch {
      showToast("Lỗi khi lưu thiết lập phân quyền.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const newRole: RoleItem = {
      id: Date.now(),
      name: newRoleName.trim(),
      userCount: 0,
      isSystem: false,
      permissions: DEFAULT_MODULES.map((m) => ({
        ...m,
        all: false,
        create: false,
        update: false,
        delete: false,
        view: true,
      })),
    };

    setRoles((prev) => [...prev, newRole]);
    setSelectedRoleId(newRole.id);
    setNewRoleName("");
    setIsCreateModalOpen(false);
    showToast(`Đã tạo vai trò mới: "${newRole.name}"`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await rolesService.deleteRole(deleteTarget.id);
      setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      if (selectedRoleId === deleteTarget.id) {
        setSelectedRoleId(1);
      }
      showToast(`Đã xóa vai trò "${deleteTarget.name}" thành công!`);
      setDeleteTarget(null);
    } catch {
      showToast("Lỗi khi xóa vai trò.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canView("mod_user")) {
    return <AccessDenied moduleName="Quản Lý Vai Trò & Ma Trận Phân Quyền" requiredModule="mod_user" />;
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 overflow-hidden">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg border shadow-xl flex items-center gap-2 text-xs font-semibold bg-emerald-950/90 text-emerald-300 border-emerald-500/40 animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      <RolesHeader rolesCount={roles.length} />

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-2.5 overflow-hidden">
        <div className="md:col-span-4 flex flex-col h-full overflow-hidden">
          <RoleListPanel
            roles={roles}
            selectedRoleId={selectedRoleId}
            onSelectRole={setSelectedRoleId}
            searchQuery={searchRole}
            onSearchChange={setSearchRole}
            canCreate={canCreate("mod_user")}
            canDelete={canDelete("mod_user")}
            onOpenCreate={() => setIsCreateModalOpen(true)}
            onDeleteRole={setDeleteTarget}
          />
        </div>

        <div className="md:col-span-8 flex flex-col h-full overflow-hidden">
          <RolePermissionsMatrix
            currentRole={currentRole}
            canUpdate={canUpdate("mod_user")}
            isSaving={isSaving}
            onTogglePermission={handleTogglePermission}
            onRenameRole={handleRenameRole}
            onSaveRoles={handleSaveRoles}
            onResetDefault={() => {
              setRoles((prev) =>
                prev.map((r) => (r.id === selectedRoleId ? { ...r, permissions: DEFAULT_MODULES } : r))
              );
              showToast("Đã khôi phục phân quyền mặc định cho vai trò này (chưa lưu).");
            }}
          />
        </div>
      </div>

      <CreateRoleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateRole}
        newRoleName={newRoleName}
        onRoleNameChange={setNewRoleName}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Xóa Vai Trò Quản Trị"
        itemName={deleteTarget?.name}
        itemType="vai trò"
        description="Thao tác này sẽ gỡ bỏ vai trò khỏi hệ thống. Các nhân sự thuộc vai trò này sẽ cần được phân quyền lại."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
