import { postgresClient, PostgresClient } from '../../core/database/postgres.client.js';
import { ProductEntity } from './entities/product.entity.js';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';

export class StoreRepository {
  private client: PostgresClient;
  private memoryStore: ProductEntity[] = [];
  private onPersist?: () => void;

  constructor(
    client: PostgresClient = postgresClient,
    initialStore: ProductEntity[] = [],
    onPersist?: () => void
  ) {
    this.client = client;
    this.memoryStore = initialStore;
    this.onPersist = onPersist;
  }

  private async ensureTable(): Promise<void> {
    const ddl = `
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category_tag VARCHAR(100) DEFAULT 'Phụ Kiện',
        subtitle TEXT,
        description TEXT,
        price NUMERIC(15, 2) NOT NULL DEFAULT 0,
        original_price NUMERIC(15, 2),
        rating NUMERIC(3, 2) DEFAULT 5.0,
        reviews_count INT DEFAULT 0,
        image_url TEXT,
        gallery_urls JSONB DEFAULT '[]'::jsonb,
        warranty_text VARCHAR(255),
        highlights JSONB DEFAULT '[]'::jsonb,
        specs JSONB DEFAULT '{}'::jsonb,
        stock_quantity INT DEFAULT 50,
        is_published BOOLEAN DEFAULT TRUE,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        display_order INT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    try {
      await this.client.query(ddl);
    } catch (err: any) {
      console.warn('[StoreRepository] Error ensuring products table:', err.message);
    }
  }

  public async getProducts(isPublishedOnly: boolean = false, category?: string, search?: string): Promise<ProductEntity[]> {
    try {
      await this.ensureTable();
      let sql = 'SELECT * FROM products WHERE 1=1';
      const params: any[] = [];
      let idx = 1;

      if (isPublishedOnly) {
        sql += ` AND is_published = true`;
      }
      if (category && category !== 'ALL') {
        sql += ` AND LOWER(category_tag) = LOWER($${idx++})`;
        params.push(category);
      }
      if (search) {
        sql += ` AND (LOWER(name) LIKE $${idx} OR LOWER(subtitle) LIKE $${idx} OR LOWER(category_tag) LIKE $${idx})`;
        params.push(`%${search.toLowerCase().trim()}%`);
        idx++;
      }

      sql += ' ORDER BY display_order ASC, created_at DESC';

      const res = await this.client.query(sql, params);
      if (res.rows.length > 0) {
        return res.rows.map(r => this.mapRowToEntity(r));
      }
    } catch (err: any) {
      console.warn('[StoreRepository] DB query failed, falling back to memoryStore:', err.message);
    }

    let list = [...this.memoryStore];
    if (isPublishedOnly) list = list.filter(p => p.isPublished);
    if (category && category !== 'ALL') {
      list = list.filter(p => (p.categoryTag || '').toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase().trim();
      list = list.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.subtitle || '').toLowerCase().includes(q) ||
        (p.categoryTag || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  public async createProduct(data: CreateProductDto): Promise<ProductEntity> {
    const id = data.id || `PROD-${Date.now()}`;
    const name = data.name || 'Sản phẩm mới Austec';
    const cat = data.categoryTag || data.category || 'Phụ Kiện';
    const sub = data.subtitle || data.description || '';
    const desc = data.description || '';
    const price = Number(data.price) || 0;
    const origPrice = data.originalPrice ? Number(data.originalPrice) : null;
    const img = data.imageUrl || 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80';
    const gallery = Array.isArray(data.galleryUrls) ? data.galleryUrls : [];
    const warranty = data.warrantyText || 'Bảo hành chính hãng 24 tháng theo Hardware ID';
    const highlights = Array.isArray(data.highlights) ? data.highlights : [];
    const specs = (typeof data.specs === 'object' && data.specs !== null) ? data.specs : {};
    const stock = Number(data.stockQuantity ?? data.stock) || 50;
    const isPub = data.isPublished !== undefined ? Boolean(data.isPublished) : (data.status !== 'DISCONTINUED');
    const status = data.status || (isPub ? 'ACTIVE' : 'DISCONTINUED');
    const displayOrder = Number(data.displayOrder) || 0;

    try {
      await this.ensureTable();
      const sql = `
        INSERT INTO products (
          id, name, category_tag, subtitle, description,
          price, original_price, image_url, gallery_urls,
          warranty_text, highlights, specs, stock_quantity,
          is_published, status, display_order, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category_tag = EXCLUDED.category_tag,
          subtitle = EXCLUDED.subtitle,
          description = EXCLUDED.description,
          price = EXCLUDED.price,
          original_price = EXCLUDED.original_price,
          image_url = EXCLUDED.image_url,
          gallery_urls = EXCLUDED.gallery_urls,
          warranty_text = EXCLUDED.warranty_text,
          highlights = EXCLUDED.highlights,
          specs = EXCLUDED.specs,
          stock_quantity = EXCLUDED.stock_quantity,
          is_published = EXCLUDED.is_published,
          status = EXCLUDED.status,
          display_order = EXCLUDED.display_order,
          updated_at = NOW()
        RETURNING *;
      `;

      const res = await this.client.query(sql, [
        id, name, cat, sub, desc,
        price, origPrice, img, JSON.stringify(gallery),
        warranty, JSON.stringify(highlights), JSON.stringify(specs),
        stock, isPub, status, displayOrder
      ]);

      const entity = this.mapRowToEntity(res.rows[0]);
      this.syncMemoryStore(entity);
      return entity;
    } catch (err: any) {
      console.warn('[StoreRepository] DB createProduct failed, falling back to memory:', err.message);
      const entity: ProductEntity = {
        id, name, categoryTag: cat, category: cat,
        subtitle: sub, description: desc, price, originalPrice: origPrice ?? undefined,
        imageUrl: img, galleryUrls: gallery, warrantyText: warranty,
        highlights, specs, stockQuantity: stock, stock,
        isPublished: isPub, status, displayOrder,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      this.syncMemoryStore(entity);
      return entity;
    }
  }

  public async updateProduct(id: string, data: UpdateProductDto): Promise<ProductEntity | null> {
    try {
      await this.ensureTable();
      const current = await this.getProductById(id);
      if (!current) return null;

      const merged = { ...current, ...data };
      const sql = `
        UPDATE products SET
          name = $1, category_tag = $2, subtitle = $3, description = $4,
          price = $5, original_price = $6, image_url = $7, gallery_urls = $8,
          warranty_text = $9, highlights = $10, specs = $11, stock_quantity = $12,
          is_published = $13, status = $14, display_order = $15, updated_at = NOW()
        WHERE id = $16
        RETURNING *;
      `;

      const res = await this.client.query(sql, [
        merged.name,
        merged.categoryTag || merged.category,
        merged.subtitle || merged.description,
        merged.description,
        merged.price,
        merged.originalPrice || null,
        merged.imageUrl,
        JSON.stringify(merged.galleryUrls || []),
        merged.warrantyText,
        JSON.stringify(merged.highlights || []),
        JSON.stringify(merged.specs || {}),
        merged.stockQuantity || merged.stock || 0,
        merged.isPublished ?? true,
        merged.status || 'ACTIVE',
        merged.displayOrder || 0,
        id,
      ]);

      if (res.rows.length > 0) {
        const entity = this.mapRowToEntity(res.rows[0]);
        this.syncMemoryStore(entity);
        return entity;
      }
    } catch (err: any) {
      console.warn('[StoreRepository] DB updateProduct failed:', err.message);
    }

    const idx = this.memoryStore.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.memoryStore[idx] = { ...this.memoryStore[idx], ...data, updatedAt: new Date().toISOString() };
      this.onPersist?.();
      return this.memoryStore[idx];
    }
    return null;
  }

  public async deleteProduct(id: string): Promise<boolean> {
    try {
      await this.ensureTable();
      await this.client.query('DELETE FROM products WHERE id = $1', [id]);
    } catch (err: any) {
      console.warn('[StoreRepository] DB deleteProduct error:', err.message);
    }

    const idx = this.memoryStore.findIndex(p => p.id === id);
    if (idx !== -1) {
      this.memoryStore.splice(idx, 1);
      this.onPersist?.();
      return true;
    }
    return true;
  }

  public async getProductById(id: string): Promise<ProductEntity | null> {
    try {
      await this.ensureTable();
      const res = await this.client.query('SELECT * FROM products WHERE id = $1', [id]);
      if (res.rows.length > 0) return this.mapRowToEntity(res.rows[0]);
    } catch (_) {}
    return this.memoryStore.find(p => p.id === id) || null;
  }

  public async getOrders(): Promise<any[]> {
    try {
      const res = await this.client.query('SELECT * FROM orders ORDER BY created_at DESC');
      return res.rows;
    } catch {
      return [];
    }
  }

  public async updateOrderStatus(id: string, status: string): Promise<boolean> {
    try {
      await this.client.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
      return true;
    } catch {
      return false;
    }
  }

  public async createOrder(data: any): Promise<any> {
    const id = data.id || `ORD-${Date.now()}`;
    try {
      const res = await this.client.query(
        `INSERT INTO orders (id, customer_id, customer_name, customer_phone, shipping_address, total_amount, status, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
         RETURNING *`,
        [
          id,
          data.customerId || 'cust',
          data.customerName || '',
          data.customerPhone || '',
          data.shippingAddress || '',
          Number(data.totalAmount) || 0,
          data.status || 'PENDING',
          data.notes || '',
        ]
      );
      return res.rows[0];
    } catch {
      return { id, ...data };
    }
  }

  private syncMemoryStore(entity: ProductEntity) {
    const idx = this.memoryStore.findIndex(p => p.id === entity.id);
    if (idx !== -1) {
      this.memoryStore[idx] = entity;
    } else {
      this.memoryStore.unshift(entity);
    }
    this.onPersist?.();
  }

  private mapRowToEntity(r: any): ProductEntity {
    return {
      id: r.id,
      name: r.name,
      categoryTag: r.category_tag,
      category: r.category_tag,
      subtitle: r.subtitle,
      description: r.description,
      price: Number(r.price) || 0,
      originalPrice: r.original_price ? Number(r.original_price) : undefined,
      rating: Number(r.rating) || 5.0,
      reviewsCount: Number(r.reviews_count) || 0,
      imageUrl: r.image_url,
      galleryUrls: typeof r.gallery_urls === 'string' ? JSON.parse(r.gallery_urls) : (r.gallery_urls || []),
      warrantyText: r.warranty_text,
      highlights: typeof r.highlights === 'string' ? JSON.parse(r.highlights) : (r.highlights || []),
      specs: typeof r.specs === 'string' ? JSON.parse(r.specs) : (r.specs || {}),
      stockQuantity: Number(r.stock_quantity) || 0,
      stock: Number(r.stock_quantity) || 0,
      isPublished: r.is_published,
      status: r.status,
      displayOrder: Number(r.display_order) || 0,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    };
  }
}
