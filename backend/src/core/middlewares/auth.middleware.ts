import { Request, Response, NextFunction } from 'express';
import { AuthService, AuthenticatedRequest, UserRole, AuthUser } from '../../services/auth.service.js';

export { AuthenticatedRequest, UserRole, AuthUser };

export const authenticate = AuthService.authenticate;
export const requireRole = AuthService.requireRole;
export const signToken = AuthService.signToken;
export const verifyToken = AuthService.verifyToken;
