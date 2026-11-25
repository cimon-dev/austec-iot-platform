import {
  AuthService,
  AuthenticatedRequest,
  UserRole,
  AuthUser,
  StepUpPurpose,
} from '../../services/auth.service.js';
import { requireStepUp, assertStepUpFromRequest } from './stepup.middleware.js';

export { AuthenticatedRequest, UserRole, AuthUser, StepUpPurpose, requireStepUp, assertStepUpFromRequest };

export const authenticate = AuthService.authenticate;
export const requireRole = AuthService.requireRole;
export const signToken = AuthService.signToken;
export const verifyToken = AuthService.verifyToken;
