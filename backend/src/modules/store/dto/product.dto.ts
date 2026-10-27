import { z } from 'zod';

export const CreateProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Tên sản phẩm không được để trống'),
  categoryTag: z.string().optional(),
  category: z.string().optional(),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().optional(),
  imageUrl: z.string().url().optional().or(z.string()),
  galleryUrls: z.array(z.string()).optional(),
  warrantyText: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  specs: z.record(z.string(), z.any()).optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
  stock: z.number().int().nonnegative().optional(),
  isPublished: z.boolean().optional(),
  status: z.string().optional(),
  displayOrder: z.number().optional(),
});

export type CreateProductDto = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = CreateProductSchema.partial();
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
