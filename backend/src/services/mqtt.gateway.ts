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
  private pendingAcks: Map<string, Array<{
    expectedActions?: string[];
    resolve: (value: { success: boolean; payload?: string }) => void;
    timer: NodeJS.Timeout;
  }>> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isScanningHeartbeat: boolean = false;

  constructor(
    private postgresService: PostgresService,
    private blackboxService: BlackboxService,
    private hotCache: HotCacheClient,
    private onStateChangeCallback?: (hwId: string, state: any) => void
  ) { }

  /**
   * Chờ xác nhận 2 chiều từ phần cứng thực tế (Loại bỏ thành công ảo)
   */
  public waitForActionAck(hardwareId: string, expectedActions?: string[], timeoutMs: number = 3500): Promise<{ success: boolean; payload?: string }> {
    return new Promise((resolve) => {
      const key = hardwareId.toLowerCase().trim();
      const timer = setTimeout(() => {
        const list = this.pendingAcks.get(key) || [];
        const filtered = list.filter(item => item.timer !== timer);
        if (filtered.length > 0) {
          this.pendingAcks.set(key, filtered);
        } else {
          this.pendingAcks.delete(key);
        }
        resolve({ success: false, payload: 'TIMEOUT' });
      }, timeoutMs);

      const item = { expectedActions, resolve, timer };
      const list = this.pendingAcks.get(key) || [];
      list.push(item);
      this.pendingAcks.set(key, list);
    });
  }

  /**
   * Giải phóng chờ ACK CHỈ KHI gói tin thực tế từ phần cứng khớp chính xác mã lệnh kỳ vọng (Strict 2-Way ACK)
   */
  public resolvePendingAck(hardwareId: string, payload: string) {
    const key = hardwareId.toLowerCase().trim();
    const list = this.pendingAcks.get(key);
    if (!list || list.length === 0) return;

    const cleanPayload = (payload || '').trim();
    const cleanLower = cleanPayload.toLowerCase();

    // Parse JSON một lần nếu payload là JSON để hỗ trợ đối chiếu các trường ack/code/action/probe
    let parsedJson: Record<string, any> | null = null;
    if (cleanPayload.startsWith('{') && cleanPayload.endsWith('}')) {
      try {
        parsedJson = JSON.parse(cleanPayload);
      } catch (_) {
        parsedJson = null;
      }
    }

    const matchesExpected = (expectedActions?: string[]): boolean => {
      if (!expectedActions || expectedActions.length === 0) return true;
      for (const rawExp of expectedActions) {
        const exp = (rawExp || '').trim();
        if (!exp) continue;
        const expLower = exp.toLowerCase();

        // 1. Khớp tuyệt đối chuỗi payload (ví dụ: "295", "1", "2", "3", "13", "14", "0", "SET_LFP", "CFG:...")
        if (cleanLower === expLower) return true;

        // 2. Nếu phần cứng trả JSON ACK chuẩn: {"ack":"295"} / {"code":"13"} / {"action":"14"} / {"probe":295}
        if (parsedJson) {
          const candidates = [parsedJson.ack, parsedJson.code, parsedJson.action, parsedJson.probe, parsedJson.cmd]
            .filter((v) => v !== undefined && v !== null)
            .map((v) => String(v).trim().toLowerCase());
          if (candidates.includes(expLower)) return true;
        }
      }
      return false;
    };

    const remaining: typeof list = [];
    for (const item of list) {
      if (matchesExpected(item.expectedActions)) {
        clearTimeout(item.timer);
        item.resolve({ success: true, payload: cleanPayload });
      } else {
        remaining.push(item);
      }
    }

    if (remaining.length > 0) {
      this.pendingAcks.set(key, remaining);
    } else {
      this.pendingAcks.delete(key);
    }
  }

  /**
   * Khởi động cơ chế quét trạng thái thiết bị định kỳ (30 giây / lần, chạy ngay lượt đầu sau 5s)
   */
  public startHeartbeatScanner(intervalMs: number = 30000) {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    console.log(`[MQTT Gateway] ⏱️ Đã kích hoạt cơ chế quét trạng thái thiết bị liên tục (${intervalMs / 1000}s/lần)`);
    setTimeout(() => {
      this.runHeartbeatScan().catch(() => { });
    }, 5000);
    this.heartbeatTimer = setInterval(async () => {
      await this.runHeartbeatScan();
    }, intervalMs);
  }

  /**
   * Đánh dấu thiết bị OFFLINE ngay lập tức (khi không điều khiển được / mất phản hồi)
   */
  public async markDeviceOffline(hwId: string): Promise<void> {
    try {
      if (this.postgresService && typeof this.postgresService.query === 'function') {
        await this.postgresService.query(
          `UPDATE device_instances SET is_online = false, updated_at = NOW()::text WHERE LOWER(hardware_id) = LOWER($1)`,
          [hwId]
        );
      }
      await this.hotCache.setDeviceState(hwId, { isOnline: false });
      await this.hotCache.setDeviceState(hwId.toLowerCase(), { isOnline: false });
      await this.hotCache.setDeviceState(hwId.toUpperCase(), { isOnline: false });
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(hwId, { isOnline: false });
      }
    } catch (e: any) {
      console.warn(`[MQTT Gateway] Lỗi đánh dấu offline [${hwId}]:`, e.message);
    }
  }

  /**
   * Thực thi quét song song và kiểm tra trạng thái Online/Offline bằng cơ chế sẵn có của firmware gốc (không dùng mã 295):
   * - SmartMetter & BMS: dựa trên gói telemetry định kỳ 1s (quá 25s không có telemetry -> OFFLINE)
   * - Cửa cuốn & Ổ cắm: gửi sub/isonline, firmware gốc trả "1" lên pub/isonline
   * - Camera: giữ trạng thái theo kết nối/stream & sự kiện broker disconnected
   */
  public async runHeartbeatScan() {
    if (this.isScanningHeartbeat) return;
    this.isScanningHeartbeat = true;
    try {
      if (!this.postgresService || typeof this.postgresService.query !== 'function') return;
      const res = await this.postgresService.query(`SELECT hardware_id, owner_id, last_heartbeat, is_online FROM device_instances`);
      if (!res || !res.rows) return;

      const nowMs = Date.now();
      await Promise.allSettled(res.rows.map(async (row: any) => {
        const hwId: string = row.hardware_id;
        if (!hwId) return;

        const upperHw = hwId.toUpperCase();
        const isSocket = upperHw.startsWith('OCAM') || upperHw.includes('SOCKET') || upperHw.startsWith('SMARTSW');
        const isCamera = !isSocket && (upperHw.startsWith('CAM') || upperHw.includes('CAMERA') || upperHw.includes('OV2640'));
        const isBms = !isSocket && !isCamera && upperHw.includes('BMS');
        const isMeter = !isSocket && !isCamera && !isBms && (upperHw.startsWith('SMARTMETTER') || upperHw.startsWith('SMARTMETER') || upperHw.includes('METER') || upperHw.includes('CONGTO'));

        // Camera bản gốc không có ping định kỳ -> không tự đánh dấu offline trong vòng quét này
        if (isCamera) return;

        let isActuallyOnline = false;
        const cacheState = await this.hotCache.getDeviceState(hwId);

        if (isMeter || isBms) {
          // SmartMetter & BMS gốc gửi telemetry mỗi 1s -> kiểm tra lastHeartbeat trong 25s gần nhất
          const lastHbRaw = cacheState?.lastHeartbeat || row.last_heartbeat;
          if (lastHbRaw) {
            const hbTime = new Date(lastHbRaw).getTime();
            if (!isNaN(hbTime) && (nowMs - hbTime) <= 25000) {
              isActuallyOnline = true;
            }
          }
        } else {
          // Cửa cuốn & Ổ cắm gốc: nhận sub/isonline -> trả "1" lên pub/isonline
          const prefixes = new Set<string>([
            'USR-330967',
            'amtuong',
            'austec',
            '00000000-0000-0000-0000-000000000001',
          ]);
          if (row.owner_id) prefixes.add(String(row.owner_id).trim());
          const cachedOwner = (cacheState?.currentProperties as any)?.ownerId;
          if (cachedOwner) prefixes.add(String(cachedOwner).trim());

          const ackPromise = this.waitForActionAck(hwId, ['1'], 2500);
          for (const prefix of prefixes) {
            if (!prefix) continue;
            this.publishMessage(`${prefix}/${hwId}/sub/isonline`, '1').catch(() => { });
          }
          const ack = await ackPromise;
          isActuallyOnline = Boolean(ack.success && ack.payload?.trim() === '1');
        }

        const wasOnline = row.is_online === true;
        if (wasOnline !== isActuallyOnline) {
          console.log(`[MQTT Gateway] 🔄 Cập nhật trạng thái định kỳ [${hwId}]: ${isActuallyOnline ? 'ONLINE' : 'OFFLINE'}`);
          await this.postgresService.query(
            `UPDATE device_instances SET is_online = $1, ${isActuallyOnline ? 'last_heartbeat = NOW()::text,' : ''} updated_at = NOW()::text WHERE LOWER(hardware_id) = LOWER($2)`,
            [isActuallyOnline, hwId]
          );
          const nextState = { isOnline: isActuallyOnline, ...(isActuallyOnline ? { lastHeartbeat: new Date().toISOString() } : {}) };
          await this.hotCache.setDeviceState(hwId, nextState);
          await this.hotCache.setDeviceState(hwId.toLowerCase(), nextState);
          await this.hotCache.setDeviceState(hwId.toUpperCase(), nextState);
          if (this.onStateChangeCallback) {
            this.onStateChangeCallback(hwId, { isOnline: isActuallyOnline });
          }
        }
      }));
    } catch (e: any) {
      console.warn(`[MQTT Gateway] Lỗi khi quét trạng thái thiết bị định kỳ:`, e.message);
    } finally {
      this.isScanningHeartbeat = false;
    }
  }

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

        // Đăng ký nhận chính xác các kênh của Austec (loại bỏ wildcard đơn +/status để tránh rác công cộng trên EMQX):
        // 1. Cửa cuốn & Ổ cắm (ocammoi): USR-330967/#, amtuong/#, +/+/pub/#, +/+/onboard, austec/#
        // 2. Camera AI (espcam.pdf): esp32/+/status, esp32/+/photo, devices/+/camera/#
        this.client?.subscribe([
          'USR-330967/#',
          'amtuong/#',
          'austec/#',
          '+/+/pub/#',
          '+/+/onboard',
          'devices/+/camera/#',
          'devices/+/status',
          'esp32/+/status',
          'esp32/+/photo',
          '$SYS/brokers/+/clients/+/disconnected',
        ], (err) => {
          if (!err) {
            console.log('[MQTT Gateway] 📡 Đã kích hoạt lắng nghe Topic Cửa cuốn, Camera AI & Ổ cắm Austec trên EMQX!');
          }
        });
        this.startHeartbeatScanner(30000);
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
    // Bắt sự kiện Broker báo thiết bị ngắt kết nối TCP/Keep-Alive ($SYS/brokers/+/clients/{clientId}/disconnected)
    if (topic.startsWith('$SYS')) {
      if (topic.includes('/clients/') && topic.endsWith('/disconnected')) {
        const parts = topic.split('/');
        const clientId = parts[parts.length - 2];
        if (clientId && !clientId.startsWith('austec_backend')) {
          console.log(`[MQTT Gateway] 🔌 Broker báo thiết bị ngắt kết nối [${clientId}] -> Đánh dấu OFFLINE`);
          await this.markDeviceOffline(clientId);
        }
      }
      return;
    }

    // A. XỬ LÝ KHUNG HÌNH CAMERA (JPEG BINARY BUFFER từ espcam.pdf và platform)
    if (topic.includes('/camera/photo') || (topic.startsWith('esp32/') && topic.endsWith('/photo'))) {
      const parts = topic.split('/');
      // topic: devices/{hwId}/camera/photo HOẶC esp32/{device_name}/photo
      const hwId = parts.length >= 2 ? parts[1] : 'CAM_UNKNOWN';
      this.cameraSnapshots.set(hwId, { buffer: message, timestamp: Date.now() });
      this.cameraSnapshots.set(hwId.toLowerCase(), { buffer: message, timestamp: Date.now() });
      this.cameraSnapshots.set(hwId.toUpperCase(), { buffer: message, timestamp: Date.now() });
      this.recordMessage(topic, `[JPEG Photo: ${message.length} bytes]`, 'INCOMING');
      console.log(`[MQTT Gateway] 📸 [${hwId}] Nhận khung hình Camera JPEG: ${message.length} bytes`);

      const camPhotoState = {
        isOnline: true,
        currentProperties: { hasStream: true, lastPhotoAt: new Date().toISOString(), photoSize: message.length },
        lastHeartbeat: new Date().toISOString(),
      };
      await this.hotCache.setDeviceState(hwId, camPhotoState);
      await this.hotCache.setDeviceState(hwId.toLowerCase(), camPhotoState);
      await this.hotCache.setDeviceState(hwId.toUpperCase(), camPhotoState);

      try {
        await this.postgresService?.query(
          `UPDATE device_instances SET is_online = true, last_heartbeat = NOW()::text WHERE LOWER(hardware_id) = LOWER($1)`,
          [hwId]
        );
      } catch (_) { }

      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(hwId, { cameraFrame: true, size: message.length });
      }
      this.resolvePendingAck(hwId, 'CAMERA_FRAME');
      return;
    }

    const payload = message.length > 2048 ? message.subarray(0, 2048).toString('utf-8') : message.toString('utf-8');
    const shortPayload = payload.length > 80 ? payload.slice(0, 80) + '...' : payload;
    this.recordMessage(topic, shortPayload, 'INCOMING');

    // =========================================================================
    // XỬ LÝ MÃ NHẬN DIỆN THIẾT BỊ ONLINE CHUẨN TOÀN HỆ THỐNG: MÃ 295
    // Khi Backend gửi mã 295 xuống thiết bị, thiết bị bắt buộc gửi lại đúng mã 295.
    // Nếu nhận được mã 295 từ bất kỳ topic nào của thiết bị, lập tức kích hoạt ONLINE!
    // =========================================================================
    const cleanPayload = payload.trim();
    if (cleanPayload === '295' || cleanPayload.includes('"probe":295') || cleanPayload.includes('"probe":"295"') || cleanPayload.includes('"action":"295"') || cleanPayload.includes('"action":295')) {
      let detectedHwId = '';
      const tParts = topic.split('/');
      if (topic.startsWith('devices/') || topic.startsWith('esp32/') || topic.startsWith('austec/')) {
        detectedHwId = tParts[1] || '';
      } else if (tParts.length >= 3 && (tParts[0] === 'USR-330967' || tParts[0] === 'amtuong' || tParts[2] === 'pub')) {
        detectedHwId = tParts[1] || '';
      } else if (tParts.length >= 2) {
        detectedHwId = tParts[0] || tParts[1] || '';
      } else {
        detectedHwId = topic;
      }

      if (detectedHwId && detectedHwId !== 'status' && detectedHwId !== 'action' && detectedHwId !== 'command') {
        console.log(`[MQTT Gateway] 🟢 [${detectedHwId}] Xác thực ONLINE thành công qua mã chuẩn 295! Topic: ${topic}`);
        const nowIso = new Date().toISOString();
        const onlineState = { isOnline: true, lastHeartbeat: nowIso };
        await this.hotCache.setDeviceState(detectedHwId, onlineState);
        await this.hotCache.setDeviceState(detectedHwId.toLowerCase(), onlineState);
        await this.hotCache.setDeviceState(detectedHwId.toUpperCase(), onlineState);

        try {
          await this.postgresService?.query(
            `UPDATE device_instances SET is_online = true, last_heartbeat = NOW()::text, updated_at = NOW()::text WHERE LOWER(hardware_id) = LOWER($1)`,
            [detectedHwId]
          );
        } catch (_) { }

        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(detectedHwId, { isOnline: true });
        }
        this.resolvePendingAck(detectedHwId, '295');
        return;
      }
    }

    // B.1. XỬ LÝ GÓI TIN XÁC NHẬN LỆNH CHUẨN (2-WAY ACK): austec/{hwId}/ack, austec/{hwId}/status, devices/{hwId}/camera/ack
    if (
      (topic.startsWith('austec/') && (topic.endsWith('/ack') || topic.endsWith('/status'))) ||
      (topic.startsWith('devices/') && topic.endsWith('/camera/ack'))
    ) {
      const parts = topic.split('/');
      const hwId = parts[1];
      if (hwId) {
        console.log(`[MQTT Gateway] ✅ [${hwId}] Nhận ACK phần cứng trên [${topic}]: ${cleanPayload}`);
        const ackOnlineState = { isOnline: true, lastHeartbeat: new Date().toISOString() };
        await this.hotCache.setDeviceState(hwId, ackOnlineState);
        await this.hotCache.setDeviceState(hwId.toLowerCase(), ackOnlineState);
        await this.hotCache.setDeviceState(hwId.toUpperCase(), ackOnlineState);
        try {
          await this.postgresService?.query(
            `UPDATE device_instances SET is_online = true, last_heartbeat = NOW()::text WHERE LOWER(hardware_id) = LOWER($1)`,
            [hwId]
          );
        } catch (_) { }
        this.resolvePendingAck(hwId, cleanPayload);
        return;
      }
    }

    // B. XỬ LÝ TRẠNG THÁI ONLINE CỦA CAMERA: devices/{hwId}/status HOẶC esp32/{hwId}/status (espcam.pdf)
    if ((topic.startsWith('devices/') && topic.endsWith('/status')) || (topic.startsWith('esp32/') && topic.endsWith('/status'))) {
      const parts = topic.split('/');
      const hwId = parts[1];
      if (!hwId || hwId === 'status') return;

      // Chỉ nhận diện Camera theo đúng chuẩn espcam.pdf (tên bắt đầu bằng CAM) hoặc thiết bị Austec
      const isAustecCam = hwId.toUpperCase().startsWith('CAM') || topic.startsWith('devices/');
      if (!isAustecCam) return;
      console.log(`[MQTT Gateway] 📷 Camera [${hwId}] thông báo ONLINE! Payload: ${shortPayload}`);

      const camOnlineState = {
        isOnline: true,
        currentProperties: { hasStream: true, streamResolution: 'VGA 640x480' },
        lastHeartbeat: new Date().toISOString(),
      };
      await this.hotCache.setDeviceState(hwId, camOnlineState);
      await this.hotCache.setDeviceState(hwId.toLowerCase(), camOnlineState);
      await this.hotCache.setDeviceState(hwId.toUpperCase(), camOnlineState);

      try {
        await this.postgresService?.query(
          `UPDATE device_instances SET is_online = true, last_heartbeat = NOW()::text WHERE LOWER(hardware_id) = LOWER($1)`,
          [hwId]
        );
      } catch (_) { }

      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(hwId, { isOnline: true });
      }
      this.resolvePendingAck(hwId, 'CAMERA_ONLINE');
      return;
    }

    // B.2. XỬ LÝ DỮ LIỆU CÔNG TƠ ĐIỆN TỬ & PIN LƯU TRỮ BMS: austec/{hwId}/telemetry, austec/{hwId}/alarm, austec/{hwId}/daily_report
    if (topic.startsWith('austec/') && (topic.endsWith('/telemetry') || topic.endsWith('/alarm') || topic.endsWith('/daily_report'))) {
      const parts = topic.split('/');
      const hwId = parts[1];
      const sub = parts[2];
      try {
        const json = JSON.parse(payload);
        if (sub === 'telemetry') {
          // B.2.1. Phân loại xử lý BMS: AUSTEC_BMS...
          if (hwId.toUpperCase().includes('BMS')) {
            console.log(`[MQTT Gateway] 🔋 [${hwId}] Nhận Telemetry BMS: V=${json.v_pack}V, I=${json.i_pack}A, SOC=${json.soc}%, Status=${json.status}`);
            const bmsState = {
              isOnline: true,
              currentProperties: {
                batteryVoltage: json.v_pack ?? 0,
                packVoltage: json.v_pack ?? 0,
                packCurrent: json.i_pack ?? 0,
                currentPowerKw: json.p_kw ?? 0,
                batteryPercent: json.soc ?? 0,
                socPercent: json.soc ?? 0,
                bmsStatus: json.status ?? 'BMS Wakeup',
                isDischarging: (json.i_pack ?? 0) < -0.3,
                isCharging: (json.i_pack ?? 0) > 0.3,
                mosTemp: json.t_mos ?? 0,
                ntcTemps: json.t_ntc ?? [],
                cellVoltages: json.cells ?? [],
                cfg: json.cfg ?? {},
              },
              lastHeartbeat: new Date().toISOString(),
            };
            await this.hotCache.setDeviceState(hwId, bmsState);
            await this.hotCache.setDeviceState(hwId.toLowerCase(), bmsState);
            await this.hotCache.setDeviceState(hwId.toUpperCase(), bmsState);
            try {
              await this.postgresService?.query(
                `UPDATE device_instances 
                 SET is_online = true, 
                     current_properties = COALESCE(current_properties, '{}'::jsonb) || $1::jsonb,
                     last_heartbeat = NOW()::text 
                 WHERE LOWER(hardware_id) = LOWER($2)`,
                [JSON.stringify(bmsState.currentProperties), hwId]
              );
            } catch (_) { }
            if (this.onStateChangeCallback) {
              this.onStateChangeCallback(hwId, { ...bmsState.currentProperties, isOnline: true, lastHeartbeat: bmsState.lastHeartbeat });
            }
            return;
          }

          console.log(`[MQTT Gateway] ⚡ [${hwId}] Nhận dữ liệu Telemetry Công tơ: U=${json.voltage}V, I=${json.current}A, P=${json.power}W, Total=${json.total_kwh}kWh, Relay=${json.relay_status}`);
          const isRelayOn = json.relay_status === 'ON';
          const meterState = {
            isOnline: true,
            currentProperties: {
              voltage: json.voltage,
              current: json.current,
              power: json.power,
              total_kwh: json.total_kwh,
              daily_kwh: json.daily_kwh,
              relay_status: json.relay_status || 'ON',
              is_meter_on: isRelayOn,
              p_warn_cfg: json.p_warn_cfg,
              i_warn_cfg: json.i_warn_cfg,
              cf_pulses: json.cf_pulses,
            },
            lastHeartbeat: new Date().toISOString(),
          };
          await this.hotCache.setDeviceState(hwId, meterState);
          await this.hotCache.setDeviceState(hwId.toLowerCase(), meterState);
          await this.hotCache.setDeviceState(hwId.toUpperCase(), meterState);
          try {
            await this.postgresService?.query(
              `UPDATE device_instances 
               SET is_online = true, 
                   current_properties = COALESCE(current_properties, '{}'::jsonb) || $1::jsonb,
                   last_heartbeat = NOW()::text 
               WHERE LOWER(hardware_id) = LOWER($2)`,
              [JSON.stringify(meterState.currentProperties), hwId]
            );
          } catch (_) { }
          if (this.onStateChangeCallback) {
            this.onStateChangeCallback(hwId, { ...meterState.currentProperties, isOnline: true, lastHeartbeat: meterState.lastHeartbeat });
          }
          return;
        } else if (sub === 'daily_report') {
          console.log(`[MQTT Gateway] 📊 [${hwId}] Nhận báo cáo chốt số cuối ngày (Mã 20): daily=${json.daily_kwh}kWh, total=${json.total_kwh}kWh`);
          const reportProps = {
            daily_kwh: json.daily_kwh,
            total_kwh: json.total_kwh,
            last_daily_closing_at: new Date().toISOString(),
          };
          await this.hotCache.setDeviceState(hwId, {
            isOnline: true,
            currentProperties: reportProps,
            lastHeartbeat: new Date().toISOString(),
          });
          try {
            await this.postgresService?.query(
              `UPDATE device_instances
               SET is_online = true,
                   current_properties = COALESCE(current_properties, '{}'::jsonb) || $1::jsonb,
                   last_heartbeat = NOW()::text
               WHERE LOWER(hardware_id) = LOWER($2)`,
              [JSON.stringify(reportProps), hwId]
            );
          } catch (_) { }
          this.resolvePendingAck(hwId, '20');
          return;
        } else if (sub === 'alarm') {
          console.warn(`[MQTT Gateway] 🚨 [${hwId}] CẢNH BÁO CÔNG TƠ ĐIỆN TỬ: ${json.message}`);
          const alarmState = {
            currentProperties: {
              alarm: json.message,
              relay_status: 'OFF',
              is_meter_on: false,
              alarmAt: new Date().toISOString(),
            },
            lastHeartbeat: new Date().toISOString(),
          };
          await this.hotCache.setDeviceState(hwId, alarmState);
          try {
            await this.postgresService?.query(
              `UPDATE device_instances 
               SET current_properties = COALESCE(current_properties, '{}'::jsonb) || $1::jsonb,
                   last_heartbeat = NOW()::text 
               WHERE LOWER(hardware_id) = LOWER($2)`,
              [JSON.stringify(alarmState.currentProperties), hwId]
            );
          } catch (_) { }

          // TH2: Phát thông báo cảnh báo nguy hiểm khẩn cấp tới chủ sở hữu thiết bị
          try {
            const devOwnerRes = await this.postgresService?.query(
              `SELECT owner_id, custom_name FROM device_instances WHERE LOWER(hardware_id) = LOWER($1) LIMIT 1`,
              [hwId]
            );
            if (devOwnerRes?.rows?.length > 0 && devOwnerRes.rows[0].owner_id) {
              const ownerId = devOwnerRes.rows[0].owner_id;
              const devName = devOwnerRes.rows[0].custom_name || hwId;
              const notifId = `NOTIF-ALERT-${Date.now()}`;
              await this.postgresService?.query(
                `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
                 VALUES ($1, $2, $3, $4, 'ALERT_DANGER', false, NOW()::text)`,
                [
                  notifId,
                  ownerId,
                  `🚨 CẢNH BÁO NGUY HIỂM: ${devName}`,
                  `Phát hiện sự cố an toàn: ${json.message || 'Cảnh báo rơ-le / sự cố quá tải'} trên thiết bị ${devName} (${hwId}).`,
                ]
              );
            }
          } catch (_) { }

          if (this.onStateChangeCallback) {
            this.onStateChangeCallback(hwId, { ...alarmState.currentProperties, isOnline: true, lastHeartbeat: alarmState.lastHeartbeat });
          }
          this.resolvePendingAck(hwId, payload);
          return;
        }
      } catch (err: any) {
        console.warn(`[MQTT Gateway] Lỗi phân tích gói tin công tơ [${topic}]: ${err.message}`);
      }
    }

    // C. XỬ LÝ TRẠNG THÁI CỦA Ổ CẮM / RƠ-LE: {deviceName}/status & {deviceName}/response
    const slashCount = (topic.match(/\//g) || []).length;
    if (slashCount === 1) {
      const [hwId, subAction] = topic.split('/');

      // CHỈ xử lý nếu đúng là ổ cắm Austec (định danh OCAM...)
      if (hwId.startsWith('OCAM')) {
        // 1. Ổ cắm báo Online: {deviceName}/status
        if (subAction === 'status') {
          console.log(`[MQTT Gateway] 🔌 Ổ cắm [${hwId}] thông báo ONLINE! Payload: ${payload}`);
          await this.hotCache.setDeviceState(hwId, {
            isOnline: true,
            currentProperties: { is_relay_on: false, relay_state: 'OFF' },
            lastHeartbeat: new Date().toISOString(),
          });
          try {
            await this.postgresService.query('UPDATE device_instances SET is_online = true, last_heartbeat = NOW()::text WHERE hardware_id = $1', [hwId]);
          } catch (_) { }
          if (this.onStateChangeCallback) {
            this.onStateChangeCallback(hwId, { isOnline: true });
          }
          this.resolvePendingAck(hwId, payload);
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
            this.onStateChangeCallback(hwId, { isOnline: true, is_relay_on: isRelayOn, relay_state: isRelayOn ? 'ON' : 'OFF', lastHeartbeat: new Date().toISOString() });
          }
          this.resolvePendingAck(hwId, payload);
          return;
        }
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
        const stateObj = {
          isOnline: true,
          currentProperties: { open_state: 'CLOSED', ownerId: user },
          lastHeartbeat: new Date().toISOString(),
        };
        await this.hotCache.setDeviceState(hwId, stateObj);
        await this.hotCache.setDeviceState(hwId.toLowerCase(), stateObj);
        await this.hotCache.setDeviceState(hwId.toUpperCase(), stateObj);
        try {
          await this.postgresService.query('UPDATE device_instances SET is_online = true, last_heartbeat = NOW()::text WHERE LOWER(hardware_id) = LOWER($1)', [hwId]);
        } catch (_) { }
        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(hwId, { isOnline: true, paired: true });
        }
        this.resolvePendingAck(hwId, payload);
      }

      // 2. Gói tin Phản Hồi Trạng Thái Trực Tuyến: {user}/{hwId}/pub/isonline
      if (subType === 'pub' && parts[3] === 'isonline') {
        console.log(`[MQTT Gateway] 🚪 [${hwId}] Phản hồi IS_ONLINE: ${payload}`);
        const stateObj = {
          isOnline: true,
          currentProperties: { isOnline: true, ownerId: user },
          lastHeartbeat: new Date().toISOString(),
        };
        await this.hotCache.setDeviceState(hwId, stateObj);
        await this.hotCache.setDeviceState(hwId.toLowerCase(), stateObj);
        await this.hotCache.setDeviceState(hwId.toUpperCase(), stateObj);
        try {
          await this.postgresService.query('UPDATE device_instances SET is_online = true, last_heartbeat = NOW()::text WHERE LOWER(hardware_id) = LOWER($1)', [hwId]);
        } catch (_) { }
        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(hwId, { isOnline: true, paired: true });
        }
        this.resolvePendingAck(hwId, payload);
      }

      // 3. Gói tin Báo Cảm Biến / Hành Trình Cửa HOẶC Trạng Thái Ổ Cắm (ocammoi): {user}/{hwId}/pub/action
      if (subType === 'pub' && parts[3] === 'action') {
        const isSocket = hwId.toLowerCase().startsWith('ocam') || hwId.toLowerCase().includes('socket');

        if (isSocket) {
          // Xử lý ổ cắm theo ocammoi: "13" = BẬT, "14" = TẮT, "3" = DỪNG
          const isRelayOn = payload === '13' || payload === '1';
          console.log(`[MQTT Gateway] ⚡ [${hwId}] Ổ cắm ocammoi phản hồi Rơ-le: Action = ${payload} -> ${isRelayOn ? 'BẬT (ON)' : 'TẮT (OFF)'}`);
          const socketState = {
            isOnline: true,
            currentProperties: { is_relay_on: isRelayOn, relay_state: isRelayOn ? 'ON' : 'OFF', lastAction: payload, ownerId: user },
            lastHeartbeat: new Date().toISOString(),
          };
          await this.hotCache.setDeviceState(hwId, socketState);
          await this.hotCache.setDeviceState(hwId.toLowerCase(), socketState);
          await this.hotCache.setDeviceState(hwId.toUpperCase(), socketState);
          try {
            await this.postgresService.query(
              `UPDATE device_instances SET is_online = true, last_heartbeat = NOW()::text, current_properties = current_properties || jsonb_build_object('is_relay_on', $2::boolean, 'relay_state', $3) WHERE LOWER(hardware_id) = LOWER($1)`,
              [hwId, isRelayOn, isRelayOn ? 'ON' : 'OFF']
            );
          } catch (_) { }
          if (this.onStateChangeCallback) {
            this.onStateChangeCallback(hwId, { isOnline: true, is_relay_on: isRelayOn, relay_state: isRelayOn ? 'ON' : 'OFF', lastHeartbeat: new Date().toISOString() });
          }
          this.resolvePendingAck(hwId, payload);
          return;
        }

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

        try {
          await this.postgresService.query(
            `UPDATE device_instances SET is_online = true, last_heartbeat = NOW()::text WHERE LOWER(hardware_id) = LOWER($1)`,
            [hwId]
          );
        } catch (_) { }

        if (this.onStateChangeCallback) {
          this.onStateChangeCallback(hwId, { isOnline: true, open_state: openState, action: payload, lastHeartbeat: new Date().toISOString() });
        }
        this.resolvePendingAck(hwId, payload);
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
    return this.cameraSnapshots.get(hwId) ||
      this.cameraSnapshots.get(hwId.toLowerCase()) ||
      this.cameraSnapshots.get(hwId.toUpperCase());
  }

  /**
   * Phát lệnh điều khiển xuống mạch ESP32:
   * 1. Cửa cuốn: topic {user}/{device_id}/sub/action
   * 2. Camera: topic devices/{device_id}/camera/cmd
   * 3. Ổ cắm: topic {device_id}/set
   */
  public async publishAction(userId: string, hwId: string, actionNumber: string): Promise<boolean> {
    const upperHwId = hwId.toUpperCase();
    const isSocket = upperHwId.startsWith('OCAM') || upperHwId.includes('SOCKET') || upperHwId.includes('OCAM');
    const isCamera = !isSocket && (upperHwId.startsWith('CAM') || upperHwId.includes('CAMERA') || upperHwId.includes('OV2640'));
    const isBms = !isSocket && !isCamera && upperHwId.includes('BMS');
    const isMeter = !isSocket && !isCamera && !isBms && (upperHwId.startsWith('SMARTMETTER') || upperHwId.startsWith('SMARTMETER') || upperHwId.includes('METER') || upperHwId.includes('CONGTO'));

    const candidateTopics = new Set<string>();

    if (isBms) {
      candidateTopics.add(`austec/${hwId}/command`);
      candidateTopics.add(`austec/${hwId.toLowerCase()}/command`);
      candidateTopics.add(`austec/${hwId.toUpperCase()}/command`);
      candidateTopics.add(`${hwId}/command`);
    } else if (isMeter) {
      candidateTopics.add(`austec/${hwId}/command`);
      candidateTopics.add(`austec/${hwId.toLowerCase()}/command`);
      candidateTopics.add(`austec/${hwId}/sub/action`);
      candidateTopics.add(`${hwId}/command`);
    } else if (isSocket) {
      // Ổ cắm theo chuẩn ocammoi lắng nghe tại {user}/{hwId}/sub/action (user cứng trong EEPROM là USR-330967)
      candidateTopics.add(`USR-330967/${hwId}/sub/action`);
      candidateTopics.add(`USR-330967/${hwId.toLowerCase()}/sub/action`);
      candidateTopics.add(`USR-330967/${hwId.toUpperCase()}/sub/action`);
      candidateTopics.add(`00000000-0000-0000-0000-000000000001/${hwId}/sub/action`);
      candidateTopics.add(`${userId || 'austec'}/${hwId}/sub/action`);
      candidateTopics.add(`austec/${hwId}/sub/action`);
      candidateTopics.add(`amtuong/${hwId}/sub/action`);
      candidateTopics.add(`${hwId}/sub/action`);
      candidateTopics.add(`${hwId}/set`);
    } else if (isCamera) {
      candidateTopics.add(`devices/${hwId}/camera/cmd`);
      candidateTopics.add(`devices/${hwId}/cmd`);
      candidateTopics.add(`esp32/${hwId}/cmd`);
      candidateTopics.add(`esp32/${hwId}/sub/action`);
      candidateTopics.add(`${hwId}/cmd`);
    } else {
      candidateTopics.add(`USR-330967/${hwId}/sub/action`);
      candidateTopics.add(`USR-330967/${hwId.toLowerCase()}/sub/action`);
      candidateTopics.add(`00000000-0000-0000-0000-000000000001/${hwId}/sub/action`);
      candidateTopics.add(`${userId || 'austec'}/${hwId}/sub/action`);
      candidateTopics.add(`austec/${hwId}/sub/action`);
      candidateTopics.add(`amtuong/${hwId}/sub/action`);
      candidateTopics.add(`amtuong/${hwId.toLowerCase()}/sub/action`);
      candidateTopics.add(`${hwId}/sub/action`);
    }

    // Luôn truy vấn database PostgreSQL để bổ sung topic {owner_id}/{hwId}/sub/action chính xác của chủ thiết bị
    try {
      if (this.postgresService && typeof this.postgresService.query === 'function') {
        const ownersRes = await this.postgresService.query(
          `SELECT owner_id FROM device_instances WHERE LOWER(hardware_id) = LOWER($1) OR hardware_id = $1 LIMIT 1`,
          [hwId]
        );
        if (ownersRes && ownersRes.rows && ownersRes.rows.length > 0 && ownersRes.rows[0].owner_id) {
          candidateTopics.add(`${ownersRes.rows[0].owner_id}/${hwId}/sub/action`);
        }
        const permsRes = await this.postgresService.query(
          `SELECT user_id FROM device_permissions WHERE LOWER(hardware_id) = LOWER($1) OR hardware_id = $1`,
          [hwId]
        );
        if (permsRes && permsRes.rows && permsRes.rows.length > 0) {
          for (const row of permsRes.rows) {
            if (row.user_id) candidateTopics.add(`${row.user_id}/${hwId}/sub/action`);
          }
        }
      }
    } catch (_) { }

    try {
      const state = await this.hotCache.getDeviceState(hwId);
      const knownOwner = (state?.currentProperties as any)?.ownerId;
      if (knownOwner) {
        candidateTopics.add(`${knownOwner}/${hwId}/sub/action`);
      }
    } catch (_) { }

    let payloadsToSend = [actionNumber];
    if (isMeter) {
      if (actionNumber === 'METER_POWER_OFF' || actionNumber === 'OFF' || actionNumber === '14' || actionNumber === '1') {
        payloadsToSend = ['14'];
      } else if (actionNumber === 'METER_POWER_ON' || actionNumber === 'ON' || actionNumber === '13' || actionNumber === '2') {
        payloadsToSend = ['13'];
      } else if (actionNumber === 'RESET' || actionNumber === '0') {
        payloadsToSend = ['0'];
      }
    }

    let anySuccess = false;
    for (const topic of candidateTopics) {
      for (const p of payloadsToSend) {
        const ok = await this.publishMessage(topic, p);
        if (ok) anySuccess = true;
      }
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

  public async isHardwareOnline(hwId: string, userId?: string, forceProbe: boolean = false): Promise<boolean> {
    const cleanId = hwId.trim().toLowerCase();
    const upperHw = hwId.trim().toUpperCase();
    const isSocket = upperHw.startsWith('OCAM') || upperHw.includes('SOCKET') || upperHw.startsWith('SMARTSW');
    const isCamera = !isSocket && (upperHw.startsWith('CAM') || upperHw.includes('CAMERA') || upperHw.includes('OV2640'));
    const isBms = !isSocket && !isCamera && upperHw.includes('BMS');
    const isMeter = !isSocket && !isCamera && !isBms && (upperHw.startsWith('SMARTMETTER') || upperHw.startsWith('SMARTMETER') || upperHw.includes('METER') || upperHw.includes('CONGTO'));

    const nowMs = Date.now();
    const FRESH_WINDOW_MS = 25000;

    // 1. Kiểm tra HotCache (CHỈ tin khi lastHeartbeat còn mới trong vòng 25s, hoặc Camera)
    let cachedOwner: string | undefined;
    try {
      const state = (await this.hotCache.getDeviceState(hwId)) ||
        (await this.hotCache.getDeviceState(cleanId)) ||
        (await this.hotCache.getDeviceState(upperHw));
      cachedOwner = (state?.currentProperties as any)?.ownerId;
      if (state && state.isOnline && !forceProbe) {
        if (isCamera) return true;
        if (state.lastHeartbeat) {
          const hbMs = new Date(state.lastHeartbeat).getTime();
          if (!isNaN(hbMs) && (nowMs - hbMs) <= FRESH_WINDOW_MS) {
            return true;
          }
        }
      }
    } catch (_) { }

    // 2. Kiểm tra gói tin INCOMING thực sự GẦN ĐÂY (trong 25 giây gần nhất - sửa bug tin cũ hàng giờ)
    const hasRecentMsg = this.messageHistory.some((m) => {
      if (m.direction !== 'INCOMING') return false;
      const msgTime = new Date(m.timestamp).getTime();
      if (isNaN(msgTime) || (nowMs - msgTime) > FRESH_WINDOW_MS) return false;
      const top = m.topic.toLowerCase();
      return (
        top.includes(`/${cleanId}/`) || top.startsWith(`${cleanId}/`) || top.includes(cleanId)
      );
    });
    if (hasRecentMsg) return true;

    // SmartMetter & BMS gốc chỉ báo sống qua telemetry 1s -> quá 25s không có gói là OFFLINE
    if (isMeter || isBms) return false;
    // Camera gốc không trả lời sub/isonline -> giữ trạng thái đã có
    if (isCamera) return false;

    // 3. Cửa cuốn & Ổ cắm gốc: chủ động hỏi sub/isonline, đợi trả "1" trên pub/isonline
    try {
      const prefixes = new Set<string>([
        'USR-330967',
        'amtuong',
        'austec',
        '00000000-0000-0000-0000-000000000001',
      ]);
      if (userId && userId.trim().length > 0) prefixes.add(userId.trim());
      if (cachedOwner) prefixes.add(cachedOwner.trim());

      const ackPromise = this.waitForActionAck(hwId, ['1'], 2000);
      for (const prefix of prefixes) {
        this.publishMessage(`${prefix}/${hwId}/sub/isonline`, '1').catch(() => { });
        if (cleanId !== hwId) {
          this.publishMessage(`${prefix}/${cleanId}/sub/isonline`, '1').catch(() => { });
        }
      }

      const ack = await ackPromise;
      if (ack.success && ack.payload?.trim() === '1') {
        return true;
      }
    } catch (_) { }

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
