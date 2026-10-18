import { z } from 'zod';

/**
 * 1. GROUP (Nhóm sản phẩm / Thương hiệu)
 */
export interface DeviceGroup {
  id: number;
  groupName: string;         // e.g. "CỬA CUỐN NHÔM CÔNG NGHỆ ĐỨC"
  code: string;              // e.g. "DOOR_GERMAN_ALU"
  imageUrl?: string;
  bannerUrl?: string;
  description?: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const DeviceGroupValidator = z.object({
  id: z.number().int().positive().optional(),
  groupName: z.string().min(2).max(120),
  code: z.string().min(2).max(50),
  imageUrl: z.string().url().optional().or(z.literal('')),
  bannerUrl: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  displayOrder: z.number().int().default(0),
});

/**
 * 2. DEVICE TYPE (Loại phần cứng kỹ thuật / Hardware Archetype)
 */
export interface DeviceType {
  id: number;
  typeName: string;          // e.g. "Roller Door", "Smart Lock", "UPS", "Socket"
  typeCode: string;          // e.g. "DOOR", "SMART_LOCK", "UPS", "SOCKET", "BIKE_TRACKER"
  iconSvg?: string;
  description?: string;
  createdAt: string;
}

export const DeviceTypeValidator = z.object({
  id: z.number().int().positive().optional(),
  typeName: z.string().min(2).max(100),
  typeCode: z.string().min(2).max(50),
  iconSvg: z.string().optional(),
  description: z.string().optional(),
});

/**
 * 3. PROPERTY (Từ điển thuộc tính & Telemetry)
 */
export type PropertyDataType = 'boolean' | 'integer' | 'float' | 'string' | 'enum' | 'json';
export type UIWidgetType = 'toggle' | 'gauge' | 'slider' | 'segmented' | 'status_badge' | 'telemetry_graph' | 'action_button';

export interface Property {
  id: number;
  propertyKey: string;       // e.g. "open_state", "battery_level", "rf_list", "motor_current"
  displayName: string;       // e.g. "Trạng thái cửa", "Mức pin (%)"
  dataType: PropertyDataType;
  unit?: string;             // "%", "V", "A", "°C", "km/h"
  uiWidgetType: UIWidgetType;
  isControllable: boolean;   // Có thể gửi lệnh tác động xuống không?
  validationRule?: {
    min?: number;
    max?: number;
    enumOptions?: string[];
    regex?: string;
  };
  description?: string;
}

export const PropertyValidator = z.object({
  id: z.number().int().positive().optional(),
  propertyKey: z.string().regex(/^[a-zA-Z0-9_]+$/, 'Key phải chứa chữ cái, số hoặc gạch dưới'),
  displayName: z.string().min(2).max(120),
  dataType: z.enum(['boolean', 'integer', 'float', 'string', 'enum', 'json']),
  unit: z.string().max(20).optional(),
  uiWidgetType: z.enum(['toggle', 'gauge', 'slider', 'segmented', 'status_badge', 'telemetry_graph', 'action_button']),
  isControllable: z.boolean().default(false),
  validationRule: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    enumOptions: z.array(z.string()).optional(),
    regex: z.string().optional(),
  }).optional(),
  description: z.string().optional(),
});

/**
 * 4. DEVICE MODEL (Khuôn mẫu sản phẩm thương mại)
 */
export interface ModelPropertyConfig {
  propertyKey: string;
  isRequired: boolean;
  defaultValue?: any;
  alertThresholdLow?: number;
  alertThresholdHigh?: number;
}

export interface DeviceModel {
  id: number;
  modelName: string;         // e.g. "Austec Titadoor A900 Super"
  modelCode: string;         // e.g. "AUSTEC-A900"
  groupId: number;           // References DeviceGroup.id
  typeId: number;            // References DeviceType.id
  firmwareVersionLatest: string; // e.g. "v2.4.1"
  hardwareVersion: string;   // e.g. "HW-REV-B"
  supplier: string;          // e.g. "Austec Factory 1"
  imageUrl?: string;
  propertiesConfig: ModelPropertyConfig[];
  controlCapabilities: string[]; // e.g. ["OPEN", "CLOSE", "STOP", "LOCK"]
  createdAt: string;
}

export const DeviceModelValidator = z.object({
  id: z.number().int().positive().optional(),
  modelName: z.string().min(2).max(120),
  modelCode: z.string().min(2).max(60),
  groupId: z.number().int().positive(),
  typeId: z.number().int().positive(),
  firmwareVersionLatest: z.string().default('v1.0.0'),
  hardwareVersion: z.string().default('HW-REV-A'),
  supplier: z.string().default('Austec Global'),
  imageUrl: z.string().optional(),
  propertiesConfig: z.array(z.object({
    propertyKey: z.string(),
    isRequired: z.boolean().default(false),
    defaultValue: z.any().optional(),
    alertThresholdLow: z.number().optional(),
    alertThresholdHigh: z.number().optional(),
  })),
  controlCapabilities: z.array(z.string()).default([]),
});

