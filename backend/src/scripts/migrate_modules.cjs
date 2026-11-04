const { postgresClient } = require('../../dist/core/database/postgres.client.js');

(async () => {
  await postgresClient.connect();
  const allModules = [
    { id: 'mod_dash', name: 'Dashboard Tổng Quan' },
    { id: 'mod_dev', name: 'Quản Lý Thiết Bị Tập Trung' },
    { id: 'mod_ota', name: 'Quản Lý Firmware & OTA' },
    { id: 'mod_user', name: 'Quản Lý Cán Bộ & Vai Trò' },
    { id: 'mod_customer', name: 'Quản Lý Khách Hàng & Gia Đình' },
    { id: 'mod_cskh', name: 'Vận Hành & CSKH Live Chat' },
    { id: 'mod_noti', name: 'Trung Tâm Thông Báo Push' },
    { id: 'mod_audit', name: 'Hộp Đen Kiểm Toán SHA-256' },
    { id: 'mod_store', name: 'Gian Hàng & Thương Phẩm' },
    { id: 'mod_guide', name: 'Hướng Dẫn Lắp Đặt & Reset' },
    { id: 'mod_setting', name: 'Cài Đặt Hệ Thống' }
  ];

  // 1: Admin - all true
  for (const m of allModules) {
    const exists = await postgresClient.query('SELECT id FROM role_permissions WHERE role_id = 1 AND module_id = $1', [m.id]);
    if (exists.rows.length === 0) {
      await postgresClient.query(
        'INSERT INTO role_permissions (role_id, module_id, module_name, can_view, can_create, can_update, can_delete, can_all) VALUES (1, $1, $2, true, true, true, true, true)',
        [m.id, m.name]
      );
    } else {
      await postgresClient.query(
        'UPDATE role_permissions SET module_name = $1, can_view = true, can_create = true, can_update = true, can_delete = true, can_all = true WHERE role_id = 1 AND module_id = $2',
        [m.name, m.id]
      );
    }
  }

  // 2: Device Admin - mod_dash, mod_dev, mod_ota, mod_store, mod_guide
  const devMods = ['mod_dash', 'mod_dev', 'mod_ota', 'mod_store', 'mod_guide'];
  for (const m of allModules) {
    const can = devMods.includes(m.id);
    const exists = await postgresClient.query('SELECT id FROM role_permissions WHERE role_id = 2 AND module_id = $1', [m.id]);
    if (exists.rows.length === 0) {
      await postgresClient.query(
        'INSERT INTO role_permissions (role_id, module_id, module_name, can_view, can_create, can_update, can_delete, can_all) VALUES (2, $1, $2, $3, $3, $3, false, false)',
        [m.id, m.name, can]
      );
    } else {
      await postgresClient.query(
        'UPDATE role_permissions SET module_name = $1, can_view = $2, can_create = $2, can_update = $2, can_delete = false, can_all = false WHERE role_id = 2 AND module_id = $3',
        [m.name, can, m.id]
      );
    }
  }

  // 3: CSKH Support - mod_dash, mod_customer, mod_cskh, mod_noti, mod_store
  const cskhMods = ['mod_dash', 'mod_customer', 'mod_cskh', 'mod_noti', 'mod_store'];
  for (const m of allModules) {
    const can = cskhMods.includes(m.id);
    const exists = await postgresClient.query('SELECT id FROM role_permissions WHERE role_id = 3 AND module_id = $1', [m.id]);
    if (exists.rows.length === 0) {
      await postgresClient.query(
        'INSERT INTO role_permissions (role_id, module_id, module_name, can_view, can_create, can_update, can_delete, can_all) VALUES (3, $1, $2, $3, $3, $3, false, false)',
        [m.id, m.name, can]
      );
    } else {
      await postgresClient.query(
        'UPDATE role_permissions SET module_name = $1, can_view = $2, can_create = $2, can_update = $2, can_delete = false, can_all = false WHERE role_id = 3 AND module_id = $3',
        [m.name, can, m.id]
      );
    }
  }

  // 4: Kỹ Thuật Kho - mod_dash, mod_dev, mod_store, mod_guide
  const techMods = ['mod_dash', 'mod_dev', 'mod_store', 'mod_guide'];
  for (const m of allModules) {
    const can = techMods.includes(m.id);
    const exists = await postgresClient.query('SELECT id FROM role_permissions WHERE role_id = 4 AND module_id = $1', [m.id]);
    if (exists.rows.length === 0) {
      await postgresClient.query(
        'INSERT INTO role_permissions (role_id, module_id, module_name, can_view, can_create, can_update, can_delete, can_all) VALUES (4, $1, $2, $3, $3, $3, false, false)',
        [m.id, m.name, can]
      );
    } else {
      await postgresClient.query(
        'UPDATE role_permissions SET module_name = $1, can_view = $2, can_create = $2, can_update = $2, can_delete = false, can_all = false WHERE role_id = 4 AND module_id = $3',
        [m.name, can, m.id]
      );
    }
  }

  console.log('Migration successful: All 11 modules seeded into role_permissions!');
  process.exit(0);
})().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
