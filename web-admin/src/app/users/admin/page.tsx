"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  ShieldCheck, 
  Building2, 
  Phone, 
  Mail, 
  X, 
  CheckCircle2, 
  KeyRound,
  Filter
} from "lucide-react";
import { useLanguage } from "../../../context/LanguageContext";
import { usePermissions } from "../../../context/PermissionContext";
import { AccessDenied } from "../../../components/AccessDenied";
import { Pagination } from "@/components/Pagination";

interface AdminUser {
  id: number;
  empID: string;
  name: string;
  email: string;
  company: string;
  department: string;
  phone: string;
  role: string;
  updatedBy: string;
  updatedAt: string;
}

const INITIAL_ADMINS: AdminUser[] = [
  {
    id: 1,
    empID: "AUSTEC001",
    name: "AUSTEC Super Admin",
    email: "austec.admin@gmail.com",
    company: "AUSTEC GROUP",
    department: "Ban Điều Hành",
    phone: "0912 345 678",
    role: "Administrator",
    updatedBy: "System",
    updatedAt: "18/10/2026"
  },
  {
    id: 2,
    empID: "AUSTEC002",
    name: "Trần Minh Quang",
    email: "quang.tm@austec.vn",
    company: "AUSTEC",
    department: "Phòng Kỹ Thuật IoT",
    phone: "0988 776 655",
    role: "Device Admin",
    updatedBy: "austec.admin@gmail.com",
    updatedAt: "16/10/2026"
  },
  {
    id: 3,
    empID: "HOANGCONG001",
    name: "Công ty Hoàng Công - CSKH",
    email: "luan.pham.264.95@gmail.com",
    company: "Hoàng Công Partner",
    department: "Bộ Phận Vận Hành",
    phone: "0905 123 456",
    role: "Support Agent",
    updatedBy: "rent.vehicle@gmail.com",
    updatedAt: "12/10/2026"
  },
  {
    id: 4,
    empID: "AUSTEC005",
    name: "Nguyễn Thu Hà",
    email: "ha.nt@austec.vn",
    company: "AUSTEC",
    department: "Chăm Sóc Khách Hàng",
    phone: "0944 889 900",
    role: "CSKH Support",
    updatedBy: "austec.admin@gmail.com",
    updatedAt: "10/10/2026"
  },
  {
    id: 5,
    empID: "AUSTEC006",
    name: "Đặng Văn Hùng",
    email: "hung.dv@austec.vn",
    company: "AUSTEC",
    department: "Kho Vận & Logistics",
    phone: "0912 888 777",
    role: "Kỹ Thuật Kho",
    updatedBy: "austec.admin@gmail.com",
    updatedAt: "08/10/2026"
  },
  {
    id: 6,
    empID: "AUSTEC007",
    name: "Lê Kim Oanh",
    email: "oanh.lk@austec.vn",
    company: "AUSTEC",
    department: "Tài Chính & Kế Toán",
    phone: "0934 112 233",
    role: "Administrator",
    updatedBy: "austec.admin@gmail.com",
    updatedAt: "05/10/2026"
  },
  {
    id: 7,
    empID: "AUSTEC008",
    name: "Phạm Đức Nam",
    email: "nam.pd@austec.vn",
    company: "AUSTEC",
    department: "Phòng Bảo Hành & Kỹ Thuật",
    phone: "0978 990 011",
    role: "Device Admin",
    updatedBy: "austec.admin@gmail.com",
    updatedAt: "04/10/2026"
  },
  {
    id: 8,
    empID: "AUSTEC009",
    name: "Vũ Thúy Hằng",
    email: "hang.vt@austec.vn",
    company: "AUSTEC",
    department: "Quản Lý Chất Lượng QA",
    phone: "0966 334 455",
    role: "Support Agent",
    updatedBy: "austec.admin@gmail.com",
    updatedAt: "02/10/2026"
  },
  {
    id: 9,
    empID: "HOANGCONG002",
    name: "Bùi Tuấn Anh",
    email: "anh.bt@hoangcong.vn",
    company: "Hoàng Công Partner",
    department: "Giám Sát Vận Hành",
    phone: "0909 667 788",
    role: "Rent Vehicle Admin",
    updatedBy: "rent.vehicle@gmail.com",
    updatedAt: "01/10/2026"
  },
  {
    id: 10,
    empID: "AUSTEC010",
    name: "Hoàng Thị Lan",
    email: "lan.ht@austec.vn",
    company: "AUSTEC",
    department: "Dịch Vụ Khách Hàng",
    phone: "0982 556 677",
    role: "CSKH Support",
    updatedBy: "austec.admin@gmail.com",
    updatedAt: "28/09/2026"
  }
];

