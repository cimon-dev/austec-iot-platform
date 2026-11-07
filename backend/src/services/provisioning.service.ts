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
  public onUpdate?: () => void;

  constructor(initialInventory?: DeviceInventory[], initialInstances?: DeviceInstance[]) {
    if (initialInventory) {
      initialInventory.forEach(inv => this.inventoryStore.set(inv.hardwareId, inv));
    }
    if (initialInstances) {
      initialInstances.forEach(inst => this.instanceStore.set(inst.hardwareId, inst));
    }
  }

  public exportData(): { inventory: DeviceInventory[]; instances: DeviceInstance[] } {
    return {
      inventory: Array.from(this.inventoryStore.values()),
      instances: Array.from(this.instanceStore.values()),
    };
  }

  public importData(data: { inventory?: DeviceInventory[]; instances?: DeviceInstance[] }) {
    if (data.inventory && Array.isArray(data.inventory)) {
      data.inventory.forEach(inv => this.inventoryStore.set(inv.hardwareId, inv));
    }
    if (data.instances && Array.isArray(data.instances)) {
      data.instances.forEach(inst => this.instanceStore.set(inst.hardwareId, inst));
    }
  }

  /**
   * Đăng ký thiết bị xuất xưởng vào kho
   */
  public registerToInventory(inventory: DeviceInventory): void {
    this.inventoryStore.set(inventory.hardwareId, inventory);
    this.onUpdate?.();
  }

  /**
   * Ghép nối thiết bị mới qua mã QR và Hardware ID chuẩn
   */
  public pairDevice(req: PairingRequest): PairingResult {
    let item = this.inventoryStore.get(req.hardwareId);

    if (!item) {
      // Tự động khởi tạo thiết bị thực tế nếu chưa có trong danh mục kho
      const upperHw = req.hardwareId.toUpperCase();
      const isSocketHw = upperHw.startsWith('OCAM') || upperHw.includes('SOCKET') || upperHw.includes('OCAM');
      const isCamHw = !isSocketHw && (upperHw.startsWith('CAM') || upperHw.includes('CAMERA') || upperHw.includes('OV2640'));
      const createdItem: DeviceInventory = {
        id: `inv-${req.hardwareId}`,
        hardwareId: req.hardwareId,
        macAddress: `FC:B4:67:${req.hardwareId.replace(/[^A-Za-z0-9]/g, '').slice(0, 4)}`,
        modelId: isCamHw ? 5 : (isSocketHw ? 4 : 1),
        batchNumber: 'BATCH-2026-AUTO',
        supplier: 'Austec Factory',
        qrCodeHash: req.qrCodeHash || '',
        producedAt: '2026-10-23',
        warrantyMonths: 24,
        status: 'IN_WAREHOUSE',
        createdAt: new Date().toISOString(),
      };
      this.inventoryStore.set(req.hardwareId, createdItem);
      item = createdItem;
    }

    const currentItem: DeviceInventory = item;

    if (currentItem.qrCodeHash && req.qrCodeHash && currentItem.qrCodeHash !== req.qrCodeHash) {
      return {
        success: false,
        message: 'Mã băm QR Code bảo mật không khớp hoặc tem đã bị làm giả!',
        errorCode: 'INVALID_QR',
      };
    }

    if (currentItem.status === 'ACTIVATED') {
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
    warrantyEnd.setMonth(warrantyEnd.getMonth() + (currentItem.warrantyMonths || 24));

    // Cập nhật trạng thái kho
    currentItem.status = 'ACTIVATED';
    this.inventoryStore.set(currentItem.hardwareId, currentItem);

    // Tạo Instance người dùng
    const subscriptionExpires = new Date(now);
    subscriptionExpires.setMonth(subscriptionExpires.getMonth() + 12); // Mặc định 12 tháng khi lần đầu kích hoạt

    const newInstance: DeviceInstance = {
      id: `inst-${currentItem.hardwareId}-${Date.now()}`,
      hardwareId: currentItem.hardwareId,
      customName: req.customName,
      ownerId: req.userId,
      firmwareVersionCurrent: 'v2.4.1',
      isOnline: false,
      lastHeartbeat: now.toISOString(),
      currentProperties: {
        open_state: 'CLOSED',
        is_locked: false,
        battery_level: 95,
      },
      warrantyStartAt: now.toISOString(),
      warrantyEndAt: warrantyEnd.toISOString(),
      subscriptionType: 'LIMITED',
      subscriptionExpiresAt: subscriptionExpires.toISOString(),
      subscriptionStatus: 'ACTIVE',
      deviceType: currentItem.modelId === 2 
        ? 'Khóa thông minh' 
        : (currentItem.modelId === 3 
          ? 'Bộ lưu điện' 
          : (currentItem.modelId === 4 || currentItem.hardwareId.toUpperCase().startsWith('OCAM') || currentItem.hardwareId.toUpperCase().includes('SOCKET')
            ? 'Ổ cắm' 
            : (currentItem.modelId === 5 || currentItem.hardwareId.toUpperCase().startsWith('CAM')
              ? 'Camera' 
              : (currentItem.hardwareId.toUpperCase().startsWith('AMTUONG') || currentItem.hardwareId.toUpperCase().startsWith('AT-DOOR')
                ? 'Cửa cuốn' 
                : ((currentItem as any).deviceType || 'Thiết bị thông minh'))))),
      installationAddress: {
        fullText: req.addressDisplay || 'Hà Nội, Việt Nam',
      },
      locationLat: req.locationLat,
      locationLng: req.locationLng,
      addressDisplay: req.addressDisplay,
      createdAt: now.toISOString(),
    };

    this.instanceStore.set(req.hardwareId, newInstance);
    this.onUpdate?.();

    return {
      success: true,
      message: 'Ghép nối và kích hoạt bảo hành điện tử 24 tháng thành công (Kèm 12 tháng gói dịch vụ khởi tạo)!',
      device: newInstance,
      warrantyEndAt: warrantyEnd.toISOString(),
    };
  }

  /**
   * Gia hạn gói dịch vụ thiết bị (12 tháng, 24 tháng hoặc Vô thời hạn)
   */
  public renewSubscription(
    hardwareId: string, 
    months: number = 12, 
    isPerpetual: boolean = false
  ): { success: boolean; message: string; device?: DeviceInstance } {
    const inst = this.instanceStore.get(hardwareId);
    if (!inst) {
      return { success: false, message: 'Thiết bị không tồn tại trong hệ thống' };
    }

    if (isPerpetual) {
      inst.subscriptionType = 'PERPETUAL';
      inst.subscriptionStatus = 'LIFETIME';
      inst.subscriptionExpiresAt = '2099-12-31T23:59:59Z';
    } else {
      inst.subscriptionType = 'LIMITED';
      inst.subscriptionStatus = 'ACTIVE';
      const currentExp = inst.subscriptionExpiresAt ? new Date(inst.subscriptionExpiresAt) : new Date();
      const baseDate = currentExp.getTime() > Date.now() ? currentExp : new Date();
      baseDate.setMonth(baseDate.getMonth() + months);
      inst.subscriptionExpiresAt = baseDate.toISOString();
    }

    this.instanceStore.set(hardwareId, inst);
    return {
      success: true,
      message: isPerpetual 
        ? `Đã nâng cấp thiết bị ${hardwareId} lên gói Vô Thời Hạn (Trọn đời) thành công!` 
        : `Đã gia hạn thiết bị ${hardwareId} thêm ${months} tháng thành công! Hạn mới: ${new Date(inst.subscriptionExpiresAt!).toLocaleDateString('vi-VN')}`,
      device: inst,
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
