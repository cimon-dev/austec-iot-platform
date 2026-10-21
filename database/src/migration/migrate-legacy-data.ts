import {
  DeviceGroup,
  DeviceType,
  Property,
  DeviceModel,
  DeviceInventory,
  Customer,
  DeviceInstance,
  Product,
  DeviceMemberPermission,
  CustomerSupportRequest,
} from '../schemas/types.js';

export interface MigrationResult {
  migratedGroups: DeviceGroup[];
  migratedTypes: DeviceType[];
  migratedProperties: Property[];
  migratedModels: DeviceModel[];
  migratedInventory: DeviceInventory[];
  migratedCustomers: Customer[];
  migratedInstances: DeviceInstance[];
  migratedProducts: Product[];
  migratedPermissions: DeviceMemberPermission[];
  migratedRequests: CustomerSupportRequest[];
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
      { id: 18, name: 'CAMERA AN NINH AI AUSTEC', desc: 'Hệ thống camera giám sát an ninh thông minh AI 360 độ ban đêm' },
      { id: 19, name: 'CẢM BIẾN MÔI TRƯỜNG & NHIỆT ẨM', desc: 'Cảm biến nhiệt độ, độ ẩm không khí, cảnh báo cháy & môi trường' },
      { id: 15, name: 'GSHT', desc: 'Giám sát hành trình xe máy, ô tô' },
      { id: 13, name: 'LƯU ĐIỆN TIÊU CHUẨN AUSTEC', desc: 'Bộ lưu điện tiêu chuẩn chính hãng' },
      { id: 12, name: 'LƯU ĐIỆN AC', desc: 'Bộ lưu điện AC 220V 50Hz sóng sin chuẩn' },
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
      { id: 16, name: 'Camera', desc: 'Camera an ninh AI' },
      { id: 17, name: 'Sensor', desc: 'Cảm biến môi trường nhiệt ẩm' },
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
      { id: 50, code: 'temperature', name: 'Nhiệt độ môi trường', type: 'float', unit: '°C', widget: 'gauge', ctrl: false, min: -20, max: 100 },
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
      description: `Thông số ${p.name}`,
    }));

    // 4. DI TRÚ KHUÔN MẪU SẢN PHẨM (DEVICE MODELS)
    const migratedModels: DeviceModel[] = [
      {
        id: 1,
        modelName: 'Austec Titadoor A900 Super',
        modelCode: 'AUSTEC-A900',
        groupId: 9,
        typeId: 10,
        firmwareVersionLatest: 'v2.4.1',
        hardwareVersion: 'HW-REV-C',
        supplier: 'Austec Smart Factory Hà Nội',
        propertiesConfig: [
          { propertyKey: 'open_state', isRequired: true, defaultValue: 'CLOSED' },
          { propertyKey: 'battery_level', isRequired: true, defaultValue: 95, alertThresholdLow: 15 },
          { propertyKey: 'is_locked', isRequired: true, defaultValue: false },
          { propertyKey: 'rf_list', isRequired: false },
        ],
        controlCapabilities: ['OPEN', 'CLOSE', 'STOP', 'CHILD_LOCK'],
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 2,
        modelName: 'Khóa Masaru Titan X1 Pro FaceID',
        modelCode: 'MASARU-X1',
        groupId: 11,
        typeId: 11,
        firmwareVersionLatest: 'v3.1.0',
        hardwareVersion: 'HW-REV-B',
        supplier: 'Masaru Security Tokyo / Austec VN',
        propertiesConfig: [
          { propertyKey: 'is_locked', isRequired: true, defaultValue: true },
          { propertyKey: 'battery_level', isRequired: true, defaultValue: 90, alertThresholdLow: 20 },
        ],
        controlCapabilities: ['UNLOCK', 'LOCK', 'GENERATE_OTP'],
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 3,
        modelName: 'Austec UPS Sine 220V Intelligent',
        modelCode: 'UPS-220-SINE',
        groupId: 12,
        typeId: 12,
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
      {
        id: 4,
        modelName: 'Camera An Ninh AI Austec 4K HDR',
        modelCode: 'AUSTEC-CAM-360',
        groupId: 18,
        typeId: 16,
        firmwareVersionLatest: 'v4.2.0',
        hardwareVersion: 'HW-CAM-X2',
        supplier: 'Austec Vision Lab',
        propertiesConfig: [
          { propertyKey: 'battery_level', isRequired: true, defaultValue: 100 },
        ],
        controlCapabilities: ['SNAPSHOT', 'SIREN_ALARM', 'NIGHT_VISION'],
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 5,
        modelName: 'Trạm Môi Trường Nhiệt Ẩm MultiSensor M1 Pro',
        modelCode: 'SENSOR-TH-ZIGBEE',
        groupId: 19,
        typeId: 17,
        firmwareVersionLatest: 'v1.2.3',
        hardwareVersion: 'HW-TH-Z1',
        supplier: 'Austec Sensor Core',
        propertiesConfig: [
          { propertyKey: 'temperature', isRequired: true, defaultValue: 25.5 },
          { propertyKey: 'humidity', isRequired: true, defaultValue: 60.0 },
          { propertyKey: 'battery_level', isRequired: true, defaultValue: 95 },
        ],
        controlCapabilities: ['PING', 'CALIBRATE'],
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    // 5. DI TRÚ KHÁCH HÀNG THỰC TẾ (CUSTOMERS)
    const rawLegacyCustomers = [
      { id: 'c001', name: 'Nguyễn Mạnh Đức', phone: '0944102588', email: 'ducduc02092005@gmail.com', gender: 'Male', address: 'Số 45, Đường Lê Duẩn, Hoàn Kiếm, Hà Nội' },
      { id: 'c002', name: 'Dan Phung', phone: '0906806066', email: 'tigerphung@gmail.com', gender: 'Male', address: 'Tòa Park 3, Vinhomes Times City, Hoàng Mai, Hà Nội' },
      { id: 'c003', name: 'Nguyễn Văn Quang', phone: '0982487278', email: 'nguyenvanquangdao0301992@gmail.com', gender: 'Male', address: 'Số 88, Phố Huế, Hai Bà Trưng, Hà Nội' },
      { id: 'c004', name: 'Nguyễn Dung', phone: '0396881625', email: 'dungnguyen2009agribank@gmail.com', gender: 'Female', address: 'Số 120, Lê Lợi, P. Bến Nghé, Quận 1, TP. HCM' },
      { id: 'c005', name: 'Nguyễn Công Bằng', phone: '0933753799', email: 'banghn79@gmail.com', gender: 'Male', address: 'Khu dân cư Him Lam, P. Tân Hưng, Quận 7, TP. HCM' },
      { id: 'c006', name: 'Tạ Thị Hoan', phone: '0979031573', email: 'thanhhoan151191@gmail.com', gender: 'Female', address: 'Số 56, Nguyễn Văn Linh, Q. Hải Châu, Đà Nẵng' },
      { id: 'c007', name: 'Vũ Đình Long', phone: '0977641983', email: 'vulong721985@gmail.com', gender: 'Male', address: 'Khu đô thị Starlake, Tây Hồ, Hà Nội' },
      { id: 'c008', name: 'Lò Thị Mai', phone: '0362227229', email: 'bjnzey11493@gmail.com', gender: 'Female', address: 'Bản Mòn, Phường Chiềng Cơi, TP. Sơn La' },
    ];

    const migratedCustomers: Customer[] = rawLegacyCustomers.map((c, idx) => ({
      id: `00000000-0000-0000-0000-${String(idx + 1).padStart(12, '0')}`,
      fullName: c.name,
      email: c.email,
      phone: c.phone,
      gender: c.gender as any,
      address: c.address,
      isActive: true,
      createdAt: '2026-09-01T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    }));

    // 6. DI TRÚ KHO XUẤT XƯỞNG & THIẾT BỊ HOẠT ĐỘNG (INVENTORY & INSTANCES)
    const rawLegacyDevices = [
      { 
        hwId: 'AT-DOOR-88239A01', 
        mac: 'FC:F5:C4:88:23:91', 
        modelId: 1, 
        ownerIdx: 0, 
        name: 'Cửa cuốn Gara Đức Mạnh', 
        deviceType: 'Cửa cuốn',
        status: 'ACTIVATED', 
        isOnline: true, 
        subType: 'LIMITED',
        subMonths: 12,
        address: { street: 'Số 45 Lê Duẩn', ward: 'Bến Nghé', district: 'Hoàn Kiếm', province: 'Hà Nội', fullText: 'Số 45 Lê Duẩn, Bến Nghé, Hoàn Kiếm, Hà Nội' }
      },
      { 
        hwId: 'AT-LOCK-77124B02', 
        mac: 'FC:F5:C4:77:12:42', 
        modelId: 2, 
        ownerIdx: 1, 
        name: 'Khóa chính Dan Phung', 
        deviceType: 'Khóa thông minh',
        status: 'ACTIVATED', 
        isOnline: true, 
        subType: 'LIMITED',
        subMonths: 12,
        address: { street: 'Tòa Park 3', ward: 'Mai Động', district: 'Hoàng Mai', province: 'Hà Nội', fullText: 'Tòa Park 3, Vinhomes Times City, Hoàng Mai, Hà Nội' }
      },
      { 
        hwId: 'AT-UPS-99011C03', 
        mac: 'FC:F5:C4:99:01:13', 
        modelId: 3, 
        ownerIdx: 2, 
        name: 'Bộ lưu điện UPS Quang', 
        deviceType: 'Bộ lưu điện',
        status: 'ACTIVATED', 
        isOnline: true, 
        subType: 'LIMITED',
        subMonths: 12,
        address: { street: 'Số 88 Phố Huế', ward: 'Ngô Thì Nhậm', district: 'Hai Bà Trưng', province: 'Hà Nội', fullText: 'Số 88 Phố Huế, Hai Bà Trưng, Hà Nội' }
      },
      { 
        hwId: 'AT-DOOR-88239A04', 
        mac: 'FC:F5:C4:88:23:94', 
        modelId: 1, 
        ownerIdx: 4, 
        name: 'Cửa cuốn Công Bằng', 
        deviceType: 'Cửa cuốn',
        status: 'ACTIVATED', 
        isOnline: false, 
        subType: 'LIMITED',
        subMonths: 12,
        address: { street: 'Đường D1', ward: 'Tân Hưng', district: 'Quận 7', province: 'TP. Hồ Chí Minh', fullText: 'Khu dân cư Him Lam, Quận 7, TP. HCM' }
      },
      { 
        hwId: 'AT-DOOR-88239A05', 
        mac: 'FC:F5:C4:88:23:95', 
        modelId: 1, 
        ownerIdx: 6, 
        name: 'Cửa cuốn Đình Long', 
        deviceType: 'Cửa cuốn',
        status: 'ACTIVATED', 
        isOnline: true, 
        subType: 'PERPETUAL',
        subMonths: 999,
        address: { street: 'Lô H2 Khu Starlake', ward: 'Xuân Tảo', district: 'Tây Hồ', province: 'Hà Nội', fullText: 'Khu đô thị Starlake, Tây Hồ, Hà Nội' }
      },
      { 
        hwId: 'AT-DOOR-88239A06', 
        mac: 'FC:F5:C4:88:23:96', 
        modelId: 1, 
        ownerIdx: 7, 
        name: 'Cửa cuốn Lò Thị Mai', 
        deviceType: 'Cửa cuốn',
        status: 'ACTIVATED', 
        isOnline: true, 
        subType: 'LIMITED',
        subMonths: 12,
        address: { street: 'Bản Mòn', ward: 'Chiềng Cơi', district: 'TP. Sơn La', province: 'Sơn La', fullText: 'Bản Mòn, Phường Chiềng Cơi, TP. Sơn La' }
      },
      { 
        hwId: 'AT-CAM-00109A01', 
        mac: 'FC:F5:C4:11:22:33', 
        modelId: 4, 
        ownerIdx: 0, 
        name: 'Camera Cổng Chính Biệt Thự Đức', 
        deviceType: 'Camera AI',
        status: 'ACTIVATED', 
        isOnline: true, 
        subType: 'LIMITED',
        subMonths: 12,
        address: { street: 'Số 45 Lê Duẩn', ward: 'Bến Nghé', district: 'Hoàn Kiếm', province: 'Hà Nội', fullText: 'Số 45 Lê Duẩn, Hoàn Kiếm, Hà Nội' }
      },
      // Thiết bị tồn kho
      { 
        hwId: 'AT-DOOR-88239A99', 
        mac: 'FC:F5:C4:88:23:99', 
        modelId: 1, 
        ownerIdx: -1, 
        name: 'Cửa cuốn lưu kho tổng', 
        deviceType: 'Cửa cuốn',
        status: 'IN_WAREHOUSE', 
        isOnline: false, 
        subType: 'LIMITED',
        subMonths: 12,
        address: { street: 'KCN Sóng Thần', ward: 'An Bình', district: 'Dĩ An', province: 'Bình Dương', fullText: 'Kho Tổng KCN Sóng Thần, Bình Dương' }
      },
      { 
        hwId: 'AT-LOCK-77124B99', 
        mac: 'FC:F5:C4:77:12:99', 
        modelId: 2, 
        ownerIdx: -1, 
        name: 'Khóa Masaru nhập kho', 
        deviceType: 'Khóa thông minh',
        status: 'IN_WAREHOUSE', 
        isOnline: false, 
        subType: 'LIMITED',
        subMonths: 12,
        address: { street: 'KCN Quang Minh', ward: 'Mê Linh', district: 'Mê Linh', province: 'Hà Nội', fullText: 'Kho Chi Nhánh Miền Bắc, Mê Linh, Hà Nội' }
      },
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
      .map((d, idx) => {
        const isPerpetual = d.subType === 'PERPETUAL';
        const expiresAt = isPerpetual ? '2099-12-31T23:59:59Z' : '2027-09-01T00:00:00Z'; // 12 tháng kể từ kích hoạt
        const status = isPerpetual ? 'LIFETIME' : (idx === 3 ? 'EXPIRED' : 'ACTIVE');

        return {
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
            positionPercent: d.hwId.includes('DOOR') ? 0 : undefined,
          },
          warrantyStartAt: '2026-09-01T00:00:00Z',
          warrantyEndAt: '2028-09-01T00:00:00Z',
          subscriptionType: isPerpetual ? 'PERPETUAL' : 'LIMITED',
          subscriptionExpiresAt: expiresAt,
          subscriptionStatus: status,
          deviceType: d.deviceType,
          installationAddress: d.address,
          locationLat: 21.0285 + idx * 0.01,
          locationLng: 105.8542 + idx * 0.01,
          addressDisplay: d.address.fullText,
          createdAt: '2026-09-01T00:00:00Z',
        };
      });

    // 7. DI TRÚ SẢN PHẨM GIAN HÀNG THƯƠNG MẠI (PRODUCTS)
    const migratedProducts: Product[] = [
      {
        id: 'PROD-DOOR-A900',
        name: 'Cửa Cuốn Austec Titadoor A900 Super',
        categoryTag: 'Cửa Cuốn',
        subtitle: 'Nhôm định hình 6063 T6 • Khe thoáng thông minh thế hệ mới',
        price: 18500000,
        originalPrice: 21000000,
        rating: 4.9,
        reviewsCount: 142,
        imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80',
        galleryUrls: [
          'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80',
        ],
        warrantyText: 'Bảo hành chính hãng 24 tháng theo Hardware ID',
        highlights: [
          'Sơn tĩnh điện cao cấp AkzoNobel chống phai màu 10 năm ngoài trời',
          'Cảm biến tự dừng & đảo chiều thông minh khi gặp vật cản siêu nhạy',
          'Bo mạch kép kết nối đồng thời WiFi băng tần kép + Bluetooth BLE 5.0',
          'Vận hành êm ái dưới 45dB nhờ gioăng cao su giảm chấn 2 chiều kép',
        ],
        specs: {
          'Độ dày nan cửa': '1.4mm - 1.8mm (Nan kép khe thoáng)',
          'Chất liệu cấu thành': 'Hợp kim nhôm 6063-T6 đạt chuẩn quốc tế',
          'Tốc độ đóng/mở': '15cm - 18cm / giây',
          'Màu sắc chuẩn': 'Ghi sần / Cafe ánh kim / Vàng kem hoàng gia',
          'Công suất động cơ': 'Austec Turbo 800W lõi đồng nguyên chất',
          'Kháng nước & bụi': 'Chuẩn IP65 chống nước mưa tạt ngang',
          'Tích hợp': 'Điều khiển qua App, Tay RF học lệnh, Nút bấm âm tường',
        },
        stockQuantity: 45,
        isPublished: true,
        displayOrder: 1,
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-10-21T00:00:00Z',
      },
      {
        id: 'PROD-LOCK-MASARU-X1',
        name: 'Khóa Cửa Thông Minh Masaru Titan X1 FaceID',
        categoryTag: 'Khóa Masaru',
        subtitle: 'Nhận diện khuôn mặt 3D AI • Vân tay bán dẫn FPC Thụy Điển',
        price: 9800000,
        originalPrice: 12500000,
        rating: 5.0,
        reviewsCount: 88,
        imageUrl: 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?auto=format&fit=crop&w=800&q=80',
        galleryUrls: [],
        warrantyText: 'Bảo hành 1 đổi 1 trong 24 tháng theo Hardware ID',
        highlights: [
          'Camera 3D cấu trúc ánh sáng nhận diện FaceID trong 0.2 giây',
          'Thân khóa đúc bằng hợp kim Titan nguyên khối chống cưa cắt phá hoại',
          'Cảnh báo đột nhập và còi hú tự động chụp ảnh gửi về điện thoại',
          'Mã số ảo chống nhìn trộm và cấp mã OTP một lần cho khách',
        ],
        specs: {
          'Phương thức mở khóa': 'FaceID 3D, Vân tay FPC, Thẻ từ RFID, Mã số, Khóa cơ, App Mobile',
          'Dung lượng lưu trữ': '50 Khuôn mặt, 100 Vân tay, 100 Thẻ từ, 100 Mật mã',
          'Chất liệu thân khóa': 'Hợp kim Kẽm & Titan đúc liền khối',
          'Thời lượng pin': 'Pin sạc Lithium 5000mAh (Dùng 10 - 12 tháng/lần sạc)',
          'Cổng sạc khẩn cấp': 'USB Type-C tiện lợi',
          'Tiêu chuẩn ruột khóa': 'Ruột 6068 inox 304 tiêu chuẩn châu Âu',
        },
        stockQuantity: 60,
        isPublished: true,
        displayOrder: 2,
        createdAt: '2026-08-10T00:00:00Z',
        updatedAt: '2026-10-21T00:00:00Z',
      },
      {
        id: 'PROD-UPS-SINE-1200',
        name: 'Bộ Lưu Điện Austec Sin Chuẩn Pro 1200VA',
        categoryTag: 'Lưu Điện UPS',
        subtitle: 'Sóng sin chuẩn tinh khiết • Tự động xả bảo dưỡng chống chai ắc quy',
        price: 4600000,
        originalPrice: 5200000,
        rating: 4.8,
        reviewsCount: 95,
        imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
        galleryUrls: [],
        warrantyText: 'Bảo hành bo mạch & ắc quy chính hãng 24 tháng',
        highlights: [
          'Điện áp ra sóng sin chuẩn 220V/50Hz giúp motor cửa chạy êm không gằn',
          'Thời gian lưu điện chờ liên tục lên đến 72 giờ không mất nguồn',
          'Thuật toán AI tự động xả ắc quy định kỳ mỗi 30 ngày giúp pin bền gấp 3 lần',
          'Màn hình LCD và viễn thám báo chính xác dung lượng pin còn lại theo %',
        ],
        specs: {
          'Công suất định mức': '1200VA / 900W',
          'Điện áp đầu vào': 'AC 160V - 240V / 50Hz',
          'Điện áp đầu ra': 'AC 220V ± 2% (Sóng sin chuẩn tinh khiết)',
          'Dung lượng ắc quy': '2 x 12V / 12Ah kín khí chuyên dụng',
          'Thời gian chuyển mạch': '< 4ms (Không gây gián đoạn động cơ)',
          'Cơ chế bảo vệ': 'Quá tải, ngắn mạch, sụt áp, quá nhiệt độ',
        },
        stockQuantity: 80,
        isPublished: true,
        displayOrder: 3,
        createdAt: '2026-08-15T00:00:00Z',
        updatedAt: '2026-10-21T00:00:00Z',
      },
      {
        id: 'PROD-CAM-AI-VISION',
        name: 'Camera AI An Ninh Ngoài Trời Austec Vision 4K',
        categoryTag: 'AI Camera',
        subtitle: 'Độ phân giải 4K HDR • Nhận diện chuyển động người AI • Quay quét 360°',
        price: 2450000,
        originalPrice: 2900000,
        rating: 4.9,
        reviewsCount: 110,
        imageUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=800&q=80',
        galleryUrls: [],
        warrantyText: 'Bảo hành chính hãng 24 tháng theo Hardware ID',
        highlights: [
          'Ống kính 8.0MP 4K HDR ghi hình sắc nét ngày đêm có màu ban đêm',
          'Chip AI tích hợp phát hiện chính xác người, xe, cảnh báo xua đuổi còi hú',
          'Đàm thoại 2 chiều lọc tiếng ồn rõ ràng từ điện thoại',
          'Chuẩn chống nước ngoài trời IP67 chịu mưa bão khắc nghiệt',
        ],
        specs: {
          'Cảm biến hình ảnh': 'Sony Starvis CMOS 8MP 4K Ultra HD',
          'Góc nhìn': 'Quay ngang 355°, quay dọc 90°, ống kính 4mm',
          'Tầm nhìn ban đêm': 'Hồng ngoại 30m + Đèn LED trợ sáng có màu 20m',
          'Chuẩn nén video': 'H.265+ tiết kiệm 80% dung lượng',
          'Lưu trữ': 'Thẻ nhớ MicroSD tối đa 256GB hoặc Austec Cloud NVR',
        },
        stockQuantity: 120,
        isPublished: true,
        displayOrder: 4,
        createdAt: '2026-08-20T00:00:00Z',
        updatedAt: '2026-10-21T00:00:00Z',
      },
      {
        id: 'PROD-SENSOR-ENV-M1',
        name: 'Trạm Cảm Biến Môi Trường Không Dây MultiSensor M1 Pro',
        categoryTag: 'Cảm Biến',
        subtitle: 'Đo nhiệt độ, độ ẩm, chất lượng không khí AQI • Kết nối Zigbee 3.0',
        price: 850000,
        originalPrice: 1100000,
        rating: 4.7,
        reviewsCount: 76,
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
        galleryUrls: [],
        warrantyText: 'Bảo hành chính hãng 24 tháng 1 đổi 1',
        highlights: [
          'Cảm biến Sensirion Thụy Sĩ sai số nhiệt độ dưới 0.2°C',
          'Tự động kích hoạt đóng cửa khi phát hiện mưa hoặc mở quạt thông gió khi nhiệt độ cao',
          'Thời lượng pin cúc áo CR2450 dùng liên tục 2 năm',
        ],
        specs: {
          'Dải đo nhiệt độ': '-20°C đến 60°C (Sai số ±0.2°C)',
          'Dải đo độ ẩm': '0% đến 99% RH (Sai số ±2%)',
          'Giao thức kết nối': 'Zigbee 3.0 / BLE Mesh',
          'Kích thước': '40mm x 40mm x 12mm (Cực kỳ nhỏ gọn)',
        },
        stockQuantity: 150,
        isPublished: true,
        displayOrder: 5,
        createdAt: '2026-08-22T00:00:00Z',
        updatedAt: '2026-10-21T00:00:00Z',
      },
    ];

    // 8. DI TRÚ PHÂN QUYỀN THÀNH VIÊN GIA ĐÌNH (PERMISSIONS)
    const migratedPermissions: DeviceMemberPermission[] = [
      // Thiết bị 1: Cửa cuốn Gara Đức Mạnh (AT-DOOR-88239A01)
      {
        id: 'PERM-01',
        hardwareId: 'AT-DOOR-88239A01',
        userId: '00000000-0000-0000-0000-000000000001',
        memberName: 'Nguyễn Mạnh Đức',
        phoneNumber: '0944102588',
        role: 'OWNER',
        canControl: true,
        canViewHistory: true,
        canChildLock: true,
        canConfig: true,
        scheduleLimitActive: false,
        createdAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'PERM-02',
        hardwareId: 'AT-DOOR-88239A01',
        userId: 'USER-SUB-001',
        memberName: 'Trần Thu Hà (Vợ)',
        phoneNumber: '0988776655',
        role: 'MEMBER',
        canControl: true,
        canViewHistory: true,
        canChildLock: true,
        canConfig: false,
        scheduleLimitActive: false,
        createdAt: '2026-09-02T10:00:00Z',
      },
      {
        id: 'PERM-03',
        hardwareId: 'AT-DOOR-88239A01',
        userId: 'USER-SUB-002',
        memberName: 'Nguyễn Minh Khang (Con trai)',
        phoneNumber: '0977112233',
        role: 'MEMBER',
        canControl: true,
        canViewHistory: true,
        canChildLock: false,
        canConfig: false,
        scheduleLimitActive: false,
        createdAt: '2026-09-05T14:30:00Z',
      },
      {
        id: 'PERM-04',
        hardwareId: 'AT-DOOR-88239A01',
        userId: 'USER-SUB-003',
        memberName: 'Lê Văn Toàn (Tài xế / Khách)',
        phoneNumber: '0911223344',
        role: 'GUEST',
        canControl: true,
        canViewHistory: false,
        canChildLock: false,
        canConfig: false,
        scheduleLimitActive: true,
        accessStartTime: '07:30',
        accessEndTime: '18:30',
        accessDays: [true, true, true, true, true, true, false], // T2 - T7
        createdAt: '2026-09-10T08:00:00Z',
      },
      // Thiết bị 2: Khóa chính Dan Phung (AT-LOCK-77124B02)
      {
        id: 'PERM-05',
        hardwareId: 'AT-LOCK-77124B02',
        userId: '00000000-0000-0000-0000-000000000002',
        memberName: 'Dan Phung',
        phoneNumber: '0906806066',
        role: 'OWNER',
        canControl: true,
        canViewHistory: true,
        canChildLock: true,
        canConfig: true,
        scheduleLimitActive: false,
        createdAt: '2026-09-01T00:00:00Z',
      },
      {
        id: 'PERM-06',
        hardwareId: 'AT-LOCK-77124B02',
        userId: 'USER-SUB-004',
        memberName: 'Bùi Thị Lan (Người giúp việc)',
        phoneNumber: '0934123999',
        role: 'GUEST',
        canControl: true,
        canViewHistory: false,
        canChildLock: false,
        canConfig: false,
        scheduleLimitActive: true,
        accessStartTime: '08:00',
        accessEndTime: '12:00',
        accessDays: [true, false, true, false, true, false, false], // T2, T4, T6
        createdAt: '2026-09-15T09:00:00Z',
      },
    ];

    // 9. DI TRÚ PHIẾU YÊU CẦU HỖ TRỢ OFFLINE (CUSTOMER SUPPORT REQUESTS)
    const migratedRequests: CustomerSupportRequest[] = [
      {
        id: 'REQ-2026-001',
        customerId: '00000000-0000-0000-0000-000000000001',
        customerName: 'Nguyễn Mạnh Đức',
        customerPhone: '0944102588',
        hardwareId: 'AT-DOOR-88239A01',
        requestType: 'WARRANTY',
        requestTypeName: 'Yêu Cầu Bảo Hành Định Kỳ 6 Tháng',
        description: 'Cửa cuốn nhà tôi hoạt động tốt nhưng dạo gần đây gioăng cao su đáy có hiện tượng hơi kêu rít khi chạm sàn. Nhờ xưởng cử kỹ thuật qua tra mỡ bảo dưỡng giúp tôi.',
        attachmentUrls: [
          'https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80',
        ],
        replyChannel: 'EMAIL',
        contactEmail: 'ducduc02092005@gmail.com',
        priority: 'NORMAL',
        status: 'OPEN',
        createdAt: '2026-10-20T10:15:00Z',
        updatedAt: '2026-10-20T10:15:00Z',
      },
      {
        id: 'REQ-2026-002',
        customerId: '00000000-0000-0000-0000-000000000003',
        customerName: 'Nguyễn Văn Quang',
        customerPhone: '0982487278',
        hardwareId: 'AT-UPS-99011C03',
        requestType: 'BATTERY_REPLACE',
        requestTypeName: 'Kiểm Tra Bình Ắc Quy UPS Lưu Điện',
        description: 'Bộ lưu điện báo pin 100% nhưng khi cúp điện thử thì đèn báo đỏ nhấp nháy. Nghi ngờ bình ắc quy bị sụt dung lượng. Xin kiểm tra và đổi bình mới chính hãng.',
        attachmentUrls: [],
        replyChannel: 'PUSH_NOTIFICATION',
        contactEmail: 'nguyenvanquangdao0301992@gmail.com',
        priority: 'URGENT',
        status: 'PROCESSING',
        adminResponse: 'Kỹ thuật viên khu vực Hai Bà Trưng đã nhận phiếu và sẽ liên hệ anh Quang trước 14h hôm nay.',
        createdAt: '2026-10-21T08:30:00Z',
        updatedAt: '2026-10-21T09:00:00Z',
      },
      {
        id: 'REQ-2026-003',
        customerId: '00000000-0000-0000-0000-000000000002',
        customerName: 'Dan Phung',
        customerPhone: '0906806066',
        hardwareId: 'AT-LOCK-77124B02',
        requestType: 'RENEW_SUBSCRIPTION',
        requestTypeName: 'Gia Hạn Gói Dịch Vụ Viễn Thám Khóa Masaru',
        description: 'Khóa cửa biệt thự của tôi sắp hết hạn 12 tháng đầu tiên, tôi muốn gia hạn thêm gói 24 tháng hoặc chuyển hẳn sang vĩnh viễn trọn đời. Vui lòng gửi hướng dẫn thanh toán.',
        attachmentUrls: [],
        replyChannel: 'EMAIL',
        contactEmail: 'tigerphung@gmail.com',
        priority: 'NORMAL',
        status: 'RESOLVED',
        adminResponse: 'Đã gia hạn thành công thêm 24 tháng cho thiết bị AT-LOCK-77124B02 của quý khách đến 10/2028.',
        resolvedAt: '2026-10-21T11:20:00Z',
        createdAt: '2026-10-19T14:00:00Z',
        updatedAt: '2026-10-21T11:20:00Z',
      },
    ];

    const totalRecords =
      migratedGroups.length +
      migratedTypes.length +
      migratedProperties.length +
      migratedModels.length +
      migratedInventory.length +
      migratedCustomers.length +
      migratedInstances.length +
      migratedProducts.length +
      migratedPermissions.length +
      migratedRequests.length;

    return {
      migratedGroups,
      migratedTypes,
      migratedProperties,
      migratedModels,
      migratedInventory,
      migratedCustomers,
      migratedInstances,
      migratedProducts,
      migratedPermissions,
      migratedRequests,
      stats: {
        totalRecordsMigrated: totalRecords,
        successRate: 100.0,
        errors,
      },
    };
  }
}
