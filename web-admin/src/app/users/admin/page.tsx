"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { CheckCircle2 } from "lucide-react";
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

const INITIAL_ADMINS: AdminUser[] = [
  {
    id: "admin-001",
    empID: "AUSTEC001",
    name: "AUSTEC Super Admin",
    email: "austec.admin@gmail.com",
    company: "AUSTEC GROUP",
    department: "Ban Điều Hành",
    phone: "0912 345 678",
    role: "Administrator",
    updatedBy: "System",
    updatedAt: "18/10/2026",
  },
  {
    id: "admin-002",
    empID: "AUSTEC002",
    name: "Trần Minh Quang",
    email: "quang.tm@austec.vn",
    company: "AUSTEC",
    department: "Phòng Kỹ Thuật IoT",
    phone: "0988 776 655",
    role: "Device Admin",
    updatedBy: "austec.admin@gmail.com",
    updatedAt: "16/10/2026",
  },
];

const DEFAULT_ROLES_LIST = [
  "Administrator",
  "Device Admin",
  "Support Agent",
  "CSKH Support",
  "Kỹ Thuật Kho",
];

export default function AdminManagementPage() {
  const { canView, canCreate, canUpdate, canDelete } = usePermissions();

  const [admins, setAdmins] = useState<AdminUser[]>(INITIAL_ADMINS);
  const [rolesList, setRolesList] = useState<string[]>(DEFAULT_ROLES_LIST);

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
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchStaff = useCallback(() => {
    adminService.getStaff().then((res) => {
      if (res && res.length > 0) {
        setAdmins(res);
      }
    });
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      const matchEmp = !searchEmpId || a.empID.toLowerCase().includes(searchEmpId.toLowerCase());
      const matchEmail = !searchEmail || a.email.toLowerCase().includes(searchEmail.toLowerCase());
      const matchPhone = !searchPhone || a.phone?.includes(searchPhone) || a.phoneNumber?.includes(searchPhone);
      const matchRole = !searchRole || a.role === searchRole || a.systemRole === searchRole;
      const matchCompany = !searchCompany || a.company.toLowerCase().includes(searchCompany.toLowerCase());
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
        await adminService.updateStaff(editingAdmin.id, form);
        fetchStaff();
        showToast("Cập nhật thông tin cán bộ quản trị thành công!");
      } catch {
        showToast("Lỗi khi cập nhật thông tin.");
      }
    } else {
      try {
        await adminService.createStaff(form);
        fetchStaff();
        showToast(`Đã tạo thành công tài khoản cán bộ: ${form.name}`);
      } catch {
        showToast("Lỗi khi tạo cán bộ mới.");
      }
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await adminService.deleteStaff(deleteTarget.id);
      fetchStaff();
      showToast("Đã xóa tài khoản quản trị thành công!");
      setDeleteTarget(null);
    } catch {
      showToast("Lỗi khi xóa tài khoản quản trị.");
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
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg border shadow-xl flex items-center gap-2 text-xs font-semibold bg-emerald-950/90 text-emerald-300 border-emerald-500/40 animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

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
        canUpdate={canUpdate("mod_user")}
        canDelete={canDelete("mod_user")}
        onEdit={handleOpenEdit}
        onDelete={setDeleteTarget}
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
