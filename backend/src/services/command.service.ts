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
  ) { }

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
      // Cho phép phát lệnh kiểm thử trực tiếp đối với thiết bị phần cứng thực tế (amtuong*, austec*, esp*, AT-*, CAM_*, OCAM*, WIFIRF*, WIFRF*, SMARTSW*, SMARTMETTER*)
      const hwLower = req.hardwareId.toLowerCase();
      const isHardwareDevice = hwLower.startsWith('amtuong') ||
        hwLower.startsWith('cuacuon') ||
        hwLower.startsWith('glsdoor') ||
        hwLower.startsWith('rolldoor') ||
        hwLower.startsWith('austec') ||
        hwLower.startsWith('esp') ||
        hwLower.startsWith('cam') ||
        hwLower.startsWith('ocam') ||
        hwLower.includes('socket') ||
        hwLower.startsWith('wifirf') ||
        hwLower.startsWith('wifrf') ||
        hwLower.startsWith('smartsw') ||
        hwLower.startsWith('smartmetter') ||
        hwLower.startsWith('smartmeter') ||
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

    // 2. Phân loại thiết bị & Ánh xạ mã lệnh phần cứng (Ưu tiên kiểm tra ổ cắm trước để tránh ocam chứa chữ cam)
    const upperHwId = req.hardwareId.toUpperCase();
    const isSocket = upperHwId.startsWith('OCAM') || upperHwId.includes('SOCKET') || upperHwId.startsWith('SMARTSW') || upperHwId.includes('SMARTSW');
    const isCamera = !isSocket && (upperHwId.startsWith('CAM') || upperHwId.includes('CAMERA') || upperHwId.includes('OV2640'));
    const isBms = !isSocket && !isCamera && upperHwId.includes('BMS');
    const isMeter = !isSocket && !isCamera && !isBms && (upperHwId.startsWith('SMARTMETTER') || upperHwId.startsWith('SMARTMETER') || upperHwId.includes('METER') || upperHwId.includes('CONGTO'));

    let actionCode = req.command;
    if (isBms) {
      // Pin lưu trữ BMS: giữ nguyên mã chuỗi lệnh chuẩn (SET_LFP, SET_LIION, SET_LTO, CLEAR_LOG, CFG:...)
      actionCode = req.command.trim();
    } else if (isMeter) {
      if (req.command === 'TURN_ON' || req.command === 'ON' || req.command === 'METER_POWER_ON' || req.command === '13') {
        actionCode = '13';
      } else if (req.command === 'TURN_OFF' || req.command === 'OFF' || req.command === 'METER_POWER_OFF' || req.command === '14') {
        actionCode = '14';
      } else if (req.command === 'RESET' || req.command === 'CLEAR_ALERT' || req.command === '0') {
        actionCode = '0';
      } else if (req.command === 'DAILY_CLOSING' || req.command === '20' || req.command === '3') {
        actionCode = '20';
      } else if (req.command === 'CONFIG_POWER_LIMIT' || (req.params && req.params.power_limit !== undefined)) {
        const pLimit = Number(req.params?.power_limit) || 5000;
        actionCode = JSON.stringify({ power_limit: pLimit });
      }
    } else if (isSocket) {
      if (req.command === 'TURN_ON' || req.command === 'ON' || req.command === '13' || req.command === '1') {
        actionCode = '13'; // Khớp ocammoi: case 13 -> ocam.BAT()
      } else if (req.command === 'TURN_OFF' || req.command === 'OFF' || req.command === '14' || req.command === '0') {
        actionCode = '14'; // Khớp ocammoi: case 14 -> ocam.TAT()
      } else if (req.command === 'STOP' || req.command === '3') {
        actionCode = '3';  // Khớp ocammoi: case 3 -> ocam.dung()
      } else if (req.command === 'RF_SETUP' || req.command === 'RF_PAIR_NEW' || req.command === '11') {
        actionCode = '11'; // Khớp ocammoi: case 11 -> ocam.RF_setup()
      } else if (req.command === 'RF_CLEAR' || req.command === 'RF_CLEAR_ALL' || req.command === '12') {
        actionCode = '12'; // Khớp ocammoi: case 12 -> ocam.RF_clear()
      } else if (req.command === 'TOGGLE_RELAY') {
        const isCurrentlyOn = currentState?.currentProperties?.is_relay_on === true || currentState?.currentProperties?.relay_state === 'ON';
        actionCode = isCurrentlyOn ? '14' : '13';
      } else if (req.command === 'LOCK' || req.command === 'CHILD_LOCK_ON') {
        actionCode = 'LOCK';
      } else if (req.command === 'UNLOCK' || req.command === 'CHILD_LOCK_OFF') {
        actionCode = 'UNLOCK';
      } else if (req.command === 'TOGGLE_CHILD_LOCK') {
        const isCurrentlyLocked = currentState?.currentProperties?.is_child_lock === true;
        actionCode = isCurrentlyLocked ? 'UNLOCK' : 'LOCK';
      }
    } else if (isCamera) {
      if (req.command === 'STREAM_START' || req.command === 'START_STREAM' || req.command === '13' || req.command === 'TAKE_SNAPSHOT') {
        actionCode = '13';
      } else if (req.command === 'STREAM_STOP' || req.command === 'STOP_STREAM' || req.command === '14') {
        actionCode = '14';
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
        RF_PAIR_NEW: '11',
        RF_CLEAR: '12',
        RF_CLEAR_ALL: '12',
      };
      actionCode = actionMap[req.command] || req.command || '3';
    }

    // Xác định danh sách mã ACK kỳ vọng chính xác & thời gian chờ theo từng loại lệnh
    const expectedAckCodes: string[] = [actionCode];
    if (isMeter && (req.command === 'CONFIG_POWER_LIMIT' || (req.params && req.params.power_limit !== undefined))) {
      expectedAckCodes.push('CONFIG_POWER_LIMIT');
    } else if (isBms && actionCode.startsWith('CFG:')) {
      expectedAckCodes.push('CFG_OK');
    }

    // Riêng lệnh học/xóa tay cầm RF (11, 12) mạch có delay 7s nên nâng timeout lên 10s
    const ackTimeoutMs = (actionCode === '11' || actionCode === '12') ? 10000 : 3500;

    // Firmware gốc:
    // - Cửa cuốn & Ổ cắm: có echo mã lệnh trên pub/action -> bắt ACK chặt 2 chiều
    // - SmartMetter & BMS: bản gốc không có topic /ack (chỉ gửi telemetry 1s) -> kiểm tra telemetry gần đây (25s), nếu mất telemetry -> báo OFFLINE ngay
    // - Camera: bản gốc không có /camera/ack -> phát lệnh stream 13/14 trực tiếp
    if ((isMeter || isBms) && this.mqttGateway) {
      const lastHbRaw = currentState?.lastHeartbeat;
      const hbTime = lastHbRaw ? new Date(lastHbRaw).getTime() : 0;
      const isTelemetryAlive = Boolean(currentState?.isOnline && hbTime > 0 && (Date.now() - hbTime) <= 25000);
      if (!isTelemetryAlive) {
        await this.mqttGateway.markDeviceOffline(req.hardwareId);
        const latencyMs = Math.round(performance.now() - startTime);
        return {
          success: false,
          ackStatus: 'TIMEOUT',
          latencyMs,
          message: 'Thiết bị đang ngoại tuyến hoặc không phản hồi.',
        };
      }
    }

    const skipStrictAck = isCamera || isMeter || isBms;

    if (this.mqttGateway) {
      // Nếu là lệnh bật stream camera ("13") và Backend có MEDIAMTX_HOST từ .env -> đẩy động xuống ESP32 qua MQTT
      // để khi PC đổi IP Wi-Fi hoặc chuyển lên VPS không cần cắm cáp nạp lại firmware ESP32
      const configuredMediaHost = (process.env.MEDIAMTX_HOST || process.env.STREAM_SERVER_HOST || '').trim();
      const configuredRtspPort = (process.env.STREAM_SERVER_PORT_RTSP || '8554').trim();
      if (isCamera && actionCode === '13' && configuredMediaHost) {
        await this.mqttGateway.publishAction(req.actorId, req.hardwareId, `rtsp:${configuredMediaHost}:${configuredRtspPort}`);
        // Chờ 250ms để ESP32-CAM ghi cấu hình MediaMTX vào bộ nhớ Flash NVS xong, tránh bị tràn buffer bỏ rơi lệnh "13"
        await new Promise(resolve => setTimeout(resolve, 250));
      }

      // Đăng ký lắng nghe ACK TRƯỚC khi phát gói tin để tránh race condition khi mạch phản hồi quá nhanh
      const ackPromise = !skipStrictAck
        ? this.mqttGateway.waitForActionAck(req.hardwareId, expectedAckCodes, ackTimeoutMs)
        : Promise.resolve({ success: true, payload: actionCode });

      // Phát mã lệnh chuẩn trực tiếp qua MQTT tới thiết bị phần cứng
      await this.mqttGateway.publishAction(req.actorId, req.hardwareId, actionCode);

      // Chờ phản hồi ACK 2 chiều khớp chính xác mã từ thiết bị phần cứng
      const ack = await ackPromise;
      if (!ack.success) {
        // Không điều khiển được -> đánh dấu OFFLINE ngay lập tức
        await this.mqttGateway.markDeviceOffline(req.hardwareId);
        const latencyMs = Math.round(performance.now() - startTime);
        this.blackboxService.logCommand({
          hardwareId: req.hardwareId,
          actorId: req.actorId,
          actorRole: req.actorRole,
          actorIp: req.actorIp,
          actionType: `CMD_${req.command}`,
          payloadSent: { actionCode, expectedAckCodes, params: req.params || {} },
          ackStatus: 'TIMEOUT',
          latencyMs,
        });

        return {
          success: false,
          ackStatus: 'TIMEOUT',
          latencyMs,
          message: 'Không thể điều khiển thiết bị. Thiết bị đã chuyển sang ngoại tuyến.',
        };
      }
    } else {
      const hardwareResponseTimeMs = Math.floor(40 + Math.random() * 50);
      await new Promise(resolve => setTimeout(resolve, hardwareResponseTimeMs));
    }

    // 3. Cập nhật trạng thái sau khi thực thi lệnh vào Hot Cache
    const updatedProperties = { ...(currentState?.currentProperties || {}) };
    if (isMeter) {
      if (actionCode === '13') {
        updatedProperties.is_meter_on = true;
        updatedProperties.relay_status = 'ON';
      } else if (actionCode === '14') {
        updatedProperties.is_meter_on = false;
        updatedProperties.relay_status = 'OFF';
      } else if (actionCode === '0' || actionCode === 'RESET') {
        updatedProperties.alarm = null;
        updatedProperties.is_meter_on = true;
        updatedProperties.relay_status = 'ON';
      } else if (req.command === 'CONFIG_POWER_LIMIT' && req.params?.power_limit) {
        updatedProperties.power_limit_w = req.params.power_limit;
      }
    } else if (isSocket) {
      if (actionCode === '13' || actionCode === '3') {
        updatedProperties.is_relay_on = true;
        updatedProperties.relay_state = 'ON';
      } else if (actionCode === '14' || actionCode === '4') {
        updatedProperties.is_relay_on = false;
        updatedProperties.relay_state = 'OFF';
      } else if (actionCode === 'LOCK') {
        updatedProperties.is_child_lock = true;
        updatedProperties.is_locked = true;
      } else if (actionCode === 'UNLOCK') {
        updatedProperties.is_child_lock = false;
        updatedProperties.is_locked = false;
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
      message: 'Thực hiện thành công',
      deviceState: updatedProperties,
    };
  }
}
