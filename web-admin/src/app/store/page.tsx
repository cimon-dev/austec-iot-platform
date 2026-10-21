"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  X, 
  Check, 
  Tag, 
  Cpu, 
  Layers, 
  ShieldCheck, 
  Boxes, 
  DollarSign, 
  Image as ImageIcon,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Filter
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";

export interface ProductItem {
  id: string;
  name: string;
  category: "DOOR" | "LOCK" | "CAMERA" | "SENSOR" | "UPS" | "ACCESSORY";
  price: number;
  originalPrice?: number;
  imageUrl: string;
  description: string;
  highlights: string[];
  specs: Record<string, string>;
  stock: number;
  status: "ACTIVE" | "OUT_OF_STOCK" | "DISCONTINUED";
  isFeatured?: boolean;
}

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
      "Bảo hành xuất xưởng": "24 tháng chính hãng"
    },
    stock: 45,
    status: "ACTIVE",
    isFeatured: true
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
      "Bảo hành xuất xưởng": "36 tháng 1 đổi 1"
    },
    stock: 80,
    status: "ACTIVE",
    isFeatured: true
  },
  {
    id: "PROD-UPS-SINE",
    name: "Bộ Lưu Điện Cửa Cuốn Sóng Sin Chuẩn Austec Sine Pro 220V",
    category: "UPS",
    price: 3650000,
    originalPrice: 4200000,
    imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80",
    description: "Bộ lưu điện chuyên dụng cho motor cửa cuốn tải nặng, đầu ra sóng Sin chuẩn bảo vệ bo mạch, thời gian lưu điện lên tới 48 giờ liên tục khi mất điện lưới.",
    highlights: ["Sóng Sin chuẩn 100%", "Thời gian chờ 48 giờ", "Tự động xả sạc bảo dưỡng bình", "Bảo vệ quá dòng / quá áp"],
    specs: {
      "Công suất danh định": "1200VA / 900W",
      "Điện áp đầu vào": "165V - 245V AC",
      "Điện áp đầu ra": "220V AC ± 3% (Pure Sine Wave)",
      "Ắc quy": "2 x 12V / 9Ah kín khí chống cháy",
      "Thời gian chuyển mạch": "< 5 mili giây",
      "Thời gian lưu điện": "Chờ 48h - Đóng mở 15-20 lần",
      "Bảo hành xuất xưởng": "18 tháng đổi mới"
    },
    stock: 60,
    status: "ACTIVE"
  },
  {
    id: "PROD-CAM-VISION",
    name: "Camera Giám Sát An Ninh AI 360 Austec Vision 4K UltraHD",
    category: "CAMERA",
    price: 1850000,
    originalPrice: 2300000,
    imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80",
    description: "Camera an ninh ngoài trời xoay 360 độ quay quét ban đêm có màu, AI phân tích chuyển động người và xe, còi báo động xua đuổi xâm nhập thời gian thực.",
    highlights: ["Độ phân giải 4K 8MP", "Xoay ngang 355° - Dọc 90°", "Ban đêm có màu Full Color", "Đàm thoại 2 chiều to rõ"],
    specs: {
      "Độ phân giải": "4K (3840 x 2160) @ 25fps",
      "Góc quay": "Ngang 355 độ, Dọc 90 độ",
      "Tầm nhìn ban đêm": "Hồng ngoại 30m / Đèn rọi có màu 20m",
      "Chuẩn kháng nước": "IP67 chống chịu thời tiết mưa bão",
      "Kết nối": "Wi-Fi Dual Band 2.4G/5GHz + Cổng LAN RJ45",
      "Lưu trữ": "Thẻ nhớ MicroSD 256GB / Cloud Austec",
      "Bảo hành xuất xưởng": "24 tháng chính hãng"
    },
    stock: 120,
    status: "ACTIVE"
  },
  {
    id: "PROD-SENSOR-M1",
    name: "Cảm Biến Môi Trường Đa Năng Zigbee 3.0 Austec MultiSensor M1",
    category: "SENSOR",
    price: 650000,
    originalPrice: 850000,
    imageUrl: "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80",
    description: "Cảm biến nhiệt độ, độ ẩm không khí và cảnh báo khói cháy thông minh, kết nối Zigbee 3.0 phản hồi siêu tốc, màn hình hiển thị E-Ink tiết kiệm pin.",
    highlights: ["Đo nhiệt độ ±0.2°C", "Đo độ ẩm ±2% RH", "Màn hình E-Ink sắc nét", "Pin dùng 2 năm liên tục"],
    specs: {
      "Giao thức kết nối": "Zigbee 3.0 / Bluetooth BLE",
      "Dải đo nhiệt độ": "-10°C đến +60°C",
      "Dải đo độ ẩm": "0% đến 99% RH",
      "Loại pin": "CR2450 (Thời lượng pin 24 tháng)",
      "Kích thước": "60 x 60 x 14 mm",
      "Tương thích": "Austec IoT Gateway Hub",
      "Bảo hành xuất xưởng": "12 tháng đổi mới"
    },
    stock: 200,
    status: "ACTIVE"
  }
];

