"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback } from "react";
import { toast } from "sonner";
import { useLanguage } from "../../context/LanguageContext";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { ProductItem } from "./types";
import { storeService } from "./store-service";
import {
  StoreHeader,
  StoreFilterToolbar,
  StoreProductTable,
  ProductDetailDrawer,
  ProductFormModal,
} from "./components";

export type { ProductItem };

function StoreContent() {
  const { canView } = usePermissions();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");

  // Form State
  const [productForm, setProductForm] = useState({
    id: "",
    name: "",
    category: "DOOR" as ProductItem["category"],
    price: 1000000,
    originalPrice: 1200000,
    imageUrl: "",
    description: "",
    highlightsText: "",
    stock: 50,
    status: "ACTIVE" as ProductItem["status"],
    specsRows: [{ key: "Chất liệu", value: "Hợp kim nhôm" }, { key: "Bảo hành xuất xưởng", value: "24 tháng" }],
  });

  // Hydrate products from Backend
  useEffect(() => {
    storeService.getProducts().then((data) => {
      if (data && data.length > 0) {
        setProducts(data);
      }
    });
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        Object.entries(p.specs || {}).some(([k, v]) => k.toLowerCase().includes(q) || v.toLowerCase().includes(q));

      const matchCategory = selectedCategory === "ALL" || p.category === selectedCategory;
      const matchStatus = selectedStatus === "ALL" || p.status === selectedStatus;
      return matchSearch && matchCategory && matchStatus;
    });
  }, [products, searchQuery, selectedCategory, selectedStatus]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode("CREATE");
    setProductForm({
      id: `PROD-${Date.now().toString().slice(-6)}`,
      name: "",
      category: "DOOR",
      price: 15000000,
      originalPrice: 18000000,
      imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80",
      description: "",
      highlightsText: "Chính hãng Austec, Tiết kiệm điện, Bảo hành tận nơi",
      stock: 50,
      status: "ACTIVE",
      specsRows: [
        { key: "Chất liệu", value: "Hợp kim cao cấp" },
        { key: "Điện áp hoạt động", value: "220V / 50Hz" },
        { key: "Bảo hành xuất xưởng", value: "24 tháng chính hãng" },
      ],
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (p: ProductItem) => {
    setModalMode("EDIT");
    const specsArray = Object.entries(p.specs || {}).map(([key, value]) => ({ key, value }));
    setProductForm({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      originalPrice: p.originalPrice || p.price,
      imageUrl: p.imageUrl,
      description: p.description,
      highlightsText: (p.highlights || []).join(", "),
      stock: p.stock,
      status: p.status,
      specsRows: specsArray.length > 0 ? specsArray : [{ key: "Bảo hành", value: "24 tháng" }],
    });
    setIsModalOpen(true);
  };

  // Spec Rows Helpers
  const handleAddSpecRow = () => {
    setProductForm((prev) => ({
      ...prev,
      specsRows: [...prev.specsRows, { key: "", value: "" }],
    }));
  };

  const handleRemoveSpecRow = (idx: number) => {
    setProductForm((prev) => ({
      ...prev,
      specsRows: prev.specsRows.filter((_, i) => i !== idx),
    }));
  };

  const handleUpdateSpecRow = (idx: number, field: "key" | "value", val: string) => {
    setProductForm((prev) => {
      const updated = [...prev.specsRows];
      updated[idx][field] = val;
      return { ...prev, specsRows: updated };
    });
  };

  // Submit Save Product
  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      toast.error("Vui lòng nhập tên sản phẩm!");
      return;
    }

    const specsObj: Record<string, string> = {};
    productForm.specsRows.forEach((row) => {
      if (row.key.trim()) {
        specsObj[row.key.trim()] = row.value.trim();
      }
    });

    const highlightsList = productForm.highlightsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const savedProduct: ProductItem = {
      id: productForm.id || `PROD-${Date.now().toString().slice(-6)}`,
      name: productForm.name.trim(),
      category: productForm.category,
      price: Number(productForm.price),
      originalPrice: Number(productForm.originalPrice),
      imageUrl:
        productForm.imageUrl.trim() ||
        "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80",
      description: productForm.description.trim(),
      highlights: highlightsList,
      specs: specsObj,
      stock: Number(productForm.stock),
      status: productForm.status,
    };

    if (modalMode === "CREATE") {
      try {
        const res = await storeService.createProduct(savedProduct);
        if (res.success && res.product) {
          setProducts((prev) => [res.product!, ...prev]);
        } else {
          setProducts((prev) => [savedProduct, ...prev]);
        }
        toast.success(`Đã thêm sản phẩm "${savedProduct.name}" vào CSDL PostgreSQL!`);
      } catch (err: any) {
        toast.error(`Lỗi khi tạo sản phẩm: ${err.message}`);
      }
    } else {
      try {
        await storeService.updateProduct(savedProduct.id, savedProduct);
        setProducts((prev) => prev.map((p) => (p.id === savedProduct.id ? savedProduct : p)));
        if (selectedProduct?.id === savedProduct.id) {
          setSelectedProduct(savedProduct);
        }
        toast.success(`Đã cập nhật thông tin sản phẩm "${savedProduct.name}" vào PostgreSQL!`);
      } catch (err: any) {
        toast.error(`Lỗi cập nhật sản phẩm: ${err.message}`);
      }
    }

    setIsModalOpen(false);
  };

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await storeService.deleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      if (selectedProduct?.id === deleteTarget.id) {
        setSelectedProduct(null);
      }
      toast.success(`Đã xóa sản phẩm "${deleteTarget.name}" khỏi CSDL PostgreSQL thành công!`);
    } catch (e: any) {
      toast.error(`Lỗi khi xóa sản phẩm: ${e.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (!canView("mod_dev")) {
    return (
      <AccessDenied
        moduleTitle="Quản Lý Gian Hàng & Sản Phẩm Xuất Xưởng"
        requiredPermission="Quyền truy cập Phân hệ Thiết bị & Thương mại (mod_dev)"
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-slate-100 dark:bg-slate-950 p-2.5 space-y-2.5">


      {/* Top Header */}
      <StoreHeader onOpenCreateModal={handleOpenCreateModal} />

      {/* Main Content Split Pane */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2.5 overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <StoreFilterToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            totalFiltered={filteredProducts.length}
          />

          <StoreProductTable
            products={filteredProducts}
            selectedProduct={selectedProduct}
            onSelectProduct={setSelectedProduct}
            onOpenEditModal={handleOpenEditModal}
            onDeleteProduct={setDeleteTarget}
          />
        </div>

        <ProductDetailDrawer
          selectedProduct={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onOpenEditModal={handleOpenEditModal}
        />
      </div>

      {/* Product Create / Edit Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveProductSubmit}
        modalMode={modalMode}
        productForm={productForm}
        setProductForm={setProductForm}
        handleAddSpecRow={handleAddSpecRow}
        handleUpdateSpecRow={handleUpdateSpecRow}
        handleRemoveSpecRow={handleRemoveSpecRow}
      />

      {/* Standardized Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Xóa Sản Phẩm Khỏi Gian Hàng"
        itemName={deleteTarget?.name}
        itemType="sản phẩm"
        description="Thao tác này sẽ đồng bộ gỡ bỏ sản phẩm khỏi CSDL PostgreSQL và ứng dụng di động."
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default function StoreManagementPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-500 font-mono">Đang tải gian hàng...</div>}>
      <StoreContent />
    </Suspense>
  );
}
