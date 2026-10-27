import { z } from 'zod';

export const CreateGroupSchema = z.object({
  code: z.string().min(1, 'Mã nhóm không được để trống'),
  group_name: z.string().min(1, 'Tên nhóm không được để trống'),
  image_url: z.string().optional(),
  banner_url: z.string().optional(),
  description: z.string().optional(),
});

export const CreateDeviceTypeSchema = z.object({
  type_code: z.string().min(1, 'Mã loại phần cứng không được để trống'),
  type_name: z.string().min(1, 'Tên loại phần cứng không được để trống'),
  image_url: z.string().optional(),
  description: z.string().optional(),
});

export const CreatePropertySchema = z.object({
  property_key: z.string().min(1, 'Mã định danh thuộc tính không được để trống'),
  display_name: z.string().min(1, 'Tên hiển thị không được để trống'),
  data_type: z.string().default('BOOLEAN'),
  unit: z.string().optional(),
  ui_widget_type: z.string().default('TOGGLE'),
  is_controllable: z.boolean().default(true),
  min_val: z.number().optional(),
  max_val: z.number().optional(),
});

export const CreateModelSchema = z.object({
  model_code: z.string().min(1, 'Mã thương phẩm không được để trống'),
  model_name: z.string().min(1, 'Tên thương phẩm không được để trống'),
  group_id: z.number().int().positive().optional(),
  type_id: z.number().int().positive().optional(),
  image_url: z.string().optional(),
  firmware_version_latest: z.string().optional(),
  hardware_version: z.string().optional(),
  assigned_properties: z.array(z.string()).optional(),
});

export const DeviceControlSchema = z.object({
  hardwareId: z.string().min(1),
  command: z.string().min(1),
  params: z.any().optional(),
});

export const DevicePairSchema = z.object({
  hardwareId: z.string().min(1),
  qrHash: z.string().optional(),
  deviceName: z.string().optional(),
  location: z.string().optional(),
});
