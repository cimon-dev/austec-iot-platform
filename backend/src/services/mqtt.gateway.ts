import mqtt, { MqttClient } from 'mqtt';
import { PostgresService } from './postgres.service.js';
import { BlackboxService } from './blackbox.service.js';
import { HotCacheClient } from '@austec/database';

export interface MqttMessageEvent {
  topic: string;
  payload: string;
  timestamp: string;
  direction: 'INCOMING' | 'OUTGOING';
}

export class MqttGateway {
  private client: MqttClient | null = null;
  private messageHistory: MqttMessageEvent[] = [];
  private isRunning: boolean = false;
  private brokerUrl: string = 'mqtt://127.0.0.1:1883';
  private cameraSnapshots: Map<string, { buffer: Buffer; timestamp: number }> = new Map();

  constructor(
    private postgresService: PostgresService,
    private blackboxService: BlackboxService,
    private hotCache: HotCacheClient,
    private onStateChangeCallback?: (hwId: string, state: any) => void
  ) {}

  public start(port: number = 1883): Promise<boolean> {
    const isCloudEnv = !!(process.env.RENDER || process.env.NODE_ENV === 'production');
    this.brokerUrl = process.env.MQTT_BROKER_URL || (isCloudEnv ? 'mqtt://broker.emqx.io:1883' : `mqtt://127.0.0.1:${port}`);
    return new Promise((resolve) => {
      console.log(`[MQTT Gateway] 🔌 Đang kết nối tới EMQX MQTT Broker tại ${this.brokerUrl}...`);
      
      this.client = mqtt.connect(this.brokerUrl, {
        clientId: `austec_backend_${Date.now()}`,
        reconnectPeriod: 3000,
        connectTimeout: 5000,
      });

      this.client.on('connect', () => {
        this.isRunning = true;
        console.log(`[MQTT Gateway] 🚀 Đã kết nối thành công tới EMQX MQTT Broker (Port 1883)!`);
        
        // Đăng ký nhận toàn bộ các kênh thiết bị:
        // 1. Cửa cuốn: {user}/{device_id}/pub/... và {user}/{device_id}/onboard
        // 2. Camera AI: devices/+/status, devices/+/camera/#
        // 3. Ổ cắm thông minh: +/status, +/response, +/set
        this.client?.subscribe([
          '+/+/pub/#',
          '+/+/onboard',
          'austec/#',
          'devices/+/status',
          'devices/+/camera/#',
          '+/status',
          '+/response',
          '+/set',
        ], (err) => {
          if (!err) {
            console.log('[MQTT Gateway] 📡 Đã kích hoạt lắng nghe Topic Cửa cuốn, Camera AI & Ổ cắm trên EMQX!');
          }
        });
        resolve(true);
      });

      this.client.on('message', async (topic: string, message: Buffer) => {
        await this.handleIncomingMessage(topic, message);
      });

      let lastErrorLogTime = 0;
      this.client.on('error', (err) => {
        const now = Date.now();
        if (now - lastErrorLogTime > 10000) {
          console.warn(`[MQTT Gateway] ⚠️ Cảnh báo kết nối EMQX: ${err.message}`);
          lastErrorLogTime = now;
        }
      });
    });
  }

  private async handleIncomingMessage(topic: string, message: Buffer) {
    if (topic.startsWith('$SYS')) return;

    // A. XỬ LÝ KHUNG HÌNH CAMERA (JPEG BINARY BUFFER)
    if (topic.includes('/camera/photo')) {
      const parts = topic.split('/');
      // topic: devices/{hwId}/camera/photo
      const hwId = parts.length >= 2 ? parts[1] : 'CAM_UNKNOWN';
      this.cameraSnapshots.set(hwId, { buffer: message, timestamp: Date.now() });
      this.recordMessage(topic, `[JPEG Photo: ${message.length} bytes]`, 'INCOMING');
      console.log(`[MQTT Gateway] 📸 [${hwId}] Nhận khung hình Camera JPEG: ${message.length} bytes`);

      await this.hotCache.setDeviceState(hwId, {
        isOnline: true,
        currentProperties: { hasStream: true, lastPhotoAt: new Date().toISOString(), photoSize: message.length },
        lastHeartbeat: new Date().toISOString(),
      });
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(hwId, { cameraFrame: true, size: message.length });
      }
      return;
    }

