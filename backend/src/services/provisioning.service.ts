import { DeviceInventory, DeviceInstance } from '@austec/database';

export interface PairingRequest {
  hardwareId: string;
  qrCodeHash: string;
  userId: string;
  customName: string;
  wifiSSID?: string;
  locationLat?: number;
  locationLng?: number;
  addressDisplay?: string;
}

export interface PairingResult {
  success: boolean;
  message: string;
  device?: DeviceInstance;
  warrantyEndAt?: string;
  errorCode?: 'NOT_FOUND' | 'INVALID_QR' | 'ALREADY_ACTIVATED' | 'INVALID_USER';
}

export class ProvisioningService {
  private inventoryStore: Map<string, DeviceInventory> = new Map();
  private instanceStore: Map<string, DeviceInstance> = new Map();
  private transferOTPs: Map<string, { hardwareId: string; currentOwnerId: string; expiresAt: number }> = new Map();

  constructor(initialInventory?: DeviceInventory[], initialInstances?: DeviceInstance[]) {
    if (initialInventory) {
      initialInventory.forEach(inv => this.inventoryStore.set(inv.hardwareId, inv));
    }
    if (initialInstances) {
      initialInstances.forEach(inst => this.instanceStore.set(inst.hardwareId, inst));
    }
  }

  /**
   * Đăng ký thiết bị xuất xưởng vào kho
   */
  public registerToInventory(inventory: DeviceInventory): void {
    this.inventoryStore.set(inventory.hardwareId, inventory);
  }

  /**
   * Ghép nối thiết bị mới qua mã QR và Hardware ID chuẩn
   */
  public pairDevice(req: PairingRequest): PairingResult {
    const item = this.inventoryStore.get(req.hardwareId);

    if (!item) {
      return {
        success: false,
        message: `Hardware ID '${req.hardwareId}' không tồn tại trong hệ sinh thái Austec.`,
        errorCode: 'NOT_FOUND',
      };
    }

    if (item.qrCodeHash !== req.qrCodeHash) {
      return {
        success: false,
        message: 'Mã băm QR Code bảo mật không khớp hoặc tem đã bị làm giả!',
        errorCode: 'INVALID_QR',
      };
    }

    if (item.status === 'ACTIVATED') {
      const existingInstance = this.instanceStore.get(req.hardwareId);
      if (existingInstance && existingInstance.ownerId === req.userId) {
        return {
          success: true,
          message: 'Thiết bị này đã được bạn kích hoạt trước đó.',
          device: existingInstance,
        };
      }
      return {
        success: false,
        message: 'Thiết bị này đã được kích hoạt bởi chủ sở hữu khác. Vui lòng liên hệ chủ cũ để chuyển nhượng.',
        errorCode: 'ALREADY_ACTIVATED',
      };
    }

    // Tiến hành kích hoạt bảo hành điện tử
    const now = new Date();
    const warrantyEnd = new Date(now);
    warrantyEnd.setMonth(warrantyEnd.getMonth() + (item.warrantyMonths || 24));

    // Cập nhật trạng thái kho
    item.status = 'ACTIVATED';
    this.inventoryStore.set(item.hardwareId, item);

    // Tạo Instance người dùng
    const newInstance: DeviceInstance = {
      id: `inst-${item.hardwareId}-${Date.now()}`,
      hardwareId: item.hardwareId,
      customName: req.customName,
      ownerId: req.userId,
      firmwareVersionCurrent: 'v2.4.1',
      isOnline: true,
      lastHeartbeat: now.toISOString(),
      currentProperties: {
        open_state: 'CLOSED',
        is_locked: false,
        battery_level: 95,
      },
      warrantyStartAt: now.toISOString(),
      warrantyEndAt: warrantyEnd.toISOString(),
      locationLat: req.locationLat,
      locationLng: req.locationLng,
      addressDisplay: req.addressDisplay,
      createdAt: now.toISOString(),
    };

    this.instanceStore.set(req.hardwareId, newInstance);

    return {
      success: true,
      message: 'Ghép nối và kích hoạt bảo hành điện tử 24 tháng thành công!',
      device: newInstance,
      warrantyEndAt: warrantyEnd.toISOString(),
    };
  }

  /**
   * Sinh mã OTP chuyển nhượng thiết bị (hiệu lực 15 phút)
   */
  public generateTransferOTP(hardwareId: string, currentOwnerId: string): string {
    const inst = this.instanceStore.get(hardwareId);
    if (!inst || inst.ownerId !== currentOwnerId) {
      throw new Error('Bạn không có quyền chuyển nhượng thiết bị này');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.transferOTPs.set(otp, {
      hardwareId,
      currentOwnerId,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });

    return otp;
  }

  /**
   * Nhận chuyển nhượng thiết bị bằng OTP
   */
  public claimTransferOTP(otp: string, newOwnerId: string): { success: boolean; message: string } {
    const record = this.transferOTPs.get(otp);
    if (!record) {
      return { success: false, message: 'Mã OTP không hợp lệ hoặc không tồn tại' };
    }

    if (Date.now() > record.expiresAt) {
      this.transferOTPs.delete(otp);
      return { success: false, message: 'Mã OTP chuyển nhượng đã hết hạn (quá 15 phút)' };
    }

    const inst = this.instanceStore.get(record.hardwareId);
    if (!inst) {
      return { success: false, message: 'Thiết bị không tồn tại' };
    }

    inst.ownerId = newOwnerId;
    this.instanceStore.set(record.hardwareId, inst);
    this.transferOTPs.delete(otp);

    return {
      success: true,
      message: `Chuyển nhượng quyền sở hữu thiết bị '${inst.customName}' sang tài khoản mới thành công!`,
    };
  }

  public getInstance(hardwareId: string): DeviceInstance | undefined {
    return this.instanceStore.get(hardwareId);
  }

  public getDevicesByOwner(ownerId: string): DeviceInstance[] {
    return Array.from(this.instanceStore.values()).filter(d => d.ownerId === ownerId);
  }

  public getAllInstances(): DeviceInstance[] {
    return Array.from(this.instanceStore.values());
  }
}
