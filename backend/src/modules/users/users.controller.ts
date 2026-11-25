import { Request, Response } from 'express';
import { UsersService } from './users.service.js';
import {
  AuthService,
  AuthenticatedRequest,
  StepUpPurpose,
} from '../../services/auth.service.js';
import { GoogleAuthService } from '../../services/google-auth.service.js';
import { EmailOtpService } from '../../services/email-otp.service.js';
import { ZaloZnsService } from '../../services/zalo-zns.service.js';
import { OtpChannel, VerificationService } from '../../services/verification.service.js';
import { Controller, Get, Post, Put, Delete } from '../../core/decorators/index.js';
import {
  authenticate,
  requireRole,
  requireStepUp,
  assertStepUpFromRequest,
} from '../../core/middlewares/auth.middleware.js';

@Controller()
export class UsersController {
  constructor(private service: UsersService) {}

  // ==========================================
  // PUBLIC AUTH CONFIG (WEB ADMIN & MOBILE APP)
  // ==========================================
  @Get('/auth/public-config')
  public async getPublicAuthConfig(_req: Request, res: Response) {
    res.json({
      success: true,
      googleWebClientId: GoogleAuthService.getWebClientId(),
      googleAuthEnabled: GoogleAuthService.isConfigured(),
      emailOtpEnabled: true,
      emailSmtpConfigured: EmailOtpService.isConfigured(),
      zaloOtpEnabled: ZaloZnsService.isEnabled(),
      zaloFullyConfigured: ZaloZnsService.isFullyConfigured(),
      devConsoleOtpMode: process.env.NODE_ENV !== 'production' && !EmailOtpService.isConfigured(),
    });
  }

  // ==========================================
  // AUTHENTICATION & GOOGLE OAUTH
  // ==========================================
  @Post('/auth/login')
  public async login(req: Request, res: Response) {
    try {
      const result = await this.service.login(req.body || {});
      res.json({
        success: true,
        ...result,
        message: (result as any).message || 'Đăng nhập thành công!',
      });
    } catch (e: any) {
      res.status(401).json({ success: false, error: e.message });
    }
  }

  @Post('/auth/login/verify-2fa')
  public async verifyAdminLogin2FA(req: Request, res: Response) {
    try {
      const { preAuthToken, code, otp, challengeId } = req.body || {};
      const result = await this.service.verifyAdminLogin2FA(
        String(preAuthToken || ''),
        String(code || otp || ''),
        challengeId ? String(challengeId) : undefined
      );
      res.json({
        success: true,
        ...result,
        message: 'Xác thực 2FA thành công! Chào mừng Quản trị viên.',
      });
    } catch (e: any) {
      res.status(401).json({ success: false, error: e.message });
    }
  }

