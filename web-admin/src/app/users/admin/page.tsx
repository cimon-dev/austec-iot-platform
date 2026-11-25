"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Clock, CheckCircle2, XCircle, Mail, Smartphone, Building2, Users } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { usePermissions } from "../../../context/PermissionContext";
import { AccessDenied } from "../../../components/AccessDenied";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import {
  StepUpVerifyModal,
  getCachedStepUpToken,
  clearCachedStepUpToken,
} from "@/components/StepUpVerifyModal";
import { AdminUser } from "./types";
import { adminService, PendingStaffCandidate } from "./admin-service";
import { AdminHeader, AdminFilterBar, AdminTable, AdminFormModal } from "./components";
import { rolesService } from "../roles/roles-service";

function isAdminRoleName(role?: string, systemRole?: string): boolean {
  return `${systemRole || ""} ${role || ""}`.toUpperCase().includes("ADMIN");
}

export default function AdminManagementPage() {
  const { user } = useAuth();
  const { canView, canCreate, canUpdate, canDelete } = usePermissions();

  const [activeTab, setActiveTab] = useState<"approved" | "pending">("approved");
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [pendingList, setPendingList] = useState<PendingStaffCandidate[]>([]);
  const [processingPendingId, setProcessingPendingId] = useState<string | null>(null);
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
    company: "",
    department: "",
    phone: "",
    role: "CSKH Support",
    password: "",
  });

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Step-up verification modal state (Chức năng #9: chỉ bật khi tạo/nâng quyền/xóa/sửa ADMIN)
  const [stepUpRequest, setStepUpRequest] = useState<{
    title: string;
    detail: string;
    badgeType: "danger" | "warning";
    summaryRows: Array<{ label: string; value: string }>;
    action: (stepUpToken: string) => Promise<void>;
  } | null>(null);

  const fetchStaff = useCallback(() => {
    setIsLoading(true);
    const tasks: Promise<any>[] = [
      adminService.getStaff().then((res) => {
        if (res && Array.isArray(res)) setAdmins(res);
      }),
    ];
    if (user?.role === "ADMIN") {
      tasks.push(
        adminService.getPendingStaff().then((res) => {
          if (res && Array.isArray(res)) setPendingList(res);
        })
      );
    }
    Promise.all(tasks).finally(() => setIsLoading(false));
  }, [user?.role]);

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

  const runWithAdminStepUp = async (
    config: {
      title: string;
      detail: string;
      badgeType?: "danger" | "warning";
      summaryRows?: Array<{ label: string; value: string }>;
    },
    action: (token: string) => Promise<void>
  ) => {
    const cached = getCachedStepUpToken("ADMIN_ROLE_CHANGE");
    if (cached) {
      await action(cached);
      return;
    }
    setStepUpRequest({
      title: config.title,
      detail: config.detail,
      badgeType: config.badgeType || "warning",
      summaryRows: config.summaryRows || [],
      action,
    });
  };

  const handleApprovePending = async (candidate: PendingStaffCandidate) => {
    setProcessingPendingId(candidate.id);
    try {
      const res = await adminService.approvePendingStaff(candidate.id);
      if (res.success) {
        toast.success(res.message || `Đã phê duyệt tài khoản CSKH ${candidate.fullName}!`);
        fetchStaff();
      } else {
        toast.error(res.error || "Không thể phê duyệt tài khoản.");
      }
    } finally {
      setProcessingPendingId(null);
    }
  };

  const handleRejectPending = async (candidate: PendingStaffCandidate) => {
    setProcessingPendingId(candidate.id);
    try {
      const res = await adminService.rejectPendingStaff(candidate.id);
      if (res.success) {
        toast.info(res.message || `Đã từ chối yêu cầu đăng ký của ${candidate.fullName}.`);
        fetchStaff();
      } else {
        toast.error(res.error || "Không thể từ chối yêu cầu.");
      }
    } finally {
      setProcessingPendingId(null);
    }
  };

  const handleBulkDelete = async (ids: (string | number)[]) => {
    const targets = admins.filter((a) => ids.includes(a.id));
    const includesAdmin = targets.some((a) => isAdminRoleName(a.role, a.systemRole));

    const executeDelete = async (stepUpToken?: string) => {
      let deleted = 0;
      for (const id of ids) {
        try {
          const res = await adminService.deleteStaff(id, stepUpToken);
          if (res.success) deleted++;
        } catch (e) {
          console.warn("Lỗi xóa cán bộ:", id, e);
        }
      }
      fetchStaff();
      toast.success(`Đã xóa ${deleted} cán bộ quản trị thành công!`);
    };

    if (includesAdmin) {
      await runWithAdminStepUp(
        {
          title: "Xác Thực Xóa Tài Khoản Quản Trị Viên (ADMIN)",
          detail:
            "Danh sách chọn xóa có chứa tài khoản quyền ADMIN. Yêu cầu xác thực OTP (Gmail hoặc Zalo) để tiếp tục.",
          badgeType: "danger",
          summaryRows: [{ label: "Số lượng xóa", value: `${ids.length} tài khoản` }],
        },
        executeDelete
      );
    } else {
      await executeDelete();
    }
  };

  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      const matchEmp = !searchEmpId || a.empID?.toLowerCase().includes(searchEmpId.toLowerCase());
      const matchEmail = !searchEmail || a.email?.toLowerCase().includes(searchEmail.toLowerCase());
      const matchPhone =
        !searchPhone || a.phone?.includes(searchPhone) || a.phoneNumber?.includes(searchPhone);
      const matchRole = !searchRole || a.role === searchRole || a.systemRole === searchRole;
      const matchCompany =
        !searchCompany || a.company?.toLowerCase().includes(searchCompany.toLowerCase());
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
      company: "",
      department: "",
      phone: "",
      role: rolesList.find((r) => r.toUpperCase().includes("CSKH")) || rolesList[0] || "CSKH Support",
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

    const willBeAdmin = isAdminRoleName(form.role);
    const wasAdmin = editingAdmin ? isAdminRoleName(editingAdmin.role, editingAdmin.systemRole) : false;
    const needsStepUp = willBeAdmin || wasAdmin;

    const executeSave = async (stepUpToken?: string) => {
      if (editingAdmin) {
        const res = await adminService.updateStaff(editingAdmin.id, form, stepUpToken);
        if (res.requireStepUp) {
          clearCachedStepUpToken("ADMIN_ROLE_CHANGE");
          toast.warning(res.error || "Vui lòng xác thực OTP để thay đổi tài khoản ADMIN.");
          return;
        }
        if (!res.success) {
          toast.error(res.error || "Lỗi khi cập nhật thông tin cán bộ");
          return;
        }
        await fetchStaff();
        toast.success("Cập nhật thông tin cán bộ quản trị thành công!");
        setIsModalOpen(false);
      } else {
        const res = await adminService.createStaff(form, stepUpToken);
        if (res.requireStepUp) {
          clearCachedStepUpToken("ADMIN_ROLE_CHANGE");
          toast.warning(res.error || "Vui lòng xác thực OTP để tạo tài khoản ADMIN.");
          return;
        }
        if (!res.success) {
          toast.error(res.error || "Lỗi khi tạo cán bộ mới");
          return;
        }
        await fetchStaff();
        toast.success(`Đã tạo thành công tài khoản cán bộ: ${form.name}`);
        setIsModalOpen(false);
      }
    };

    if (needsStepUp) {
      await runWithAdminStepUp(
        {
          title: editingAdmin
            ? "Xác Thực Cấp Quyền / Cập Nhật Tài Khoản ADMIN"
            : "Xác Thực Khởi Tạo Tài Khoản Quản Trị Viên (ADMIN)",
          detail:
            "Thao tác cấp quyền hoặc thay đổi thông tin tài khoản quyền Quản trị viên (ADMIN) yêu cầu xác thực OTP qua Gmail hoặc Zalo.",
          badgeType: "warning",
          summaryRows: [
            { label: "Họ tên", value: form.name },
            { label: "Email", value: form.email },
            { label: "Vai trò đích", value: form.role },
          ],
        },
        executeSave
      );
    } else {
      await executeSave();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const targetIsAdmin = isAdminRoleName(deleteTarget.role, deleteTarget.systemRole);

    const executeDelete = async (stepUpToken?: string) => {
      setIsDeleting(true);
      try {
        const res = await adminService.deleteStaff(deleteTarget.id, stepUpToken);
        if (res.requireStepUp) {
          clearCachedStepUpToken("ADMIN_ROLE_CHANGE");
          toast.warning(res.error || "Yêu cầu xác thực OTP.");
          return;
        }
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

    if (targetIsAdmin) {
      await runWithAdminStepUp(
        {
          title: "Xác Thực Xóa Tài Khoản ADMIN",
          detail: `Bạn đang chuẩn bị xóa vĩnh viễn tài khoản Quản trị viên ${deleteTarget.email}. Vui lòng xác thực OTP qua Gmail hoặc Zalo.`,
          badgeType: "danger",
          summaryRows: [
            { label: "Quản trị viên", value: deleteTarget.name || deleteTarget.fullName || "" },
            { label: "Email", value: deleteTarget.email },
          ],
        },
        executeDelete
      );
    } else {
      await executeDelete();
    }
  };

  if (!canView("mod_user")) {
    return (
      <AccessDenied
        moduleName="Quản Lý Cán Bộ Quản Trị (Admin Management)"
        requiredModule="mod_user"
      />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2.5 overflow-hidden">
      <AdminHeader canCreate={canCreate("mod_user")} onOpenCreate={handleOpenCreate} />

      {/* Switch Tabs: Danh sách chính thức & Chờ phê duyệt CSKH */}
      {user?.role === "ADMIN" && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("approved")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition cursor-pointer ${
              activeTab === "approved"
                ? "bg-slate-900 text-white dark:bg-cyan-600 border-slate-900 dark:border-cyan-500 shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Cán bộ đang hoạt động ({admins.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition cursor-pointer ${
              activeTab === "pending"
                ? "bg-amber-600 text-white border-amber-500 shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>CSKH Chờ phê duyệt</span>
            {pendingList.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold ${
                  activeTab === "pending"
                    ? "bg-white text-amber-700"
                    : "bg-amber-500 text-white"
                }`}
              >
                {pendingList.length}
              </span>
            )}
          </button>
        </div>
      )}

      {activeTab === "approved" ? (
        <>
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
        </>
      ) : (
        /* PENDING CSKH APPROVAL QUEUE */
        <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          {pendingList.length === 0 ? (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-500/70" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Không có tài khoản CSKH nào đang chờ duyệt
              </p>
              <p className="text-xs max-w-md">
                Khi nhân viên CSKH tự đăng ký qua Email hoặc Google tại trang /register, yêu cầu sẽ xuất hiện tại đây để Quản trị viên xét duyệt.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pendingList.map((candidate) => (
                <div
                  key={candidate.id}
                  className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/15 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{candidate.fullName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                            CHỜ DUYỆT (CSKH)
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Ngày gửi: {candidate.registeredAt} • Phương thức:{" "}
                          <strong>
                            {candidate.googleLinked || candidate.authProvider === "google"
                              ? "Google (Gmail)"
                              : "Email & Mật khẩu"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300 pt-1">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{candidate.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{candidate.phoneNumber || "Chưa cung cấp SĐT"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{candidate.department}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-800/30">
                    <button
                      type="button"
                      disabled={processingPendingId === candidate.id}
                      onClick={() => handleRejectPending(candidate)}
                      className="flex-1 py-2 rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Từ chối</span>
                    </button>
                    <button
                      type="button"
                      disabled={processingPendingId === candidate.id}
                      onClick={() => handleApprovePending(candidate)}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {processingPendingId === candidate.id ? "Đang xử lý..." : "Phê duyệt"}
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {stepUpRequest && (
        <StepUpVerifyModal
          isOpen={true}
          purpose="ADMIN_ROLE_CHANGE"
          title={stepUpRequest.title}
          warningDetail={stepUpRequest.detail}
          badgeType={stepUpRequest.badgeType}
          summaryRows={stepUpRequest.summaryRows}
          onClose={() => setStepUpRequest(null)}
          onVerified={async (token) => {
            const act = stepUpRequest.action;
            setStepUpRequest(null);
            await act(token);
          }}
        />
      )}
    </div>
  );
}
