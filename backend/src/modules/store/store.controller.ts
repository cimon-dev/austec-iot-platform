import { Request, Response } from 'express';
import { StoreService } from './store.service.js';
import { AuthenticatedRequest } from '../../services/auth.service.js';

export class StoreController {
  constructor(private service: StoreService) {}

  public getShopProducts = async (req: Request, res: Response) => {
    try {
      const { category, search } = req.query;
      const products = await this.service.getShopProducts(category as string, search as string);
      res.json({ success: true, products, total: products.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public getAdminProducts = async (_req: Request, res: Response) => {
    try {
      const products = await this.service.getAdminProducts();
      res.json({ success: true, products, total: products.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public createProduct = async (req: Request, res: Response) => {
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
  };

  public updateProduct = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const updated = await this.service.updateProduct(id, req.body);
      res.json({ success: true, message: 'Cập nhật sản phẩm thành công!', product: updated });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public deleteProduct = async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      await this.service.deleteProduct(id);
      res.json({ success: true, message: 'Đã xóa sản phẩm khỏi gian hàng thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public getOrders = async (_req: Request, res: Response) => {
    try {
      const orders = await this.service.getOrders();
      res.json({ success: true, orders, total: orders.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public updateOrderStatus = async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      await this.service.updateOrderStatus(String(req.params.id), status);
      res.json({ success: true, message: 'Cập nhật trạng thái đơn hàng thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public createShopOrder = async (req: AuthenticatedRequest, res: Response) => {
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
  };
}
