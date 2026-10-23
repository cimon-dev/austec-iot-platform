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
  subscriptionType?: 'LIMITED' | 'PERPETUAL';
  subscriptionExpiresAt?: string;
  subscriptionStatus?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'LIFETIME';
  deviceType?: string;
  installationAddress?: {
    street?: string;
    ward?: string;
    district?: string;
    province?: string;
    fullText?: string;
  };
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
  subscriptionType: z.enum(['LIMITED', 'PERPETUAL']).default('LIMITED'),
  subscriptionExpiresAt: z.string().optional(),
  subscriptionStatus: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'LIFETIME']).optional(),
  deviceType: z.string().optional(),
  installationAddress: z.object({
    street: z.string().optional(),
    ward: z.string().optional(),
    district: z.string().optional(),
    province: z.string().optional(),
    fullText: z.string().optional(),
  }).optional(),
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
  selectedDevice?: any;
  deviceSnapshot?: Record<string, any>; // Đính kèm snapshot viễn thám thiết bị khi gửi
  createdAt: string;
}

/**
 * 10. PRODUCT (Gian hàng sản phẩm & Thông số kỹ thuật xuất xưởng)
 */
export interface Product {
  id: string;
  name: string;
  categoryTag: string; // "Cửa Cuốn", "Khóa Masaru", "Lưu Điện UPS", "Động Cơ", "Cảm Biến", "AI Camera", "Phụ Kiện"
  subtitle: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewsCount: number;
  imageUrl: string;
  galleryUrls?: string[];
  warrantyText: string; // "Bảo hành chính hãng 24 tháng theo Hardware ID"
  highlights: string[]; // Danh sách đặc điểm nổi bật
  specs: Record<string, string>; // Bảng thông số kỹ thuật xuất xưởng (Specs: Nan cửa, Động cơ, Điện áp...)
  stockQuantity: number;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const ProductValidator = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(150),
  categoryTag: z.string().min(2).max(50),
  subtitle: z.string().max(255).default(''),
  price: z.number().nonnegative(),
  originalPrice: z.number().nonnegative().optional(),
  rating: z.number().min(0).max(5).default(5),
  reviewsCount: z.number().int().nonnegative().default(0),
  imageUrl: z.string(),
  galleryUrls: z.array(z.string()).default([]),
  warrantyText: z.string().default('Bảo hành chính hãng 24 tháng theo Hardware ID'),
  highlights: z.array(z.string()).default([]),
  specs: z.record(z.string()).default({}),
  stockQuantity: z.number().int().default(100),
  isPublished: z.boolean().default(true),
  displayOrder: z.number().int().default(0),
});

/**
 * 11. DEVICE MEMBER PERMISSION (Phân quyền thành viên gia đình sử dụng thiết bị)
 */
export type MemberRole = 'OWNER' | 'MEMBER' | 'GUEST';

export interface DeviceMemberPermission {
  id: string;
  hardwareId: string;
  userId: string;
  memberName: string;
  phoneNumber: string;
  role: MemberRole;
  canControl: boolean;
  canViewHistory: boolean;
  canChildLock: boolean;
  canConfig: boolean;
  scheduleLimitActive: boolean;
  accessStartTime?: string; // e.g. "08:00"
  accessEndTime?: string;   // e.g. "18:00"
  accessDays?: boolean[];   // [T2, T3, T4, T5, T6, T7, CN]
  createdAt: string;
  updatedAt?: string;
}

export const DeviceMemberPermissionValidator = z.object({
  id: z.string().optional(),
  hardwareId: z.string().min(4),
  userId: z.string().min(1),
  memberName: z.string().min(2),
  phoneNumber: z.string().min(8),
  role: z.enum(['OWNER', 'MEMBER', 'GUEST']),
  canControl: z.boolean().default(true),
  canViewHistory: z.boolean().default(true),
  canChildLock: z.boolean().default(false),
  canConfig: z.boolean().default(false),
  scheduleLimitActive: z.boolean().default(false),
  accessStartTime: z.string().optional(),
  accessEndTime: z.string().optional(),
  accessDays: z.array(z.boolean()).optional(),
});

/**
 * 12. CUSTOMER SUPPORT REQUEST (Phiếu yêu cầu hỗ trợ / Báo hỏng từ khách hàng)
 */
export type SupportRequestType = 
  | 'WARRANTY'           // Yêu cầu bảo hành chính hãng
  | 'ROLLER_DOOR_JAM'    // Sự cố kẹt nan / hỏng motor
  | 'CONNECTION_ERROR'   // Lỗi kết nối WiFi / BLE
  | 'BATTERY_REPLACE'    // Hỏng ắc quy / Thay pin UPS
  | 'RENEW_SUBSCRIPTION' // Gia hạn gói dịch vụ thiết bị
  | 'PURCHASE_ADVICE'    // Tư vấn lắp đặt & Mua thêm thiết bị
  | 'OTHER';             // Yêu cầu khác

export type ReplyChannelType = 'EMAIL' | 'PUSH_NOTIFICATION' | 'PHONE_CALL';

export interface CustomerSupportRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  hardwareId?: string;
  requestType: SupportRequestType;
  requestTypeName: string;
  description: string;
  attachmentUrls: string[];
  replyChannel: ReplyChannelType;
  contactEmail?: string;
  priority: 'LOW' | 'NORMAL' | 'URGENT';
  status: 'OPEN' | 'PROCESSING' | 'RESOLVED' | 'CLOSED';
  adminResponse?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const CustomerSupportRequestValidator = z.object({
  id: z.string().optional(),
  customerId: z.string(),
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  hardwareId: z.string().optional(),
  requestType: z.enum([
    'WARRANTY',
    'ROLLER_DOOR_JAM',
    'CONNECTION_ERROR',
    'BATTERY_REPLACE',
    'RENEW_SUBSCRIPTION',
    'PURCHASE_ADVICE',
    'OTHER'
  ]),
  requestTypeName: z.string(),
  description: z.string().min(5),
  attachmentUrls: z.array(z.string()).default([]),
  replyChannel: z.enum(['EMAIL', 'PUSH_NOTIFICATION', 'PHONE_CALL']).default('EMAIL'),
  contactEmail: z.string().email().optional().or(z.literal('')),
  priority: z.enum(['LOW', 'NORMAL', 'URGENT']).default('NORMAL'),
  status: z.enum(['OPEN', 'PROCESSING', 'RESOLVED', 'CLOSED']).default('OPEN'),
  adminResponse: z.string().optional(),
});

/**
 * 13. SYSTEM ROLE & ROLE PERMISSIONS (Phân quyền vai trò quản trị động)
 */
export interface SystemRole {
  id: number;
  roleCode: string;
  roleName: string;
  description?: string;
  isSystem: boolean;
  userCount?: number;
  permissions?: RolePermission[];
  createdAt: string;
}

export interface RolePermission {
  id?: number;
  roleId: number;
  moduleId: string;
  moduleName: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canAll: boolean;
}

/**
 * 14. ORDER & ORDER ITEMS (Đơn đặt hàng từ gian hàng Mobile App)
 */
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  id?: number;
  orderId?: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  totalAmount: number;
  status: OrderStatus;
  notes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * 15. RF REMOTE (Quản lý tay remote RF cửa cuốn)
 */
export interface RfRemote {
  id?: number;
  hardwareId: string;
  remoteCode: string;
  remoteName: string;
  pairedAt: string;
  isBlocked: boolean;
}

