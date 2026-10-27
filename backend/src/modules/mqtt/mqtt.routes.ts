import { Router } from 'express';
import { MqttGateway } from '../../services/mqtt.gateway.js';
import { liveScannerService } from '../../services/live-scanner.service.js';

export function createMqttRouter(mqttGateway: MqttGateway): Router {
  const router = Router();

  router.get('/mqtt/status', (_req, res) => {
    res.json({ success: true, ...mqttGateway.getStatus() });
  });

  router.get('/mqtt/history', (_req, res) => {
    res.json({ success: true, history: mqttGateway.getMessageHistory() });
  });

  router.post('/mqtt/publish', async (req, res) => {
    try {
      const { topic, payload } = req.body;
      const ok = await mqttGateway.publishMessage(topic, payload);
      res.json({ success: ok, topic, payload });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  router.get('/wifi/current', async (_req, res) => {
    try {
      const data = await liveScannerService.scanLiveNetworks();
      res.json({
        success: true,
        currentSsid: data.currentSsid,
        band: data.band,
        signal: data.signal,
        networks: data.networks,
        networkDetails: data.networkDetails,
        brokerIp: '192.168.100.6',
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
        brokerIp: '192.168.100.6',
        brokerPort: 1883,
      });
    }
  });

  router.get('/devices/discovered-hardware', async (_req, res) => {
    try {
      const devices = await liveScannerService.getDiscoveredDevices();
      res.json({ success: true, devices });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}