/**
 * 5. DEVICE INVENTORY (Kho thiết bị xuất xưởng)
 */
export type InventoryStatus = 'IN_WAREHOUSE' | 'DISTRIBUTED' | 'ACTIVATED' | 'MAINTENANCE' | 'DECOMMISSIONED';

export interface DeviceInventory {
  id: string;                // UUID
  hardwareId: string;        // e.g. "AT-DOOR-88239A01"
  macAddress: string;        // e.g. "FC:F5:C4:88:23:9A"
  modelId: number;           // References DeviceModel.id
  batchNumber: string;       // e.g. "LOT-2026-Q1-01"
  supplier: string;
  status: InventoryStatus;
  producedAt: string;        // YYYY-MM-DD
  warrantyMonths: number;    // e.g. 24
  qrCodeHash: string;        // Băm bảo mật chống giả mạo tem
  createdAt: string;
}

export const DeviceInventoryValidator = z.object({
  id: z.string().uuid().optional(),
  hardwareId: z.string().min(4).max(100),
  macAddress: z.string().regex(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/, 'Địa chỉ MAC không hợp lệ'),
  modelId: z.number().int().positive(),
  batchNumber: z.string().min(2).max(50),
  supplier: z.string().default('Austec Factory'),
  status: z.enum(['IN_WAREHOUSE', 'DISTRIBUTED', 'ACTIVATED', 'MAINTENANCE', 'DECOMMISSIONED']).default('IN_WAREHOUSE'),
  producedAt: z.string(),
  warrantyMonths: z.number().int().default(24),
  qrCodeHash: z.string().min(10),
});

/**
 * 6. CUSTOMER (Người dùng cuối)
 */
export interface Customer {
  id: string;                // UUID
  fullName: string;
  email: string;
  phone: string;
  gender?: 'Male' | 'Female' | 'Other';
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const CustomerValidator = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^(0|\+84)[0-9]{9,10}$/, 'Số điện thoại không hợp lệ'),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

/**
 * 7. DEVICE INSTANCE (Thực thể hoạt động của thiết bị gắn với Người dùng)
 */
export interface DeviceInstance {
  id: string;                // UUID
  hardwareId: string;        // Foreign Key to DeviceInventory.hardwareId
  customName: string;        // e.g. "Cửa cuốn Gara", "Cổng chính"
  ownerId: string;           // Foreign Key to Customer.id
  firmwareVersionCurrent: string;
  isOnline: boolean;
  lastHeartbeat?: string;
  ipAddress?: string;
  rssiSignal?: number;       // dBm
  currentProperties: Record<string, any>; // Snapshot giá trị telemetry mới nhất
  warrantyStartAt?: string;
  warrantyEndAt?: string;
  locationLat?: number;
  locationLng?: number;
  addressDisplay?: string;
  createdAt: string;
}

export const DeviceInstanceValidator = z.object({
  id: z.string().uuid().optional(),
  hardwareId: z.string().min(4),
  customName: z.string().min(1).max(100),
  ownerId: z.string().uuid(),
  firmwareVersionCurrent: z.string().default('v1.0.0'),
  isOnline: z.boolean().default(false),
  lastHeartbeat: z.string().optional(),
  ipAddress: z.string().optional(),
  rssiSignal: z.number().int().optional(),
  currentProperties: z.record(z.any()).default({}),
  warrantyStartAt: z.string().optional(),
  warrantyEndAt: z.string().optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
  addressDisplay: z.string().optional(),
});

/**
 * 8. DEVICE BLACKBOX AUDIT LOG (Hộp đen kiểm toán)
 */
export type ActorRole = 'CUSTOMER' | 'ADMIN' | 'CSKH' | 'SYSTEM';
export type AckStatus = 'SUCCESS' | 'TIMEOUT' | 'REJECTED' | 'ERROR';

export interface DeviceBlackboxLog {
  id: number;
  hardwareId: string;
  actorId?: string;
  actorRole: ActorRole;
  actorIp?: string;
  actionType: string;        // e.g. "CMD_OPEN", "CMD_CLOSE", "CHANGE_PWD"
  payloadSent: any;
  ackStatus: AckStatus;
  latencyMs: number;         // ms
  createdAt: string;
}

/**
 * 9. SUPPORT TICKET & LIVE CHAT (CSKH)
 */
export type TicketStatus = 'OPEN' | 'PROCESSING' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'URGENT';

export interface SupportTicket {
  id: string;
  customerId: string;
  hardwareId?: string;
  status: TicketStatus;
  priority: TicketPriority;
  subject: string;
  assignedCskhId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LiveChatMessage {
  id: number;
  ticketId: string;
  senderId: string;
  senderRole: 'CUSTOMER' | 'CSKH';
  message: string;
  attachmentUrls?: string[];
  deviceSnapshot?: Record<string, any>; // Đính kèm snapshot viễn thám thiết bị khi gửi
  createdAt: string;
}
