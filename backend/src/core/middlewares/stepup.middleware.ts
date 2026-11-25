import { Response, NextFunction } from 'express';
import { AuthService, AuthenticatedRequest, StepUpPurpose } from '../../services/auth.service.js';

export function extractStepUpToken(req: AuthenticatedRequest): string {
  const headerToken = req.headers['x-stepup-token'] || req.headers['x-step-up-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }
  if (req.body && typeof req.body.stepUpToken === 'string' && req.body.stepUpToken.trim()) {
    return req.body.stepUpToken.trim();
  }
  return '';
}

export function assertStepUpFromRequest(
  req: AuthenticatedRequest,
  res: Response,
  purpose: StepUpPurpose
): boolean {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Unauthorized: Vui lòng đăng nhập lại.' });
    return false;
  }

  const token = extractStepUpToken(req);
  if (!token) {
    res.status(403).json({
      success: false,
      requireStepUp: true,
      stepUpPurpose: purpose,
      error: 'Thao tác bảo mật cao yêu cầu xác thực OTP (Gmail hoặc Zalo).',
    });
    return false;
  }

  const verified = AuthService.verifyStepUpToken(token, req.user.id, purpose);
  if (!verified) {
    res.status(403).json({
      success: false,
      requireStepUp: true,
      stepUpPurpose: purpose,
      error: 'Phiên xác thực OTP không hợp lệ hoặc đã hết hạn. Vui lòng xác thực lại.',
    });
    return false;
  }

  req.stepUp = verified;
  return true;
}

/**
 * Middleware yêu cầu X-StepUp-Token hợp lệ cho đúng hành động (purpose)
 */
export function requireStepUp(purpose: StepUpPurpose) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!assertStepUpFromRequest(req, res, purpose)) {
      return;
    }
    next();
  };
}

