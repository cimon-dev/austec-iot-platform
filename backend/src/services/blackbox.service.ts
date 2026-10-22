import { DeviceBlackboxLog, ActorRole, AckStatus } from '@austec/database';

export class BlackboxService {
  private logs: DeviceBlackboxLog[] = [];
  private currentId = 1;
  public onUpdate?: () => void;

  public exportData(): DeviceBlackboxLog[] {
    return this.logs;
  }

  public importData(logs: DeviceBlackboxLog[]): void {
    if (Array.isArray(logs)) {
      this.logs = [...logs];
      const maxId = this.logs.reduce((max, l) => (l.id && l.id > max ? l.id : max), 0);
      this.currentId = maxId + 1;
    }
  }

  /**
   * Ghi vết bất biến vào hộp đen
   */
  public logCommand(entry: {
    hardwareId: string;
    actorId?: string;
    actorRole: ActorRole;
    actorIp?: string;
    actionType: string;
    payloadSent: any;
    ackStatus: AckStatus;
    latencyMs: number;
  }): DeviceBlackboxLog {
    const record: DeviceBlackboxLog = {
      id: this.currentId++,
      hardwareId: entry.hardwareId,
      actorId: entry.actorId,
      actorRole: entry.actorRole,
      actorIp: entry.actorIp || '127.0.0.1',
      actionType: entry.actionType,
      payloadSent: entry.payloadSent,
      ackStatus: entry.ackStatus,
      latencyMs: entry.latencyMs,
      createdAt: new Date().toISOString(),
    };

    this.logs.push(record);
    this.onUpdate?.();
    return record;
  }

  /**
   * Truy xuất lịch sử hộp đen phục vụ điều tra sự cố
   */
  public queryLogs(filters: {
    hardwareId?: string;
    actionType?: string;
    ackStatus?: AckStatus;
    limit?: number;
  }): DeviceBlackboxLog[] {
    let result = [...this.logs];

    if (filters.hardwareId) {
      result = result.filter(l => l.hardwareId === filters.hardwareId);
    }
    if (filters.actionType) {
      result = result.filter(l => l.actionType === filters.actionType);
    }
    if (filters.ackStatus) {
      result = result.filter(l => l.ackStatus === filters.ackStatus);
    }

    // Sắp xếp mới nhất lên đầu
    result.reverse();

    if (filters.limit) {
      result = result.slice(0, filters.limit);
    }

    return result;
  }

  public getTotalLogsCount(): number {
    return this.logs.length;
  }

  public clear(): void {
    this.logs = [];
    this.currentId = 1;
  }
}
