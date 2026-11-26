export interface ProductItem {
  id: string;
  name: string;
  category: "DOOR" | "LOCK" | "CAMERA" | "SENSOR" | "UPS" | "ACCESSORY" | string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  description: string;
  highlights: string[];
  specs: Record<string, string>;
  stock: number;
  status: "ACTIVE" | "OUT_OF_STOCK" | "DISCONTINUED" | string;
  isFeatured?: boolean;
}

export interface ProductFilterParams {
  category?: string;
  status?: string;
  search?: string;
}
