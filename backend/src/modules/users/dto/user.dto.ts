import { z } from 'zod';

export const LoginSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  phoneNumber: z.string().optional(),
  password: z.string().optional(),
  otp: z.string().optional(),
  role: z.string().optional(),
});

export type LoginDto = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  fullName: z.string().min(1, 'Họ tên không được để trống'),
  email: z.string().email().optional().or(z.literal('')),
  phoneNumber: z.string().min(8, 'Số điện thoại không hợp lệ').optional().or(z.literal('')),
  password: z.string().optional(),
  address: z.string().optional(),
  province: z.string().optional(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;

export const CreateStaffSchema = z.object({
  name: z.string().optional(),
  fullName: z.string().min(1, 'Họ tên không được để trống'),
  email: z.string().email('Email không đúng định dạng'),
  phone: z.string().optional(),
  phoneNumber: z.string().optional(),
  company: z.string().optional(),
  department: z.string().optional(),
  role: z.string().optional(),
  systemRole: z.enum(['ADMIN', 'CSKH']).optional(),
  password: z.string().optional(),
});

export type CreateStaffDto = z.infer<typeof CreateStaffSchema>;

export const CreateCustomerSchema = z.object({
  fullName: z.string().min(1, 'Họ tên không được để trống'),
  phoneNumber: z.string().min(8, 'Số điện thoại không được để trống'),
  email: z.string().email('Email không đúng định dạng'),
  password: z.string().optional(),
  address: z.string().optional(),
  province: z.string().optional(),
  isActive: z.boolean().optional(),
  initialHardwareId: z.string().optional(),
});

export type CreateCustomerDto = z.infer<typeof CreateCustomerSchema>;
