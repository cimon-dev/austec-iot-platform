"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";
import { CustomerAccount, MatrixOwnerItem, MemberPermissionItem } from "./types";
import { INITIAL_FAMILY_MATRIX } from "./mock-data";
import { customersService } from "./customers-service";
import {
  CustomerHeader,
  CustomerAccountsTab,
  FamilyMatrixTab,
  CreateCustomerModal,
  EditCustomerModal,
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

  // Accounts Tab State
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
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

  const [editingCustomer, setEditingCustomer] = useState<CustomerAccount | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const handleUpdateCustomerSubmit = async (id: string, updatedData: Partial<CustomerAccount>) => {
    setIsSubmittingEdit(true);
    try {
      const res = await customersService.updateCustomer(id, updatedData);
      if (res.success) {
        setCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...updatedData } : c))
        );
        if (viewCustomer?.id === id) {
          setViewCustomer((prev) => (prev ? { ...prev, ...updatedData } : null));
        }
        toast.success(`Đã cập nhật thông tin khách hàng (bao gồm email) vào PostgreSQL thành công!`);
        setEditingCustomer(null);
      } else {
        toast.error(res.error || "Không thể cập nhật thông tin khách hàng");
      }
    } catch (e: any) {
      toast.error(`Lỗi cập nhật khách hàng: ${e.message}`);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

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
      if (newStatus) {
        toast.success(`Đã mở khóa tài khoản ${cust.fullName}`);
      } else {
        toast.warning(`Đã tạm khóa tài khoản ${cust.fullName}`);
      }
    } catch {
      toast.error("Lỗi đồng bộ trạng thái tài khoản vào PostgreSQL!");
    }
  };

  // Submit Add Customer
  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.fullName.trim() || !newCustomerForm.phoneNumber.trim()) {
      toast.warning("Vui lòng điền đủ Họ tên và Số điện thoại!");
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
      toast.success(`Đã tạo tài khoản khách hàng "${newCust.fullName}" lưu vào PostgreSQL thành công!`);
    } catch (e: any) {
      toast.error(`Lỗi tạo khách hàng: ${e.message}`);
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
    toast.success("Đã cập nhật phân quyền thành viên tức thì!");
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
      toast.info(`Đã thu hồi quyền thành công của ${revokeTarget.memberName}`);
    } catch (e: any) {
      toast.error(`Lỗi thu hồi quyền: ${e.message}`);
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
    toast.success(`Đã cấp quyền điều khiển cho ${newMember.memberName}`);
  };

  if (!canView("mod_user")) {
    return <AccessDenied moduleId="mod_user" moduleName="Quản Lý Khách Hàng & Phân Quyền Gia Đình" />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-slate-100 dark:bg-slate-950 p-2.5 space-y-2.5">

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
          onEditCustomer={(cust) => setEditingCustomer(cust)}
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

      {/* Edit Customer Modal */}
      <EditCustomerModal
        isOpen={!!editingCustomer}
        customer={editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSubmit={handleUpdateCustomerSubmit}
        isSubmitting={isSubmittingEdit}
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
