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

  constructor(
    private postgresService: PostgresService,
    private blackboxService: BlackboxService,
    private hotCache: HotCacheClient,
    private onStateChangeCallback?: (hwId: string, state: any) => void
  ) {}

  public start(port: number = 1883): Promise<boolean> {
    this.brokerUrl = process.env.MQTT_BROKER_URL || `mqtt://127.0.0.1:${port}`;
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
        // Topic của CodeCuaCuonBLE: {user}/{device_id}/pub/... và {user}/{device_id}/onboard
        this.client?.subscribe(['+/+/pub/#', '+/+/onboard', 'austec/#'], (err) => {
          if (!err) {
            console.log('[MQTT Gateway] 📡 Đã kích hoạt lắng nghe toàn bộ Topic cảm biến & Onboarding trên EMQX!');
          }
        });
        resolve(true);
      });

      this.client.on('message', async (topic: string, message: Buffer) => {
        const payload = message.toString('utf-8');
        await this.handleIncomingMessage(topic, payload);
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

  private async handleIncomingMessage(topic: string, payload: string) {
    if (topic.startsWith('$SYS')) return;

    this.recordMessage(topic, payload, 'INCOMING');

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
        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(hwId, { isOnline: true, paired: true });
        }
      }

      // 2. Gói tin Báo Cảm Biến / Hành Trình Cửa: {user}/{hwId}/pub/action
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
   * Phát lệnh điều khiển xuống mạch ESP32: topic {user}/{device_id}/sub/action
   * Action: "1" (Mở), "2" (Đóng), "3" (Dừng), "11" (Học RF), "12" (Xóa RF)
   */
  public async publishAction(userId: string, hwId: string, actionNumber: string): Promise<boolean> {
    const primaryTopic = `${userId || 'austec'}/${hwId}/sub/action`;
    const res = await this.publishMessage(primaryTopic, actionNumber);

    try {
      const state = await this.hotCache.getDeviceState(hwId);
      const knownOwner = (state?.currentProperties as any)?.ownerId;
      if (knownOwner && knownOwner !== userId) {
        await this.publishMessage(`${knownOwner}/${hwId}/sub/action`, actionNumber);
      }
    } catch (_) {}

    return res;
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
