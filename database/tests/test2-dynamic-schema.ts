import { DynamicSchemaEngine } from '../src/dynamic-schema/schema-engine.js';
import { Property, DeviceModel } from '../src/schemas/types.js';

console.log('================================================================');
console.log('TEST 2: KIỂM THỬ SCHEMA ĐỘNG & SINH WIDGET (DYNAMIC SCHEMA TEST)');
console.log('================================================================');

const engine = new DynamicSchemaEngine();
let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName} - ${detail || 'Failed assertion'}`);
    failCount++;
  }
}

// 1. Thêm các thuộc tính mới mà KHÔNG cần sửa bất kỳ dòng code backend hay database nào
console.log('\n--- Bước 1: Đăng ký Thuộc tính Mới vào Từ điển Schema ---');

const pm25Prop: Property = {
  id: 101,
  propertyKey: 'pm25_density',
  displayName: 'Nồng độ bụi mịn PM2.5',
  dataType: 'float',
  unit: 'µg/m³',
  uiWidgetType: 'gauge',
  isControllable: false,
  validationRule: { min: 0, max: 500 },
};

const curtainProp: Property = {
  id: 102,
  propertyKey: 'curtain_position',
  displayName: 'Vị trí rèm cửa',
  dataType: 'integer',
  unit: '%',
  uiWidgetType: 'slider',
  isControllable: true,
  validationRule: { min: 0, max: 100 },
};

const securityModeProp: Property = {
  id: 103,
  propertyKey: 'security_mode',
  displayName: 'Chế độ an ninh',
  dataType: 'enum',
  uiWidgetType: 'segmented',
  isControllable: true,
  validationRule: {
    enumOptions: ['DISARMED', 'HOME_STAY', 'AWAY_ARMED', 'PANIC'],
  },
};

engine.registerProperty(pm25Prop);
engine.registerProperty(curtainProp);
engine.registerProperty(securityModeProp);

assert(engine.getProperty('pm25_density') !== undefined, 'Đăng ký thành công thuộc tính PM2.5');
assert(engine.getProperty('curtain_position') !== undefined, 'Đăng ký thành công thuộc tính Rèm cửa');
assert(engine.getProperty('security_mode') !== undefined, 'Đăng ký thành công thuộc tính Chế độ an ninh');

// 2. Tạo Model mới sử dụng các thuộc tính trên
console.log('\n--- Bước 2: Tạo Model Mới Ghép Nối Thuộc Tính ---');

const airPurifierModel: DeviceModel = {
  id: 10,
  modelName: 'Austec Smart Air Purifier P5',
  modelCode: 'AUSTEC-AIR-P5',
  groupId: 1,
  typeId: 2,
  firmwareVersionLatest: 'v1.0.0',
  hardwareVersion: 'HW-AIR-A',
  supplier: 'Austec Clean Air Tech',
  propertiesConfig: [
    { propertyKey: 'pm25_density', isRequired: true, alertThresholdHigh: 150 },
    { propertyKey: 'security_mode', isRequired: false, defaultValue: 'DISARMED' },
  ],
  controlCapabilities: ['SET_FAN_SPEED', 'POWER_ON', 'POWER_OFF'],
  createdAt: new Date().toISOString(),
};

engine.registerModel(airPurifierModel);
assert(engine.getModel('AUSTEC-AIR-P5') !== undefined, "Model 'AUSTEC-AIR-P5' được nạp thành công vào Engine");

// 3. Tự động sinh đặc tả UI Widget cho Mobile App / Web CMS
console.log('\n--- Bước 3: Tự động sinh Đặc tả UI Widget ---');
const widgetSpecs = engine.generateUIWidgetSpecs('AUSTEC-AIR-P5');

assert(widgetSpecs.length === 2, 'Sinh chính xác 2 widget cho 2 thuộc tính được cấu hình');
assert(widgetSpecs[0].widgetType === 'gauge' && widgetSpecs[0].unit === 'µg/m³', 'Widget PM2.5 sinh đúng kiểu gauge và đơn vị µg/m³');
assert(widgetSpecs[1].widgetType === 'segmented' && widgetSpecs[1].options?.length === 4, 'Widget security_mode sinh đúng kiểu segmented với 4 lựa chọn');

// 4. Kiểm thử kiểm thực gói tin Telemetry & Bắt lỗi / Bắn Cảnh báo
console.log('\n--- Bước 4: Kiểm thực Gói tin Telemetry ---');

// Case A: Gói tin chuẩn
const validPayload = {
  pm25_density: 35.8,
  security_mode: 'HOME_STAY',
};
const resA = engine.validateTelemetry('AUSTEC-AIR-P5', validPayload);
assert(resA.isValid, 'Gói tin telemetry hợp lệ được chấp nhận');
assert(resA.alerts.length === 0, 'Không phát sinh cảnh báo khi chỉ số nằm trong vùng an toàn');

// Case B: Chỉ số vượt ngưỡng cảnh báo nguy hiểm (PM2.5 = 178 > 150)
const alertPayload = {
  pm25_density: 178.5,
};
const resB = engine.validateTelemetry('AUSTEC-AIR-P5', alertPayload);
assert(resB.isValid, 'Gói tin vẫn hợp lệ về mặt cấu trúc');
assert(resB.alerts.length === 1 && resB.alerts[0].level === 'CRITICAL', 'Tự động phát hiện cảnh báo CRITICAL khi PM2.5 vượt 150 µg/m³');

// Case C: Giá trị enum không hợp lệ
const invalidEnumPayload = {
  pm25_density: 20.0,
  security_mode: 'SUPER_HACKER_MODE', // Không nằm trong enumOptions
};
const resC = engine.validateTelemetry('AUSTEC-AIR-P5', invalidEnumPayload);
assert(!resC.isValid, 'Từ chối thành công giá trị enum không nằm trong danh mục cho phép');
assert(resC.errors.some(e => e.includes('không thuộc danh mục hợp lệ')), 'Thông báo lỗi chỉ rõ vi phạm danh mục enum');

// Case D: Vượt quá dải đo cho phép (PM2.5 > 500)
const outOfRangePayload = {
  pm25_density: 999.0,
};
const resD = engine.validateTelemetry('AUSTEC-AIR-P5', outOfRangePayload);
assert(!resD.isValid, 'Từ chối thành công giá trị vượt quá giới hạn dải đo');

console.log('\n================================================================');
console.log(`KẾT QUẢ TEST 2: ${passCount} Passed, ${failCount} Failed.`);
console.log(`Độ tin cậy Dynamic Schema Engine: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
}
