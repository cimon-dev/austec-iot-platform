import { Request, Response } from 'express';
import { UsersService } from './users.service.js';
import { AuthenticatedRequest } from '../../services/auth.service.js';

export class UsersController {
  constructor(private service: UsersService) {}

  public login = async (req: Request, res: Response) => {
    try {
      const result = await this.service.login(req.body);
      res.json({ success: true, ...result, message: 'Đăng nhập thành công!' });
    } catch (e: any) {
      res.status(401).json({ success: false, error: e.message });
    }
  };

  public register = async (req: Request, res: Response) => {
    try {
      const result = await this.service.register(req.body);
      res.json({ success: true, ...result, message: 'Đăng ký tài khoản thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public me = async (req: AuthenticatedRequest, res: Response) => {
    res.json({ success: true, user: req.user });
  };

  public getStaff = async (_req: Request, res: Response) => {
    try {
      const staff = await this.service.getStaff();
      res.json({ success: true, staff });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public createStaff = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const staff = await this.service.createStaff(req.body, req.user?.email);
      res.json({ success: true, staff, message: 'Thêm cán bộ quản trị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public updateStaff = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const staff = this.service.updateStaff(String(req.params.id), req.body, req.user?.email);
      res.json({ success: true, staff, message: 'Cập nhật cán bộ thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public deleteStaff = async (req: Request, res: Response) => {
    try {
      this.service.deleteStaff(String(req.params.id));
      res.json({ success: true, message: 'Đã xóa cán bộ khỏi hệ thống!' });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  };

  public toggleStaffStatus = async (req: Request, res: Response) => {
    try {
      const staff = this.service.toggleStaffStatus(String(req.params.id), req.body.isActive);
      res.json({
        success: true,
        staff,
        message: `Tài khoản cán bộ hiện đang ở trạng thái: ${staff.isActive ? 'Hoạt động' : 'Tạm khóa'}`,
      });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  };

  public getCustomers = async (_req: Request, res: Response) => {
    try {
      const customers = await this.service.getCustomers();
      res.json({ success: true, customers });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public createCustomer = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const customer = this.service.createCustomer(req.body);
      res.json({
        success: true,
        customer,
        message: `Đã thêm tài khoản khách hàng ${customer.fullName} thành công!`,
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public toggleCustomerStatus = async (req: Request, res: Response) => {
    try {
      const customer = this.service.toggleCustomerStatus(String(req.params.id), req.body.isActive);
      res.json({
        success: true,
        customer,
        message: `Tài khoản hiện đang ở trạng thái: ${customer.isActive ? 'Hoạt động' : 'Tạm khóa'}`,
      });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  };

  public getRoles = async (_req: Request, res: Response) => {
    try {
      const roles = await this.service.getRoles();
      res.json({ success: true, roles });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public updateRolePermissions = async (req: Request, res: Response) => {
    try {
      const { permissions } = req.body;
      await this.service.updateRolePermissions(Number(req.params.id), permissions);
      res.json({ success: true, message: 'Cập nhật phân quyền vai trò thành công vào PostgreSQL!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public saveRoles = async (req: Request, res: Response) => {
    try {
      const { roles } = req.body;
      if (!Array.isArray(roles)) {
        res.status(400).json({ success: false, error: 'Danh sách vai trò không hợp lệ' });
        return;
      }
      await this.service.saveRoles(roles);
      res.json({ success: true, message: 'Đã lưu thiết lập ma trận phân quyền vào PostgreSQL thành công!' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public deleteRole = async (req: Request, res: Response) => {
    try {
      const roleId = Number(req.params.id);
      await this.service.deleteRole(roleId);
      res.json({ success: true, message: 'Đã xóa vai trò thành công khỏi PostgreSQL!' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };
}