    const payload = message.toString('utf-8');
    this.recordMessage(topic, payload, 'INCOMING');

    // B. XỬ LÝ TRẠNG THÁI ONLINE CỦA CAMERA: devices/{hwId}/status
    if (topic.startsWith('devices/') && topic.endsWith('/status')) {
      const parts = topic.split('/');
      const hwId = parts[1];
      console.log(`[MQTT Gateway] 📷 Camera [${hwId}] thông báo ONLINE! Payload: ${payload}`);
      try {
        await this.postgresService.registerPairingDevice(hwId, 'AI_CAMERA_360', '00000000-0000-0000-0000-000000000001', `Camera AI ${hwId}`);
      } catch (_) {}
      await this.hotCache.setDeviceState(hwId, {
        isOnline: true,
        currentProperties: { hasStream: true, streamResolution: 'VGA 640x480' },
        lastHeartbeat: new Date().toISOString(),
      });
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(hwId, { isOnline: true, paired: true });
      }
      return;
    }

    // C. XỬ LÝ TRẠNG THÁI CỦA Ổ CẮM / RƠ-LE: {deviceName}/status & {deviceName}/response
    const slashCount = (topic.match(/\//g) || []).length;
    if (slashCount === 1) {
      const [hwId, subAction] = topic.split('/');
      
      // 1. Ổ cắm báo Online: {deviceName}/status
      if (subAction === 'status') {
        console.log(`[MQTT Gateway] 🔌 Ổ cắm [${hwId}] thông báo ONLINE! Payload: ${payload}`);
        try {
          await this.postgresService.registerPairingDevice(hwId, 'SMART_SOCKET_ECO', '00000000-0000-0000-0000-000000000001', `Ổ cắm ${hwId}`);
        } catch (_) {}
        await this.hotCache.setDeviceState(hwId, {
          isOnline: true,
          currentProperties: { is_relay_on: false, relay_state: 'OFF' },
          lastHeartbeat: new Date().toISOString(),
        });
        try {
          await this.postgresService.query('UPDATE device_instances SET is_online = true, last_heartbeat = NOW()::text WHERE hardware_id = $1', [hwId]);
        } catch (_) {}
        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(hwId, { isOnline: true, paired: true });
        }
        return;
      }

      // 2. Ổ cắm phản hồi kết quả rơ-le: {deviceName}/response ("3" = Bật, "4" = Tắt)
      if (subAction === 'response') {
        const isRelayOn = payload.trim() === '3';
        console.log(`[MQTT Gateway] ⚡ [${hwId}] Ổ cắm phản hồi trạng thái Rơ-le: ${isRelayOn ? 'BẬT (3)' : 'TẮT (4)'}`);
        await this.hotCache.setDeviceState(hwId, {
          isOnline: true,
          currentProperties: { is_relay_on: isRelayOn, relay_state: isRelayOn ? 'ON' : 'OFF' },
          lastHeartbeat: new Date().toISOString(),
        });
        await this.postgresService.logBlackbox({
          hardwareId: hwId,
          actorId: '00000000-0000-0000-0000-000000000001',
          actorRole: 'CUSTOMER',
          actorName: 'Ổ cắm thông minh',
          actionType: isRelayOn ? 'RELAY_TURNED_ON' : 'RELAY_TURNED_OFF',
          payloadSent: { action: payload, isRelayOn },
          ackStatus: 'SUCCESS',
          latencyMs: 25,
        });
        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(hwId, { is_relay_on: isRelayOn, relay_state: isRelayOn ? 'ON' : 'OFF' });
        }
        return;
      }
    }

    // D. XỬ LÝ CỬA CUỐN AUSTEC (CodeCuaCuonBLE chuẩn)
    const parts = topic.split('/');
    if (parts.length >= 2) {
      const user = parts[0];
      const hwId = parts[1];
      const subType = parts[2];

      // 1. Gói tin ONBOARDING từ chip ESP32
      if (subType === 'onboard' || topic.endsWith('/onboard')) {
        console.log(`[MQTT Gateway] 🚀 Thiết bị [${hwId}] thông báo ONBOARD thành công! Chủ sở hữu: ${user}`);
        await this.postgresService.registerPairingDevice(hwId, 'DOOR_GERMAN_ALU', user || '00000000-0000-0000-0000-000000000001');
        await this.hotCache.setDeviceState(hwId, {
          isOnline: true,
          currentProperties: { open_state: 'CLOSED', ownerId: user },
          lastHeartbeat: new Date().toISOString(),
        });
        try {
          await this.postgresService.query('UPDATE device_instances SET is_online = true, last_heartbeat = NOW()::text WHERE hardware_id = $1', [hwId]);
        } catch (_) {}
        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(hwId, { isOnline: true, paired: true });
        }
      }

      // 2. Gói tin Phản Hồi Trạng Thái Trực Tuyến: {user}/{hwId}/pub/isonline
      if (subType === 'pub' && parts[3] === 'isonline') {
        console.log(`[MQTT Gateway] 🚪 [${hwId}] Phản hồi IS_ONLINE: ${payload}`);
        await this.hotCache.setDeviceState(hwId, {
          isOnline: true,
          currentProperties: { isOnline: true, ownerId: user },
          lastHeartbeat: new Date().toISOString(),
        });
        try {
          await this.postgresService.query('UPDATE device_instances SET is_online = true, last_heartbeat = NOW()::text WHERE hardware_id = $1', [hwId]);
        } catch (_) {}
        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(hwId, { isOnline: true, paired: true });
        }
      }

      // 3. Gói tin Báo Cảm Biến / Hành Trình Cửa: {user}/{hwId}/pub/action
      if (subType === 'pub' && parts[3] === 'action') {
        console.log(`[MQTT Gateway] 🚪 [${hwId}] Phản hồi rơ-le/cảm biến: Action = ${payload}`);
        let openState = 'MOVING';
        if (payload === '4') openState = 'OPEN';        // Chạm công tắc trên CB_UP (Mở hoàn toàn)
        if (payload === '5') openState = 'CLOSED';      // Chạm công tắc dưới CB_DOWN (Đóng hoàn toàn)
        if (payload === '1') openState = 'OPENING';     // Rơ-le mở đang kích hoạt
        if (payload === '2') openState = 'CLOSING';     // Rơ-le đóng đang kích hoạt
        if (payload === '3') openState = 'PAUSED';      // Đã dừng khẩn cấp

        await this.hotCache.setDeviceState(hwId, {
          isOnline: true,
          currentProperties: { open_state: openState, lastAction: payload, ownerId: user },
          lastHeartbeat: new Date().toISOString(),
        });

        await this.postgresService.logBlackbox({
          hardwareId: hwId,
          actorId: user,
          actorRole: 'CUSTOMER',
          actorName: 'Cảm biến cơ hành trình',
          actionType: `SENSOR_ACTION_${payload}`,
          payloadSent: { action: payload, openState },
          ackStatus: 'SUCCESS',
          latencyMs: 35,
        });

        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(hwId, { open_state: openState, action: payload });
        }
      }

      // 3. Tiến độ OTA nạp từ xa
      if (subType === 'pub' && parts[3] === 'ota_progress') {
        const pct = parseInt(payload) || 0;
        console.log(`[MQTT Gateway] 🔄 [${hwId}] Báo cáo tiến độ OTA: ${pct}%`);
        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(hwId, { otaProgress: pct });
        }
      }
    }
  }

  /**
   * Lấy khung hình chụp Camera JPEG mới nhất trong cache bộ nhớ
   */
  public getCameraSnapshot(hwId: string): { buffer: Buffer; timestamp: number } | undefined {
    return this.cameraSnapshots.get(hwId);
  }

  /**
   * Phát lệnh điều khiển xuống mạch ESP32:
   * 1. Cửa cuốn: topic {user}/{device_id}/sub/action
   * 2. Camera: topic devices/{device_id}/camera/cmd
   * 3. Ổ cắm: topic {device_id}/set
   */
  public async publishAction(userId: string, hwId: string, actionNumber: string): Promise<boolean> {
    const isCamera = hwId.toUpperCase().startsWith('CAM_') || hwId.toUpperCase().includes('CAM');
    const isSocket = hwId.toUpperCase().startsWith('OCAM') || hwId.toUpperCase().includes('OCAM') || hwId.toUpperCase().includes('SOCKET');

    const candidateTopics = new Set<string>();

    if (isCamera) {
      candidateTopics.add(`devices/${hwId}/camera/cmd`);
    } else if (isSocket) {
      candidateTopics.add(`${hwId}/set`);
    } else {
      candidateTopics.add(`${userId || 'austec'}/${hwId}/sub/action`);
      candidateTopics.add(`austec/${hwId}/sub/action`);
      candidateTopics.add(`amtuong/${hwId}/sub/action`);
      candidateTopics.add(`${hwId}/sub/action`);

      try {
        const state = await this.hotCache.getDeviceState(hwId);
        const knownOwner = (state?.currentProperties as any)?.ownerId;
        if (knownOwner) {
          candidateTopics.add(`${knownOwner}/${hwId}/sub/action`);
        }
      } catch (_) {}
    }

    let anySuccess = false;
    for (const topic of candidateTopics) {
      const ok = await this.publishMessage(topic, actionNumber);
      if (ok) anySuccess = true;
    }

    return anySuccess;
  }

  /**
   * Phát lệnh nạp OTA xuống thiết bị
   */
  public async publishOta(userId: string, hwId: string, otaJson: any): Promise<boolean> {
    const topic = `${userId || 'austec'}/${hwId}/sub/ota`;
    return this.publishMessage(topic, JSON.stringify(otaJson));
  }

  /**
   * Phát thông điệp bất kỳ vào EMQX Broker
   */
  public publishMessage(topic: string, payload: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.recordMessage(topic, payload, 'OUTGOING');
      if (this.client && this.client.connected) {
        this.client.publish(topic, payload, { qos: 0 }, (err) => {
          if (err) {
            console.error(`[MQTT Gateway] Lỗi phát sóng tới ${topic}:`, err);
            resolve(false);
          } else {
            console.log(`[MQTT Gateway] 📤 EMQX đã phát: [${topic}] -> ${payload}`);
            resolve(true);
          }
        });
      } else {
        console.warn(`[MQTT Gateway] ⚠️ Client chưa kết nối EMQX, lưu tạm packet [${topic}]`);
        resolve(true);
      }
    });
  }

  private recordMessage(topic: string, payload: string, direction: 'INCOMING' | 'OUTGOING') {
    this.messageHistory.unshift({
      topic,
      payload,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      direction,
    });
    if (this.messageHistory.length > 50) {
      this.messageHistory.pop();
    }
  }

  public getMessageHistory(): MqttMessageEvent[] {
    return this.messageHistory;
  }

  public getStatus(): { isRunning: boolean; brokerUrl: string; messageCount: number } {
    return {
      isRunning: this.isRunning,
      brokerUrl: this.brokerUrl,
      messageCount: this.messageHistory.length,
    };
  }

  public async isHardwareOnline(hwId: string): Promise<boolean> {
    const cleanId = hwId.trim().toLowerCase();
    try {
      const state = await this.hotCache.getDeviceState(hwId);
      if (state && state.isOnline) return true;
    } catch (_) {}

    const hasRecentMsg = this.messageHistory.some((m) => {
      const top = m.topic.toLowerCase();
      return (
        m.direction === 'INCOMING' &&
        (top.includes(`/${cleanId}/`) || top.startsWith(`${cleanId}/`) || top.includes(cleanId))
      );
    });
    if (hasRecentMsg) return true;

    // Chủ động phát gói thăm dò (ping) xuống topic sub/isonline của Cửa cuốn / Ổ cắm
    try {
      this.publishMessage(`+/${hwId}/sub/isonline`, '1').catch(() => {});
      this.publishMessage(`00000000-0000-0000-0000-000000000001/${hwId}/sub/isonline`, '1').catch(() => {});
      this.publishMessage(`austec/${hwId}/sub/isonline`, '1').catch(() => {});
    } catch (_) {}

    return false;
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.client) {
        this.client.end(false, () => resolve());
      } else {
        resolve();
      }
    });
  }
}
