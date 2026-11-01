import { Request, Response } from 'express';
import { StoreService } from './store.service.js';
import { AuthenticatedRequest } from '../../services/auth.service.js';
import { Controller, Get, Post, Put, Delete } from '../../core/decorators/index.js';
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

  @Post('/shop/orders', authenticate)
  public async createShopOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const data = req.body;
      const order = await this.service.createOrder({
        ...data,
        customerId: req.user!.id,
        customerName: req.user!.fullName || data.customerName,
        customerPhone: req.user!.email || data.customerPhone,
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

