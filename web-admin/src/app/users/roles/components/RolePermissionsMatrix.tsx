"use client";

import React, { useState } from "react";
import { Save, RotateCcw, Edit, Check, X, Shield } from "lucide-react";
import { RoleItem } from "../types";

interface RolePermissionsMatrixProps {
  currentRole: RoleItem | null;
  canUpdate: boolean;
  isSaving: boolean;
  onTogglePermission: (
    roleId: number,
    moduleId: string,
    field: "all" | "create" | "update" | "delete" | "view"
  ) => void;
  onRenameRole: (roleId: number, newName: string) => void;
  onSaveRoles: () => void;
  onResetDefault: () => void;
}

export const RolePermissionsMatrix: React.FC<RolePermissionsMatrixProps> = ({
  currentRole,
  canUpdate,
  isSaving,
  onTogglePermission,
  onRenameRole,
  onSaveRoles,
  onResetDefault,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameText, setNameText] = useState("");

  if (!currentRole) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-400">
        <Shield className="w-10 h-10 mb-2 opacity-50" />
        <p className="text-xs">Chọn một vai trò ở danh sách bên trái để cấu hình phân quyền.</p>
      </div>
    );
  }

  const handleStartRename = () => {
    setNameText(currentRole.name);
    setIsEditingName(true);
  };

  const handleSaveRename = () => {
    if (nameText.trim() && nameText.trim() !== currentRole.name) {
      onRenameRole(currentRole.id, nameText.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={nameText}
                onChange={(e) => setNameText(e.target.value)}
                className="text-xs px-2 py-1 rounded border border-indigo-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveRename}
                className="p-1 rounded bg-indigo-600 text-white cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="p-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Ma Trận: {currentRole.name}
              </h2>
              {canUpdate && !currentRole.isSystem && (
                <button
                  type="button"
                  onClick={handleStartRename}
                  className="p-1 rounded text-slate-400 hover:text-indigo-600 cursor-pointer"
                  title="Đổi tên vai trò"
                >
                  <Edit className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {canUpdate && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetDefault}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Mặc định</span>
            </button>
            <button
              type="button"
              onClick={onSaveRoles}
              disabled={isSaving}
              className="flex items-center gap-1 px-3 py-1 rounded text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3 h-3" />
              <span>{isSaving ? "Đang lưu..." : "Lưu Thay Đổi"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Permissions Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left text-xs min-w-[600px]">
          <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px] tracking-wider">
            <tr>
              <th className="p-2.5">Phân Hệ Chức Năng (Module)</th>
              <th className="p-2.5 text-center w-20">Tất Cả</th>
              <th className="p-2.5 text-center w-20">Xem (View)</th>
              <th className="p-2.5 text-center w-20">Tạo (Create)</th>
              <th className="p-2.5 text-center w-20">Sửa (Update)</th>
              <th className="p-2.5 text-center w-20">Xóa (Delete)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
            {currentRole.permissions.map((perm) => (
              <tr key={perm.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="p-2.5 font-medium text-slate-900 dark:text-white">
                  <div className="text-xs">{perm.name}</div>
                  <div className="text-[10px] font-mono text-slate-400">{perm.id}</div>
                </td>
                <td className="p-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={perm.all}
                    disabled={!canUpdate}
                    onChange={() => onTogglePermission(currentRole.id, perm.id, "all")}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer disabled:opacity-50"
                  />
                </td>
                <td className="p-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={perm.view}
                    disabled={!canUpdate}
                    onChange={() => onTogglePermission(currentRole.id, perm.id, "view")}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer disabled:opacity-50"
                  />
                </td>
                <td className="p-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={perm.create}
                    disabled={!canUpdate}
                    onChange={() => onTogglePermission(currentRole.id, perm.id, "create")}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer disabled:opacity-50"
                  />
                </td>
                <td className="p-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={perm.update}
                    disabled={!canUpdate}
                    onChange={() => onTogglePermission(currentRole.id, perm.id, "update")}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer disabled:opacity-50"
                  />
                </td>
                <td className="p-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={perm.delete}
                    disabled={!canUpdate}
                    onChange={() => onTogglePermission(currentRole.id, perm.id, "delete")}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer disabled:opacity-50"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
