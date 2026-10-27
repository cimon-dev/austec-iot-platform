export type CommandType =
  | "OPEN"
  | "CLOSE"
  | "STOP"
  | "CHILD_LOCK"
  | "DISCHARGE_UPS"
  | "PAIRING"
  | "TRANSFER"
  | "UNLOCK_OTP"
  | "CALIBRATE_BATTERY"
  | "ENGINE_CUTOFF"
  | string;

export interface BlackboxLogEntry {
  id: string | number;
  hardwareId: string;
  modelName: string;
  commandType: CommandType;
  actionType?: string;
  payload: Record<string, any>;
  payloadSent?: Record<string, any>;
  userId?: string;
  actorId?: string;
  userEmail?: string;
  actorEmail?: string;
  userRole?: "CUSTOMER" | "ADMIN" | "CSKH" | string;
  actorRole?: "CUSTOMER" | "ADMIN" | "CSKH" | string;
  clientIp: string;
  deviceFingerprint?: string;
  timestamp: string;
  createdAt?: string;
  ackTimestamp?: string;
  latencyMs: number;
  status: "ACKNOWLEDGED" | "TIMEOUT" | "REJECTED" | "EXECUTING" | string;
  ackStatus?: string;
  cryptoSignature: string;
}

export interface BlackboxFilterParams {
  hardwareId?: string;
  actionType?: string;
  ackStatus?: string;
  limit?: number;
  offset?: number;
}
