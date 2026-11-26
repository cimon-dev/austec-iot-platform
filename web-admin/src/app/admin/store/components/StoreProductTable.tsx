"use client";

import React, { useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import { ProductItem } from "../types";
import { ImageZoomModal } from "@/components/ImageZoomModal";

interface StoreProductTableProps {
  products: ProductItem[];
  selectedProduct: ProductItem | null;
  onSelectProduct: (product: ProductItem) => void;
  onOpenEditModal: (product: ProductItem) => void;
  onDeleteProduct: (product: { id: string; name: string }) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
  isLoading?: boolean;
}

export const StoreProductTable: React.FC<StoreProductTableProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
  onOpenEditModal,
  onDeleteProduct,
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  isLoading = false,
}) => {
  const [zoomImage, setZoomImage] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: "",
    title: "",
  });

  const isAllSelected = products.length > 0 && selectedIds.length === products.length;

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left text-xs min-w-[750px]">
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px] tracking-wider">
          <tr>
            {onToggleSelect && (
              <th className="p-2.5 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onSelectAll}
                  className="rounded border-slate-300 dark:border-slate-600 text-slate-900 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                  title="Chọn tất cả"
                />
              </th>
            )}
            <th className="p-2.5">Sản Phẩm</th>
            <th className="p-2.5">Phân Loại</th>
            <th className="p-2.5">Giá Bán</th>
            <th className="p-2.5">Tồn Kho</th>
            <th className="p-2.5">Đặc Điểm Nổi Bật</th>
            <th className="p-2.5">Trạng Thái</th>
            <th className="p-2.5 text-right">Thao Tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
          {isLoading ? (
            <tr>
              <td colSpan={onToggleSelect ? 8 : 7} className="p-10 text-center text-slate-400">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs">Đang tải danh sách sản phẩm...</span>
                </div>
              </td>
            </tr>
          ) : products.length === 0 ? (
            <tr>
              <td colSpan={onToggleSelect ? 8 : 7} className="p-10 text-center text-slate-400">
                <p className="text-xs">Chưa có sản phẩm nào trong gian hàng.</p>
              </td>
            </tr>
          ) : (
            products.map((prod) => {
              const isSelected = selectedProduct?.id === prod.id;
              const isChecked = selectedIds.includes(prod.id);
              return (
                <tr
                  key={prod.id}
                  onClick={() => onSelectProduct(prod)}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                    isChecked
                      ? "bg-slate-100 dark:bg-slate-800/80"
                      : isSelected
                      ? "bg-slate-50 dark:bg-slate-800/50 border-l-2 border-slate-900 dark:border-white"
                      : ""
                  }`}
                >
                  {onToggleSelect && (
                    <td className="p-2.5 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleSelect(prod.id)}
                        className="rounded border-slate-300 dark:border-slate-600 text-slate-900 focus:ring-0 cursor-pointer w-3.5 h-3.5"
                      />
                    </td>
                  )}
                  <td className="p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          if (prod.imageUrl) {
                            setZoomImage({ isOpen: true, url: prod.imageUrl, title: prod.name });
                          }
                        }}
                        className="relative w-10 h-10 rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 cursor-zoom-in group"
                        title="Bấm để phóng to ảnh"
                      >
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">{prod.name}</div>
                        <div className="text-[10px] font-mono text-slate-500 font-bold">{prod.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-2.5">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {prod.category}
                    </span>
                  </td>
                  <td className="p-2.5">
                    <div className="font-mono font-bold text-slate-900 dark:text-white">
                      {prod.price.toLocaleString("vi-VN")} đ
                    </div>
                    {prod.originalPrice && prod.originalPrice > prod.price && (
                      <div className="text-[10px] font-mono text-slate-400 line-through">
                        {prod.originalPrice.toLocaleString("vi-VN")} đ
                      </div>
                    )}
                  </td>
                  <td className="p-2.5 font-mono">
                    <span
                      className={`font-bold ${
                        prod.stock < 10 ? "text-rose-500" : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {prod.stock} cái
                    </span>
                  </td>
                  <td className="p-2.5 max-w-[220px]">
                    <div className="flex flex-wrap gap-1">
                      {prod.highlights.slice(0, 2).map((h, i) => (
                        <span
                          key={i}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                        prod.status === "ACTIVE"
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent"
                          : prod.status === "OUT_OF_STOCK"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                      }`}
                    >
                      {prod.status === "ACTIVE"
                        ? "ĐANG BÁN"
                        : prod.status === "OUT_OF_STOCK"
                        ? "HẾT HÀNG"
                        : "NGỪNG BÁN"}
                    </span>
                  </td>
                  <td className="p-2.5 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onOpenEditModal(prod)}
                        className="p-1 rounded text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 hover:bg-amber-100 dark:hover:bg-amber-900/60 cursor-pointer transition-colors"
                        title="Chỉnh sửa sản phẩm"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteProduct({ id: prod.id, name: prod.name })}
                        className="p-1 rounded text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 dark:hover:bg-rose-900/60 cursor-pointer transition-colors"
                        title="Xóa sản phẩm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {zoomImage.isOpen && (
        <ImageZoomModal
          isOpen={zoomImage.isOpen}
          imageUrl={zoomImage.url}
          altText={zoomImage.title}
          title={zoomImage.title}
          onClose={() => setZoomImage({ isOpen: false, url: "", title: "" })}
        />
      )}
    </div>
  );
};

