import { Request, Response } from 'express';
import { UsersService } from './users.service.js';
import { AuthenticatedRequest } from '../../services/auth.service.js';
import { Controller, Get, Post, Put, Delete } from '../../core/decorators/index.js';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware.js';

@Controller()
export class UsersController {
  constructor(private service: UsersService) {}

  // ==========================================
  // AUTHENTICATION
  // ==========================================
  @Post('/auth/login')
  public async login(req: Request, res: Response) {
    try {
      const result = await this.service.login(req.body);
      res.json({ success: true, ...result, message: 'Đăng nhập thành công!' });
    } catch (e: any) {
      res.status(401).json({ success: false, error: e.message });
    }
  }

  @Post('/auth/register')
  public async register(req: Request, res: Response) {
    try {
      const result = await this.service.register(req.body);
      res.json({ success: true, ...result, message: 'Đăng ký tài khoản thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Get('/auth/me', authenticate)
  public async me(req: AuthenticatedRequest, res: Response) {
    res.json({ success: true, user: req.user });
  }

  // ==========================================
  // STAFF MANAGEMENT
  // ==========================================
  @Get('/admin/staff', authenticate, requireRole(['ADMIN', 'CSKH']))
  public async getStaff(_req: Request, res: Response) {
    try {
      const staff = await this.service.getStaff();
      res.json({ success: true, staff });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/admin/staff', authenticate, requireRole(['ADMIN']))
  public async createStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const staff = await this.service.createStaff(req.body, req.user?.email);
      res.json({ success: true, staff, message: 'Thêm cán bộ quản trị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/admin/staff/:id', authenticate, requireRole(['ADMIN']))
  public async updateStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const staff = this.service.updateStaff(String(req.params.id), req.body, req.user?.email);
      res.json({ success: true, staff, message: 'Cập nhật cán bộ thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Delete('/admin/staff/:id', authenticate, requireRole(['ADMIN']))
  public async deleteStaff(req: Request, res: Response) {
    try {
      this.service.deleteStaff(String(req.params.id));
      res.json({ success: true, message: 'Đã xóa cán bộ khỏi hệ thống!' });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  }

  @Put('/admin/staff/:id/status', authenticate, requireRole(['ADMIN']))
  public async toggleStaffStatus(req: Request, res: Response) {
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
  }

  // ==========================================
  // CUSTOMER MANAGEMENT
  // ==========================================
  @Get('/admin/customers')
  @Get('/customers')
  public async getCustomers(_req: Request, res: Response) {
    try {
      const customers = await this.service.getCustomers();
      res.json({ success: true, customers });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/admin/customers', authenticate, requireRole(['ADMIN', 'CSKH']))
  @Post('/customers', authenticate, requireRole(['ADMIN', 'CSKH']))
  public async createCustomer(req: AuthenticatedRequest, res: Response) {
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
  }

  @Put('/admin/customers/:id', authenticate, requireRole(['ADMIN', 'CSKH']))
  @Put('/customers/:id', authenticate, requireRole(['ADMIN', 'CSKH']))
  public async updateCustomer(req: Request, res: Response) {
    try {
      const customer = await this.service.updateCustomer(String(req.params.id), req.body);
      res.json({
        success: true,
        customer,
        message: 'Cập nhật thông tin khách hàng thành công vào PostgreSQL!',
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/admin/customers/:id/status', authenticate, requireRole(['ADMIN', 'CSKH']))
  public async toggleCustomerStatus(req: Request, res: Response) {
    try {
      const customer = await this.service.toggleCustomerStatus(String(req.params.id), req.body.isActive);
      res.json({
        success: true,
        customer,
        message: `Tài khoản hiện đang ở trạng thái: ${customer.isActive ? 'Hoạt động' : 'Tạm khóa'}`,
      });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  }

  // ==========================================
  // SYSTEM ROLES & PERMISSIONS
  // ==========================================
  @Get('/admin/roles', authenticate)
  public async getRoles(_req: Request, res: Response) {
    try {
      const roles = await this.service.getRoles();
      res.json({ success: true, roles });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Put('/admin/roles', authenticate, requireRole(['ADMIN']))
  public async saveRoles(req: Request, res: Response) {
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
  }

  @Put('/admin/roles/:id', authenticate, requireRole(['ADMIN']))
  public async updateRole(req: Request, res: Response) {
    try {
      const roleId = Number(req.params.id);
      const { name, roleName, description } = req.body;
      const role = await this.service.updateRole(roleId, { name: name || roleName, description });
      res.json({
        success: true,
        role,
        message: 'Cập nhật tên vai trò thành công vào PostgreSQL!',
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/admin/roles/:id/permissions', authenticate, requireRole(['ADMIN']))
  public async updateRolePermissions(req: Request, res: Response) {
    try {
      const { permissions } = req.body;
      await this.service.updateRolePermissions(Number(req.params.id), permissions);
      res.json({ success: true, message: 'Cập nhật phân quyền vai trò thành công vào PostgreSQL!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Delete('/admin/roles/:id', authenticate, requireRole(['ADMIN']))
  public async deleteRole(req: Request, res: Response) {
    try {
      const roleId = Number(req.params.id);
      await this.service.deleteRole(roleId);
      res.json({ success: true, message: 'Đã xóa vai trò thành công khỏi PostgreSQL!' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}

