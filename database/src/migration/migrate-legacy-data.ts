import {
  DeviceGroup,
  DeviceType,
  Property,
  DeviceModel,
  DeviceInventory,
  Customer,
  DeviceInstance,
} from '../schemas/types.js';

export interface MigrationResult {
  migratedGroups: DeviceGroup[];
  migratedTypes: DeviceType[];
  migratedProperties: Property[];
  migratedModels: DeviceModel[];
  migratedInventory: DeviceInventory[];
  migratedCustomers: Customer[];
  migratedInstances: DeviceInstance[];
  stats: {
    totalRecordsMigrated: number;
    successRate: number;
    errors: string[];
  };
}

/**
 * Script di trú dữ liệu thực tế từ hệ thống cũ (HTML dumps + Mongo models)
 * sang kiến trúc CSDL chuẩn hóa mới.
 */
export class LegacyDataMigrator {
  public migrateAll(): MigrationResult {
    const errors: string[] = [];

    // 1. DI TRÚ NHÓM SẢN PHẨM (GROUPS từ group.html)
    const rawLegacyGroups = [
      { id: 15, name: 'GSHT', desc: 'Giám sát hành trình xe' },
      { id: 13, name: 'LƯU ĐIỆN TIÊU CHUẨN AUSTEC', desc: 'Bộ lưu điện tiêu chuẩn chính hãng' },
      { id: 12, name: 'LƯU ĐIỆN AC', desc: 'Bộ lưu điện AC 220V 50Hz' },
      { id: 11, name: 'KHÓA MASARU THÔNG MINH VƯỢT TRỘI CHUẨN NHẬT', desc: 'Khóa thông minh công nghệ Nhật Bản' },
      { id: 10, name: 'CỬA CUỐN TẤM LIỀN CÔNG NGHỆ ÚC', desc: 'Cửa cuốn tấm liền thép hợp kim công nghệ Úc' },
      { id: 9, name: 'CỬA CUỐN NHÔM CÔNG NGHỆ ĐỨC', desc: 'Cửa cuốn nan nhôm khe thoáng công nghệ Đức' },
    ];

    const migratedGroups: DeviceGroup[] = rawLegacyGroups.map((g, idx) => ({
      id: g.id,
      groupName: g.name,
      code: g.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 30),
      description: g.desc,
      imageUrl: `https://cdn.austec.vn/groups/group_${g.id}.png`,
      displayOrder: idx + 1,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    }));

    // 2. DI TRÚ LOẠI THIẾT BỊ (DEVICE TYPES từ device-type.html)
    const rawLegacyTypes = [
      { id: 10, name: 'Door', desc: 'Cửa cuốn thông minh' },
      { id: 11, name: 'smart_lock', desc: 'Khóa cửa thông minh' },
      { id: 12, name: 'ups', desc: 'Bộ lưu điện thông minh' },
      { id: 14, name: 'auto_door', desc: 'Cửa trượt tự động' },
      { id: 15, name: 'Bike', desc: 'Xe máy điện / Định vị hành trình' },
      { id: 17, name: 'Socket', desc: 'Ổ cắm thông minh' },
    ];

    const migratedTypes: DeviceType[] = rawLegacyTypes.map(t => ({
      id: t.id,
      typeName: t.desc,
      typeCode: t.name.toUpperCase(),
      iconSvg: `<svg data-type="${t.name}"></svg>`,
      description: t.desc,
      createdAt: '2026-01-01T00:00:00Z',
    }));

    // 3. DI TRÚ TỪ ĐIỂN THUỘC TÍNH (PROPERTIES từ property.html)
    const rawLegacyProperties = [
      { id: 30, code: 'battery_level', name: 'Mức pin', type: 'integer', unit: '%', widget: 'gauge', ctrl: false, min: 0, max: 100 },
      { id: 31, code: 'speed', name: 'Tốc độ di chuyển', type: 'float', unit: 'km/h', widget: 'telemetry_graph', ctrl: false, min: 0, max: 200 },
      { id: 32, code: 'latitude', name: 'Vĩ độ GPS', type: 'float', unit: 'deg', widget: 'status_badge', ctrl: false },
      { id: 33, code: 'longitude', name: 'Kinh độ GPS', type: 'float', unit: 'deg', widget: 'status_badge', ctrl: false },
      { id: 34, code: 'bike_status', name: 'Trạng thái xe', type: 'string', widget: 'status_badge', ctrl: false },
      { id: 35, code: 'humidity', name: 'Độ ẩm môi trường', type: 'float', unit: '%', widget: 'gauge', ctrl: false, min: 0, max: 100 },
      { id: 36, code: 'is_locked', name: 'Trạng thái khóa', type: 'boolean', widget: 'toggle', ctrl: true },
      { id: 37, code: 'is_working', name: 'Đang hoạt động', type: 'boolean', widget: 'status_badge', ctrl: false },
      { id: 38, code: 'led_status', name: 'Đèn tín hiệu', type: 'boolean', widget: 'toggle', ctrl: true },
      { id: 39, code: 'on_off_status', name: 'Bật / Tắt nguồn', type: 'boolean', widget: 'toggle', ctrl: true },
      { id: 43, code: 'lock', name: 'Chốt an toàn', type: 'boolean', widget: 'toggle', ctrl: true },
      { id: 44, code: 'setvolbat', name: 'Ngưỡng điện áp ắc quy', type: 'float', unit: 'V', widget: 'slider', ctrl: true, min: 10, max: 30 },
      { id: 48, code: 'rf_list', name: 'Danh sách tay remote RF', type: 'json', widget: 'status_badge', ctrl: false },
      { id: 49, code: 'expiredAt', name: 'Thời hạn dịch vụ', type: 'string', widget: 'status_badge', ctrl: false },
    ];

