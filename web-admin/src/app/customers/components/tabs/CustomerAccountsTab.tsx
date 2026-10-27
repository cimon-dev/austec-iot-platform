"use client";

import React, { useState, useMemo } from "react";
import { Search, UserPlus, Edit3 } from "lucide-react";
import { CustomerAccount } from "../../types";
import { Pagination } from "@/components/Pagination";
import { CustomerDetailModal } from "../modals/CustomerDetailModal";

interface CustomerAccountsTabProps {
  customers: CustomerAccount[];
  viewCustomer: CustomerAccount | null;
  onSelectCustomer: (cust: CustomerAccount | null) => void;
  canUpdate: boolean;
  onToggleStatus: (id: string) => void;
  onOpenAddModal: () => void;
  onViewMatrix: (ownerId: string) => void;
  onEditCustomer?: (cust: CustomerAccount) => void;
}

export function CustomerAccountsTab({
  customers,
  viewCustomer,
  onSelectCustomer,
  canUpdate,
  onToggleStatus,
  onOpenAddModal,
  onViewMatrix,
  onEditCustomer,
}: CustomerAccountsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-xs pl-7 pr-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white w-56 focus:outline-none focus:border-purple-500"
              />
            </div>
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
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
              Tìm thấy <strong className="text-purple-600 dark:text-purple-400">{filteredCustomers.length}</strong> khách hàng
            </div>
            <button
              type="button"
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Thêm Tài Khoản Mới</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px] tracking-wider">
              <tr>
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
                const isSelected = viewCustomer?.id === cust.id;
                return (
                  <tr
                    key={cust.id}
                    onClick={() => onSelectCustomer(cust)}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                      isSelected ? "bg-purple-50/70 dark:bg-purple-950/40 border-l-2 border-purple-500" : ""
                    }`}
                  >
                    <td className="p-2.5 font-mono text-purple-600 dark:text-purple-400 font-bold">{cust.id}</td>
                    <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{cust.fullName}</td>
                    <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{cust.phoneNumber}</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{cust.province}</td>
                    <td className="p-2.5">
                      <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/20">
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
                            isSelected
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-purple-600 dark:text-purple-400 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          {isSelected ? "Đang xem" : "Chi tiết ➔"}
                        </button>
                        {canUpdate && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditCustomer?.(cust);
                            }}
                            className="p-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 cursor-pointer transition-colors"
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
    </div>
  );
}
