const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: 'postgresql://austec_admin:AustecSecure2026Password!@127.0.0.1:5432/austec_iot_db',
});

async function cleanDb() {
  await client.connect();
  console.log('Connected to PostgreSQL.');

  // 1. Truncate dependent child tables
  await client.query('TRUNCATE TABLE order_items, orders CASCADE;');
  console.log('Cleared orders & order_items.');

  await client.query('TRUNCATE TABLE live_chat_messages, support_tickets, customer_support_requests CASCADE;');
  console.log('Cleared support tickets & messages.');

  await client.query('TRUNCATE TABLE blackbox_audit_logs, blackbox_logs CASCADE;');
  console.log('Cleared blackbox logs.');

  await client.query('TRUNCATE TABLE ota_device_records, ota_campaigns CASCADE;');
  console.log('Cleared OTA campaigns & records.');

  await client.query('TRUNCATE TABLE device_rf_remotes CASCADE;');
  console.log('Cleared RF remotes.');

  await client.query('TRUNCATE TABLE device_permissions CASCADE;');
  console.log('Cleared device permissions.');

  await client.query('TRUNCATE TABLE device_instances CASCADE;');
  console.log('Cleared device instances.');

  await client.query('TRUNCATE TABLE device_inventory CASCADE;');
  console.log('Cleared device inventory.');

  await client.query('TRUNCATE TABLE notifications CASCADE;');
  console.log('Cleared notifications.');

  // Clean models, types, groups so admin device management is clean slate
  await client.query('DELETE FROM device_models;');
  await client.query('DELETE FROM device_types;');
  await client.query('DELETE FROM device_groups;');
  console.log('Cleared device models, types, and groups.');

  // 2. Clean users: keep ONLY austec.admin@gmail.com
  const usersBefore = await client.query('SELECT count(*) FROM users;');
  console.log('Users before:', usersBefore.rows[0].count);
  await client.query("DELETE FROM users WHERE email != 'austec.admin@gmail.com';");
  const usersAfter = await client.query('SELECT id, email, role FROM users;');
  console.log('Users after:', usersAfter.rows);

  // 3. Clean device_properties: only keep the 7 roller door properties
  await client.query('DELETE FROM device_properties;');
  console.log('Cleared old properties.');

  const rollerProperties = [
    {
      id: 31,
      property_key: 'motor_current',
      display_name: 'Dòng điện động cơ',
      data_type: 'float',
      unit: 'A',
      ui_widget_type: 'telemetry_graph',
      is_controllable: false,
      min_val: 0,
      max_val: 20,
      description: 'Dòng điện tiêu thụ động cơ cửa cuốn',
    },
    {
      id: 32,
      property_key: 'ac_voltage',
      display_name: 'Điện áp nguồn AC',
      data_type: 'float',
      unit: 'V',
      ui_widget_type: 'gauge',
      is_controllable: false,
      min_val: 0,
      max_val: 300,
      description: 'Điện áp lưới điện cấp cho bộ điều khiển cửa cuốn',
    },
    {
      id: 33,
      property_key: 'door_state',
      display_name: 'Trạng thái cửa',
      data_type: 'string',
      unit: '',
      ui_widget_type: 'status_badge',
      is_controllable: true,
      min_val: null,
      max_val: null,
      description: 'Trạng thái vận hành cửa cuốn (OPEN, CLOSED, STOPPED, OPENING, CLOSING)',
    },
    {
      id: 34,
      property_key: 'position_percent',
      display_name: 'Vị trí mở cửa',
      data_type: 'integer',
      unit: '%',
      ui_widget_type: 'slider',
      is_controllable: true,
      min_val: 0,
      max_val: 100,
      description: 'Độ mở hành trình cửa cuốn từ 0% (đóng hoàn toàn) đến 100% (mở tối đa)',
    },
    {
      id: 37,
      property_key: 'is_locked',
      display_name: 'Khóa chốt an toàn',
      data_type: 'boolean',
      unit: '',
      ui_widget_type: 'toggle',
      is_controllable: true,
      min_val: null,
      max_val: null,
      description: 'Khóa chốt cơ điện an toàn chống cạy cửa',
    },
    {
      id: 38,
      property_key: 'is_child_lock',
      display_name: 'Khóa phím trẻ em',
      data_type: 'boolean',
      unit: '',
      ui_widget_type: 'toggle',
      is_controllable: true,
      min_val: null,
      max_val: null,
      description: 'Khóa nút bấm tường cơ học để tránh trẻ em nghịch bấm',
    },
    {
      id: 39,
      property_key: 'rf_list',
      display_name: 'Danh sách tay remote RF',
      data_type: 'json',
      unit: '',
      ui_widget_type: 'status_badge',
      is_controllable: false,
      min_val: null,
      max_val: null,
      description: 'Danh sách các tay điều khiển từ xa RF 433MHz đã học lệnh',
    },
  ];

  for (const p of rollerProperties) {
    await client.query(
      `INSERT INTO device_properties (id, property_key, display_name, data_type, unit, ui_widget_type, is_controllable, min_val, max_val, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [p.id, p.property_key, p.display_name, p.data_type, p.unit, p.ui_widget_type, p.is_controllable, p.min_val, p.max_val, p.description, new Date().toISOString()]
    );
  }
  await client.query("SELECT setval('device_properties_id_seq', (SELECT COALESCE(MAX(id), 1) FROM device_properties))");

  const propsAfter = await client.query('SELECT id, property_key, display_name, data_type, ui_widget_type, is_controllable FROM device_properties ORDER BY id ASC;');
  console.log('Props after cleanup:', propsAfter.rows);

  // Check roles & permissions intact
  const roles = await client.query('SELECT count(*) FROM system_roles;');
  const perms = await client.query('SELECT count(*) FROM role_permissions;');
  console.log('System roles kept:', roles.rows[0].count);
  console.log('Role permissions kept:', perms.rows[0].count);

  await client.end();
  console.log('PostgreSQL database cleanup completed successfully!');
}

cleanDb().catch(e => {
  console.error('Error during cleanup:', e);
  process.exit(1);
});
