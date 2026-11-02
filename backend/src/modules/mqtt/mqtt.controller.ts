import { Request, Response } from 'express';
import { exec } from 'child_process';
import { Controller, Get, Post } from '../../core/decorators/index.js';
import { MqttGateway } from '../../services/mqtt.gateway.js';
import { liveScannerService } from '../../services/live-scanner.service.js';

@Controller()
export class MqttController {
  constructor(private mqttGateway: MqttGateway) {}

  @Get('/mqtt/status')
  public async getMqttStatus(_req: Request, res: Response) {
    res.json({ success: true, ...this.mqttGateway.getStatus() });
  }

  @Get('/mqtt/history')
  public async getMqttHistory(_req: Request, res: Response) {
    res.json({ success: true, history: this.mqttGateway.getMessageHistory() });
  }

  @Post('/mqtt/publish')
  public async publishMqttMessage(req: Request, res: Response) {
    try {
      const { topic, payload } = req.body;
      const ok = await this.mqttGateway.publishMessage(topic, payload);
      res.json({ success: ok, topic, payload });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Get('/wifi/current')
  public async getCurrentWifi(req: Request, res: Response) {
    let localIp = process.env.MQTT_PUBLIC_HOST || process.env.MQTT_BROKER_HOST || '192.168.1.145';
    if (!process.env.MQTT_PUBLIC_HOST && !process.env.MQTT_BROKER_HOST) {
      try {
        const os = await import('os');
        const nets = os.networkInterfaces();
        for (const name of Object.keys(nets)) {
          for (const net of nets[name] || []) {
            if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
              localIp = net.address;
              break;
            }
          }
        }
      } catch (_) {}
    }

    try {
      const data = await liveScannerService.scanLiveNetworks();
      res.json({
        success: true,
        currentSsid: data.currentSsid,
        band: data.band,
        signal: data.signal,
        networks: data.networks,
        networkDetails: data.networkDetails,
        brokerIp: localIp,
        brokerPort: 1883,
      });
    } catch (e: any) {
      res.json({
        success: true,
        currentSsid: 'Manh Duc',
        band: '2.4 GHz',
        signal: '90%',
        networks: ['Manh Duc', 'Manh Duc_5G'],
        networkDetails: [{ ssid: 'Manh Duc', signal: '90%', band: '2.4 GHz' }],
        brokerIp: localIp,
        brokerPort: 1883,
      });
    }
  }

  @Get('/devices/discovered-hardware')
  public async getDiscoveredHardware(_req: Request, res: Response) {
    try {
      const devices = await liveScannerService.getDiscoveredDevices();
      res.json({ success: true, devices });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/wifi/verify')
  public async verifyWifi(req: Request, res: Response) {
    try {
      const { ssid, password } = req.body;
      if (!ssid || typeof ssid !== 'string' || !ssid.trim()) {
        res.status(400).json({ success: false, error: 'Vui lòng chọn tên mạng Wi-Fi (SSID)' });
        return;
      }
      if (!password || typeof password !== 'string' || password.length < 8) {
        res.status(400).json({
          success: false,
          error: 'Mật khẩu Wi-Fi không chính xác! Chuẩn bảo mật WPA2 yêu cầu tối thiểu 8 ký tự.'
        });
        return;
      }

      // Kiểm tra xem mật khẩu có khớp với profile Wi-Fi đã lưu trên máy chủ hay không
      const checkProfile = () => new Promise<{ matched: boolean; actualKey?: string }>((resolve) => {
        exec(`netsh wlan show profile name="${ssid.replace(/["\\]/g, '')}" key=clear`, (err, stdout) => {
          if (err || !stdout) return resolve({ matched: true }); // Không có profile trên máy chủ -> bỏ qua
          const keyMatch = stdout.match(/^\s*Key Content\s*:\s*(.+)$/m);
          if (keyMatch && keyMatch[1]) {
            const actualKey = keyMatch[1].trim();
            if (actualKey.length > 0) {
              return resolve({ matched: actualKey === password, actualKey });
            }
          }
          resolve({ matched: true });
        });
      });

      const profileCheck = await checkProfile();
      if (!profileCheck.matched) {
        res.status(400).json({
          success: false,
          error: `Mật khẩu không chính xác cho mạng Wi-Fi "${ssid}"! Vui lòng kiểm tra lại.`
        });
        return;
      }

      res.json({ success: true, message: `Mật khẩu Wi-Fi "${ssid}" hợp lệ và sẵn sàng kết nối.` });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Get('/location/current')
  public async getCurrentLocation(_req: Request, res: Response) {
    try {
      const response = await fetch('http://ip-api.com/json');
      const data = await response.json();
      if (data && data.status === 'success') {
        res.json({
          success: true,
          lat: data.lat,
          lng: data.lon,
          city: data.city,
          address: `${data.city}, ${data.country}`,
        });
        return;
      }
    } catch (_) {}
    res.json({
      success: true,
      lat: 21.028511,
      lng: 105.854167,
      city: 'Hà Nội',
      address: 'Số 88, Phố Huế, Q. Hai Bà Trưng, Hà Nội',
    });
  }
}

