import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { PostgresService } from '../src/services/postgres.service.js';
import { PersistentDataPayload } from '../src/services/persistence.service.js';

import { LegacyDataMigrator } from '@austec/database';

async function main() {
  console.log('--- KHỞI ĐỘNG TIẾN TRÌNH ĐỒNG BỘ POSTGRESQL AUSTEC IOT ---');

  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://austec_admin:AustecSecure2026Password!@127.0.0.1:5432/austec_iot_db';

  const pgService = new PostgresService(connectionString);
  const connected = await pgService.connect();
  if (!connected) {
    console.error('Không thể kết nối tới PostgreSQL! Vui lòng kiểm tra lại container docker hoặc dịch vụ PostgreSQL.');
    process.exit(1);
  }

  // 1. Tạo toàn bộ 9 bảng quan hệ
  console.log('1. Đang tạo các bảng trong PostgreSQL...');
  await pgService.initTables();

  // 2. Đọc dữ liệu từ file austec_database.json
  const dataPath = path.resolve(process.cwd(), '../data/austec_database.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`Không tìm thấy file dữ liệu tại ${dataPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(dataPath, 'utf-8');
  const payload = JSON.parse(raw) as PersistentDataPayload;

  // Bổ sung Device Inventory & Instances từ Legacy Migrator nếu chưa có
  const migrator = new LegacyDataMigrator();
  const migrated = migrator.migrateAll();

  if (!payload.deviceInventory || payload.deviceInventory.length === 0) {
    payload.deviceInventory = migrated.migratedInventory;
  }
  if (!payload.deviceInstances || payload.deviceInstances.length === 0) {
    payload.deviceInstances = migrated.migratedInstances;
  }

  // Lưu ngược lại json để cả file cục bộ và PostgreSQL đều đầy đủ 100%
  fs.writeFileSync(dataPath, JSON.stringify(payload, null, 2), 'utf-8');

  console.log(
    `2. Đã đọc dữ liệu nguồn: ${payload.users?.length || 0} users, ` +
    `${payload.products?.length || 0} products, ` +
    `${payload.permissions?.length || 0} perms, ` +
    `${payload.deviceInstances?.length || 0} instances, ` +
    `${payload.deviceInventory?.length || 0} inventory items`
  );

  // 3. Đồng bộ sang PostgreSQL
  console.log('3. Đang bơm toàn bộ dữ liệu vào PostgreSQL...');
  await pgService.syncAllToPostgres(payload);

  // 4. Kiểm tra lại dữ liệu vừa bơm
  console.log('4. Kiểm tra dữ liệu trong PostgreSQL...');
  const loaded = await pgService.loadAllFromPostgres();
  if (loaded) {
    console.log('--- KẾT QUẢ ĐỒNG BỘ THÀNH CÔNG RỰC RỠ ---');
    console.log(`- Users trong PostgreSQL: ${loaded.users.length}`);
    console.log(`- Quyền thiết bị trong PostgreSQL: ${loaded.permissions.length}`);
    console.log(`- Sản phẩm gian hàng: ${loaded.products.length}`);
    console.log(`- Phiếu yêu cầu hỗ trợ: ${loaded.requests.length}`);
    console.log(`- Live Chat Tickets: ${loaded.supportTickets.length}`);
    console.log(`- Live Chat Messages: ${loaded.supportMessages.length}`);
    console.log(`- Thiết bị Instances: ${loaded.deviceInstances?.length || 0}`);
    console.log(`- Kho thiết bị Inventory: ${loaded.deviceInventory?.length || 0}`);
    console.log(`- Danh sách tài khoản:`, loaded.users.map(u => `${u.fullName} (${u.email}) [${u.role}]`));
  }

  await pgService.close();
  console.log('--- HOÀN TẤT ĐỒNG BỘ 100% ---');
}

main().catch(err => {
  console.error('Lỗi khi chạy script đồng bộ:', err);
  process.exit(1);
});
