"use client";

import React from "react";
import { Edit, Trash2 } from "lucide-react";
import { ProductItem } from "../types";

interface StoreProductTableProps {
  products: ProductItem[];
  selectedProduct: ProductItem | null;
  onSelectProduct: (product: ProductItem) => void;
  onOpenEditModal: (product: ProductItem) => void;
  onDeleteProduct: (product: { id: string; name: string }) => void;
}

export const StoreProductTable: React.FC<StoreProductTableProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
  onOpenEditModal,
  onDeleteProduct,
}) => {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left text-xs min-w-[700px]">
        <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px] tracking-wider">
          <tr>
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
          {products.map((prod) => {
            const isSelected = selectedProduct?.id === prod.id;
            return (
              <tr
                key={prod.id}
                onClick={() => onSelectProduct(prod)}
                className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                  isSelected ? "bg-cyan-50/70 dark:bg-cyan-950/40 border-l-2 border-cyan-500" : ""
                }`}
              >
                <td className="p-2.5">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="w-10 h-10 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-white truncate">{prod.name}</div>
                      <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">{prod.id}</div>
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
                        className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 truncate"
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
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
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
                      className="p-1 rounded text-cyan-600 hover:text-cyan-800 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 cursor-pointer"
                      title="Chỉnh sửa sản phẩm"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProduct({ id: prod.id, name: prod.name })}
                      className="p-1 rounded text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="Xóa sản phẩm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
