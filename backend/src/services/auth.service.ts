import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export type UserRole = 'ADMIN' | 'CSKH' | 'CUSTOMER';

export type StepUpPurpose =
  | 'ADMIN_LOGIN_2FA'
  | 'CHANGE_PASSWORD'
  | 'FORGOT_PASSWORD'
  | 'UPDATE_CONTACT'
  | 'UNLINK_GOOGLE'
  | 'DELETE_ACCOUNT'
  | 'TRANSFER_DEVICE'
  | 'UNPAIR_DEVICE'
  | 'OTA_ADMIN'
  | 'ADMIN_ROLE_CHANGE'
  | 'SYSTEM_SETTINGS';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  address?: string;
  province?: string;
}

export interface PreAuthPayload {
  scope: 'ADMIN_2FA_PENDING';
  userId: string;
  email: string;
  role: UserRole;
}

export interface StepUpTokenPayload {
  scope: 'STEPUP_VERIFIED';
  userId: string;
  purpose: StepUpPurpose;
  channel: 'EMAIL' | 'ZALO';
  verifiedAt: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  stepUp?: StepUpTokenPayload;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'austec-jwt-secret-key-super-secure-2026';
}

function getStepUpSecret(): string {
  return process.env.STEPUP_JWT_SECRET || `${getJwtSecret()}-stepup`;
}

export function getStepUpTtlMinutes(): number {
  const parsed = Number(process.env.STEPUP_TTL_MINUTES || 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

export class AuthService {
  public static signToken(user: AuthUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        avatarUrl: user.avatarUrl,
        address: user.address,
        province: user.province,
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    );
  }

  public static verifyToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as any;
      if (!decoded || decoded.scope === 'ADMIN_2FA_PENDING' || decoded.scope === 'STEPUP_VERIFIED') {
        return null;
      }
      if (!decoded.id || !decoded.role) {
        return null;
      }
      return decoded as AuthUser;
    } catch {
      return null;
    }
  }

  public static signPreAuthToken(user: { id: string; email: string; role: UserRole }): string {
    const payload: PreAuthPayload = {
      scope: 'ADMIN_2FA_PENDING',
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, getStepUpSecret(), { expiresIn: '10m' });
  }

  public static verifyPreAuthToken(token: string): PreAuthPayload | null {
    try {
      const decoded = jwt.verify(token, getStepUpSecret()) as PreAuthPayload;
      if (!decoded || decoded.scope !== 'ADMIN_2FA_PENDING' || !decoded.userId) {
        return null;
      }
      return decoded;
    } catch {
      return null;
    }
  }

  public static signStepUpToken(
    userId: string,
    purpose: StepUpPurpose,
    channel: 'EMAIL' | 'ZALO'
  ): { token: string; expiresInSeconds: number } {
    const ttlMinutes = getStepUpTtlMinutes();
    const payload: StepUpTokenPayload = {
      scope: 'STEPUP_VERIFIED',
      userId,
      purpose,
      channel,
      verifiedAt: new Date().toISOString(),
    };
    const token = jwt.sign(payload, getStepUpSecret(), {
      expiresIn: `${ttlMinutes}m`,
    });
    return { token, expiresInSeconds: ttlMinutes * 60 };
  }

  public static verifyStepUpToken(
    token: string,
    expectedUserId: string,
    expectedPurpose: StepUpPurpose
  ): StepUpTokenPayload | null {
    try {
      const decoded = jwt.verify(token, getStepUpSecret()) as StepUpTokenPayload;
      if (
        !decoded ||
        decoded.scope !== 'STEPUP_VERIFIED' ||
        decoded.userId !== expectedUserId ||
        decoded.purpose !== expectedPurpose
      ) {
        return null;
      }
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Middleware xác thực Bearer JWT thực tế (không còn token bypass mẫu)
   */
  public static authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Unauthorized: Thiếu Bearer Token' });
      return;
    }

    const token = authHeader.split(' ')[1]?.trim();
    if (!token) {
      res.status(401).json({ success: false, error: 'Unauthorized: Token trống' });
      return;
    }

    const user = AuthService.verifyToken(token);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
      });
      return;
    }

    req.user = user;
    next();
  }

  /**
   * Middleware phân quyền RBAC đa tầng
   */
  public static requireRole(allowedRoles: UserRole[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        res.status(403).json({
          success: false,
          error: `Forbidden: Quyền '${req.user.role}' không được phép truy cập chức năng này (Yêu cầu: ${allowedRoles.join(', ')})`,
        });
        return;
      }

      next();
    };
  }
}
