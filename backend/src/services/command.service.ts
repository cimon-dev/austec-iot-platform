import { BlackboxService } from './blackbox.service.js';
import { HotCacheClient } from '@austec/database';
import { ActorRole, AckStatus } from '@austec/database';

export interface CommandRequest {
  hardwareId: string;
  command: string;          // e.g. "OPEN", "CLOSE", "STOP", "LOCK", "UNLOCK"
  params?: Record<string, any>;
  actorId: string;
  actorRole: ActorRole;
  actorIp?: string;
}

export interface CommandResponse {
  success: boolean;
  ackStatus: AckStatus;
  latencyMs: number;
  message: string;
  deviceState?: Record<string, any>;
}

export class CommandService {
  constructor(
    private blackboxService: BlackboxService,
    private hotCache: HotCacheClient
  ) {}

  /**
   * Phát lệnh điều khiển khẩn cấp xuống thiết bị qua kênh thời gian thực
   */
  public async dispatchCommand(req: CommandRequest): Promise<CommandResponse> {
    const startTime = performance.now();

    // 1. Kiểm tra thiết bị có đang online không trong Hot Cache (< 0.1ms)
    const currentState = await this.hotCache.getDeviceState(req.hardwareId);
    if (!currentState || !currentState.isOnline) {
      const latencyMs = Math.round(performance.now() - startTime);

      this.blackboxService.logCommand({
        hardwareId: req.hardwareId,
        actorId: req.actorId,
        actorRole: req.actorRole,
        actorIp: req.actorIp,
        actionType: `CMD_${req.command}`,
        payloadSent: req.params || {},
        ackStatus: 'TIMEOUT',
        latencyMs,
      });

      return {
        success: false,
        ackStatus: 'TIMEOUT',
        latencyMs,
        message: `Thiết bị '${req.hardwareId}' hiện đang Offline hoặc mất kết nối mạng.`,
      };
    }

    // 2. Mô phỏng luồng phát sóng MQTT và nhận ACK từ phần cứng thực tế (Thời gian trung bình 80-180ms)
    const hardwareResponseTimeMs = Math.floor(60 + Math.random() * 90);
    await new Promise(resolve => setTimeout(resolve, hardwareResponseTimeMs));

    // 3. Cập nhật trạng thái sau khi thực thi lệnh vào Hot Cache
    const updatedProperties = { ...currentState.currentProperties };
    if (req.command === 'OPEN') updatedProperties.open_state = 'OPEN';
    if (req.command === 'CLOSE') updatedProperties.open_state = 'CLOSED';
    if (req.command === 'STOP') updatedProperties.open_state = 'PAUSED';
    if (req.command === 'LOCK') updatedProperties.is_locked = true;
    if (req.command === 'UNLOCK') updatedProperties.is_locked = false;

    await this.hotCache.setDeviceState(req.hardwareId, {
      currentProperties: updatedProperties,
      lastHeartbeat: new Date().toISOString(),
    });

    const latencyMs = Math.round(performance.now() - startTime);

    // 4. Ghi nhận bất biến vào Hộp đen kiểm toán
    this.blackboxService.logCommand({
      hardwareId: req.hardwareId,
      actorId: req.actorId,
      actorRole: req.actorRole,
      actorIp: req.actorIp,
      actionType: `CMD_${req.command}`,
      payloadSent: req.params || {},
      ackStatus: 'SUCCESS',
      latencyMs,
    });

    return {
      success: true,
      ackStatus: 'SUCCESS',
      latencyMs,
      message: `Lệnh '${req.command}' đã được phần cứng thực thi thành công (ACK sau ${latencyMs}ms)!`,
      deviceState: updatedProperties,
    };
  }
}
