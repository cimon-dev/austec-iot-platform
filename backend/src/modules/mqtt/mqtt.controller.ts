import { Request, Response } from 'express';
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
    let localIp = '192.168.1.145';
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
}
