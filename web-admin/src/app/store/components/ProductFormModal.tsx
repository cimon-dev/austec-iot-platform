"use client";

import React from "react";
import { ShoppingBag, X, Plus, Trash2 } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";
import { ProductItem } from "../types";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  modalMode: "CREATE" | "EDIT";
  productForm: {
    id: string;
    name: string;
    category: ProductItem["category"];
    price: number;
    originalPrice?: number;
    imageUrl: string;
    description: string;
    highlightsText: string;
    stock: number;
    status: ProductItem["status"];
    specsRows: Array<{ key: string; value: string }>;
  };
  setProductForm: React.Dispatch<React.SetStateAction<any>>;
  handleAddSpecRow: () => void;
  handleUpdateSpecRow: (idx: number, field: "key" | "value", val: string) => void;
  handleRemoveSpecRow: (idx: number) => void;
}

export function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  modalMode,
  productForm,
  setProductForm,
  handleAddSpecRow,
  handleUpdateSpecRow,
  handleRemoveSpecRow,
}: ProductFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {modalMode === "CREATE" ? "Thêm Sản Phẩm Mới Vào Gian Hàng" : "Chỉnh Sửa Thông Tin & Specs Sản Phẩm"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={onSubmit} className="p-3.5 space-y-3 overflow-y-auto flex-1 text-xs">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Tên sản phẩm thương phẩm *
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Cửa cuốn Austec Titadoor A900 Super..."
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Mã sản phẩm (SKU) *
              </label>
              <input
                type="text"
                required
                disabled={modalMode === "EDIT"}
                placeholder="PROD-..."
                value={productForm.id}
                onChange={(e) => setProductForm({ ...productForm, id: e.target.value })}
                className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Phân loại danh mục
              </label>
              <select
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value as any })}
                className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="DOOR">Cửa cuốn thông minh</option>
                <option value="LOCK">Khóa Masaru chuẩn Nhật</option>
                <option value="CAMERA">Camera An Ninh AI</option>
                <option value="SENSOR">Cảm biến môi trường</option>
                <option value="UPS">Bộ lưu điện Sin chuẩn</option>
                <option value="ACCESSORY">Phụ kiện IoT</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Giá bán ưu đãi (VNĐ) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
                className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Số lượng tồn kho
              </label>
              <input
                type="number"
                min={0}
                value={productForm.stock}
                onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
                className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Hình ảnh sản phẩm (Cloudflare R2 Storage)
            </label>
            <ImageUploader
              folder="products"
              value={productForm.imageUrl}
              onChange={(url) => setProductForm({ ...productForm, imageUrl: url })}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Mô tả sản phẩm
            </label>
            <textarea
              rows={2}
              placeholder="Giới thiệu tính năng, ứng dụng công nghệ..."
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              className="w-full text-xs p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Đặc điểm nổi bật (Cách nhau bởi dấu phẩy)
            </label>
            <input
              type="text"
              placeholder="Hợp kim nhôm 6063-T5, Tự dừng vật cản, Động cơ Inverter..."
              value={productForm.highlightsText}
              onChange={(e) => setProductForm({ ...productForm, highlightsText: e.target.value })}
              className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Dynamic Technical Specs Builder */}
          <div className="space-y-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Thông Số Kỹ Thuật Xuất Xưởng (Key - Value Builder)
              </span>
              <button
                type="button"
                onClick={handleAddSpecRow}
                className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm thông số</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {productForm.specsRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Tên thông số (Vd: Chất liệu, Điện áp)"
                    value={row.key}
                    onChange={(e) => handleUpdateSpecRow(idx, "key", e.target.value)}
                    className="w-1/3 text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="Giá trị (Vd: Nhôm định hình 6063-T5, 220V/50Hz)"
                    value={row.value}
                    onChange={(e) => handleUpdateSpecRow(idx, "value", e.target.value)}
                    className="flex-1 text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecRow(idx)}
                    className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="Xóa dòng"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-xs cursor-pointer"
            >
              {modalMode === "CREATE" ? "Tạo Sản Phẩm" : "Lưu Thay Đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
