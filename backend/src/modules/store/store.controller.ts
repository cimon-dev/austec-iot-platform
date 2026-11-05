import { Request, Response } from 'express';
import { StoreService } from './store.service.js';
import { AuthenticatedRequest, AuthService } from '../../services/auth.service.js';
import { Controller, Get, Post, Put, Patch, Delete } from '../../core/decorators/index.js';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware.js';

@Controller()
export class StoreController {
  constructor(private service: StoreService) {}

  // ==========================================
  // SHOP ENDPOINTS
  // ==========================================
  @Get('/shop/products')
  public async getShopProducts(req: Request, res: Response) {
    try {
      const { category, search } = req.query;
      const products = await this.service.getShopProducts(category as string, search as string);
      res.json({ success: true, products, total: products.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Get('/shop/products/:id/reviews')
  public async getProductReviews(req: Request, res: Response) {
    try {
      let currentUserId: string | undefined;
      let userPhone: string | undefined;
      let userEmail: string | undefined;
      let userRole: string | undefined;

      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const verified: any = AuthService.verifyToken(token);
        if (verified) {
          currentUserId = verified.id;
          userPhone = verified.phoneNumber || verified.phone;
          userEmail = verified.email;
          userRole = verified.role;
        }
      }

      const isAdmin = userRole === 'ADMIN';
      const includeHidden = req.query.includeHidden === 'true' && isAdmin;
      const productId = String(req.params.id);

      const reviewData = await this.service.getReviews(productId, includeHidden, currentUserId);

      // Check if user is eligible to write a review
      let canReview = false;
      let reviewReason: string | undefined;
      if (currentUserId) {
        const check = await this.service.canUserReview(currentUserId, productId, userPhone, userEmail, userRole);
        canReview = check.canReview;
        reviewReason = check.reason;
      }

      res.json({
        success: true,
        ...reviewData,
        canReview,
        reviewReason,
        isAdmin,
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/shop/products/:id/reviews', authenticate)
  public async createProductReview(req: AuthenticatedRequest, res: Response) {
    try {
      const productId = String(req.params.id);
      const { rating, comment } = req.body;

      if (!rating || Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({ success: false, error: 'Số sao đánh giá phải từ 1 đến 5 sao!' });
      }
      if (!comment || !comment.trim()) {
        return res.status(400).json({ success: false, error: 'Vui lòng nhập nội dung nhận xét!' });
      }

      const review = await this.service.createReview({
        productId,
        userId: req.user!.id,
        userName: req.user!.fullName || req.user!.email || 'Khách hàng',
        userPhone: req.user!.phoneNumber,
        userEmail: req.user!.email,
        userRole: req.user!.role,
        rating: Number(rating),
        comment: comment.trim(),
      });

      res.json({ success: true, message: 'Gửi đánh giá thành công!', review });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/shop/products/:id/reviews/:reviewId', authenticate)
  public async updateProductReview(req: AuthenticatedRequest, res: Response) {
    try {
      const productId = String(req.params.id);
      const reviewId = String(req.params.reviewId);
      const { rating, comment } = req.body;

      if (!rating || Number(rating) < 1 || Number(rating) > 5) {
        return res.status(400).json({ success: false, error: 'Số sao đánh giá phải từ 1 đến 5 sao!' });
      }
      if (!comment || !comment.trim()) {
        return res.status(400).json({ success: false, error: 'Vui lòng nhập nội dung nhận xét!' });
      }

      const review = await this.service.updateReview(productId, reviewId, req.user!.id, {
        rating: Number(rating),
        comment: comment.trim(),
      });

      res.json({ success: true, message: 'Cập nhật đánh giá thành công!', review });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Patch('/shop/admin/reviews/:reviewId/toggle-visibility', authenticate, requireRole(['ADMIN']))
  public async toggleReviewVisibility(req: AuthenticatedRequest, res: Response) {
    try {
      const reviewId = String(req.params.reviewId);
      const result = await this.service.toggleReviewVisibility(reviewId);
      res.json({
        success: true,
        message: result.isHidden ? 'Đã ẩn nhận xét này khỏi gian hàng!' : 'Đã hiện nhận xét này trên gian hàng!',
        isHidden: result.isHidden,
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Post('/shop/orders', authenticate)
  public async createShopOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const data = req.body;
      const order = await this.service.createOrder({
        ...data,
        customerId: req.user!.id,
        customerName: req.user!.fullName || data.customerName,
        customerPhone: req.user!.phoneNumber || req.user!.email || data.customerPhone,
      });
      res.json({ success: true, message: 'Đặt hàng thành công!', order });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // ==========================================
  // ADMIN STORE MANAGEMENT
  // ==========================================
  @Get('/admin/products', authenticate)
  public async getAdminProducts(_req: Request, res: Response) {
    try {
      const products = await this.service.getAdminProducts();
      res.json({ success: true, products, total: products.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/admin/products', authenticate, requireRole(['ADMIN']))
  public async createProduct(req: Request, res: Response) {
    try {
      const product = await this.service.createProduct(req.body);
      res.json({
        success: true,
        message: 'Đã thêm sản phẩm mới vào gian hàng thành công!',
        product,
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/admin/products/:id', authenticate, requireRole(['ADMIN']))
  public async updateProduct(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      const updated = await this.service.updateProduct(id, req.body);
      res.json({ success: true, message: 'Cập nhật sản phẩm thành công!', product: updated });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Delete('/admin/products/:id', authenticate, requireRole(['ADMIN']))
  public async deleteProduct(req: Request, res: Response) {
    try {
      const id = String(req.params.id);
      await this.service.deleteProduct(id);
      res.json({ success: true, message: 'Đã xóa sản phẩm khỏi gian hàng thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Get('/admin/orders', authenticate)
  public async getOrders(_req: Request, res: Response) {
    try {
      const orders = await this.service.getOrders();
      res.json({ success: true, orders, total: orders.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Put('/admin/orders/:id/status', authenticate, requireRole(['ADMIN', 'CSKH']))
  public async updateOrderStatus(req: Request, res: Response) {
    try {
      const { status } = req.body;
      await this.service.updateOrderStatus(String(req.params.id), status);
      res.json({ success: true, message: 'Cập nhật trạng thái đơn hàng thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }
}

