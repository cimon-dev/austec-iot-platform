"use client";

import React from "react";
import { X, Edit } from "lucide-react";
import { ProductItem } from "../types";

interface ProductDetailDrawerProps {
  selectedProduct: ProductItem | null;
  onClose: () => void;
  onOpenEditModal: (product: ProductItem) => void;
}

export function ProductDetailDrawer({
  selectedProduct,
  onClose,
  onOpenEditModal,
}: ProductDetailDrawerProps) {
  if (!selectedProduct) return null;

  return (
    <div className="w-full md:w-96 shrink-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
      <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold uppercase">
            Thông Số Kỹ Thuật Xuất Xưởng
          </span>
          <h3 className="font-bold text-slate-900 dark:text-white text-xs truncate">{selectedProduct.name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto flex-1 text-xs">
        {/* Product Photo Banner */}
        <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video bg-slate-950">
          <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-white">
            Mã: {selectedProduct.id}
          </div>
        </div>

        {/* Price & Category */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Giá bán chính thức:</span>
            <span className="font-mono text-sm font-bold text-cyan-600 dark:text-cyan-400">
              {selectedProduct.price.toLocaleString("vi-VN")} đ
            </span>
          </div>
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500">Số lượng sẵn có:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedProduct.stock} sản phẩm</span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mô Tả Sản Phẩm</div>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
            {selectedProduct.description}
          </p>
        </div>

        {/* Highlights */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Đặc Điểm Vượt Trội</div>
          <div className="flex flex-wrap gap-1.5">
            {selectedProduct.highlights.map((h, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                ✓ {h}
              </span>
            ))}
          </div>
        </div>

        {/* Factory Technical Specs Table */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Thông Số Xuất Xưởng (Specs)</span>
            <span className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400">Đồng bộ Mobile App</span>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {Object.entries(selectedProduct.specs).map(([specKey, specVal], idx) => (
              <div key={idx} className="p-2 flex justify-between items-start text-[11px] bg-white dark:bg-slate-900/50">
                <span className="text-slate-500 shrink-0 max-w-[40%] font-medium">{specKey}:</span>
                <span className="text-slate-900 dark:text-white text-right font-medium">{specVal}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenEditModal(selectedProduct)}
            className="flex-1 py-2 px-3 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Sửa Thông Số & Giá</span>
          </button>
        </div>
      </div>
    </div>
  );
}