function StoreContent() {
  const { t, language } = useLanguage();
  const { canView, canUpdate, canCreate, canDelete } = usePermissions();

  const [products, setProducts] = useState<ProductItem[]>(INITIAL_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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
    specsRows: [{ key: "Chất liệu", value: "Hợp kim nhôm" }, { key: "Bảo hành xuất xưởng", value: "24 tháng" }]
  });

  // Hydrate products from Backend
  useEffect(() => {
    fetch("http://localhost:4000/api/admin/products", {
      headers: { "Authorization": "Bearer austec-admin-super-token" }
    })
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.products) && res.products.length > 0) {
          setProducts(res.products);
        }
      })
      .catch(() => {});
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        Object.entries(p.specs).some(([k, v]) => k.toLowerCase().includes(q) || v.toLowerCase().includes(q));

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
        { key: "Bảo hành xuất xưởng", value: "24 tháng chính hãng" }
      ]
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (p: ProductItem) => {
    setModalMode("EDIT");
    const specsArray = Object.entries(p.specs).map(([key, value]) => ({ key, value }));
    setProductForm({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      originalPrice: p.originalPrice || p.price,
      imageUrl: p.imageUrl,
      description: p.description,
      highlightsText: p.highlights.join(", "),
      stock: p.stock,
      status: p.status,
      specsRows: specsArray.length > 0 ? specsArray : [{ key: "Bảo hành", value: "24 tháng" }]
    });
    setIsModalOpen(true);
  };

  // Handle Spec Rows
  const handleAddSpecRow = () => {
    setProductForm({
      ...productForm,
      specsRows: [...productForm.specsRows, { key: "", value: "" }]
    });
  };

  const handleRemoveSpecRow = (idx: number) => {
    setProductForm({
      ...productForm,
      specsRows: productForm.specsRows.filter((_, i) => i !== idx)
    });
  };

  const handleUpdateSpecRow = (idx: number, field: "key" | "value", val: string) => {
    const updated = [...productForm.specsRows];
    updated[idx][field] = val;
    setProductForm({ ...productForm, specsRows: updated });
  };

  // Submit Save Product (Create or Edit)
  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) {
      alert("Vui lòng nhập tên sản phẩm!");
      return;
    }

    const specsObj: Record<string, string> = {};
    productForm.specsRows.forEach(row => {
      if (row.key.trim()) {
        specsObj[row.key.trim()] = row.value.trim();
      }
    });

    const highlightsList = productForm.highlightsText
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const savedProduct: ProductItem = {
      id: productForm.id,
      name: productForm.name.trim(),
      category: productForm.category,
      price: Number(productForm.price),
      originalPrice: Number(productForm.originalPrice),
      imageUrl: productForm.imageUrl.trim() || "https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop&q=80",
      description: productForm.description.trim(),
      highlights: highlightsList,
      specs: specsObj,
      stock: Number(productForm.stock),
      status: productForm.status
    };

    if (modalMode === "CREATE") {
      setProducts([savedProduct, ...products]);
      fetch("http://localhost:4000/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer austec-admin-super-token"
        },
        body: JSON.stringify(savedProduct)
      }).catch(() => {});
      showToast(`Đã thêm sản phẩm "${savedProduct.name}" vào gian hàng!`);
    } else {
      setProducts(prev => prev.map(p => p.id === savedProduct.id ? savedProduct : p));
      fetch(`http://localhost:4000/api/admin/products/${savedProduct.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer austec-admin-super-token"
        },
        body: JSON.stringify(savedProduct)
      }).catch(() => {});
      if (selectedProduct?.id === savedProduct.id) {
        setSelectedProduct(savedProduct);
      }
      showToast(`Đã cập nhật thông tin sản phẩm "${savedProduct.name}"!`);
    }

    setIsModalOpen(false);
  };

  // Delete Product
  const handleDeleteProduct = (productId: string, productName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${productName}" khỏi gian hàng?`)) {
      return;
    }

    setProducts(prev => prev.filter(p => p.id !== productId));
    if (selectedProduct?.id === productId) {
      setSelectedProduct(null);
    }

    fetch(`http://localhost:4000/api/admin/products/${productId}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer austec-admin-super-token" }
    }).catch(() => {});

    showToast(`Đã xóa sản phẩm "${productName}" khỏi gian hàng`);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Quản Lý Gian Hàng & Thông Số Kỹ Thuật Xuất Xưởng
              </h1>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                Catalog & Specs Hub
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Quản lý danh mục sản phẩm thương phẩm, hình ảnh, thông số kỹ thuật xuất xưởng đồng bộ thời gian thực với Mobile App
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-3 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Sản Phẩm Mới</span>
        </button>
      </div>

      {/* Main Content Split Pane */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2.5 overflow-hidden">
        {/* Products Table & Filters */}
        <div className="flex-1 min-w-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Filter Toolbar */}
          <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, thông số, mã..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs pl-7 pr-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white w-56 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ALL">Mọi danh mục</option>
                <option value="DOOR">Cửa cuốn thông minh</option>
                <option value="LOCK">Khóa Masaru chuẩn Nhật</option>
                <option value="CAMERA">Camera An Ninh AI</option>
                <option value="SENSOR">Cảm biến môi trường</option>
                <option value="UPS">Bộ lưu điện Sin chuẩn</option>
                <option value="ACCESSORY">Phụ kiện IoT</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="ALL">Mọi trạng thái</option>
                <option value="ACTIVE">Đang kinh doanh</option>
                <option value="OUT_OF_STOCK">Tạm hết hàng</option>
                <option value="DISCONTINUED">Ngừng sản xuất</option>
              </select>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Hiển thị <strong className="text-cyan-600 dark:text-cyan-400">{filteredProducts.length}</strong> sản phẩm
            </div>
          </div>

          {/* Table */}
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
                {filteredProducts.map((prod) => {
                  const isSelected = selectedProduct?.id === prod.id;
                  return (
                    <tr
                      key={prod.id}
                      onClick={() => setSelectedProduct(prod)}
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
                        <span className={`font-bold ${prod.stock < 10 ? "text-rose-500" : "text-slate-700 dark:text-slate-300"}`}>
                          {prod.stock} cái
                        </span>
                      </td>
                      <td className="p-2.5 max-w-[220px]">
                        <div className="flex flex-wrap gap-1">
                          {prod.highlights.slice(0, 2).map((h, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 truncate">
                              {h}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-2.5">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          prod.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : prod.status === "OUT_OF_STOCK"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                        }`}>
                          {prod.status === "ACTIVE" ? "ĐANG BÁN" : prod.status === "OUT_OF_STOCK" ? "HẾT HÀNG" : "NGỪNG BÁN"}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-1 rounded text-cyan-600 hover:text-cyan-800 dark:hover:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 cursor-pointer"
                            title="Chỉnh sửa sản phẩm"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
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
        </div>

        {/* Product Details Inspector Drawer */}
        {selectedProduct && (
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
                onClick={() => setSelectedProduct(null)}
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
                  onClick={() => handleOpenEditModal(selectedProduct)}
                  className="flex-1 py-2 px-3 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Sửa Thông Số & Giá</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL: CREATE / EDIT PRODUCT */}
      {/* ===================================================================== */}
      {isModalOpen && (
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
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveProductSubmit} className="p-3.5 space-y-3 overflow-y-auto flex-1 text-xs">
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
                  URL Hình ảnh sản phẩm *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://images.unsplash.com/..."
                  value={productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-mono"
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
                  onClick={() => setIsModalOpen(false)}
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
      )}
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
