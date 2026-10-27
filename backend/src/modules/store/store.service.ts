import { StoreRepository } from './store.repository.js';
import { CreateProductSchema, UpdateProductSchema, CreateProductDto, UpdateProductDto } from './dto/product.dto.js';
import { ProductEntity } from './entities/product.entity.js';

export class StoreService {
  constructor(private repo: StoreRepository = new StoreRepository()) {}

  public async getShopProducts(category?: string, search?: string): Promise<ProductEntity[]> {
    return this.repo.getProducts(true, category, search);
  }

  public async getAdminProducts(category?: string, search?: string): Promise<ProductEntity[]> {
    return this.repo.getProducts(false, category, search);
  }

  public async getProductById(id: string): Promise<ProductEntity | null> {
    return this.repo.getProductById(id);
  }

  public async createProduct(raw: unknown): Promise<ProductEntity> {
    const validated: CreateProductDto = CreateProductSchema.parse(raw);
    return this.repo.createProduct(validated);
  }

  public async updateProduct(id: string, raw: unknown): Promise<ProductEntity | null> {
    const validated: UpdateProductDto = UpdateProductSchema.parse(raw);
    return this.repo.updateProduct(id, validated);
  }

  public async deleteProduct(id: string): Promise<boolean> {
    return this.repo.deleteProduct(id);
  }

  public async getOrders(): Promise<any[]> {
    return this.repo.getOrders();
  }

  public async updateOrderStatus(id: string, status: string): Promise<boolean> {
    return this.repo.updateOrderStatus(id, status);
  }

  public async createOrder(data: any): Promise<any> {
    return this.repo.createOrder(data);
  }
}
