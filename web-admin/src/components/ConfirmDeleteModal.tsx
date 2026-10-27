"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title?: string;
  itemName?: string;
  itemType?: string;
  description?: string;
  isDeleting?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title = "Xác nhận xóa dữ liệu",
  itemName,
  itemType = "mục này",
  description,
  isDeleting = false,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 space-y-4">
          {/* Header with Danger Accent */}
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {title}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {description ? (
                  description
                ) : (
                  <>
                    Hành động này sẽ xóa vĩnh viễn {itemType}{" "}
                    {itemName && (
                      <span className="font-semibold text-rose-600 dark:text-rose-400">
                        &quot;{itemName}&quot;
                      </span>
                    )}{" "}
                    khỏi hệ thống và không thể hoàn tác.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={onConfirm}
              className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg text-white bg-rose-600 hover:bg-rose-500 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xóa...</span>
                </>
              ) : (
                <span>Xác nhận xóa</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
