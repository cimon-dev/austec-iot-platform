"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { usePermissions } from "../../../context/PermissionContext";
import { AccessDenied } from "../../../components/AccessDenied";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { AdminUser } from "./types";
import { adminService } from "./admin-service";
import {
  AdminHeader,
  AdminFilterBar,
  AdminTable,
  AdminFormModal,
} from "./components";

import { rolesService } from "../roles/roles-service";

export default function AdminManagementPage() {
  const { canView, canCreate, canUpdate, canDelete } = usePermissions();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [rolesList, setRolesList] = useState<string[]>([]);

  // Search state
  const [searchEmpId, setSearchEmpId] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchRole, setSearchRole] = useState("");
  const [searchCompany, setSearchCompany] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({
    empID: "",
    name: "",
    email: "",
    company: "AUSTEC",
    department: "Phòng Vận Hành IoT",
    phone: "",
    role: "Device Admin",
    password: "",
  });

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStaff = useCallback(() => {
    setIsLoading(true);
    adminService
      .getStaff()
      .then((res) => {
        if (res && Array.isArray(res)) {
          setAdmins(res);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);
  const fetchRoles = useCallback(() => {
    rolesService.getRoles().then((roles) => {
      if (roles && Array.isArray(roles) && roles.length > 0) {
        setRolesList(roles.map((r) => r.name));
      }
    });
  }, []);

  useEffect(() => {
    fetchStaff();
    fetchRoles();
  }, [fetchStaff, fetchRoles]);

  const handleBulkDelete = async (ids: (string | number)[]) => {
    let deleted = 0;
    for (const id of ids) {
      try {
        const res = await adminService.deleteStaff(id);
        if (res.success) deleted++;
      } catch (e) {
        console.warn("Lỗi xóa cán bộ:", id, e);
      }
    }
    fetchStaff();
    toast.success(`Đã xóa ${deleted} cán bộ quản trị thành công!`);
  };

  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      const matchEmp = !searchEmpId || a.empID?.toLowerCase().includes(searchEmpId.toLowerCase());
      const matchEmail = !searchEmail || a.email?.toLowerCase().includes(searchEmail.toLowerCase());
      const matchPhone = !searchPhone || a.phone?.includes(searchPhone) || a.phoneNumber?.includes(searchPhone);
      const matchRole = !searchRole || a.role === searchRole || a.systemRole === searchRole;
      const matchCompany = !searchCompany || a.company?.toLowerCase().includes(searchCompany.toLowerCase());
      return matchEmp && matchEmail && matchPhone && matchRole && matchCompany;
    });
  }, [admins, searchEmpId, searchEmail, searchPhone, searchRole, searchCompany]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchEmpId, searchEmail, searchPhone, searchRole, searchCompany]);

  const paginatedAdmins = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAdmins.slice(start, start + pageSize);
  }, [filteredAdmins, currentPage, pageSize]);

  const handleOpenCreate = () => {
    setEditingAdmin(null);
    setForm({
      empID: `AUSTEC${String(admins.length + 1).padStart(3, "0")}`,
      name: "",
      email: "",
      company: "AUSTEC",
      department: "Phòng Kỹ Thuật IoT",
      phone: "",
      role: rolesList[0] || "Administrator",
      password: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (a: AdminUser) => {
    setEditingAdmin(a);
    setForm({
      empID: a.empID,
      name: a.name || a.fullName || "",
      email: a.email,
      company: a.company,
      department: a.department,
      phone: a.phone || a.phoneNumber || "",
      role: a.role || a.systemRole || rolesList[0],
      password: "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;

    if (editingAdmin) {
      try {
        const res = await adminService.updateStaff(editingAdmin.id, form);
        if (!res.success) {
          toast.error(res.error || "Lỗi khi cập nhật thông tin cán bộ");
          return;
        }
        await fetchStaff();
        toast.success("Cập nhật thông tin cán bộ quản trị thành công!");
        setIsModalOpen(false);
      } catch (err: any) {
        toast.error("Lỗi khi cập nhật thông tin: " + err.message);
      }
    } else {
      try {
        const res = await adminService.createStaff(form);
        if (!res.success) {
          toast.error(res.error || "Lỗi khi tạo cán bộ mới");
          return;
        }
        await fetchStaff();
        toast.success(`Đã tạo thành công tài khoản cán bộ: ${form.name}`);
        setIsModalOpen(false);
      } catch (err: any) {
        toast.error("Lỗi khi tạo cán bộ mới: " + err.message);
      }
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await adminService.deleteStaff(deleteTarget.id);
      if (!res.success) {
        toast.error(res.error || "Lỗi khi xóa tài khoản quản trị");
        return;
      }
      await fetchStaff();
      toast.success("Đã xóa tài khoản quản trị thành công!");
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error("Lỗi khi xóa tài khoản quản trị: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canView("mod_user")) {
    return (
      <AccessDenied moduleName="Quản Lý Cán Bộ Quản Trị (Admin Management)" requiredModule="mod_user" />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 overflow-hidden">
      <AdminHeader canCreate={canCreate("mod_user")} onOpenCreate={handleOpenCreate} />

      <AdminFilterBar
        searchEmpId={searchEmpId}
        onSearchEmpIdChange={setSearchEmpId}
        searchEmail={searchEmail}
        onSearchEmailChange={setSearchEmail}
        searchPhone={searchPhone}
        onSearchPhoneChange={setSearchPhone}
        searchRole={searchRole}
        onSearchRoleChange={setSearchRole}
        searchCompany={searchCompany}
        onSearchCompanyChange={setSearchCompany}
        rolesList={rolesList}
        onReset={() => {
          setSearchEmpId("");
          setSearchEmail("");
          setSearchPhone("");
          setSearchRole("");
          setSearchCompany("");
        }}
      />

      <AdminTable
        admins={paginatedAdmins}
        isLoading={isLoading}
        canUpdate={canUpdate("mod_user")}
        canDelete={canDelete("mod_user")}
        onEdit={handleOpenEdit}
        onDelete={setDeleteTarget}
        onBulkDelete={handleBulkDelete}
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={filteredAdmins.length}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      <AdminFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
        editingAdmin={editingAdmin}
        form={form}
        setForm={setForm}
        rolesList={rolesList}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Xóa Cán Bộ Quản Trị"
        itemName={deleteTarget?.name || deleteTarget?.fullName}
        itemType="cán bộ"
        description="Thao tác này sẽ gỡ bỏ tài khoản cán bộ quản trị khỏi cơ sở dữ liệu hệ thống."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
