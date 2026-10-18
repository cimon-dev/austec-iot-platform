/**
 * Redis Hot Cache Client:
 * Quản lý trạng thái viễn thám và nhịp tim sống còn (Heartbeat) của thiết bị với độ trễ < 1ms.
 */

export interface CachedDeviceState {
  hardwareId: string;
  isOnline: boolean;
  lastHeartbeat: string;
  rssiSignal?: number;
  ipAddress?: string;
  currentProperties: Record<string, any>;
  customName?: string;
  ownerId?: string;
  updatedAt: string;
}

export class HotCacheClient {
  // In-memory high speed key-value store (mô phỏng kiến trúc Redis Hash & TTL)
  private store: Map<string, CachedDeviceState> = new Map();
  private readonly HEARTBEAT_TIMEOUT_MS = 90_000; // 90 giây không có tin hiệu -> Coi như Offline

  private getKey(hardwareId: string): string {
    return `device:state:${hardwareId}`;
  }

  /**
   * Cập nhật trạng thái viễn thám và gia hạn Heartbeat cho thiết bị
   */
  public async setDeviceState(
    hardwareId: string,
    stateUpdate: Partial<Omit<CachedDeviceState, 'hardwareId' | 'updatedAt'>>
  ): Promise<CachedDeviceState> {
    const key = this.getKey(hardwareId);
    const existing = this.store.get(key) || {
      hardwareId,
      isOnline: true,
      lastHeartbeat: new Date().toISOString(),
      currentProperties: {},
      updatedAt: new Date().toISOString(),
    };

    const mergedProperties = {
      ...existing.currentProperties,
      ...(stateUpdate.currentProperties || {}),
    };

    const newState: CachedDeviceState = {
      ...existing,
      ...stateUpdate,
      hardwareId,
      currentProperties: mergedProperties,
      isOnline: stateUpdate.isOnline !== undefined ? stateUpdate.isOnline : true,
      lastHeartbeat: stateUpdate.lastHeartbeat || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.store.set(key, newState);
    return newState;
  }

  /**
   * Đọc trạng thái thiết bị tức thời (< 1ms)
   */
  public async getDeviceState(hardwareId: string): Promise<CachedDeviceState | null> {
    const key = this.getKey(hardwareId);
    const state = this.store.get(key);
    if (!state) return null;

    // Kiểm tra TTL nhịp tim sống còn
    const lastHeartbeatTime = new Date(state.lastHeartbeat).getTime();
    const now = Date.now();
    if (now - lastHeartbeatTime > this.HEARTBEAT_TIMEOUT_MS && state.isOnline) {
      state.isOnline = false;
      state.updatedAt = new Date().toISOString();
      this.store.set(key, state);
    }

    return state;
  }

  /**
   * Đọc hàng loạt trạng thái của nhiều thiết bị cùng lúc (MGET equivalent)
   */
  public async getBatchStates(hardwareIds: string[]): Promise<Record<string, CachedDeviceState | null>> {
    const results: Record<string, CachedDeviceState | null> = {};
    for (const id of hardwareIds) {
      results[id] = await this.getDeviceState(id);
    }
    return results;
  }

  /**
   * Thống kê tổng số lượng thiết bị Online / Offline thời gian thực
   */
  public async getRealtimeStats(): Promise<{ totalTracked: number; online: number; offline: number }> {
    let online = 0;
    let offline = 0;
    const now = Date.now();

    for (const state of this.store.values()) {
      const lastHeartbeatTime = new Date(state.lastHeartbeat).getTime();
      if (now - lastHeartbeatTime <= this.HEARTBEAT_TIMEOUT_MS && state.isOnline) {
        online++;
      } else {
        offline++;
      }
    }

    return {
      totalTracked: this.store.size,
      online,
      offline,
    };
  }

  public clear(): void {
    this.store.clear();
  }
}
