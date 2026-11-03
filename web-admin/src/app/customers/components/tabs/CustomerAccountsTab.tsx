"use client";

import React, { useState, useMemo } from "react";
import { Search, UserPlus, Edit3, Trash2, Loader2 } from "lucide-react";
import { CustomerAccount } from "../../types";
import { Pagination } from "@/components/Pagination";
import { CustomerDetailModal } from "../modals/CustomerDetailModal";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

interface CustomerAccountsTabProps {
  customers: CustomerAccount[];
  isLoading?: boolean;
  viewCustomer: CustomerAccount | null;
  onSelectCustomer: (cust: CustomerAccount | null) => void;
  canUpdate: boolean;
  onToggleStatus: (id: string) => void;
  onOpenAddModal: () => void;
  onViewMatrix: (ownerId: string) => void;
  onEditCustomer?: (cust: CustomerAccount) => void;
  onDeleteCustomers?: (ids: string[]) => Promise<void>;
}

export function CustomerAccountsTab({
  customers,
  isLoading = false,
  viewCustomer,
  onSelectCustomer,
  canUpdate,
  onToggleStatus,
  onOpenAddModal,
  onViewMatrix,
  onEditCustomer,
  onDeleteCustomers,
}: CustomerAccountsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Multi-selection & Bulk Delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        cust.fullName.toLowerCase().includes(q) ||
        cust.phoneNumber.includes(q) ||
        cust.email.toLowerCase().includes(q) ||
        cust.id.toLowerCase().includes(q);
      const matchProvince = selectedProvince === "ALL" || cust.province === selectedProvince;
      return matchSearch && matchProvince;
    });
  }, [customers, searchTerm, selectedProvince]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const toggleSelectCustomer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllPaginatedSelected =
    paginatedCustomers.length > 0 &&
    paginatedCustomers.every((c) => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (isAllPaginatedSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedCustomers.forEach((c) => next.delete(c.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedCustomers.forEach((c) => next.add(c.id));
        return next;
      });
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.size === 0 || !onDeleteCustomers) return;
    setIsBulkDeleting(true);
    try {
      await onDeleteCustomers(Array.from(selectedIds));
      setSelectedIds(new Set());
    } finally {
      setIsBulkDeleting(false);
      setIsBulkDeleteModalOpen(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex gap-2.5 overflow-hidden">
      {/* Main Table Column */}
      <div className="flex-1 min-w-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên, SĐT, Email, ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs pl-7 pr-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white w-56 focus:outline-none focus:border-slate-900 dark:focus:border-white"
              />
            </div>
            <select
              value={selectedProvince}
              onChange={(e) => {
                setSelectedProvince(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white cursor-pointer"
            >
              <option value="ALL">Mọi tỉnh thành</option>
              <option value="Hà Nội">Hà Nội</option>
              <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
              <option value="Đà Nẵng">Đà Nẵng</option>
              <option value="Hải Phòng">Hải Phòng</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Tìm thấy <strong className="text-slate-900 dark:text-white font-semibold">{filteredCustomers.length}</strong> khách hàng
            </div>
            <button
              type="button"
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Thêm tài khoản mới</span>
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900 text-white dark:bg-slate-800 text-xs animate-in fade-in duration-150 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">Đã chọn {selectedIds.size} khách hàng</span>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer ml-1"
              >
                Bỏ chọn
              </button>
            </div>
            {canUpdate && onDeleteCustomers && (
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-medium cursor-pointer transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa đã chọn ({selectedIds.size})</span>
              </button>
            )}
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-6 h-6 animate-spin text-slate-900 dark:text-white" />
            </div>
          ) : paginatedCustomers.length === 0 ? (
            <div className="text-center py-20 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400">Danh sách khách hàng đang trống.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="p-2.5 w-8">
                    <input
                      type="checkbox"
                      checked={isAllPaginatedSelected}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                  </th>
                  <th className="p-2.5">User ID</th>
                  <th className="p-2.5">Họ và Tên</th>
                  <th className="p-2.5">Số Điện Thoại</th>
                  <th className="p-2.5">Tỉnh / Thành Phố</th>
                  <th className="p-2.5">Số Thiết Bị</th>
                  <th className="p-2.5">Trạng Thái</th>
                  <th className="p-2.5">Ngày Đăng Ký</th>
                  <th className="p-2.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {paginatedCustomers.map((cust) => {
                  const isViewing = viewCustomer?.id === cust.id;
                  const isChecked = selectedIds.has(cust.id);
                  return (
                    <tr
                      key={cust.id}
                      onClick={() => onSelectCustomer(cust)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-slate-100/70 dark:bg-slate-800/60"
                          : isViewing
                          ? "bg-slate-50 dark:bg-slate-800/40 border-l-2 border-slate-900 dark:border-white"
                          : ""
                      }`}
                    >
                      <td
                        className="p-2.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectCustomer(cust.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 font-mono text-slate-900 dark:text-white font-bold">{cust.id}</td>
                      <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{cust.fullName}</td>
                      <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{cust.phoneNumber}</td>
                      <td className="p-2.5 text-slate-600 dark:text-slate-300">{cust.province}</td>
                      <td className="p-2.5">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {cust.devices.length} TB
                        </span>
                      </td>
                      <td className="p-2.5">
                        {cust.isActive ? (
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Hoạt động
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Tạm khóa
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono text-slate-500 dark:text-slate-400">{cust.registeredAt}</td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectCustomer(viewCustomer?.id === cust.id ? null : cust);
                            }}
                            className={`text-[11px] px-2 py-1 rounded-md border font-semibold cursor-pointer transition-colors ${
                              isViewing
                                ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white"
                                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {isViewing ? "Đang xem" : "Chi tiết ➔"}
                          </button>
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditCustomer?.(cust);
                              }}
                              className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                              title="Chỉnh sửa thông tin khách hàng"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 15, 20, 50]}
          itemName="khách hàng"
        />
      </div>

      {/* Drawer Customer Details */}
      {viewCustomer && (
        <CustomerDetailModal
          customer={viewCustomer}
          onClose={() => onSelectCustomer(null)}
          canUpdate={canUpdate}
          onToggleStatus={onToggleStatus}
          onViewMatrix={onViewMatrix}
          onEditCustomer={onEditCustomer}
        />
      )}

      {/* Bulk Delete Modal */}
      <ConfirmDeleteModal
        isOpen={isBulkDeleteModalOpen}
        title="Xóa nhiều tài khoản khách hàng"
        itemName={`${selectedIds.size} khách hàng đã chọn`}
        itemType="khách hàng"
        description={`Bạn có chắc chắn muốn xóa ${selectedIds.size} tài khoản khách hàng đã chọn? Hành động này sẽ gỡ bỏ dữ liệu tài khoản khỏi hệ thống.`}
        isDeleting={isBulkDeleting}
        onConfirm={handleConfirmBulkDelete}
        onClose={() => setIsBulkDeleteModalOpen(false)}
      />
    </div>
  );
}
