export interface TicketMessage {
  sender: "CUSTOMER" | "CSKH" | string;
  senderRole?: string;
  text: string;
  time: string;
  createdAt?: string;
  hasSnapshot?: boolean;
  attachmentUrls?: string[];
  selectedDevice?: {
    isOwned: boolean;
    hardwareId?: string;
    deviceName: string;
    modelName: string;
    categoryTag: string;
    specs?: Record<string, string>;
    imageUrl?: string;
    price?: number;
    subscriptionStatus?: string;
    warrantyMonths?: number;
    activationDate?: string;
  };
}

export interface TechnicalSnapshot {
  model: string;
  fwVersion: string;
  rssi: number;
  battery: number;
  isOnline: boolean;
  lastHeartbeat: string;
  diagnostics: string;
}

export interface Ticket {
  id: string;
  customerName: string;
  customerPhone: string;
  hardwareId: string;
  deviceName: string;
  subject: string;
  status: "OPEN" | "PROCESSING" | "RESOLVED" | string;
  priority: "URGENT" | "NORMAL" | "LOW" | string;
  createdAt: string;
  updatedAt?: string;
  selectedDevice?: {
    isOwned: boolean;
    hardwareId?: string;
    deviceName: string;
    modelName: string;
    categoryTag: string;
    specs?: Record<string, string>;
    imageUrl?: string;
    price?: number;
    subscriptionStatus?: string;
    warrantyMonths?: number;
    activationDate?: string;
  };
  messages: TicketMessage[];
  technicalSnapshot: TechnicalSnapshot;
}

export interface SupportRequestTicket {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  hardwareId?: string;
  deviceName?: string;
  requestType: "TECHNICAL" | "SETUP" | "WARRANTY" | "RENEWAL" | "FEEDBACK" | string;
  description: string;
  images: string[];
  replyChannel: "EMAIL" | "PUSH" | "PHONE" | string;
  preferredContactTime?: string;
  status: "PENDING" | "PROCESSING" | "RESOLVED" | "REJECTED" | string;
  adminResponse?: string;
  respondedAt?: string;
  createdAt: string;
}