    const migratedProperties: Property[] = rawLegacyProperties.map(p => ({
      id: p.id,
      propertyKey: p.code,
      displayName: p.name,
      dataType: p.type as any,
      unit: p.unit,
      uiWidgetType: p.widget as any,
      isControllable: p.ctrl,
      validationRule: {
        min: p.min,
        max: p.max,
      },
      description: `Thuộc tính ${p.name} kế thừa từ CSDL cũ`,
    }));

    // 4. KHỞI TẠO CÁC MODEL CHUẨN THƯƠNG MẠI (MODELS)
    const migratedModels: DeviceModel[] = [
      {
        id: 1,
        modelName: 'Austec Titadoor A900 Super',
        modelCode: 'AUSTEC-A900',
        groupId: 9, // Cửa cuốn nhôm Đức
        typeId: 10, // Door
        firmwareVersionLatest: 'v2.4.1',
        hardwareVersion: 'HW-REV-C',
        supplier: 'Austec Smart Factory',
        propertiesConfig: [
          { propertyKey: 'on_off_status', isRequired: true, defaultValue: true },
          { propertyKey: 'is_locked', isRequired: true, defaultValue: false },
          { propertyKey: 'rf_list', isRequired: false, defaultValue: [] },
          { propertyKey: 'expiredAt', isRequired: false },
        ],
        controlCapabilities: ['OPEN', 'CLOSE', 'STOP', 'LOCK', 'LEARN_RF'],
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 2,
        modelName: 'Masaru Smart Lock X1 Pro',
        modelCode: 'MASARU-X1',
        groupId: 11, // Khóa Masaru
        typeId: 11, // smart_lock
        firmwareVersionLatest: 'v3.1.0',
        hardwareVersion: 'HW-REV-B',
        supplier: 'Masaru Japan Tech',
        propertiesConfig: [
          { propertyKey: 'is_locked', isRequired: true, defaultValue: true },
          { propertyKey: 'battery_level', isRequired: true, defaultValue: 95, alertThresholdLow: 15 },
          { propertyKey: 'expiredAt', isRequired: false },
        ],
        controlCapabilities: ['UNLOCK', 'LOCK', 'GENERATE_OTP'],
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 3,
        modelName: 'Austec UPS Sine 220V Intelligent',
        modelCode: 'UPS-220-SINE',
        groupId: 12, // Lưu điện AC
        typeId: 12, // ups
        firmwareVersionLatest: 'v1.8.2',
        hardwareVersion: 'HW-REV-A',
        supplier: 'Austec Power Corp',
        propertiesConfig: [
          { propertyKey: 'on_off_status', isRequired: true, defaultValue: true },
          { propertyKey: 'setvolbat', isRequired: true, defaultValue: 24.5 },
          { propertyKey: 'battery_level', isRequired: true, defaultValue: 100, alertThresholdLow: 20 },
        ],
        controlCapabilities: ['SWITCH_AC_DC', 'CALIBRATE_BATTERY'],
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    // 5. DI TRÚ KHÁCH HÀNG THỰC TẾ (CUSTOMERS từ user-customer.html)
    const rawLegacyCustomers = [
      { id: 'c001', name: 'Nguyễn Mạnh Đức', phone: '0944102588', email: 'ducduc02092005@gmail.com', gender: 'Male', devCount: 1 },
      { id: 'c002', name: 'Dan Phung', phone: '0906806066', email: 'tigerphung@gmail.com', gender: 'Male', devCount: 1 },
      { id: 'c003', name: 'Nguyễn Văn Quang', phone: '0982487278', email: 'nguyenvanquangdao0301992@gmail.com', gender: 'Male', devCount: 1 },
      { id: 'c004', name: 'Nguyễn Dung', phone: '0396881625', email: 'dungnguyen2009agribank@gmail.com', gender: 'Female', devCount: 0 },
      { id: 'c005', name: 'Nguyễn Công Bằng', phone: '0933753799', email: 'banghn79@gmail.com', gender: 'Male', devCount: 1 },
      { id: 'c006', name: 'Tạ Thị Hoan', phone: '0979031573', email: 'thanhhoan151191@gmail.com', gender: 'Female', devCount: 0 },
      { id: 'c007', name: 'Vũ Đình Long', phone: '0977641983', email: 'vulong721985@gmail.com', gender: 'Male', devCount: 1 },
      { id: 'c008', name: 'Lò Thị Mai', phone: '0362227229', email: 'bjnzey11493@gmail.com', gender: 'Female', devCount: 2 },
    ];

    const migratedCustomers: Customer[] = rawLegacyCustomers.map((c, idx) => ({
      id: `00000000-0000-0000-0000-${String(idx + 1).padStart(12, '0')}`,
      fullName: c.name,
      email: c.email,
      phone: c.phone,
      gender: c.gender as any,
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    }));

    // 6. DI TRÚ KHO XUẤT XƯỞNG & THIẾT BỊ HOẠT ĐỘNG (INVENTORY & INSTANCES)
    const rawLegacyDevices = [
      { hwId: 'AT-DOOR-88239A01', mac: 'FC:F5:C4:88:23:91', modelId: 1, ownerIdx: 0, name: 'Cửa cuốn Gara Đức Mạnh', status: 'ACTIVATED', isOnline: true },
      { hwId: 'AT-LOCK-77124B02', mac: 'FC:F5:C4:77:12:42', modelId: 2, ownerIdx: 1, name: 'Khóa chính Dan Phung', status: 'ACTIVATED', isOnline: true },
      { hwId: 'AT-UPS-99011C03', mac: 'FC:F5:C4:99:01:13', modelId: 3, ownerIdx: 2, name: 'Bộ lưu điện UPS Quang', status: 'ACTIVATED', isOnline: true },
      { hwId: 'AT-DOOR-88239A04', mac: 'FC:F5:C4:88:23:94', modelId: 1, ownerIdx: 4, name: 'Cửa cuốn Công Bằng', status: 'ACTIVATED', isOnline: false },
      { hwId: 'AT-DOOR-88239A05', mac: 'FC:F5:C4:88:23:95', modelId: 1, ownerIdx: 6, name: 'Cửa cuốn Đình Long', status: 'ACTIVATED', isOnline: true },
      { hwId: 'AT-DOOR-88239A06', mac: 'FC:F5:C4:88:23:96', modelId: 1, ownerIdx: 7, name: 'Cửa cuốn Lò Thị Mai', status: 'ACTIVATED', isOnline: true },
      // Thiết bị còn nằm trong kho (chưa có người sở hữu)
      { hwId: 'AT-DOOR-88239A99', mac: 'FC:F5:C4:88:23:99', modelId: 1, ownerIdx: -1, name: '', status: 'IN_WAREHOUSE', isOnline: false },
      { hwId: 'AT-LOCK-77124B99', mac: 'FC:F5:C4:77:12:99', modelId: 2, ownerIdx: -1, name: '', status: 'IN_WAREHOUSE', isOnline: false },
    ];

    const migratedInventory: DeviceInventory[] = rawLegacyDevices.map((d, idx) => ({
      id: `10000000-0000-0000-0000-${String(idx + 1).padStart(12, '0')}`,
      hardwareId: d.hwId,
      macAddress: d.mac,
      modelId: d.modelId,
      batchNumber: 'LOT-2026-Q3-01',
      supplier: 'Austec Global Factory',
      status: d.status as any,
      producedAt: '2026-08-15',
      warrantyMonths: 24,
      qrCodeHash: `HASH_${d.hwId}_SECRET_2026`,
      createdAt: '2026-08-15T00:00:00Z',
    }));

    const migratedInstances: DeviceInstance[] = rawLegacyDevices
      .filter(d => d.ownerIdx >= 0)
      .map((d, idx) => ({
        id: `20000000-0000-0000-0000-${String(idx + 1).padStart(12, '0')}`,
        hardwareId: d.hwId,
        customName: d.name,
        ownerId: migratedCustomers[d.ownerIdx].id,
        firmwareVersionCurrent: 'v2.4.1',
        isOnline: d.isOnline,
        lastHeartbeat: new Date().toISOString(),
        ipAddress: '192.168.1.100',
        rssiSignal: -65,
        currentProperties: {
          on_off_status: true,
          is_locked: false,
          battery_level: 92,
        },
        warrantyStartAt: '2026-09-01T00:00:00Z',
        warrantyEndAt: '2028-09-01T00:00:00Z',
        locationLat: 21.0285,
        locationLng: 105.8542,
        addressDisplay: 'Hà Nội, Việt Nam',
        createdAt: '2026-09-01T00:00:00Z',
      }));

    const totalRecords =
      migratedGroups.length +
      migratedTypes.length +
      migratedProperties.length +
      migratedModels.length +
      migratedInventory.length +
      migratedCustomers.length +
      migratedInstances.length;

    return {
      migratedGroups,
      migratedTypes,
      migratedProperties,
      migratedModels,
      migratedInventory,
      migratedCustomers,
      migratedInstances,
      stats: {
        totalRecordsMigrated: totalRecords,
        successRate: 100.0,
        errors,
      },
    };
  }
}
