import { LegacyDataMigrator } from '../src/migration/migrate-legacy-data.js';
import {
  DeviceGroupValidator,
  DeviceTypeValidator,
  PropertyValidator,
  DeviceModelValidator,
  DeviceInventoryValidator,
  CustomerValidator,
  DeviceInstanceValidator,
} from '../src/schemas/types.js';

console.log('================================================================');
console.log('TEST 1: KIỂM THỬ TOÀN VẸN DỮ LIỆU DI TRÚ (DATA INTEGRITY TEST)');
console.log('================================================================');

const migrator = new LegacyDataMigrator();
const result = migrator.migrateAll();

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

// 1. Kiểm tra số lượng bản ghi
assert(result.migratedGroups.length === 6, 'Di trú đủ 6 nhóm sản phẩm Group từ HTML cũ');
assert(result.migratedTypes.length === 6, 'Di trú đủ 6 loại phần cứng Device Type từ HTML cũ');
assert(result.migratedProperties.length === 14, 'Di trú đủ 14 thuộc tính telemetry Property từ HTML cũ');
assert(result.migratedModels.length === 3, 'Khởi tạo thành công 3 Model thương mại chuẩn');
assert(result.migratedCustomers.length === 8, 'Di trú đủ 8 khách hàng mẫu thực tế từ user-customer.html');
assert(result.migratedInventory.length === 8, 'Di trú đủ 8 thiết bị xuất xưởng trong kho');
assert(result.migratedInstances.length === 6, 'Gán thành công 6 thiết bị vào khách hàng sở hữu');

// 2. Kiểm thử hợp lệ Zod Schema cho từng bản ghi
console.log('\n--- Kiểm tra Schema Validation với Zod ---');

result.migratedGroups.forEach(g => {
  const check = DeviceGroupValidator.safeParse(g);
  assert(check.success, `Group '${g.groupName}' hợp lệ theo schema chuẩn`);
});

result.migratedTypes.forEach(t => {
  const check = DeviceTypeValidator.safeParse(t);
  assert(check.success, `Device Type '${t.typeCode}' hợp lệ theo schema chuẩn`);
});

result.migratedProperties.forEach(p => {
  const check = PropertyValidator.safeParse(p);
  assert(check.success, `Property '${p.propertyKey}' hợp lệ theo schema chuẩn`, check.success ? undefined : JSON.stringify(check.error.issues));
});

result.migratedModels.forEach(m => {
  const check = DeviceModelValidator.safeParse(m);
  assert(check.success, `Model '${m.modelCode}' hợp lệ theo schema chuẩn`, check.success ? undefined : JSON.stringify(check.error.issues));
});

result.migratedCustomers.forEach(c => {
  const check = CustomerValidator.safeParse(c);
  assert(check.success, `Customer '${c.fullName}' (${c.phone}) hợp lệ theo schema chuẩn`, check.success ? undefined : JSON.stringify(check.error.issues));
});

result.migratedInventory.forEach(inv => {
  const check = DeviceInventoryValidator.safeParse(inv);
  assert(check.success, `Inventory '${inv.hardwareId}' hợp lệ theo schema chuẩn`, check.success ? undefined : JSON.stringify(check.error.issues));
});

result.migratedInstances.forEach(inst => {
  const check = DeviceInstanceValidator.safeParse(inst);
  assert(check.success, `Instance '${inst.customName}' [${inst.hardwareId}] hợp lệ theo schema chuẩn`, check.success ? undefined : JSON.stringify(check.error.issues));
});

// 3. Kiểm tra tính toàn vẹn quan hệ liên kết (Referential Integrity)
console.log('\n--- Kiểm tra Toàn vẹn Khóa ngoại & Liên kết ---');
const groupIds = new Set(result.migratedGroups.map(g => g.id));
const typeIds = new Set(result.migratedTypes.map(t => t.id));
const propertyKeys = new Set(result.migratedProperties.map(p => p.propertyKey));
const customerIds = new Set(result.migratedCustomers.map(c => c.id));
const inventoryHardwareIds = new Set(result.migratedInventory.map(i => i.hardwareId));

// Kiểm tra Model tham chiếu Group & Type
result.migratedModels.forEach(m => {
  assert(groupIds.has(m.groupId), `Model '${m.modelCode}' liên kết đúng Group ID = ${m.groupId}`);
  assert(typeIds.has(m.typeId), `Model '${m.modelCode}' liên kết đúng Type ID = ${m.typeId}`);
  m.propertiesConfig.forEach(cfg => {
    assert(propertyKeys.has(cfg.propertyKey), `Model '${m.modelCode}' chứa PropertyKey hợp lệ '${cfg.propertyKey}'`);
  });
});

// Kiểm tra Instance tham chiếu Customer & HardwareId
result.migratedInstances.forEach(inst => {
  assert(customerIds.has(inst.ownerId), `Instance '${inst.hardwareId}' có Owner ID tồn tại trong danh sách Customer`);
  assert(inventoryHardwareIds.has(inst.hardwareId), `Instance '${inst.hardwareId}' có Hardware ID tồn tại trong kho Inventory`);
});

console.log('\n================================================================');
console.log(`KẾT QUẢ TEST 1: ${passCount} Passed, ${failCount} Failed.`);
console.log(`Tỷ lệ toàn vẹn di trú: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
console.log('================================================================');

if (failCount > 0) {
  process.exit(1);
}
