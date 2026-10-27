import fs from 'fs';
import path from 'path';
import { UnifiedUser } from '../server.js';
import {
  Product,
  DeviceMemberPermission,
  CustomerSupportRequest,
  SupportTicket,
  LiveChatMessage,
  DeviceInstance,
  DeviceInventory,
  DeviceBlackboxLog,
} from '@austec/database';

export interface PersistentDataPayload {
  users: UnifiedUser[];
  permissions: DeviceMemberPermission[];
  requests: CustomerSupportRequest[];
  products: Product[];
  supportTickets: SupportTicket[];
  supportMessages: LiveChatMessage[];
  deviceInstances?: DeviceInstance[];
  deviceInventory?: DeviceInventory[];
  blackboxLogs?: DeviceBlackboxLog[];
  lastSavedAt?: string;
  version?: string;
}

import { PostgresService } from './postgres.service.js';

export class PersistenceService {
  private filePath: string;
  private saveTimeout: NodeJS.Timeout | null = null;
  private postgresService: PostgresService | null = null;

  constructor(customPath?: string) {
    // Khởi tạo PostgresService nếu có DATABASE_URL
    const dbUrl = process.env.DATABASE_URL || 'postgresql://austec_admin:AustecSecure2026Password!@127.0.0.1:5432/austec_iot_db';
    this.postgresService = new PostgresService(dbUrl);
    this.initPostgres().catch(err => {
      console.warn('[PersistenceService] Postgres chưa sẵn sàng, sẽ dùng file JSON dự phòng:', err.message);
    });

    if (customPath) {
      this.filePath = customPath;
    } else {
      // Tìm hoặc tạo thư mục 'data' nằm ở root của austec-iot-platform
      const candidates = [
        path.resolve(process.cwd(), '../data/austec_database.json'),
        path.resolve(process.cwd(), 'data/austec_database.json'),
        path.resolve(process.cwd(), '../../data/austec_database.json'),
      ];
      this.filePath = candidates[0];
      for (const c of candidates) {
        const dir = path.dirname(c);
        if (fs.existsSync(dir)) {
          this.filePath = c;
          break;
        }
      }
    }

    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        console.error('[PersistenceService] Không thể tạo thư mục data:', e);
      }
    }
  }

  private async initPostgres(): Promise<void> {
    if (!this.postgresService) return;
    await this.postgresService.connect();
  }

  public getPostgresService(): PostgresService | null {
    return this.postgresService;
  }

  public getFilePath(): string {
    return this.filePath;
  }

  /**
   * Nạp dữ liệu bền vững từ file đĩa nếu có
   */
  public load(): PersistentDataPayload | null {
    try {
      if (!fs.existsSync(this.filePath)) {
        return null;
      }
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      if (!raw || !raw.trim()) {
        return null;
      }
      const data = JSON.parse(raw) as PersistentDataPayload;
      console.log(
        `[PersistenceService] Đã nạp dữ liệu bền vững từ ${this.filePath}: ` +
        `${data.users?.length || 0} users, ` +
        `${data.permissions?.length || 0} permissions, ` +
        `${data.supportTickets?.length || 0} tickets, ` +
        `${data.supportMessages?.length || 0} messages, ` +
        `${data.products?.length || 0} products`
      );
      return data;
    } catch (e) {
      console.error('[PersistenceService] Lỗi khi nạp dữ liệu bền vững:', e);
      return null;
    }
  }

  /**
   * Ghi dữ liệu bền vững xuống file JSON (hỗ trợ debounce hoặc immediate)
   */
  public save(data: PersistentDataPayload, immediate: boolean = false): void {
    if (immediate) {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
      this.writeToDisk(data);
      return;
    }

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.writeToDisk(data);
      this.saveTimeout = null;
    }, 250);
  }

  public writeToDisk(data: PersistentDataPayload): void {
    try {
      data.lastSavedAt = new Date().toISOString();
      data.version = '1.0';
      const jsonStr = JSON.stringify(data, null, 2);
      const tempPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tempPath, jsonStr, 'utf-8');
      fs.renameSync(tempPath, this.filePath);
      console.log(
        `[PersistenceService] Đã lưu dữ liệu bền vững thành công (${data.users?.length || 0} users, ${data.permissions?.length || 0} perms)`
      );

      // Tự động đồng bộ ngay sang PostgreSQL
      if (this.postgresService && this.postgresService.getConnected()) {
        this.postgresService.syncAllToPostgres(data).catch(err => {
          console.warn('[PersistenceService] Lỗi ngầm khi đồng bộ sang PostgreSQL:', err.message);
        });
      }
    } catch (e) {
      try {
        fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
      } catch (err2) {
        console.error('[PersistenceService] Lỗi nghiêm trọng khi ghi file đĩa:', err2);
      }
    }
  }
}
