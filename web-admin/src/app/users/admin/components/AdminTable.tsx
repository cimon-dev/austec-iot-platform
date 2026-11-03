"use client";

import React, { useState } from "react";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { AdminUser } from "../types";
import { Pagination } from "@/components/Pagination";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

interface AdminTableProps {
  admins: AdminUser[];
  isLoading?: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (admin: AdminUser) => void;
  onDelete: (admin: AdminUser) => void;
  onBulkDelete?: (ids: (string | number)[]) => Promise<void>;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const AdminTable: React.FC<AdminTableProps> = ({
  admins,
  isLoading = false,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  onBulkDelete,
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const toggleSelect = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelected = admins.length > 0 && admins.every((a) => selectedIds.has(a.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        admins.forEach((a) => next.delete(a.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        admins.forEach((a) => next.add(a.id));
        return next;
      });
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.size === 0 || !onBulkDelete) return;
    setIsBulkDeleting(true);
    try {
      await onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    } finally {
      setIsBulkDeleting(false);
      setIsBulkDeleteModalOpen(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-300 font-medium">Đã chọn <strong>{selectedIds.size}</strong> cán bộ</span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 underline cursor-pointer ml-1"
            >
              Bỏ chọn
            </button>
          </div>
          {canDelete && onBulkDelete && (
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold cursor-pointer text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa đã chọn ({selectedIds.size})</span>
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-slate-900 dark:text-white" />
          </div>
        ) : (
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="p-2.5 w-8">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                </th>
                <th className="p-2.5">Mã NV</th>
                <th className="p-2.5">Họ và Tên</th>
                <th className="p-2.5">Email</th>
                <th className="p-2.5">Điện Thoại</th>
                <th className="p-2.5">Công Ty / Đơn Vị</th>
                <th className="p-2.5">Vai Trò</th>
                <th className="p-2.5">Người Cập Nhật</th>
                <th className="p-2.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
              {admins.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    Danh sách cán bộ quản trị đang trống.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => {
                  const isChecked = selectedIds.has(admin.id);
                  return (
                    <tr
                      key={admin.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isChecked ? "bg-slate-100/70 dark:bg-slate-800/60" : ""
                      }`}
                    >
                      <td className="p-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(admin.id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-slate-900 focus:ring-slate-900 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 font-mono text-slate-900 dark:text-white font-bold">
                        {admin.empID}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                        {admin.name || admin.fullName}
                      </td>
                      <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{admin.email}</td>
                      <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">
                        {admin.phone || admin.phoneNumber}
                      </td>
                      <td className="p-2.5 text-slate-700 dark:text-slate-300">
                        <div>{admin.company}</div>
                        <div className="text-[10px] text-slate-400">{admin.department}</div>
                      </td>
                      <td className="p-2.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                          {admin.role || admin.systemRole}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-[10px] text-slate-400">
                        <div>{admin.updatedBy}</div>
                        <div>{admin.updatedAt}</div>
                      </td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => onEdit(admin)}
                              className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                              title="Sửa thông tin"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(admin)}
                              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                              title="Xóa cán bộ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={[10, 15, 20, 50]}
        itemName="cán bộ"
      />

      {/* Bulk Delete Modal */}
      <ConfirmDeleteModal
        isOpen={isBulkDeleteModalOpen}
        title="Xóa nhiều cán bộ quản trị"
        itemName={`${selectedIds.size} cán bộ đã chọn`}
        itemType="cán bộ"
        description={`Bạn có chắc chắn muốn xóa ${selectedIds.size} cán bộ quản trị đã chọn? Hành động này sẽ gỡ bỏ tài khoản cán bộ khỏi hệ thống.`}
        isDeleting={isBulkDeleting}
        onConfirm={handleConfirmBulkDelete}
        onClose={() => setIsBulkDeleteModalOpen(false)}
      />
    </div>
  );
};

