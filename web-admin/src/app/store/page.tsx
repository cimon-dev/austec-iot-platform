"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback } from "react";
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

const INITIAL_PRODUCTS: ProductItem[] = [
  {
    id: "PROD-A900",
    name: "Cửa Cuốn Khe Thoáng Austec Titadoor A900 Super",
    category: "DOOR",
    price: 18500000,
    originalPrice: 21000000,
    imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80",
    description: "Cửa cuốn nan nhôm khe thoáng công nghệ Đức cao cấp, motor biến tần không chổi than vận hành siêu êm, tích hợp bộ điều khiển IoT thông minh Austec Cloud.",
    highlights: ["Hợp kim nhôm 6063-T5", "Động cơ Inverter siêu êm", "Tự dừng khi gặp vật cản", "Cảm biến chống xô"],
    specs: {
      "Chất liệu": "Hợp kim nhôm định hình 6063-T5",
      "Độ dày nan": "1.3mm - 2.3mm",
      "Sơn tĩnh điện": "AkzoNobel chống phai màu 10 năm",
      "Điện áp hoạt động": "220V / 50Hz",
      "Tốc độ đóng mở": "15cm - 18cm / giây",
      "Tải trọng tối đa": "1000 kg",
      "Bảo hành xuất xưởng": "24 tháng chính hãng",
    },
    stock: 45,
    status: "ACTIVE",
    isFeatured: true,
  },
  {
    id: "PROD-MASARU-X1",
    name: "Khóa Thông Minh Nhận Diện Khuôn Mặt 3D Masaru Titan X1",
    category: "LOCK",
    price: 8900000,
    originalPrice: 10500000,
    imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80",
    description: "Khóa cửa thông minh cao cấp công nghệ Nhật Bản, nhận diện khuôn mặt 3D Face ID ngay cả trong bóng tối, vân tay FPC Thụy Điển 0.3s, quản lý OTP ảo qua app.",
    highlights: ["Nhận diện 3D Face ID", "Vân tay FPC Thụy Điển", "Thẻ từ & Mã số ảo", "Chống cạy phá báo động"],
    specs: {
      "Phương thức mở": "Khuôn mặt 3D, Vân tay, Mật khẩu, Thẻ từ, Chìa cơ, App",
      "Thời gian nhận diện": "< 0.3 giây",
      "Dung lượng lưu trữ": "100 Khuôn mặt, 100 Vân tay, 100 Thẻ từ",
      "Nguồn điện": "Pin sạc Lithium 5000mAh (Dùng 8-10 tháng)",
      "Cổng sạc khẩn cấp": "Type-C 5V",
      "Chuẩn khóa cơ": "Lõi inox 304 chuẩn an toàn cấp C",
      "Bảo hành xuất xưởng": "36 tháng 1 đổi 1",
    },
    stock: 80,
    status: "ACTIVE",
    isFeatured: true,
  },
];

function StoreContent() {
  const { canView } = usePermissions();

  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

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
      alert("Vui lòng nhập tên sản phẩm!");
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
      id: productForm.id,
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
      setProducts((prev) => [savedProduct, ...prev]);
      storeService.createProduct(savedProduct).catch(() => {});
      showToast(`Đã thêm sản phẩm "${savedProduct.name}" vào gian hàng!`);
    } else {
      setProducts((prev) => prev.map((p) => (p.id === savedProduct.id ? savedProduct : p)));
      storeService.updateProduct(savedProduct.id, savedProduct).catch(() => {});
      if (selectedProduct?.id === savedProduct.id) {
        setSelectedProduct(savedProduct);
      }
      showToast(`Đã cập nhật thông tin sản phẩm "${savedProduct.name}"!`);
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
      showToast(`Đã xóa sản phẩm "${deleteTarget.name}" khỏi gian hàng`);
    } catch (e: any) {
      showToast(`Lỗi khi xóa sản phẩm: ${e.message}`);
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-lg animate-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

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
