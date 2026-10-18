import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export type UserRole = 'ADMIN' | 'CSKH' | 'CUSTOMER';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'austec-super-secret-jwt-key-2026';

export class AuthService {
  public static signToken(user: AuthUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  public static verifyToken(token: string): AuthUser | null {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthUser;
    } catch {
      return null;
    }
  }

  /**
   * Middleware xác thực Token
   */
  public static authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Unauthorized: Thiếu Bearer Token' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const user = AuthService.verifyToken(token);
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized: Token không hợp lệ hoặc đã hết hạn' });
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
