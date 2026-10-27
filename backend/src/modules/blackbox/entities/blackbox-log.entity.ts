export interface BlackboxLogEntity {
  id: number | string;
  hardwareId: string;
  modelName?: string;
  actionType: string;
  commandType?: string;
  payloadSent?: Record<string, any>;
  payload?: Record<string, any>;
  actorId?: string;
  userId?: string;
  actorEmail?: string;
  userEmail?: string;
  actorRole?: string;
  userRole?: string;
  actorIp?: string;
  clientIp?: string;
  latencyMs?: number;
  ackStatus?: 'ACKNOWLEDGED' | 'TIMEOUT' | 'REJECTED' | 'EXECUTING';
  status?: 'ACKNOWLEDGED' | 'TIMEOUT' | 'REJECTED' | 'EXECUTING';
  cryptoSignature?: string;
  createdAt: string;
  timestamp?: string;
}
