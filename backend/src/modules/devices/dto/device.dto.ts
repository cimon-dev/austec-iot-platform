import { z } from 'zod';

export const CreateGroupSchema = z.object({
  code: z.string().min(1, 'Mã nhóm không được để trống'),
  name: z.string().optional(),
  group_name: z.string().optional(),
  groupName: z.string().optional(),
  imageUrl: z.string().optional(),
  image_url: z.string().optional(),
  bannerUrl: z.string().optional(),
  banner_url: z.string().optional(),
  description: z.string().optional(),
  displayOrder: z.number().optional(),
  display_order: z.number().optional(),
}).refine(data => !!(data.name || data.group_name || data.groupName), {
  message: 'Tên nhóm không được để trống',
  path: ['name'],
});

export const CreateDeviceTypeSchema = z.object({
  typeCode: z.string().optional(),
  type_code: z.string().optional(),
  code: z.string().optional(),
  typeName: z.string().optional(),
  type_name: z.string().optional(),
  name: z.string().optional(),
  imageUrl: z.string().optional(),
  image_url: z.string().optional(),
  iconSvg: z.string().optional(),
  icon_svg: z.string().optional(),
  description: z.string().optional(),
}).refine(data => !!(data.typeCode || data.type_code || data.code), {
  message: 'Mã loại phần cứng không được để trống',
  path: ['typeCode'],
}).refine(data => !!(data.typeName || data.type_name || data.name), {
  message: 'Tên loại phần cứng không được để trống',
  path: ['typeName'],
});

export const CreatePropertySchema = z.object({
  propertyKey: z.string().optional(),
  property_key: z.string().optional(),
  displayName: z.string().optional(),
  display_name: z.string().optional(),
  dataType: z.string().optional(),
  data_type: z.string().optional(),
  unit: z.string().optional(),
  uiWidgetType: z.string().optional(),
  ui_widget_type: z.string().optional(),
  isControllable: z.boolean().optional(),
  is_controllable: z.boolean().optional(),
  minVal: z.number().optional(),
  min_val: z.number().optional(),
  maxVal: z.number().optional(),
  max_val: z.number().optional(),
  description: z.string().optional(),
}).refine(data => !!(data.propertyKey || data.property_key), {
  message: 'Mã định danh thuộc tính không được để trống',
  path: ['propertyKey'],
}).refine(data => !!(data.displayName || data.display_name), {
  message: 'Tên hiển thị không được để trống',
  path: ['displayName'],
});

export const CreateModelSchema = z.object({
  modelCode: z.string().optional(),
  model_code: z.string().optional(),
  modelName: z.string().optional(),
  model_name: z.string().optional(),
  groupId: z.number().int().positive().optional(),
  group_id: z.number().int().positive().optional(),
  typeId: z.number().int().positive().optional(),
  type_id: z.number().int().positive().optional(),
  imageUrl: z.string().optional(),
  image_url: z.string().optional(),
  firmwareVersionLatest: z.string().optional(),
  firmware_version_latest: z.string().optional(),
  hardwareVersion: z.string().optional(),
  hardware_version: z.string().optional(),
  supplier: z.string().optional(),
  assignedProperties: z.array(z.string()).optional(),
  assigned_properties: z.array(z.string()).optional(),
}).refine(data => !!(data.modelCode || data.model_code), {
  message: 'Mã thương phẩm không được để trống',
  path: ['modelCode'],
}).refine(data => !!(data.modelName || data.model_name), {
  message: 'Tên thương phẩm không được để trống',
  path: ['modelName'],
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
