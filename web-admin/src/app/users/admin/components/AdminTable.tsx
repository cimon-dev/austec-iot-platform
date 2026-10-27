"use client";

import React from "react";
import { Edit, Trash2 } from "lucide-react";
import { AdminUser } from "../types";
import { Pagination } from "@/components/Pagination";

interface AdminTableProps {
  admins: AdminUser[];
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (admin: AdminUser) => void;
  onDelete: (admin: AdminUser) => void;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export const AdminTable: React.FC<AdminTableProps> = ({
  admins,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}) => {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs min-w-[760px]">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px] tracking-wider">
            <tr>
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
                <td colSpan={8} className="p-8 text-center text-slate-400">
                  Không tìm thấy cán bộ quản trị nào khớp với điều kiện tìm kiếm.
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr
                  key={admin.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="p-2.5 font-mono text-indigo-600 dark:text-indigo-400 font-bold">
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
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
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
                          className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                          title="Sửa thông tin"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(admin)}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Xóa cán bộ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
    </div>
  );
};
