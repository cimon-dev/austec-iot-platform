"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, X, Loader2, Image as ImageIcon } from "lucide-react";
import { getApiBaseUrl } from "@/context/apiConfig";

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function ImageUploader({
  value,
  onChange,
  folder = "devices",
  label = "Hình ảnh",
  className = "",
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Dung lượng file không được vượt quá 10MB!");
      return;
    }

    // Validate type
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chỉ chọn file định dạng hình ảnh (PNG, JPG, WebP, SVG)!");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch(`${getApiBaseUrl()}/api/upload/image`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        onChange(data.url);
      } else {
        setError(data.error || "Lỗi khi tải ảnh lên Cloudflare R2!");
      }
    } catch (err: any) {
      setError("Không thể kết nối máy chủ tải ảnh: " + (err.message || "Lỗi mạng"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2 flex items-center gap-3">
          <div className="w-16 h-16 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200 dark:border-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback placeholder
                (e.target as HTMLImageElement).src =
                  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2264%22%20height%3D%2264%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%20preserveAspectRatio%3D%22none%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%2216%22%20y%3D%2236%22%20font-size%3D%2210%22%20fill%3D%22%23aaa%22%3ENo%20Img%3C%2Ftext%3E%3C%2Fsvg%3E";
              }}
            />
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <p className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
              {value}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Thay ảnh khác
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            title="Xóa ảnh"
            className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-lg p-4 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-50 dark:hover:bg-slate-800/40"
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-2 space-y-1">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <span className="text-xs font-medium text-slate-500">Đang tải lên Cloudflare R2...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-1 space-y-1">
              <div className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Nhấp để tải ảnh lên Cloudflare R2
              </p>
              <p className="text-[10px] text-slate-400">
                Hỗ trợ PNG, JPG, WebP, SVG (Tối đa 10MB)
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-[11px] font-medium text-rose-500 mt-1">{error}</p>
      )}
    </div>
  );
}
