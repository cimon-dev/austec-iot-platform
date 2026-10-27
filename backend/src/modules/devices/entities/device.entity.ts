export interface DeviceGroupEntity {
  id: number;
  code: string;
  groupName: string;
  description?: string;
  imageUrl?: string;
  bannerUrl?: string;
  displayOrder?: number;
  deviceCount?: number;
  onlineRate?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceTypeEntity {
  id: number;
  typeCode: string;
  typeName: string;
  description?: string;
  imageUrl?: string;
  iconSvg?: string;
  createdAt?: string;
}

export interface DevicePropertyEntity {
  id: number;
  propertyKey: string;
  displayName: string;
  dataType: string;
  unit?: string;
  uiWidgetType?: string;
  isControllable?: boolean;
  minVal?: number;
  maxVal?: number;
  description?: string;
  createdAt?: string;
}

export interface DeviceModelEntity {
  id: number;
  modelCode: string;
  modelName: string;
  groupId?: number;
  typeId?: number;
  firmwareVersionLatest?: string;
  hardwareVersion?: string;
  supplier?: string;
  imageUrl?: string;
  assignedProperties?: string[];
  controlCapabilities?: string[];
  createdAt?: string;
}

export interface DeviceInstanceEntity {
  id: string;
  hardwareId: string;
  customName?: string;
  ownerId?: string;
  ownerName?: string;
  ownerPhone?: string;
  deviceType?: string;
  modelName?: string;
  firmwareVersionCurrent?: string;
  isOnline: boolean;
  lastHeartbeat?: string;
  currentProperties?: Record<string, any>;
  warrantyStartAt?: string;
  warrantyEndAt?: string;
  subscriptionType?: string;
  subscriptionStatus?: string;
  addressDisplay?: string;
  createdAt?: string;
}
