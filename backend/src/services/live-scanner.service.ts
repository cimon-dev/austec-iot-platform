import { exec } from 'child_process';
import path from 'path';

export interface ScannedWifi {
  ssid: string;
  signal: string;
  band: string;
}

export interface DiscoveredBleDevice {
  hardwareId: string;
  modelName: string;
  rssi: number;
  category: string;
  isRealHardware: boolean;
}

class LiveScannerService {
  private lastScanTime = 0;
  private cachedNetworks: ScannedWifi[] = [];
  private cachedCurrentSsid = 'Manh Duc';
  private cachedBand = '2.4 GHz';
  private cachedSignal = '90%';
  private isScanning = false;

  private scriptPath = path.resolve(__dirname, '../scripts/trigger_wlan_scan.ps1');

  public async scanLiveNetworks(): Promise<{ currentSsid: string; band: string; signal: string; networks: string[]; networkDetails: ScannedWifi[] }> {
    const now = Date.now();
    // Cache 5 giây để tránh quá tải card mạng khi nhiều client gọi
    if (now - this.lastScanTime < 5000 && this.cachedNetworks.length > 0) {
      return {
        currentSsid: this.cachedCurrentSsid,
        band: this.cachedBand,
        signal: this.cachedSignal,
        networks: this.cachedNetworks.map(n => n.ssid),
        networkDetails: this.cachedNetworks,
      };
    }

    return new Promise((resolve) => {
      // 1. Lấy thông tin mạng Wi-Fi hiện tại đang kết nối
      exec('netsh wlan show interfaces', (errCurrent, stdoutCurrent) => {
        if (!errCurrent && stdoutCurrent) {
          const ssidMatch = stdoutCurrent.match(/^\s*SSID\s*:\s*(.+)$/m);
          if (ssidMatch && ssidMatch[1].trim()) this.cachedCurrentSsid = ssidMatch[1].trim();
          const bandMatch = stdoutCurrent.match(/^\s*Band\s*:\s*(.+)$/m);
          if (bandMatch && bandMatch[1].trim()) this.cachedBand = bandMatch[1].trim();
          const signalMatch = stdoutCurrent.match(/^\s*Signal\s*:\s*(.+)$/m);
          if (signalMatch && signalMatch[1].trim()) this.cachedSignal = signalMatch[1].trim();
        }

        // 2. Kích hoạt quét sóng thực tế qua wlanapi.dll (KHÔNG lấy profiles lịch sử)
        const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${this.scriptPath}"`;
        exec(cmd, { timeout: 8000 }, (scanErr, stdoutScan) => {
          if (!scanErr && stdoutScan) {
            try {
              const trimmed = stdoutScan.trim();
              const jsonStart = trimmed.indexOf('[');
              const jsonEnd = trimmed.lastIndexOf(']');
              if (jsonStart !== -1 && jsonEnd !== -1) {
                const parsed: ScannedWifi[] = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
                if (Array.isArray(parsed) && parsed.length > 0) {
                  this.cachedNetworks = parsed;
                  this.lastScanTime = Date.now();
                  return resolve({
                    currentSsid: this.cachedCurrentSsid,
                    band: this.cachedBand,
                    signal: this.cachedSignal,
                    networks: this.cachedNetworks.map(n => n.ssid),
                    networkDetails: this.cachedNetworks,
                  });
                }
              }
            } catch (_) {}
          }

          // Fallback an toàn: nếu không quét được gì mới thì giữ mạng đang kết nối thực tế
          if (this.cachedNetworks.length === 0) {
            this.cachedNetworks = [
              { ssid: this.cachedCurrentSsid, signal: this.cachedSignal, band: this.cachedBand }
            ];
          }

          resolve({
            currentSsid: this.cachedCurrentSsid,
            band: this.cachedBand,
            signal: this.cachedSignal,
            networks: this.cachedNetworks.map(n => n.ssid),
            networkDetails: this.cachedNetworks,
          });
        });
      });
    });
  }

  /// Dò tìm thiết bị phần cứng Austec thực tế đang phát sóng (AP Wi-Fi hoặc BLE)
  public async getDiscoveredDevices(): Promise<DiscoveredBleDevice[]> {
    const scan = await this.scanLiveNetworks();
    const discovered: DiscoveredBleDevice[] = [];

    // Tìm kiếm trong các mạng Wi-Fi thực tế đang phát sóng trong không trung
    // Firmware ESP32 khi vào chế độ cài đặt sẽ phát Access Point với tên device_id (VD: amtuong1994)
    for (const net of scan.networkDetails) {
      const lower = net.ssid.toLowerCase();
      if (lower === 'amtuong1994' || lower.startsWith('amtuong') || lower.startsWith('austec') || lower.startsWith('esp32')) {
        const sigNum = parseInt(net.signal.replace('%', ''), 10) || 75;
        // Chuyển phần trăm sóng thành dBm (VD: 90% -> -40 dBm, 50% -> -70 dBm)
        const rssi = Math.round(-100 + (sigNum * 0.6));
        discovered.push({
          hardwareId: net.ssid,
          modelName: `Cửa Cuốn Austec ECO (${net.ssid})`,
          rssi,
          category: 'rollerDoor',
          isRealHardware: true,
        });
      }
    }

    return discovered;
  }
}

export const liveScannerService = new LiveScannerService();
