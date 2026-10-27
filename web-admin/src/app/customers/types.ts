export interface CustomerDevice {
  hardwareId: string;
  modelName: string;
  deviceType: string;
  pairedAt: string;
  warrantyUntil: string;
  isOnline: boolean;
  roleInHome: "OWNER" | "MEMBER" | "GUEST" | string;
}

export interface CustomerAccount {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  province: string;
  registeredAt: string;
  isActive: boolean;
  devices: CustomerDevice[];
}

export interface MemberPermissionItem {
  id: string;
  userId: string;
  memberName: string;
  phoneNumber: string;
  role: "MEMBER" | "GUEST" | "TECH" | string;
  canControl: boolean;
  canViewHistory: boolean;
  canChildLock: boolean;
  canConfig: boolean;
  scheduleLimitActive: boolean;
  accessStartTime: string;
  accessEndTime: string;
  accessDays: boolean[];
}

export interface MatrixDeviceItem {
  hardwareId: string;
  deviceName: string;
  modelName: string;
  deviceType: string;
  isOnline: boolean;
  subscriptionType: "LIMITED" | "PERPETUAL" | string;
  members: MemberPermissionItem[];
}

export interface MatrixOwnerItem {
  ownerId: string;
  ownerName: string;
  phoneNumber: string;
  email: string;
  address: string;
  devices: MatrixDeviceItem[];
}
