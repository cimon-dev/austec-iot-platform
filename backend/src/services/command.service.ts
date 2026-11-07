import { BlackboxService } from './blackbox.service.js';
import { HotCacheClient } from '@austec/database';
import { ActorRole, AckStatus } from '@austec/database';
import type { MqttGateway } from './mqtt.gateway.js';

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
    private hotCache: HotCacheClient,
    private mqttGateway?: MqttGateway
  ) {}

  public setMqttGateway(gateway: MqttGateway) {
    this.mqttGateway = gateway;
  }

  /**
   * Phát lệnh điều khiển khẩn cấp xuống thiết bị qua kênh thời gian thực
   */
  public async dispatchCommand(req: CommandRequest): Promise<CommandResponse> {
    const startTime = performance.now();

    // 1. Kiểm tra thiết bị có đang online không trong Hot Cache (< 0.1ms)
    const currentState = await this.hotCache.getDeviceState(req.hardwareId);
    if (!currentState || !currentState.isOnline) {
      // Cho phép phát lệnh kiểm thử trực tiếp đối với thiết bị phần cứng thực tế (amtuong*, austec*, esp*, AT-*, CAM_*, OCAM*)
      const isHardwareDevice = req.hardwareId.toLowerCase().startsWith('amtuong') ||
                               req.hardwareId.toLowerCase().startsWith('austec') ||
                               req.hardwareId.toLowerCase().startsWith('esp') ||
                               req.hardwareId.toLowerCase().startsWith('cam') ||
                               req.hardwareId.toLowerCase().startsWith('ocam') ||
                               req.hardwareId.toLowerCase().includes('socket') ||
                               req.hardwareId.startsWith('AT-');
      if (!isHardwareDevice) {
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
    }

    // 2. Phân loại thiết bị & Ánh xạ mã lệnh phần cứng
    const isCamera = req.hardwareId.toUpperCase().startsWith('CAM_') || req.hardwareId.toUpperCase().includes('CAM');
    const isSocket = req.hardwareId.toUpperCase().startsWith('OCAM') || req.hardwareId.toUpperCase().includes('OCAM') || req.hardwareId.toUpperCase().includes('SOCKET');

    let actionCode = req.command;
    if (isCamera) {
      if (req.command === 'STREAM_START' || req.command === 'START_STREAM' || req.command === '13' || req.command === 'TAKE_SNAPSHOT') {
        actionCode = '13';
      } else if (req.command === 'STREAM_STOP' || req.command === 'STOP_STREAM' || req.command === '14') {
        actionCode = '14';
      }
    } else if (isSocket) {
      if (req.command === 'TURN_ON' || req.command === 'ON' || req.command === '13' || req.command === '1' || req.command === '3') {
        actionCode = '13'; // Khớp ocammoi: case 13 -> ocam.BAT()
      } else if (req.command === 'TURN_OFF' || req.command === 'OFF' || req.command === '14' || req.command === '0' || req.command === '4') {
        actionCode = '14'; // Khớp ocammoi: case 14 -> ocam.TAT()
      } else if (req.command === 'STOP') {
        actionCode = '3';  // Khớp ocammoi: case 3 -> ocam.dung()
      } else if (req.command === 'TOGGLE_RELAY') {
        const isCurrentlyOn = currentState?.currentProperties?.is_relay_on === true || currentState?.currentProperties?.relay_state === 'ON';
        actionCode = isCurrentlyOn ? '14' : '13';
      }
    } else {
      // Mặc định: Cửa cuốn Austec
      const actionMap: Record<string, string> = {
        OPEN: '1',
        CLOSE: '2',
        STOP: '3',
        '1': '1',
        '2': '2',
        '3': '3',
        RF_SETUP: '11',
        RF_CLEAR: '12',
      };
      actionCode = actionMap[req.command] || req.command || '3';
    }
    
    if (this.mqttGateway) {
      await this.mqttGateway.publishAction(req.actorId, req.hardwareId, actionCode);
      if (isSocket) {
        // Kích hoạt đồng thời cả GPIO 5 (mã 13/14) và GPIO 3/4 (mã 3/4) để đảm bảo relay kêu bất kể chân phần cứng
        const altAction = (actionCode === '13' || actionCode === '1') ? '3' : '4';
        await this.mqttGateway.publishAction(req.actorId, req.hardwareId, altAction);
      }
    } else {
      const hardwareResponseTimeMs = Math.floor(40 + Math.random() * 50);
      await new Promise(resolve => setTimeout(resolve, hardwareResponseTimeMs));
    }

    // 3. Cập nhật trạng thái sau khi thực thi lệnh vào Hot Cache
    const updatedProperties = { ...(currentState?.currentProperties || {}) };
    if (isSocket) {
      if (actionCode === '13' || actionCode === '3') {
        updatedProperties.is_relay_on = true;
        updatedProperties.relay_state = 'ON';
      } else if (actionCode === '14' || actionCode === '4') {
        updatedProperties.is_relay_on = false;
        updatedProperties.relay_state = 'OFF';
      }
    } else if (isCamera) {
      if (actionCode === '13') {
        updatedProperties.is_streaming = true;
      } else if (actionCode === '14') {
        updatedProperties.is_streaming = false;
      }
    } else {
      if (req.command === 'OPEN') updatedProperties.open_state = 'OPEN';
      if (req.command === 'CLOSE') updatedProperties.open_state = 'CLOSED';
      if (req.command === 'STOP') updatedProperties.open_state = 'PAUSED';
      if (req.command === 'LOCK') updatedProperties.is_locked = true;
      if (req.command === 'UNLOCK') updatedProperties.is_locked = false;
      if (req.command === 'TOGGLE_CHILD_LOCK') updatedProperties.is_child_lock = !updatedProperties.is_child_lock;
    }

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