  @Post('/auth/google')
  public async googleAuth(req: Request, res: Response) {
    try {
      const { idToken, credential, portal, mode, phoneNumber, department, company } = req.body || {};
      const tokenStr = String(idToken || credential || '');
      const resolvedPortal: 'admin' | 'mobile' = portal === 'admin' ? 'admin' : 'mobile';
      const resolvedMode: 'login' | 'register' = mode === 'register' ? 'register' : 'login';

      const result = await this.service.googleAuth({
        idToken: tokenStr,
        portal: resolvedPortal,
        mode: resolvedMode,
        phoneNumber,
        department,
        company,
      });

      res.json({
        success: true,
        ...result,
        message: (result as any).message || 'Xác thực Google thành công!',
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Post('/auth/register')
  public async register(req: Request, res: Response) {
    try {
      const result = await this.service.register(req.body || {});
      res.json({
        success: true,
        ...result,
        message: (result as any).message || 'Đăng ký tài khoản thành công!',
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Get('/auth/me', authenticate)
  public async me(req: AuthenticatedRequest, res: Response) {
    try {
      const freshUser = await this.service.findByIdAsync(req.user!.id);
      if (freshUser) {
        if (!freshUser.isActive || freshUser.approvalStatus === 'PENDING') {
          res.status(401).json({ success: false, error: 'Tài khoản đã bị khóa hoặc chưa được phê duyệt.' });
          return;
        }
        res.json({
          success: true,
          user: this.service.buildUserPayload(freshUser),
          channels: VerificationService.getAvailableChannels(freshUser),
        });
        return;
      }
    } catch (_) {}
    res.json({ success: true, user: req.user });
  }

  // ==========================================
  // STEP-UP VERIFICATION (2 KÊNH: GMAIL MẶC ĐỊNH + ZALO TÙY CHỌN)
  // ==========================================
  @Get('/auth/verify/channels', authenticate)
  public async getVerifyChannels(req: AuthenticatedRequest, res: Response) {
    try {
      const freshUser = await this.service.findByIdAsync(req.user!.id);
      const channels = VerificationService.getAvailableChannels(freshUser || req.user!);
      res.json({ success: true, channels });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * Hỗ trợ cả user đã đăng nhập (Bearer token) lẫn Admin đang ở bước 2FA (preAuthToken)
   */
  @Post('/auth/verify/request')
  public async requestStepUpOtp(req: AuthenticatedRequest, res: Response) {
    try {
      const { purpose, channel, preAuthToken, targetOverride } = req.body || {};
      const resolvedChannel: OtpChannel =
        String(channel || 'EMAIL').toUpperCase() === 'ZALO' ? 'ZALO' : 'EMAIL';
      const resolvedPurpose = String(purpose || '') as StepUpPurpose;
      if (!resolvedPurpose) {
        res.status(400).json({ success: false, error: 'Thiếu mục đích xác thực (purpose).' });
        return;
      }

      let userId: string | undefined;
      if (preAuthToken) {
        const preAuth = AuthService.verifyPreAuthToken(String(preAuthToken));
        if (!preAuth) {
          res.status(401).json({ success: false, error: 'Phiên đăng nhập 2FA đã hết hạn. Vui lòng đăng nhập lại.' });
          return;
        }
        userId = preAuth.userId;
      } else {
        const authHeader = req.headers.authorization;
        const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1]?.trim() : '';
        const authUser = token ? AuthService.verifyToken(token) : null;
        if (!authUser) {
          res.status(401).json({ success: false, error: 'Unauthorized: Vui lòng đăng nhập để xác thực OTP.' });
          return;
        }
        userId = authUser.id;
      }

      const freshUser = await this.service.findByIdAsync(userId);
      if (!freshUser) {
        res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản người dùng.' });
        return;
      }

      const target =
        resolvedPurpose === 'UPDATE_CONTACT' && targetOverride
          ? String(targetOverride).trim()
          : resolvedChannel === 'EMAIL'
          ? freshUser.email
          : freshUser.phoneNumber || '';

      const result = await VerificationService.requestOtp({
        userId: freshUser.id,
        purpose: resolvedPurpose,
        channel: resolvedChannel,
        target,
        recipientName: freshUser.fullName,
      });

      res.json({
        success: true,
        ...result,
        message: result.devConsoleMode
          ? `Mã OTP (chế độ Dev) đã được in ra Terminal Backend cho ${result.maskedTarget}.`
          : resolvedChannel === 'EMAIL'
          ? `Đã gửi mã xác thực 6 chữ số tới Gmail ${result.maskedTarget}.`
          : `Đã gửi mã xác thực 6 chữ số qua Zalo tới SĐT ${result.maskedTarget}.`,
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Post('/auth/verify/confirm', authenticate)
  public async confirmStepUpOtp(req: AuthenticatedRequest, res: Response) {
    try {
      const { purpose, code, otp, challengeId } = req.body || {};
      if (!purpose) {
        res.status(400).json({ success: false, error: 'Thiếu purpose xác thực.' });
        return;
      }
      const issued = await VerificationService.confirmAndIssueStepUpToken({
        userId: req.user!.id,
        purpose: String(purpose) as StepUpPurpose,
        code: String(code || otp || ''),
        challengeId: challengeId ? String(challengeId) : undefined,
      });

      res.json({
        success: true,
        ...issued,
        message: 'Xác thực OTP thành công!',
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // ==========================================
  // FORGOT PASSWORD (CHỨC NĂNG #3)
  // ==========================================
  @Post('/auth/forgot-password/options')
  public async forgotPasswordOptions(req: Request, res: Response) {
    try {
      const { identifier } = req.body || {};
      const result = await this.service.getForgotPasswordOptions(String(identifier || ''));
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Post('/auth/forgot-password/request')
  public async requestForgotPasswordOtp(req: Request, res: Response) {
    try {
      const { identifier, channel } = req.body || {};
      const resolvedChannel: OtpChannel =
        String(channel || 'EMAIL').toUpperCase() === 'ZALO' ? 'ZALO' : 'EMAIL';
      const result = await this.service.requestForgotPasswordOtp(
        String(identifier || ''),
        resolvedChannel
      );
      res.json({
        success: true,
        ...result,
        message: result.devConsoleMode
          ? `Mã OTP khôi phục (Dev) đã được in ra Terminal Backend cho ${result.maskedTarget}.`
          : resolvedChannel === 'EMAIL'
          ? `Đã gửi mã khôi phục mật khẩu tới Gmail ${result.maskedTarget}.`
          : `Đã gửi mã khôi phục mật khẩu qua Zalo tới SĐT ${result.maskedTarget}.`,
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Post('/auth/forgot-password/confirm')
  public async confirmForgotPassword(req: Request, res: Response) {
    try {
      const { identifier, code, otp, newPassword, confirmPassword, challengeId } = req.body || {};
      if (confirmPassword && newPassword !== confirmPassword) {
        res.status(400).json({ success: false, error: 'Xác nhận mật khẩu mới không khớp.' });
        return;
      }
      const result = await this.service.confirmForgotPassword(
        String(identifier || ''),
        String(code || otp || ''),
        String(newPassword || ''),
        challengeId ? String(challengeId) : undefined
      );
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // ==========================================
  // ACCOUNT SECURITY (CHỨC NĂNG #2, #4, #5)
  // ==========================================
  @Post('/auth/change-password', authenticate, requireStepUp('CHANGE_PASSWORD'))
  public async changePassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body || {};
      if (!newPassword) {
        res.status(400).json({ success: false, error: 'Vui lòng cung cấp mật khẩu mới.' });
        return;
      }
      if (confirmPassword && newPassword !== confirmPassword) {
        res.status(400).json({ success: false, error: 'Xác nhận mật khẩu mới không khớp.' });
        return;
      }
      const result = await this.service.changePassword(req.user!.id, currentPassword, newPassword);
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/auth/profile', authenticate)
  public async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const updatedUser = await this.service.updateProfile(req.user!.id, req.body || {});
      res.json({ success: true, user: updatedUser, message: 'Cập nhật thông tin thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/auth/contact', authenticate, requireStepUp('UPDATE_CONTACT'))
  public async updateContact(req: AuthenticatedRequest, res: Response) {
    try {
      const { email, phoneNumber } = req.body || {};
      const updatedUser = await this.service.updateContact(req.user!.id, { email, phoneNumber });
      res.json({
        success: true,
        user: updatedUser,
        message: 'Cập nhật thông tin liên hệ định danh thành công!',
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Post('/auth/google/link', authenticate)
  public async linkGoogle(req: AuthenticatedRequest, res: Response) {
    try {
      const { idToken, credential } = req.body || {};
      const updatedUser = await this.service.linkGoogleAccount(
        req.user!.id,
        String(idToken || credential || '')
      );
      res.json({
        success: true,
        user: updatedUser,
        message: 'Đã liên kết tài khoản Google (Gmail) thành công!',
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Post('/auth/google/unlink', authenticate, requireStepUp('UNLINK_GOOGLE'))
  public async unlinkGoogle(req: AuthenticatedRequest, res: Response) {
    try {
      const updatedUser = await this.service.unlinkGoogleAccount(req.user!.id);
      res.json({
        success: true,
        user: updatedUser,
        message: 'Đã hủy liên kết tài khoản Google thành công!',
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Delete('/auth/account', authenticate, requireStepUp('DELETE_ACCOUNT'))
  @Post('/auth/delete-account', authenticate, requireStepUp('DELETE_ACCOUNT'))
  public async deleteAccount(req: AuthenticatedRequest, res: Response) {
    try {
      await this.service.deleteOwnAccount(req.user!.id);
      res.json({
        success: true,
        message: 'Tài khoản của bạn đã được xóa vĩnh viễn khỏi hệ thống.',
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // ==========================================
  // STAFF MANAGEMENT & PENDING CSKH APPROVAL (CHỨC NĂNG #9)
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

  @Get('/admin/staff/pending', authenticate, requireRole(['ADMIN']))
  public async getPendingStaff(_req: Request, res: Response) {
    try {
      const pending = await this.service.getPendingStaff();
      res.json({ success: true, pending, count: pending.length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/admin/staff/:id/approve', authenticate, requireRole(['ADMIN']))
  public async approvePendingStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const staff = await this.service.approvePendingStaff(
        String(req.params.id),
        req.user?.email || 'admin'
      );
      res.json({
        success: true,
        staff,
        message: `Đã phê duyệt tài khoản CSKH [${staff.fullName}] thành công!`,
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Post('/admin/staff/:id/reject', authenticate, requireRole(['ADMIN']))
  public async rejectPendingStaff(req: AuthenticatedRequest, res: Response) {
    try {
      await this.service.rejectPendingStaff(String(req.params.id), req.user?.email || 'admin');
      res.json({
        success: true,
        message: 'Đã từ chối yêu cầu đăng ký tài khoản CSKH.',
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Post('/admin/staff', authenticate, requireRole(['ADMIN']))
  public async createStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const body = req.body || {};
      // Chỉ bắt buộc Step-up OTP khi tạo tài khoản quyền ADMIN
      if (this.service.isAdminRoleInput(body.role, body.systemRole)) {
        if (!assertStepUpFromRequest(req, res, 'ADMIN_ROLE_CHANGE')) return;
      }
      const staff = await this.service.createStaff(body, req.user?.email || 'admin');
      res.json({ success: true, staff, message: 'Thêm cán bộ quản trị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/admin/staff/:id', authenticate, requireRole(['ADMIN']))
  public async updateStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const body = req.body || {};
      const existing = await this.service.findByIdAsync(id);
      const willBeAdmin = this.service.isAdminRoleInput(body.role, body.systemRole);
      const wasAdmin = existing?.role === 'ADMIN';

      // Bắt buộc Step-up OTP khi nâng quyền lên ADMIN hoặc chỉnh sửa tài khoản ADMIN
      if (willBeAdmin || wasAdmin) {
        if (!assertStepUpFromRequest(req, res, 'ADMIN_ROLE_CHANGE')) return;
      }

      const staff = await this.service.updateStaff(id, body, req.user?.email || 'admin');
      res.json({ success: true, staff, message: 'Cập nhật cán bộ thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Delete('/admin/staff/:id', authenticate, requireRole(['ADMIN']))
  public async deleteStaff(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const existing = await this.service.findByIdAsync(id);
      if (existing?.role === 'ADMIN') {
        if (!assertStepUpFromRequest(req, res, 'ADMIN_ROLE_CHANGE')) return;
      }
      await this.service.deleteStaff(id);
      res.json({ success: true, message: 'Đã xóa cán bộ khỏi hệ thống!' });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  }

  @Put('/admin/staff/:id/status', authenticate, requireRole(['ADMIN']))
  public async toggleStaffStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const id = String(req.params.id);
      const existing = await this.service.findByIdAsync(id);
      if (existing?.role === 'ADMIN') {
        if (!assertStepUpFromRequest(req, res, 'ADMIN_ROLE_CHANGE')) return;
      }
      const staff = await this.service.toggleStaffStatus(id, req.body?.isActive);
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
  @Get('/admin/customers', authenticate, requireRole(['ADMIN', 'CSKH']))
  @Get('/customers', authenticate, requireRole(['ADMIN', 'CSKH']))
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
      const customer = await this.service.createCustomer(req.body);
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
        message: 'Cập nhật thông tin khách hàng thành công!',
      });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Delete('/admin/customers/:id', authenticate, requireRole(['ADMIN']))
  @Delete('/customers/:id', authenticate, requireRole(['ADMIN']))
  public async deleteCustomer(req: Request, res: Response) {
    try {
      await this.service.deleteCustomer(String(req.params.id));
      res.json({ success: true, message: 'Đã xóa tài khoản khách hàng thành công!' });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  }

  @Put('/admin/customers/:id/status', authenticate, requireRole(['ADMIN', 'CSKH']))
  public async toggleCustomerStatus(req: Request, res: Response) {
    try {
      const customer = await this.service.toggleCustomerStatus(
        String(req.params.id),
        req.body.isActive
      );
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
