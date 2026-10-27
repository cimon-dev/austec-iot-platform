export interface SupportTicketEntity {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  hardwareId?: string;
  deviceName?: string;
  subject: string;
  status: 'OPEN' | 'PROCESSING' | 'RESOLVED';
  priority: 'URGENT' | 'NORMAL' | 'LOW';
  assignedCskhId?: string;
  selectedDevice?: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
  messages?: ChatMessageEntity[];
  lastMessage?: {
    text: string;
    sender: 'CSKH' | 'CUSTOMER';
    time: string;
  };
}

export interface ChatMessageEntity {
  id: number | string;
  ticketId: string;
  sender: 'CSKH' | 'user';
  senderRole: 'CSKH' | 'CUSTOMER';
  text: string;
  message: string;
  time: string;
  createdAt: string;
  attachmentUrls?: string[];
  images?: string[];
  selectedDevice?: Record<string, any>;
  hasSnapshot?: boolean;
  deviceSnapshot?: Record<string, any>;
}
