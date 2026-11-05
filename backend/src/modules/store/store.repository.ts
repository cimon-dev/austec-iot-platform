import { postgresClient, PostgresClient } from '../../core/database/postgres.client.js';
import { ProductEntity } from './entities/product.entity.js';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto.js';

export interface ReviewEntity {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userPhone?: string;
  rating: number;
  comment: string;
  isVerifiedBuyer: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export class StoreRepository {
  private client: PostgresClient;
  private memoryStore: ProductEntity[] = [];
  private memoryReviews: ReviewEntity[] = [];
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

      CREATE TABLE IF NOT EXISTS product_reviews (
        id VARCHAR(100) PRIMARY KEY,
        product_id VARCHAR(100) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        user_id VARCHAR(100) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        user_phone VARCHAR(50),
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        is_verified_buyer BOOLEAN DEFAULT TRUE,
        is_hidden BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(100) REFERENCES orders(id) ON DELETE CASCADE,
        product_id VARCHAR(100),
        product_name VARCHAR(255),
        unit_price NUMERIC(15, 2) NOT NULL,
        quantity INT DEFAULT 1,
        image_url TEXT
      );
    `;
    try {
      await this.client.query(ddl);
    } catch (err: any) {
      console.warn('[StoreRepository] Error ensuring tables:', err.message);
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

      // Persist order items if provided
      if (Array.isArray(data.items) && data.items.length > 0) {
        for (const item of data.items) {
          try {
            await this.client.query(
              `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, image_url)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                id,
                item.productId || item.id || '',
                item.productName || item.name || '',
                Number(item.unitPrice || item.price) || 0,
                Number(item.quantity) || 1,
                item.imageUrl || item.imagePath || '',
              ]
            );
          } catch (_) {}
        }
      }

      return res.rows[0];
    } catch {
      return { id, ...data };
    }
  }

  // ==========================================
  // REVIEW & RATING MANAGEMENT
  // ==========================================
  public async canUserReview(
    userId: string,
    productId: string,
    userPhone?: string,
    userEmail?: string,
    userRole?: string
  ): Promise<{ canReview: boolean; reason?: string }> {
    if (userRole === 'ADMIN') {
      return { canReview: true };
    }

    try {
      await this.ensureTable();
      // 1. Check orders & order_items
      const orderCheck = await this.client.query(
        `SELECT 1 FROM orders o
         LEFT JOIN order_items oi ON oi.order_id = o.id
         WHERE (o.customer_id = $1 OR o.customer_phone = $2)
           AND (oi.product_id = $3 OR o.notes LIKE $4)
         LIMIT 1`,
        [userId, userPhone || '', productId, `%${productId}%`]
      );
      if (orderCheck.rows && orderCheck.rows.length > 0) {
        return { canReview: true };
      }

      // 2. Check devices owned by user (device_instances)
      const deviceCheck = await this.client.query(
        `SELECT 1 FROM device_instances di
         WHERE (di.owner_id = $1 OR di.owner_phone = $2)
           AND (di.hardware_id = $3 OR di.model_name = $3 OR di.custom_name LIKE $4)
         LIMIT 1`,
        [userId, userPhone || '', productId, `%${productId}%`]
      );
      if (deviceCheck.rows && deviceCheck.rows.length > 0) {
        return { canReview: true };
      }
    } catch (err: any) {
      console.warn('[StoreRepository] canUserReview query error:', err.message);
    }

    return {
      canReview: false,
      reason: 'Chỉ người đã đặt mua hoặc sở hữu thiết bị mới được đánh giá.',
    };
  }

  public async getReviews(
    productId: string,
    includeHidden: boolean = false,
    currentUserId?: string
  ): Promise<{
    reviews: ReviewEntity[];
    stats: {
      averageRating: number;
      totalReviews: number;
      ratingCounts: Record<string, number>;
    };
    canReview: boolean;
    hasReviewed: boolean;
    myReview: ReviewEntity | null;
  }> {
    try {
      await this.ensureTable();
      let sql = 'SELECT * FROM product_reviews WHERE product_id = $1';
      const params: any[] = [productId];

      if (!includeHidden) {
        if (currentUserId) {
          sql += ' AND (is_hidden = false OR user_id = $2)';
          params.push(currentUserId);
        } else {
          sql += ' AND is_hidden = false';
        }
      }

      sql += ' ORDER BY created_at DESC';

      const res = await this.client.query(sql, params);
      const reviews = res.rows.map(r => this.mapRowToReview(r));

      // Calculate stats on non-hidden reviews
      const nonHidden = reviews.filter(r => !r.isHidden);
      const ratingCounts: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
      let sum = 0;
      for (const r of nonHidden) {
        const key = String(Math.min(5, Math.max(1, Math.round(r.rating))));
        ratingCounts[key] = (ratingCounts[key] || 0) + 1;
        sum += r.rating;
      }
      const avg = nonHidden.length > 0 ? Math.round((sum / nonHidden.length) * 10) / 10 : 5.0;

      const myReview = currentUserId ? reviews.find(r => r.userId === currentUserId) || null : null;

      return {
        reviews,
        stats: {
          averageRating: avg,
          totalReviews: nonHidden.length,
          ratingCounts,
        },
        canReview: false, // will be evaluated by caller if user info is present
        hasReviewed: Boolean(myReview),
        myReview,
      };
    } catch (err: any) {
      console.warn('[StoreRepository] getReviews DB query failed:', err.message);
    }

    // Fallback to memory
    const filtered = this.memoryReviews.filter(
      r => r.productId === productId && (includeHidden || !r.isHidden || r.userId === currentUserId)
    );
    const nonHidden = filtered.filter(r => !r.isHidden);
    const ratingCounts: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    let sum = 0;
    for (const r of nonHidden) {
      const key = String(Math.min(5, Math.max(1, Math.round(r.rating))));
      ratingCounts[key] = (ratingCounts[key] || 0) + 1;
      sum += r.rating;
    }
    const avg = nonHidden.length > 0 ? Math.round((sum / nonHidden.length) * 10) / 10 : 5.0;
    const myReview = currentUserId ? filtered.find(r => r.userId === currentUserId) || null : null;

    return {
      reviews: filtered,
      stats: { averageRating: avg, totalReviews: nonHidden.length, ratingCounts },
      canReview: false,
      hasReviewed: Boolean(myReview),
      myReview,
    };
  }

  public async createReview(data: {
    productId: string;
    userId: string;
    userName: string;
    userPhone?: string;
    userEmail?: string;
    userRole?: string;
    rating: number;
    comment: string;
  }): Promise<ReviewEntity> {
    await this.ensureTable();

    // Check if user already reviewed
    const existing = await this.client.query(
      'SELECT id FROM product_reviews WHERE product_id = $1 AND user_id = $2 LIMIT 1',
      [data.productId, data.userId]
    );
    if (existing.rows && existing.rows.length > 0) {
      throw new Error('Bạn đã đánh giá sản phẩm này. Hãy chọn chỉnh sửa nhận xét!');
    }

    // Check purchase eligibility
    const eligibility = await this.canUserReview(
      data.userId,
      data.productId,
      data.userPhone,
      data.userEmail,
      data.userRole
    );
    if (!eligibility.canReview) {
      throw new Error(eligibility.reason || 'Chỉ người đã mua thiết bị mới được đánh giá.');
    }

    const id = `REV-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const rating = Math.min(5, Math.max(1, Math.round(data.rating)));
    const comment = data.comment.trim();

    try {
      const res = await this.client.query(
        `INSERT INTO product_reviews (
           id, product_id, user_id, user_name, user_phone, rating, comment, is_verified_buyer, is_hidden, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, false, NOW(), NOW())
         RETURNING *`,
        [id, data.productId, data.userId, data.userName, data.userPhone || null, rating, comment]
      );
      const entity = this.mapRowToReview(res.rows[0]);
      this.memoryReviews.unshift(entity);
      await this.recalculateProductRating(data.productId);
      return entity;
    } catch (err: any) {
      console.warn('[StoreRepository] DB createReview failed, fallback to memory:', err.message);
      const entity: ReviewEntity = {
        id,
        productId: data.productId,
        userId: data.userId,
        userName: data.userName,
        userPhone: data.userPhone,
        rating,
        comment,
        isVerifiedBuyer: true,
        isHidden: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.memoryReviews.unshift(entity);
      await this.recalculateProductRating(data.productId);
      return entity;
    }
  }

  public async updateReview(
    productId: string,
    reviewId: string,
    userId: string,
    data: { rating: number; comment: string }
  ): Promise<ReviewEntity> {
    await this.ensureTable();

    const rating = Math.min(5, Math.max(1, Math.round(data.rating)));
    const comment = data.comment.trim();

    try {
      const res = await this.client.query(
        `UPDATE product_reviews SET
           rating = $1, comment = $2, updated_at = NOW()
         WHERE id = $3 AND user_id = $4 AND product_id = $5
         RETURNING *`,
        [rating, comment, reviewId, userId, productId]
      );
      if (res.rows.length === 0) {
        throw new Error('Không tìm thấy nhận xét hoặc bạn không có quyền chỉnh sửa nhận xét này!');
      }
      const entity = this.mapRowToReview(res.rows[0]);
      const idx = this.memoryReviews.findIndex(r => r.id === reviewId);
      if (idx !== -1) this.memoryReviews[idx] = entity;
      await this.recalculateProductRating(productId);
      return entity;
    } catch (err: any) {
      console.warn('[StoreRepository] DB updateReview failed, fallback to memory:', err.message);
      const idx = this.memoryReviews.findIndex(r => r.id === reviewId && r.userId === userId);
      if (idx === -1) throw new Error('Không tìm thấy nhận xét để chỉnh sửa!');
      this.memoryReviews[idx] = {
        ...this.memoryReviews[idx],
        rating,
        comment,
        updatedAt: new Date().toISOString(),
      };
      await this.recalculateProductRating(productId);
      return this.memoryReviews[idx];
    }
  }

  public async toggleReviewVisibility(reviewId: string): Promise<{ isHidden: boolean; productId: string }> {
    await this.ensureTable();
    try {
      const res = await this.client.query(
        `UPDATE product_reviews SET
           is_hidden = NOT is_hidden, updated_at = NOW()
         WHERE id = $1
         RETURNING is_hidden, product_id`,
        [reviewId]
      );
      if (res.rows.length === 0) {
        throw new Error('Không tìm thấy nhận xét!');
      }
      const isHidden = res.rows[0].is_hidden;
      const productId = res.rows[0].product_id;

      const mem = this.memoryReviews.find(r => r.id === reviewId);
      if (mem) mem.isHidden = isHidden;

      await this.recalculateProductRating(productId);
      return { isHidden, productId };
    } catch (err: any) {
      const mem = this.memoryReviews.find(r => r.id === reviewId);
      if (!mem) throw new Error('Không tìm thấy nhận xét!');
      mem.isHidden = !mem.isHidden;
      await this.recalculateProductRating(mem.productId);
      return { isHidden: mem.isHidden, productId: mem.productId };
    }
  }

  public async recalculateProductRating(productId: string): Promise<void> {
    try {
      const statsRes = await this.client.query(
        `SELECT ROUND(AVG(rating)::numeric, 1) as avg_rating, COUNT(*) as total_count
         FROM product_reviews
         WHERE product_id = $1 AND is_hidden = false`,
        [productId]
      );
      if (statsRes.rows && statsRes.rows.length > 0) {
        const avg = parseFloat(statsRes.rows[0].avg_rating) || 5.0;
        const count = parseInt(statsRes.rows[0].total_count, 10) || 0;
        await this.client.query(
          `UPDATE products SET rating = $1, reviews_count = $2, updated_at = NOW() WHERE id = $3`,
          [avg, count, productId]
        );
        const mem = this.memoryStore.find(p => p.id === productId);
        if (mem) {
          mem.rating = avg;
          mem.reviewsCount = count;
        }
      }
    } catch (err: any) {
      console.warn('[StoreRepository] recalculateProductRating error:', err.message);
    }
  }

  private mapRowToReview(r: any): ReviewEntity {
    return {
      id: r.id,
      productId: r.product_id,
      userId: r.user_id,
      userName: r.user_name,
      userPhone: r.user_phone || undefined,
      rating: Number(r.rating) || 5,
      comment: r.comment || '',
      isVerifiedBuyer: r.is_verified_buyer ?? true,
      isHidden: Boolean(r.is_hidden),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
    };
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
