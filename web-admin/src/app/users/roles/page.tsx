"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
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

export default function RolesManagementPage() {
  const { canView, canCreate, canUpdate, canDelete } = usePermissions();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(1);
  const [searchRole, setSearchRole] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RoleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchRoles = useCallback(() => {
    rolesService.getRoles().then((data) => {
      if (data && data.length > 0) {
        setRoles(data);
        if (!data.some((r) => r.id === selectedRoleId)) {
          setSelectedRoleId(data[0].id);
        }
      }
    });
  }, [selectedRoleId]);

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

  const handleRenameRole = async (roleId: number, newName: string) => {
    if (roleId > 1000000000) {
      setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, name: newName } : r)));
      toast.info(`Đã đổi tên vai trò thành "${newName}"`);
      return;
    }

    try {
      const res = await rolesService.updateRole(roleId, { name: newName });
      if (res.success) {
        setRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, name: newName } : r)));
        toast.success(`Đã đổi tên vai trò thành "${newName}" và lưu vào PostgreSQL!`);
      } else {
        toast.error(res.error || "Không thể cập nhật tên vai trò");
      }
    } catch (e: any) {
      toast.error(`Lỗi cập nhật vai trò: ${e.message}`);
    }
  };

  const handleSaveRoles = async () => {
    setIsSaving(true);
    try {
      await rolesService.saveRoles(roles);
      toast.success("Đã lưu thiết lập ma trận phân quyền vào PostgreSQL thành công!");
    } catch {
      toast.error("Lỗi khi lưu thiết lập phân quyền vào PostgreSQL.");
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
    toast.success(`Đã thêm vai trò mới: "${newRole.name}" (Bấm lưu để ghi xuống CSDL)`);
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
      toast.success(`Đã xóa vai trò "${deleteTarget.name}" thành công khỏi PostgreSQL!`);
      setDeleteTarget(null);
    } catch {
      toast.error("Lỗi khi xóa vai trò khỏi PostgreSQL.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canView("mod_user")) {
    return <AccessDenied moduleName="Quản Lý Vai Trò & Ma Trận Phân Quyền" requiredModule="mod_user" />;
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 overflow-hidden">
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
            canUpdate={canUpdate("mod_user")}
            canDelete={canDelete("mod_user")}
            onOpenCreate={() => setIsCreateModalOpen(true)}
            onDeleteRole={setDeleteTarget}
            onRenameRole={handleRenameRole}
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
              toast.info("Đã khôi phục phân quyền mặc định cho vai trò này (chưa lưu).");
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
