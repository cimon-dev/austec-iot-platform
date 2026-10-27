import { apiClient } from "@/services/api-client";
import { ProductItem } from "./types";

export const storeService = {
  async getProducts(): Promise<ProductItem[]> {
    const res = await apiClient.get<{ products: ProductItem[] }>("/api/admin/products");
    if (res.success && Array.isArray(res.products)) {
      return res.products;
    }
    return [];
  },

  async createProduct(product: ProductItem): Promise<{ success: boolean; product?: ProductItem; error?: string }> {
    const res = await apiClient.post<{ product?: ProductItem; message?: string }>("/api/admin/products", product);
    return {
      success: !!res.success,
      product: res.product,
      error: res.error,
    };
  },

  async updateProduct(id: string, product: Partial<ProductItem>): Promise<{ success: boolean; product?: ProductItem; error?: string }> {
    const res = await apiClient.put<{ product?: ProductItem; message?: string }>(`/api/admin/products/${id}`, product);
    return {
      success: !!res.success,
      product: res.product,
      error: res.error,
    };
  },

  async deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    const res = await apiClient.delete<{ message?: string }>(`/api/admin/products/${id}`);
    return {
      success: !!res.success,
      error: res.error,
    };
  },
};
