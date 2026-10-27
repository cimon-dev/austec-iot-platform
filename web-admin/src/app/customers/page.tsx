"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";
import { CustomerAccount, MatrixOwnerItem, MemberPermissionItem } from "./types";
import { MOCK_CUSTOMERS, INITIAL_FAMILY_MATRIX } from "./mock-data";
import { customersService } from "./customers-service";
import {
  CustomerHeader,
  CustomerAccountsTab,
  FamilyMatrixTab,
  CreateCustomerModal,
} from "./components";

function CustomersPageContent() {
  const { canView, canUpdate } = usePermissions();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "accounts";
  const [activeTab, setActiveTab] = useState<"accounts" | "matrix">(
    initialTab === "matrix" ? "matrix" : "accounts"
  );

  const switchTab = (tab: "accounts" | "matrix") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/customers?tab=${tab}`);
    }
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "matrix") setActiveTab("matrix");
    else if (tab === "accounts") setActiveTab("accounts");
  }, [searchParams]);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" | "error" } | null>(null);
  const showToast = useCallback((message: string, type: "success" | "info" | "warning" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Accounts Tab State
  const [customers, setCustomers] = useState<CustomerAccount[]>(MOCK_CUSTOMERS);
  const [viewCustomer, setViewCustomer] = useState<CustomerAccount | null>(null);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    password: "Austec123!@#",
    province: "Hà Nội",
    address: "",
    isActive: true,
    initialHardwareId: "",
  });

  // Hydrate customers from backend
  useEffect(() => {
    customersService.getCustomers().then((data) => {
      if (data && data.length > 0) {
        setCustomers(data);
      }
    });
  }, []);

  // Family Matrix Tab State
  const [matrixData, setMatrixData] = useState<MatrixOwnerItem[]>(INITIAL_FAMILY_MATRIX);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("USR-008712");
  const [selectedHardwareId, setSelectedHardwareId] = useState<string>("AT-DOOR-88239A01");
  const [revokeTarget, setRevokeTarget] = useState<{ memberId: string; memberName: string; hwId: string } | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  // Toggle account active status
  const handleToggleAccountStatus = async (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;
    const newStatus = !cust.isActive;

    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, isActive: newStatus } : c))
    );
    if (viewCustomer?.id === customerId) {
      setViewCustomer((prev) => (prev ? { ...prev, isActive: newStatus } : null));
    }

    try {
      await customersService.toggleCustomerStatus(customerId, newStatus);
      showToast(
        newStatus ? `Đã mở khóa tài khoản ${cust.fullName}` : `Đã tạm khóa tài khoản ${cust.fullName}`,
        newStatus ? "success" : "warning"
      );
    } catch {
      showToast("Lỗi đồng bộ trạng thái tài khoản!", "error");
    }
  };

  // Submit Add Customer
  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.fullName.trim() || !newCustomerForm.phoneNumber.trim()) {
      showToast("Vui lòng điền đủ Họ tên và Số điện thoại!", "warning");
      return;
    }

    setIsSubmittingCustomer(true);
    try {
      const newCust: CustomerAccount = {
        id: `USR-${Math.floor(100000 + Math.random() * 900000)}`,
        fullName: newCustomerForm.fullName.trim(),
        phoneNumber: newCustomerForm.phoneNumber.trim(),
        email: newCustomerForm.email.trim() || `${newCustomerForm.phoneNumber}@austec.vn`,
        province: newCustomerForm.province,
        address: newCustomerForm.address.trim() || newCustomerForm.province,
        registeredAt: new Date().toISOString().slice(0, 10),
        isActive: newCustomerForm.isActive,
        devices: newCustomerForm.initialHardwareId.trim()
          ? [
              {
                hardwareId: newCustomerForm.initialHardwareId.trim().toUpperCase(),
                modelName: "Thiết bị mới gán",
                deviceType: "Cửa cuốn",
                pairedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
                warrantyUntil: "2027-12-31",
                isOnline: true,
                roleInHome: "OWNER",
              },
            ]
          : [],
      };

      await customersService.createCustomer(newCust);
      setCustomers((prev) => [newCust, ...prev]);
      setIsAddCustomerModalOpen(false);
      showToast(`Đã tạo tài khoản khách hàng "${newCust.fullName}" thành công!`, "success");
    } catch (e: any) {
      showToast(`Lỗi tạo khách hàng: ${e.message}`, "error");
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  // Toggle Matrix Permission
  const handleToggleMemberPermission = (
    memberId: string,
    field: "canControl" | "canViewHistory" | "canChildLock" | "canConfig" | "scheduleLimitActive"
  ) => {
    const hwId = selectedHardwareId;
    setMatrixData((prev) =>
      prev.map((owner) => ({
        ...owner,
        devices: owner.devices.map((dev) => {
          if (dev.hardwareId !== hwId) return dev;
          return {
            ...dev,
            members: dev.members.map((m) => {
              if (m.id !== memberId) return m;
              return { ...m, [field]: !m[field] };
            }),
          };
        }),
      }))
    );

    customersService.updateMemberPermission(hwId, memberId, { [field]: true }).catch(() => {});
    showToast("Đã cập nhật phân quyền thành viên tức thì!", "success");
  };

  // Revoke member
  const handleConfirmRevoke = async () => {
    if (!revokeTarget) return;
    setIsRevoking(true);
    try {
      await customersService.revokeMember(revokeTarget.hwId, revokeTarget.memberId);
      setMatrixData((prev) =>
        prev.map((owner) => ({
          ...owner,
          devices: owner.devices.map((dev) => {
            if (dev.hardwareId !== revokeTarget.hwId) return dev;
            return {
              ...dev,
              members: dev.members.filter((m) => m.id !== revokeTarget.memberId),
            };
          }),
        }))
      );
      showToast(`Đã thu hồi quyền thành công của ${revokeTarget.memberName}`, "info");
    } catch (e: any) {
      showToast(`Lỗi thu hồi quyền: ${e.message}`, "error");
    } finally {
      setIsRevoking(false);
      setRevokeTarget(null);
    }
  };

  // Add Member
  const handleAddMemberToMatrix = (newMember: MemberPermissionItem) => {
    const hwId = selectedHardwareId;
    setMatrixData((prev) =>
      prev.map((owner) => ({
        ...owner,
        devices: owner.devices.map((dev) => {
          if (dev.hardwareId !== hwId) return dev;
          return {
            ...dev,
            members: [newMember, ...dev.members],
          };
        }),
      }))
    );
    customersService.addMember(hwId, newMember).catch(() => {});
    showToast(`Đã cấp quyền điều khiển cho ${newMember.memberName}`, "success");
  };

  if (!canView("mod_user")) {
    return <AccessDenied moduleId="mod_user" moduleName="Quản Lý Khách Hàng & Phân Quyền Gia Đình" />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-slate-100 dark:bg-slate-950 p-2.5 space-y-2.5">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-lg animate-in slide-in-from-top-2 border ${
            toast.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : toast.type === "error"
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              : toast.type === "warning"
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <CustomerHeader
        activeTab={activeTab}
        totalCustomers={customers.length}
        onTabChange={switchTab}
      />

      {/* Tab Content */}
      {activeTab === "accounts" ? (
        <CustomerAccountsTab
          customers={customers}
          viewCustomer={viewCustomer}
          onSelectCustomer={setViewCustomer}
          canUpdate={canUpdate("mod_user")}
          onToggleStatus={handleToggleAccountStatus}
          onOpenAddModal={() => setIsAddCustomerModalOpen(true)}
          onViewMatrix={(ownerId) => {
            setSelectedOwnerId(ownerId);
            switchTab("matrix");
          }}
        />
      ) : (
        <FamilyMatrixTab
          matrixData={matrixData}
          selectedOwnerId={selectedOwnerId}
          onSelectOwner={(id) => {
            setSelectedOwnerId(id);
            const owner = matrixData.find((o) => o.ownerId === id);
            if (owner && owner.devices.length > 0) {
              setSelectedHardwareId(owner.devices[0].hardwareId);
            }
          }}
          selectedHardwareId={selectedHardwareId}
          onSelectHardware={setSelectedHardwareId}
          onTogglePermission={handleToggleMemberPermission}
          onRevokeMember={(memberId, memberName) =>
            setRevokeTarget({ memberId, memberName, hwId: selectedHardwareId })
          }
          onAddMemberSubmit={handleAddMemberToMatrix}
          revokeTarget={revokeTarget}
          isRevoking={isRevoking}
          onConfirmRevoke={handleConfirmRevoke}
          onCancelRevoke={() => setRevokeTarget(null)}
        />
      )}

      {/* Add Customer Modal */}
      <CreateCustomerModal
        isOpen={isAddCustomerModalOpen}
        onClose={() => setIsAddCustomerModalOpen(false)}
        onSubmit={handleAddCustomerSubmit}
        form={newCustomerForm}
        setForm={setNewCustomerForm}
        isSubmitting={isSubmittingCustomer}
      />
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-500 font-mono">Đang tải khách hàng...</div>}>
      <CustomersPageContent />
    </Suspense>
  );
}
