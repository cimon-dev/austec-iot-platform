"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCustomerAuth } from "@/customer/context/CustomerAuthContext";
import { DEFAULT_STORE_PRODUCTS } from "@/customer/context/CustomerIoTContext";
import { customerApi } from "@/customer/services/customer-api-client";
import {
  ProductItem,
  ProductReviewStats,
  ShopReviewItem,
} from "@/customer/types/device";
import {
  ShoppingBag,
  Star,
  Search,
  MessageSquare,
  CheckCircle2,
  X,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";

function formatVnd(price: number): string {
  return `${Number(price || 0).toLocaleString("vi-VN")} đ`;
}

export default function CustomerShopPage() {
  const router = useRouter();
  const { user } = useCustomerAuth();

  const [products, setProducts] = useState<ProductItem[]>(DEFAULT_STORE_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeProduct, setActiveProduct] = useState<ProductItem | null>(null);

  // Reviews inside modal
  const [reviews, setReviews] = useState<ShopReviewItem[]>([]);
  const [reviewStats, setReviewStats] = useState<ProductReviewStats | null>(null);
  const [myRating, setMyRating] = useState<number>(5);
  const [myComment, setMyComment] = useState<string>("");
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Order modal
  const [orderingProduct, setOrderingProduct] = useState<ProductItem | null>(null);
  const [orderPhone, setOrderPhone] = useState(user?.phoneNumber || "");
  const [orderAddress, setOrderAddress] = useState(user?.address || "");
  const [orderNote, setOrderNote] = useState("");
  const [orderQty, setOrderQty] = useState(1);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      const res = await customerApi.get("/api/shop/products");
      const rawList = res.products || res.data?.products;
      if (res.success && Array.isArray(rawList) && rawList.length > 0) {
        const mapped: ProductItem[] = rawList.map((p: any) => ({
          id: String(p.id),
          name: String(p.name || "Sản phẩm Austec"),
          categoryTag: String(p.category || p.categoryTag || "Thiết bị thông minh"),
          subtitle: String(p.subtitle || p.description || ""),
          price: Number(p.price || 0),
          originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
          rating: Number(p.rating || 4.9),
          reviewsCount: Number(p.reviewsCount || 24),
          imagePath: p.imageUrl || p.imagePath || "/logo-app.webp",
          warrantyText: String(p.warrantyText || "Bảo hành chính hãng 24 tháng"),
          highlights: Array.isArray(p.highlights)
            ? p.highlights
            : ["Chính hãng Austec 100%", "Hỗ trợ điều khiển từ xa trên App & Web"],
          specs:
            p.specs && typeof p.specs === "object"
              ? p.specs
              : { "Thương hiệu": "AUSTEC", "Bảo hành": "24 tháng" },
        }));
        setProducts(mapped);
      }
    };
    loadProducts();
  }, []);

  const loadReviews = async (prodId: string) => {
    const res = await customerApi.get(
      `/api/shop/products/${encodeURIComponent(prodId)}/reviews`
    );
    const list = res.reviews || res.data?.reviews || [];
    setReviews(Array.isArray(list) ? list : []);
    if (res.stats || res.averageRating !== undefined) {
      setReviewStats({
        averageRating: Number(res.stats?.averageRating ?? res.averageRating ?? 0),
        totalReviews: Number(res.stats?.totalReviews ?? res.totalReviews ?? list.length),
        ratingCounts: res.stats?.ratingCounts || res.ratingCounts || {},
      });
    } else {
      setReviewStats(null);
    }
  };

  useEffect(() => {
    if (activeProduct) {
      setEditingReviewId(null);
      setMyComment("");
      setMyRating(5);
      loadReviews(activeProduct.id);
    }
  }, [activeProduct?.id]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => s.add(p.categoryTag));
    return Array.from(s);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== "ALL" && p.categoryTag !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.categoryTag.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct || !myComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      const res = editingReviewId
        ? await customerApi.put(
            `/api/shop/products/${encodeURIComponent(
              activeProduct.id
            )}/reviews/${encodeURIComponent(editingReviewId)}`,
            {
              rating: myRating,
              comment: myComment.trim(),
            }
          )
        : await customerApi.post(
            `/api/shop/products/${encodeURIComponent(activeProduct.id)}/reviews`,
            {
              rating: myRating,
              comment: myComment.trim(),
            }
          );
      if (res.success) {
        toast.success(
          editingReviewId
            ? "Đã cập nhật đánh giá sản phẩm"
            : "Cảm ơn bạn đã gửi đánh giá sản phẩm"
        );
        setMyComment("");
        setEditingReviewId(null);
        setMyRating(5);
        loadReviews(activeProduct.id);
      } else {
        toast.error(res.error || "Không thể gửi đánh giá");
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderingProduct) return;
    setIsPlacingOrder(true);
    try {
      const totalAmount = orderingProduct.price * orderQty;
      const res = await customerApi.post("/api/shop/orders", {
        customerName: user?.fullName || "Khách hàng",
        customerPhone: orderPhone,
        shippingAddress: orderAddress,
        notes: orderNote,
        totalAmount,
        items: [
          {
            productId: orderingProduct.id,
            productName: orderingProduct.name,
            unitPrice: orderingProduct.price,
            quantity: orderQty,
            imageUrl: orderingProduct.imagePath,
          },
        ],
      });
      if (res.success) {
        toast.success(
          "Đặt hàng thành công. Bộ phận CSKH Austec sẽ liên hệ xác nhận lắp đặt."
        );
        setOrderingProduct(null);
        setOrderNote("");
        setOrderQty(1);
      } else {
        toast.error(res.error || "Không thể gửi đơn đặt hàng");
      }
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
      {/* Compact Store Toolbar */}
      <div className="shrink-0 p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600/12 text-blue-500 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">
              Gian hàng chính hãng Austec Smart Home
            </h1>
            <p className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2]">
              Cửa cuốn, khóa thông minh, lưu điện UPS & cảm biến IoT bảo hành điện tử theo Hardware ID
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer shrink-0 ${
                selectedCategory === "ALL"
                  ? "bg-blue-600 text-white"
                  : "bg-[#EEF1F5] dark:bg-[#1C232E] text-[#525D6F] dark:text-[#9BA4B2]"
              }`}
            >
              Tất cả ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCategory(c)}
                className={`h-7 px-2.5 rounded-lg text-xs font-medium cursor-pointer shrink-0 ${
                  selectedCategory === c
                    ? "bg-blue-600 text-white"
                    : "bg-[#EEF1F5] dark:bg-[#1C232E] text-[#525D6F] dark:text-[#9BA4B2]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#7B8596]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm sản phẩm, model..."
              className="w-full h-7 pl-8 pr-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
            />
          </div>
        </div>
      </div>

      {/* Product Grid with Internal Scroll */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] p-4 flex flex-col justify-between gap-3 hover:border-blue-500/45 transition-colors"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-blue-600/12 text-blue-500 text-[10px] font-medium">
                    {prod.categoryTag}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-500 tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{prod.rating}</span>
                    <span className="text-[#7B8596] font-normal">
                      ({prod.reviewsCount})
                    </span>
                  </span>
                </div>

                <div
                  onClick={() => setActiveProduct(prod)}
                  className="cursor-pointer space-y-1"
                >
                  <h3 className="text-[13px] font-semibold hover:text-blue-500 transition-colors leading-snug">
                    {prod.name}
                  </h3>
                  <p className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2] line-clamp-2">
                    {prod.subtitle}
                  </p>
                </div>

                <div className="space-y-1">
                  {prod.highlights.slice(0, 2).map((h, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-1.5 text-[11px] text-[#525D6F] dark:text-[#9BA4B2]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2.5 border-t border-black/[0.06] dark:border-white/[0.06] space-y-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-blue-500 font-mono tabular-nums">
                    {formatVnd(prod.price)}
                  </span>
                  {prod.originalPrice && (
                    <span className="text-[11px] text-[#7B8596] line-through font-mono tabular-nums">
                      {formatVnd(prod.originalPrice)}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveProduct(prod)}
                    className="h-8 rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium hover:bg-[#EEF1F5] dark:hover:bg-[#1C232E] cursor-pointer"
                  >
                    Chi tiết
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/chat?consult=${encodeURIComponent(prod.name)}`)
                    }
                    className="h-8 rounded-lg border border-blue-500/35 text-blue-500 text-xs font-medium flex items-center justify-center gap-1 hover:bg-blue-600 hover:text-white cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Tư vấn</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderingProduct(prod);
                      setOrderQty(1);
                    }}
                    className="h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer"
                  >
                    Đặt mua
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product Detail & Reviews Modal */}
      {activeProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setActiveProduct(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[86vh] overflow-hidden rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#151A22] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 p-4 border-b border-black/[0.08] dark:border-white/[0.08] flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-medium text-blue-500">
                  {activeProduct.categoryTag}
                </span>
                <h2 className="text-base font-semibold">{activeProduct.name}</h2>
                <p className="text-xs text-[#525D6F] dark:text-[#9BA4B2]">
                  {activeProduct.warrantyText}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveProduct(null)}
                className="p-1.5 rounded-lg hover:bg-[#EEF1F5] dark:hover:bg-[#1C232E] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[#7B8596]">
                  Ưu điểm nổi bật
                </h4>
                {activeProduct.highlights.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[#7B8596]">
                  Thông số kỹ thuật
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(activeProduct.specs).map(([k, v]) => (
                    <div
                      key={k}
                      className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                    >
                      <span className="text-[#7B8596] block text-[11px]">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Reviews + 5★→1★ Distribution Bar */}
              <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.08] space-y-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-[#7B8596]">
                  Đánh giá từ khách hàng ({reviews.length})
                </h4>

                {reviewStats && reviewStats.totalReviews > 0 && (
                  <div className="p-3 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div className="text-center">
                      <div className="text-2xl font-mono font-semibold text-amber-500 tabular-nums">
                        {reviewStats.averageRating.toFixed(1)}
                      </div>
                      <div className="text-[11px] text-[#7B8596]">
                        {reviewStats.totalReviews} đánh giá
                      </div>
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = Number(
                          reviewStats.ratingCounts?.[String(star)] || 0
                        );
                        const pct =
                          reviewStats.totalReviews > 0
                            ? Math.round((count / reviewStats.totalReviews) * 100)
                            : 0;
                        return (
                          <div
                            key={star}
                            className="flex items-center gap-2 text-[11px] font-mono tabular-nums"
                          >
                            <span className="w-7 text-right">{star}★</span>
                            <div className="flex-1 h-1.5 rounded-full bg-black/[0.08] dark:bg-white/[0.08] overflow-hidden">
                              <div
                                className="h-full bg-amber-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="w-7 text-[#7B8596]">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmitReview} className="flex gap-2">
                  <select
                    value={myRating}
                    onChange={(e) => setMyRating(Number(e.target.value))}
                    className="h-8 px-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs font-medium"
                  >
                    {[5, 4, 3, 2, 1].map((s) => (
                      <option key={s} value={s}>
                        {s} ★
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={myComment}
                    onChange={(e) => setMyComment(e.target.value)}
                    placeholder={
                      editingReviewId
                        ? "Chỉnh sửa nhận xét của bạn..."
                        : "Viết cảm nhận của bạn về sản phẩm..."
                    }
                    className="flex-1 h-8 px-3 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                  />
                  {editingReviewId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingReviewId(null);
                        setMyComment("");
                        setMyRating(5);
                      }}
                      className="h-8 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-xs cursor-pointer"
                    >
                      Hủy
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="h-8 px-3.5 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
                  >
                    {editingReviewId ? "Cập nhật" : "Gửi"}
                  </button>
                </form>

                <div className="space-y-2">
                  {reviews.map((rv: any, idx) => {
                    const isMine =
                      user && String(rv.userId) === String(user.id);
                    return (
                      <div
                        key={rv.id || idx}
                        className="p-2.5 rounded-lg bg-[#F6F7F9] dark:bg-[#1C232E] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">
                            {rv.userName || "Khách hàng"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-amber-500 font-medium font-mono">
                              {rv.rating} ★
                            </span>
                            {isMine && rv.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingReviewId(String(rv.id));
                                  setMyRating(Number(rv.rating || 5));
                                  setMyComment(String(rv.comment || ""));
                                }}
                                className="text-[11px] text-blue-500 hover:underline flex items-center gap-0.5 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Sửa</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[#525D6F] dark:text-[#9BA4B2]">
                          {rv.comment}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Form Modal */}
      {orderingProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setOrderingProduct(null)}
        >
          <form
            onSubmit={handlePlaceOrder}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#151A22] p-5 space-y-3.5"
          >
            <h3 className="text-sm font-semibold">
              Đặt mua & đăng ký lắp đặt: {orderingProduct.name}
            </h3>
            <div className="text-xs font-mono font-medium text-blue-500 tabular-nums">
              Đơn giá: {formatVnd(orderingProduct.price)}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Số lượng</label>
              <input
                type="number"
                min={1}
                value={orderQty}
                onChange={(e) => setOrderQty(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Số điện thoại liên hệ *
              </label>
              <input
                type="tel"
                value={orderPhone}
                onChange={(e) => setOrderPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Địa chỉ lắp đặt *
              </label>
              <input
                type="text"
                value={orderAddress}
                onChange={(e) => setOrderAddress(e.target.value)}
                placeholder="Số nhà, đường, quận/huyện, tỉnh/thành..."
                className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Ghi chú kỹ thuật
              </label>
              <input
                type="text"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="Thời gian mong muốn khảo sát/lắp đặt..."
                className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOrderingProduct(null)}
                className="px-3.5 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-xs font-medium cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isPlacingOrder}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer tabular-nums"
              >
                Xác nhận đặt hàng ({formatVnd(orderingProduct.price * orderQty)})
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
