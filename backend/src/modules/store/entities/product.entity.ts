export interface ProductEntity {
  id: string;
  name: string;
  categoryTag: string;
  category?: string;
  subtitle?: string;
  description?: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviewsCount?: number;
  imageUrl?: string;
  galleryUrls?: string[];
  warrantyText?: string;
  highlights?: string[];
  specs?: Record<string, any>;
  stockQuantity?: number;
  stock?: number;
  isPublished?: boolean;
  status?: string;
  displayOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}