const DEFAULT_ROLES_LIST = [
  "Administrator",
  "Device Admin",
  "Support Agent",
  "CSKH Support",
  "Kỹ Thuật Kho",
  "Rent Vehicle Admin"
];

export default function AdminManagementPage() {
  const { t, language } = useLanguage();
  const { canView, canCreate, canUpdate, canDelete, currentRoleName } = usePermissions();

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
    password: ""
  });

  const [toast, setToast] = useState<string | null>(null);

  // Load persisted admins from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("austec_admin_users");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAdmins(parsed);
          }
        } catch (e) {}
      }

      // Sync role options from role management if present
      const savedRoles = localStorage.getItem("austec_user_roles");
      if (savedRoles) {
        try {
          const parsedRoles = JSON.parse(savedRoles);
          if (Array.isArray(parsedRoles) && parsedRoles.length > 0) {
            setRolesList(parsedRoles.map((r: any) => r.name));
          }
        } catch (e) {}
      }
    }
  }, []);

  const persistAdmins = (updated: AdminUser[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("austec_admin_users", JSON.stringify(updated));
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Filtered List
  const filteredAdmins = useMemo(() => {
    return admins.filter(a => {
      const matchEmp = !searchEmpId || a.empID.toLowerCase().includes(searchEmpId.toLowerCase());
      const matchEmail = !searchEmail || a.email.toLowerCase().includes(searchEmail.toLowerCase());
      const matchPhone = !searchPhone || a.phone.includes(searchPhone);
      const matchRole = !searchRole || a.role === searchRole;
      const matchCompany = !searchCompany || a.company.toLowerCase().includes(searchCompany.toLowerCase());
      return matchEmp && matchEmail && matchPhone && matchRole && matchCompany;
    });
  }, [admins, searchEmpId, searchEmail, searchPhone, searchRole, searchCompany]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchEmpId, searchEmail, searchPhone, searchRole, searchCompany]);

  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / pageSize));
  const paginatedAdmins = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAdmins.slice(start, start + pageSize);
  }, [filteredAdmins, currentPage, pageSize]);

  // Open Create Modal
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
      password: ""
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (a: AdminUser) => {
    setEditingAdmin(a);
    setForm({
      empID: a.empID,
      name: a.name,
      email: a.email,
      company: a.company,
      department: a.department,
      phone: a.phone,
      role: a.role,
      password: ""
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;

    if (editingAdmin) {
      const updated = admins.map(a => a.id === editingAdmin.id ? {
        ...a,
        name: form.name,
        company: form.company,
        department: form.department,
        phone: form.phone,
        role: form.role,
        updatedBy: "austec.admin@gmail.com",
        updatedAt: new Date().toLocaleDateString("vi-VN")
      } : a);
      setAdmins(updated);
      persistAdmins(updated);
      showToast("Cập nhật thông tin cán bộ quản trị thành công!");
    } else {
      const newAdmin: AdminUser = {
        id: Date.now() % 10000,
        empID: form.empID,
        name: form.name,
        email: form.email,
        company: form.company,
        department: form.department,
        phone: form.phone,
        role: form.role,
        updatedBy: "austec.admin@gmail.com",
        updatedAt: new Date().toLocaleDateString("vi-VN")
      };
      const updated = [newAdmin, ...admins];
      setAdmins(updated);
      persistAdmins(updated);
      showToast(`Đã tạo thành công tài khoản cán bộ: ${newAdmin.name}`);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa tài khoản quản trị này?")) {
      const remaining = admins.filter(a => a.id !== id);
      setAdmins(remaining);
      persistAdmins(remaining);
      showToast("Đã xóa tài khoản quản trị thành công!");
    }
  };

  // RBAC Gating
  if (!canView("mod_user")) {
    return (
      <AccessDenied 
        moduleName="Quản Lý Cán Bộ Quản Trị (Admin Management)"
        requiredModule="mod_user"
      />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2 overflow-hidden">
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 backdrop-blur-md shadow-lg flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <span>Quản Lý Cán Bộ Quản Trị (Admin Management)</span>
          </h1>
        </div>

        {canCreate("mod_user") && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer w-fit"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo Quản Trị Viên</span>
          </button>
        )}
      </div>

      {/* Filter / Search Box */}
      <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Filter className="w-3.5 h-3.5 text-indigo-500" />
          <span>Bộ lọc & Tìm kiếm cán bộ</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2">
          <div>
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 block">Mã Nhân Viên</label>
            <input
              type="text"
              placeholder="VD: AUSTEC001..."
              value={searchEmpId}
              onChange={e => setSearchEmpId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 block">Email</label>
            <input
              type="text"
              placeholder="austec@..."
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 block">Số Điện Thoại</label>
            <input
              type="text"
              placeholder="0912..."
              value={searchPhone}
              onChange={e => setSearchPhone(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 block">Vai Trò (Role)</label>
            <select
              value={searchRole}
              onChange={e => setSearchRole(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Tất cả vai trò</option>
              {rolesList.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5 block">Công Ty (Company)</label>
            <input
              type="text"
              placeholder="AUSTEC..."
              value={searchCompany}
              onChange={e => setSearchCompany(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 min-h-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[11px] sticky top-0 z-10">
              <tr>
                <th className="p-2.5 w-12 text-center">ID</th>
                <th className="p-2.5">Mã NV</th>
                <th className="p-2.5">Họ và Tên</th>
                <th className="p-2.5">Email</th>
                <th className="p-2.5">Công Ty</th>
                <th className="p-2.5">Phòng Ban</th>
                <th className="p-2.5">Số Điện Thoại</th>
                <th className="p-2.5">Vai Trò</th>
                <th className="p-2.5">Cập nhật</th>
                {(canUpdate("mod_user") || canDelete("mod_user")) && (
                  <th className="p-2.5 text-right">Thao tác</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    Không tìm thấy tài khoản quản trị viên nào khớp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedAdmins.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5 text-center text-slate-500 font-mono">{a.id}</td>
                    <td className="p-2.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{a.empID}</td>
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{a.name}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300 font-mono">{a.email}</td>
                    <td className="p-2.5 text-slate-700 dark:text-slate-300">{a.company}</td>
                    <td className="p-2.5 text-slate-700 dark:text-slate-300">{a.department}</td>
                    <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{a.phone || "---"}</td>
                    <td className="p-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-mono">
                        {a.role}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-500 text-[11px]">
                      <span>{a.updatedAt}</span>
                      <span className="block text-[10px] text-slate-400">bởi {a.updatedBy}</span>
                    </td>
                    {(canUpdate("mod_user") || canDelete("mod_user")) && (
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canUpdate("mod_user") && (
                            <button
                              onClick={() => handleOpenEdit(a)}
                              title="Chỉnh sửa thông tin"
                              className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete("mod_user") && (
                            <button
                              onClick={() => handleDelete(a.id)}
                              title="Xóa tài khoản"
                              className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredAdmins.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 15, 20, 50, 100]}
          itemName="cán bộ"
        />
      </div>

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {editingAdmin ? "Chỉnh Sửa Thông Tin Cán Bộ" : "Tạo Tài Khoản Quản Trị Mới"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mã Nhân Viên *</label>
                  <input
                    type="text"
                    required
                    value={form.empID}
                    onChange={e => setForm({ ...form, empID: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Họ và Tên *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email Đăng Nhập *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Số Điện Thoại</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Công Ty</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={e => setForm({ ...form, company: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Phòng Ban</label>
                  <input
                    type="text"
                    value={form.department}
                    onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Vai Trò Đảm Nhiệm (Role) *</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  {rolesList.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {!editingAdmin && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">Mật khẩu khởi tạo</label>
                  <input
                    type="password"
                    placeholder="Tối thiểu 8 ký tự..."
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm cursor-pointer"
                >
                  {editingAdmin ? "Lưu Thay Đổi" : "Khởi Tạo Tài Khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
