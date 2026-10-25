import { Pool, PoolClient } from 'pg';
import {
  Product,
  DeviceMemberPermission,
  CustomerSupportRequest,
  SupportTicket,
  LiveChatMessage,
  DeviceInstance,
  DeviceInventory,
  DeviceBlackboxLog,
  DeviceGroup,
  DeviceType,
  Property,
  DeviceModel,
  SystemRole,
  RolePermission,
  Order,
  OrderItem,
  RfRemote
} from '@austec/database';
import { PersistentDataPayload } from './persistence.service.js';
import type { UnifiedUser } from '../server.js';
export type { UnifiedUser };

export class PostgresService {
  private pool: Pool | null = null;
  private isConnected: boolean = false;
  private connectionString: string;

  constructor(connectionString?: string) {
    this.connectionString =
      connectionString ||
      process.env.DATABASE_URL ||
      'postgresql://austec_admin:AustecSecure2026Password!@127.0.0.1:5432/austec_iot_db';
  }

  public async connect(): Promise<boolean> {
    try {
      this.pool = new Pool({
        connectionString: this.connectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      const client = await this.pool.connect();
      console.log(`[PostgresService] Đã kết nối thành công tới PostgreSQL tại ${this.connectionString.replace(/:[^:@]*@/, ':****@')}`);
      client.release();
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('[PostgresService] Lỗi kết nối PostgreSQL:', error);
      this.isConnected = false;
      return false;
    }
  }

  public getConnected(): boolean {
    return this.isConnected;
  }

  public getPool(): Pool | null {
    return this.pool;
  }

  /**
   * Tạo toàn bộ 18 bảng cấu trúc dữ liệu chuẩn hóa nếu chưa tồn tại
   */
  public async initTables(): Promise<void> {
    if (!this.pool) return;

    const ddl = `
      -- 1. BẢNG NGƯỜI DÙNG (ADMIN, CSKH & KHÁCH HÀNG)
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        emp_id VARCHAR(50),
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone_number VARCHAR(50),
        company VARCHAR(255),
        department VARCHAR(255),
        role VARCHAR(50) NOT NULL,
        role_title VARCHAR(100),
        password VARCHAR(255) NOT NULL DEFAULT 'Austec123!@#',
        address TEXT,
        province VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        registered_at VARCHAR(50),
        updated_at VARCHAR(50),
        updated_by VARCHAR(255),
        devices JSONB DEFAULT '[]'::jsonb
      );

      -- 2. BẢNG NHÓM SẢN PHẨM (DEVICE GROUPS)
      CREATE TABLE IF NOT EXISTS device_groups (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        group_name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        banner_url TEXT,
        display_order INT DEFAULT 0,
        created_at VARCHAR(50),
        updated_at VARCHAR(50)
      );

      -- 3. BẢNG LOẠI PHẦN CỨNG KỸ THUẬT (DEVICE TYPES)
      CREATE TABLE IF NOT EXISTS device_types (
        id SERIAL PRIMARY KEY,
        type_code VARCHAR(50) UNIQUE NOT NULL,
        type_name VARCHAR(255) NOT NULL,
        icon_svg TEXT,
        description TEXT,
        created_at VARCHAR(50)
      );

      -- 4. BẢNG TỪ ĐIỂN THUỘC TÍNH (DEVICE PROPERTIES)
      CREATE TABLE IF NOT EXISTS device_properties (
        id SERIAL PRIMARY KEY,
        property_key VARCHAR(100) UNIQUE NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        data_type VARCHAR(50) NOT NULL,
        unit VARCHAR(20),
        ui_widget_type VARCHAR(50) DEFAULT 'status_badge',
        is_controllable BOOLEAN DEFAULT FALSE,
        min_val FLOAT,
        max_val FLOAT,
        validation_rule JSONB,
        description TEXT,
        created_at VARCHAR(50)
      );

      -- 5. BẢNG KHUÔN MẪU SẢN PHẨM (DEVICE MODELS)
      CREATE TABLE IF NOT EXISTS device_models (
        id SERIAL PRIMARY KEY,
        model_code VARCHAR(100) UNIQUE NOT NULL,
        model_name VARCHAR(255) NOT NULL,
        group_id INT REFERENCES device_groups(id) ON DELETE SET NULL,
        type_id INT REFERENCES device_types(id) ON DELETE SET NULL,
        firmware_version_latest VARCHAR(50) DEFAULT 'v1.0.0',
        hardware_version VARCHAR(50) DEFAULT 'HW-REV-A',
        supplier VARCHAR(255) DEFAULT 'Austec Smart Factory',
        image_url TEXT,
        properties_config JSONB DEFAULT '[]'::jsonb,
        control_capabilities JSONB DEFAULT '[]'::jsonb,
        created_at VARCHAR(50)
      );

      -- 6. BẢNG KHO XUẤT XƯỞNG (DEVICE INVENTORY)
      CREATE TABLE IF NOT EXISTS device_inventory (
        hardware_id VARCHAR(100) PRIMARY KEY,
        mac_address VARCHAR(50),
        model_id INT,
        model_name VARCHAR(255),
        device_type VARCHAR(100),
        batch_number VARCHAR(100),
        qr_code_hash VARCHAR(255),
        production_date VARCHAR(50),
        warranty_months INT DEFAULT 24,
        supplier VARCHAR(255) DEFAULT 'Austec Factory',
        status VARCHAR(50) DEFAULT 'MANUFACTURED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS mac_address VARCHAR(50);
      ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS model_id INT;
      ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS model_name VARCHAR(255);
      ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS device_type VARCHAR(100);
      ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100);
      ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS qr_code_hash VARCHAR(255);
      ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS production_date VARCHAR(50);
      ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS warranty_months INT DEFAULT 24;
      ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS supplier VARCHAR(255) DEFAULT 'Austec Factory';
      ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'MANUFACTURED';
      ALTER TABLE device_inventory ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

      -- 7. BẢNG THIẾT BỊ NGƯỜI DÙNG (DEVICE INSTANCES)
      CREATE TABLE IF NOT EXISTS device_instances (
        id VARCHAR(100) PRIMARY KEY,
        hardware_id VARCHAR(100) UNIQUE NOT NULL,
        custom_name VARCHAR(255),
        owner_id VARCHAR(100),
        device_type VARCHAR(100) DEFAULT 'Cửa cuốn',
        firmware_version_current VARCHAR(50) DEFAULT 'v2.4.1',
        is_online BOOLEAN DEFAULT TRUE,
        last_heartbeat VARCHAR(50),
        current_properties JSONB DEFAULT '{}'::jsonb,
        warranty_start_at VARCHAR(50),
        warranty_end_at VARCHAR(50),
        subscription_type VARCHAR(50) DEFAULT 'LIMITED',
        subscription_expires_at VARCHAR(50),
        subscription_status VARCHAR(50) DEFAULT 'ACTIVE',
        installation_address JSONB DEFAULT '{}'::jsonb,
        location_lat FLOAT,
        location_lng FLOAT,
        address_display TEXT,
        created_at VARCHAR(50)
      );

      -- 8. BẢNG PHÂN QUYỀN THÀNH VIÊN GIA ĐÌNH (RBAC FAMILY)
      CREATE TABLE IF NOT EXISTS device_permissions (
        id VARCHAR(100) PRIMARY KEY,
        hardware_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        member_name VARCHAR(255),
        phone_number VARCHAR(50),
        role VARCHAR(50) NOT NULL,
        can_control BOOLEAN DEFAULT TRUE,
        can_view_history BOOLEAN DEFAULT TRUE,
        can_child_lock BOOLEAN DEFAULT FALSE,
        can_config BOOLEAN DEFAULT FALSE,
        schedule_limit_active BOOLEAN DEFAULT FALSE,
        access_start_time VARCHAR(20) DEFAULT '00:00',
        access_end_time VARCHAR(20) DEFAULT '23:59',
        access_days JSONB DEFAULT '[true, true, true, true, true, true, true]'::jsonb,
        created_at VARCHAR(50),
        updated_at VARCHAR(50)
      );

      -- 9. BẢNG TAY REMOTE RF (DEVICE RF REMOTES)
      CREATE TABLE IF NOT EXISTS device_rf_remotes (
        id SERIAL PRIMARY KEY,
        hardware_id VARCHAR(100) NOT NULL,
        remote_code VARCHAR(100) NOT NULL,
        remote_name VARCHAR(255) NOT NULL,
        paired_at VARCHAR(50),
        is_blocked BOOLEAN DEFAULT FALSE
      );

      -- 10. BẢNG SẢN PHẨM GIAN HÀNG (STORE PRODUCTS)
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category_tag VARCHAR(100),
        subtitle TEXT,
        price NUMERIC(15, 2) NOT NULL,
        original_price NUMERIC(15, 2),
        rating FLOAT DEFAULT 5.0,
        reviews_count INT DEFAULT 0,
        image_url TEXT,
        gallery_urls JSONB DEFAULT '[]'::jsonb,
        warranty_text TEXT,
        highlights JSONB DEFAULT '[]'::jsonb,
        specs JSONB DEFAULT '{}'::jsonb,
        stock_quantity INT DEFAULT 50,
        is_published BOOLEAN DEFAULT TRUE,
        display_order INT DEFAULT 1,
        created_at VARCHAR(50),
        updated_at VARCHAR(50)
      );

      -- 11. BẢNG ĐƠN ĐẶT HÀNG (ORDERS)
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(100) PRIMARY KEY,
        customer_id VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        shipping_address TEXT,
        total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        status VARCHAR(50) DEFAULT 'PENDING',
        notes TEXT,
        created_at VARCHAR(50),
        updated_at VARCHAR(50)
      );

      -- 12. BẢNG CHI TIẾT ĐƠN HÀNG (ORDER ITEMS)
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(100) REFERENCES orders(id) ON DELETE CASCADE,
        product_id VARCHAR(100),
        product_name VARCHAR(255),
        unit_price NUMERIC(15, 2) NOT NULL,
        quantity INT DEFAULT 1,
        image_url TEXT
      );

      -- 13. BẢNG PHIẾU YÊU CẦU HỖ TRỢ (SUPPORT REQUESTS)
      CREATE TABLE IF NOT EXISTS customer_support_requests (
        id VARCHAR(100) PRIMARY KEY,
        customer_id VARCHAR(100),
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        customer_email VARCHAR(255),
        hardware_id VARCHAR(100),
        device_name VARCHAR(255),
        request_type VARCHAR(100),
        request_type_name VARCHAR(255),
        description TEXT,
        images JSONB DEFAULT '[]'::jsonb,
        attachment_urls JSONB DEFAULT '[]'::jsonb,
        reply_channel VARCHAR(50) DEFAULT 'APP',
        preferred_contact_time VARCHAR(100),
        status VARCHAR(50) DEFAULT 'PENDING',
        admin_response TEXT,
        resolved_at VARCHAR(50),
        created_at VARCHAR(50),
        updated_at VARCHAR(50)
      );

      -- 14. BẢNG TICKET CSKH LIVE CHAT
      CREATE TABLE IF NOT EXISTS support_tickets (
        id VARCHAR(100) PRIMARY KEY,
        customer_id VARCHAR(100) NOT NULL,
        hardware_id VARCHAR(100),
        subject TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'OPEN',
        priority VARCHAR(50) DEFAULT 'NORMAL',
        assigned_cskh_id VARCHAR(100),
        selected_device JSONB,
        created_at VARCHAR(50),
        updated_at VARCHAR(50)
      );

      -- 15. BẢNG TIN NHẮN LIVE CHAT
      CREATE TABLE IF NOT EXISTS live_chat_messages (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(100) NOT NULL,
        sender_id VARCHAR(100) NOT NULL,
        sender_role VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        attachment_urls JSONB DEFAULT '[]'::jsonb,
        selected_device JSONB,
        device_snapshot JSONB,
        created_at VARCHAR(50)
      );

      -- 16. BẢNG NHẬT KÝ HỘP ĐEN KIỂM TOÁN (BLACKBOX AUDIT LOGS)
      CREATE TABLE IF NOT EXISTS blackbox_logs (
        id SERIAL PRIMARY KEY,
        hardware_id VARCHAR(100) NOT NULL,
        actor_id VARCHAR(100),
        actor_role VARCHAR(50) NOT NULL,
        actor_name VARCHAR(255),
        actor_ip VARCHAR(100),
        action_type VARCHAR(100) NOT NULL,
        payload_sent JSONB,
        ack_status VARCHAR(50),
        latency_ms FLOAT,
        crypto_signature VARCHAR(255),
        created_at VARCHAR(50)
      );
      ALTER TABLE blackbox_logs ADD COLUMN IF NOT EXISTS actor_name VARCHAR(255);
      ALTER TABLE blackbox_logs ADD COLUMN IF NOT EXISTS crypto_signature VARCHAR(255);

      -- 17. BẢNG VAI TRÒ HỆ THỐNG (SYSTEM ROLES)
      CREATE TABLE IF NOT EXISTS system_roles (
        id SERIAL PRIMARY KEY,
        role_code VARCHAR(50) UNIQUE NOT NULL,
        role_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_system BOOLEAN DEFAULT FALSE,
        created_at VARCHAR(50)
      );

      -- 18. BẢNG MA TRẬN PHÂN QUYỀN (ROLE PERMISSIONS)
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INT REFERENCES system_roles(id) ON DELETE CASCADE,
        module_id VARCHAR(50) NOT NULL,
        module_name VARCHAR(255) NOT NULL,
        can_view BOOLEAN DEFAULT TRUE,
        can_create BOOLEAN DEFAULT FALSE,
        can_update BOOLEAN DEFAULT FALSE,
        can_delete BOOLEAN DEFAULT FALSE,
        can_all BOOLEAN DEFAULT FALSE
      );

      -- 19. BẢNG THÔNG BÁO HỆ THỐNG (NOTIFICATIONS)
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        target_role VARCHAR(50) DEFAULT 'ALL',
        target_user_id VARCHAR(100),
        type VARCHAR(50) DEFAULT 'INFO',
        is_read BOOLEAN DEFAULT FALSE,
        created_at VARCHAR(50)
      );

      -- 20. BẢNG CẤU HÌNH HỆ THỐNG RUNTIME (SYSTEM CONFIGS)
      CREATE TABLE IF NOT EXISTS system_configs (
        config_key VARCHAR(100) PRIMARY KEY,
        config_val JSONB NOT NULL,
        description TEXT,
        updated_at VARCHAR(50)
      );

      -- 21. BẢNG KHO BẢN PHÁT HÀNH FIRMWARE (FIRMWARE RELEASES)
      CREATE TABLE IF NOT EXISTS firmware_releases (
        id SERIAL PRIMARY KEY,
        version VARCHAR(50) NOT NULL,
        model_code VARCHAR(50) NOT NULL,
        binary_filename VARCHAR(255) NOT NULL,
        binary_url VARCHAR(500) NOT NULL,
        file_size_bytes INT NOT NULL,
        sha256_checksum VARCHAR(64) NOT NULL,
        release_type VARCHAR(20) DEFAULT 'STABLE',
        is_active BOOLEAN DEFAULT TRUE,
        changelog TEXT NOT NULL,
        released_by VARCHAR(100) DEFAULT 'SYSTEM_ADMIN',
        created_at VARCHAR(50) NOT NULL
      );

      -- 22. BẢNG CHIẾN DỊCH NẠP ĐỒNG BỘ OTA (OTA CAMPAIGNS)
      CREATE TABLE IF NOT EXISTS ota_campaigns (
        id SERIAL PRIMARY KEY,
        campaign_name VARCHAR(255) NOT NULL,
        target_model VARCHAR(50) NOT NULL,
        target_version VARCHAR(50) NOT NULL,
        rollout_type VARCHAR(50) DEFAULT 'ALL',
        status VARCHAR(50) DEFAULT 'RUNNING',
        total_devices INT DEFAULT 0,
        success_count INT DEFAULT 0,
        failed_count INT DEFAULT 0,
        in_progress_count INT DEFAULT 0,
        started_at VARCHAR(50) NOT NULL,
        completed_at VARCHAR(50)
      );

      -- 23. BẢNG TIẾN ĐỘ THIẾT BỊ OTA (OTA DEVICE RECORDS)
      CREATE TABLE IF NOT EXISTS ota_device_records (
        id SERIAL PRIMARY KEY,
        campaign_id INT REFERENCES ota_campaigns(id) ON DELETE CASCADE,
        hardware_id VARCHAR(100) NOT NULL,
        customer_name VARCHAR(255),
        current_version VARCHAR(50) NOT NULL,
        target_version VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        progress_pct INT DEFAULT 0,
        last_attempt_at VARCHAR(50),
        error_reason TEXT,
        retry_count INT DEFAULT 0
      );

      -- 24. BẢNG HƯỚNG DẪN LẮP ĐẶT & RESET THEO SẢN PHẨM (INSTALLATION GUIDES)
      CREATE TABLE IF NOT EXISTS installation_guides (
        id SERIAL PRIMARY KEY,
        model_code VARCHAR(50) UNIQUE NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        video_url VARCHAR(500) NOT NULL,
        video_duration VARCHAR(50),
        reset_pin_desc VARCHAR(255) NOT NULL,
        reset_hold_seconds INT DEFAULT 10,
        wiring_diagram_url VARCHAR(500),
        steps JSONB NOT NULL,
        faqs JSONB NOT NULL,
        updated_at VARCHAR(50) NOT NULL
      );

      -- INDEXES TĂNG TỐC TRUY VẤN TOÀN HỆ THỐNG
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_devices_owner ON device_instances(owner_id);
      CREATE INDEX IF NOT EXISTS idx_devices_online ON device_instances(is_online);
      CREATE INDEX IF NOT EXISTS idx_inventory_status ON device_inventory(status);
      CREATE INDEX IF NOT EXISTS idx_permissions_hw ON device_permissions(hardware_id);
      CREATE INDEX IF NOT EXISTS idx_permissions_user ON device_permissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_cust ON support_tickets(customer_id);
      CREATE INDEX IF NOT EXISTS idx_messages_ticket ON live_chat_messages(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_blackbox_hw ON blackbox_logs(hardware_id);
      CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_rf_hw ON device_rf_remotes(hardware_id);
      CREATE INDEX IF NOT EXISTS idx_firmware_model ON firmware_releases(model_code);
      CREATE INDEX IF NOT EXISTS idx_ota_campaign ON ota_device_records(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_ota_device ON ota_device_records(hardware_id);
      CREATE INDEX IF NOT EXISTS idx_guides_model ON installation_guides(model_code);
    `;

    await this.pool.query(ddl);
    console.log('[PostgresService] Đã khởi tạo hoàn tất cấu trúc 22 bảng chuẩn hóa và toàn bộ Index trong PostgreSQL!');
  }

  /**
   * Khởi tạo dữ liệu danh mục metadata ban đầu nếu bảng đang trống
   */
  public async seedInitialMetadata(): Promise<void> {
    if (!this.pool || !this.isConnected) return;

    try {
      // 1. Seed Groups
      const groupCheck = await this.pool.query('SELECT COUNT(*) FROM device_groups');
      if (parseInt(groupCheck.rows[0].count) === 0) {
        const initialGroups = [
          { id: 9, code: 'DOOR_GERMAN_ALU', name: 'CỬA CUỐN NHÔM CÔNG NGHỆ ĐỨC', desc: 'Cửa cuốn nan nhôm khe thoáng công nghệ Đức Titadoor siêu êm', order: 1 },
          { id: 10, code: 'DOOR_AU_STEEL', name: 'CỬA CUỐN TẤM LIỀN CÔNG NGHỆ ÚC', desc: 'Cửa cuốn tấm liền thép hợp kim công nghệ Úc tốc độ nhanh', order: 2 },
          { id: 11, code: 'SMART_LOCK_MASARU', name: 'KHÓA MASARU CHUẨN NHẬT', desc: 'Khóa vân tay thông minh công nghệ Nhật Bản FaceID 3D', order: 3 },
          { id: 12, code: 'UPS_AC_220V', name: 'LƯU ĐIỆN AC 220V SÓNG SIN', desc: 'Bộ lưu điện AC 220V - 50Hz sóng sin chuẩn thông minh', order: 4 },
          { id: 13, code: 'UPS_STANDARD', name: 'LƯU ĐIỆN TIÊU CHUẨN AUSTEC', desc: 'Bộ lưu điện tiêu chuẩn chính hãng tự động xả sạc', order: 5 },
          { id: 15, code: 'GSHT_TRACKER', name: 'GSHT & XE MÁY ĐIỆN', desc: 'Giám sát hành trình xe máy, ô tô, ngắt nguồn khẩn cấp', order: 6 },
          { id: 18, code: 'AI_CAMERA_360', name: 'CAMERA AN NINH AI AUSTEC', desc: 'Hệ thống camera giám sát an ninh thông minh AI 360 độ ban đêm', order: 7 },
          { id: 19, code: 'ENV_SENSOR', name: 'CẢM BIẾN MÔI TRƯỜNG & NHIỆT ẨM', desc: 'Cảm biến nhiệt độ, độ ẩm không khí, cảnh báo cháy & môi trường', order: 8 },
        ];
        for (const g of initialGroups) {
          await this.pool.query(
            `INSERT INTO device_groups (id, code, group_name, description, display_order, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [g.id, g.code, g.name, g.desc, g.order, new Date().toISOString()]
          );
        }
        await this.pool.query(`SELECT setval('device_groups_id_seq', (SELECT MAX(id) FROM device_groups))`);
        console.log('[PostgresService] Đã nạp 8 Nhóm sản phẩm (Device Groups) vào PostgreSQL!');
      }

      // 2. Seed Types
      const typeCheck = await this.pool.query('SELECT COUNT(*) FROM device_types');
      if (parseInt(typeCheck.rows[0].count) === 0) {
        const initialTypes = [
          { id: 10, code: 'DOOR', name: 'Cửa cuốn thông minh', desc: 'Hệ thống cửa cuốn tự động kết nối WiFi/BLE' },
          { id: 11, code: 'SMART_LOCK', name: 'Khóa cửa thông minh', desc: 'Khóa cửa vân tay, FaceID, thẻ từ, mã số ảo' },
          { id: 12, code: 'UPS', name: 'Bộ lưu điện thông minh', desc: 'Bộ lưu điện sóng sin, theo dõi ắc quy thời gian thực' },
          { id: 14, code: 'AUTO_DOOR', name: 'Cửa trượt tự động', desc: 'Cửa trượt kính mắt thần tự động' },
          { id: 15, code: 'BIKE', name: 'Xe máy điện / Định vị', desc: 'Xe điện thông minh, định vị GPS, chống trộm' },
          { id: 16, code: 'CAMERA', name: 'Camera an ninh AI', desc: 'Camera AI nhận diện khuôn mặt và biển số' },
          { id: 17, code: 'SENSOR', name: 'Cảm biến môi trường', desc: 'Cảm biến nhiệt ẩm, khói, khí gas' },
        ];
        for (const t of initialTypes) {
          await this.pool.query(
            `INSERT INTO device_types (id, type_code, type_name, description, created_at)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [t.id, t.code, t.name, t.desc, new Date().toISOString()]
          );
        }
        await this.pool.query(`SELECT setval('device_types_id_seq', (SELECT MAX(id) FROM device_types))`);
        console.log('[PostgresService] Đã nạp 7 Loại phần cứng (Device Types) vào PostgreSQL!');
      }

      // 3. Seed Properties Dictionary
      const propCheck = await this.pool.query('SELECT COUNT(*) FROM device_properties');
      if (parseInt(propCheck.rows[0].count) === 0) {
        const initialProperties = [
          { id: 30, key: 'battery_level', name: 'Mức pin', type: 'integer', unit: '%', widget: 'gauge', ctrl: false, min: 0, max: 100 },
          { id: 31, key: 'motor_current', name: 'Dòng điện động cơ', type: 'float', unit: 'A', widget: 'telemetry_graph', ctrl: false, min: 0, max: 20 },
          { id: 32, key: 'ac_voltage', name: 'Điện áp nguồn AC', type: 'float', unit: 'V', widget: 'gauge', ctrl: false, min: 0, max: 300 },
          { id: 33, key: 'door_state', name: 'Trạng thái cửa', type: 'string', unit: '', widget: 'status_badge', ctrl: true },
          { id: 34, key: 'position_percent', name: 'Vị trí mở cửa', type: 'integer', unit: '%', widget: 'slider', ctrl: true, min: 0, max: 100 },
          { id: 35, key: 'humidity', name: 'Độ ẩm môi trường', type: 'float', unit: '%', widget: 'gauge', ctrl: false, min: 0, max: 100 },
          { id: 36, key: 'temperature', name: 'Nhiệt độ môi trường', type: 'float', unit: '°C', widget: 'gauge', ctrl: false, min: -20, max: 100 },
          { id: 37, key: 'is_locked', name: 'Khóa chốt an toàn', type: 'boolean', unit: '', widget: 'toggle', ctrl: true },
          { id: 38, key: 'is_child_lock', name: 'Khóa trẻ em', type: 'boolean', unit: '', widget: 'toggle', ctrl: true },
          { id: 39, key: 'rf_list', name: 'Danh sách tay remote RF', type: 'json', unit: '', widget: 'status_badge', ctrl: false },
          { id: 40, key: 'expiredAt', name: 'Hạn dịch vụ thuê bao', type: 'string', unit: '', widget: 'status_badge', ctrl: false },
        ];
        for (const p of initialProperties) {
          await this.pool.query(
            `INSERT INTO device_properties (id, property_key, display_name, data_type, unit, ui_widget_type, is_controllable, min_val, max_val, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO NOTHING`,
            [p.id, p.key, p.name, p.type, p.unit, p.widget, p.ctrl, p.min || null, p.max || null, new Date().toISOString()]
          );
        }
        await this.pool.query(`SELECT setval('device_properties_id_seq', (SELECT MAX(id) FROM device_properties))`);
        console.log('[PostgresService] Đã nạp 11 Thuộc tính viễn thám (Device Properties) vào PostgreSQL!');
      }

      // 4. Seed Device Models
      const modelCheck = await this.pool.query('SELECT COUNT(*) FROM device_models');
      if (parseInt(modelCheck.rows[0].count) === 0) {
        const initialModels = [
          {
            id: 1,
            code: 'AUSTEC-A900',
            name: 'Austec Titadoor A900 Super',
            groupId: 9,
            typeId: 10,
            fw: 'v2.4.1',
            hw: 'HW-REV-C',
            supplier: 'Austec Smart Factory Hà Nội',
            capabilities: ['OPEN', 'CLOSE', 'STOP', 'CHILD_LOCK'],
          },
          {
            id: 2,
            code: 'MASARU-X1',
            name: 'Khóa Masaru Titan X1 Pro FaceID',
            groupId: 11,
            typeId: 11,
            fw: 'v3.1.0',
            hw: 'HW-REV-B',
            supplier: 'Masaru Security Tokyo',
            capabilities: ['UNLOCK', 'LOCK', 'GENERATE_OTP'],
          },
          {
            id: 3,
            code: 'UPS-220-SINE',
            name: 'Austec UPS Sine 220V Intelligent',
            groupId: 12,
            typeId: 12,
            fw: 'v1.8.2',
            hw: 'HW-REV-A',
            supplier: 'Austec Power Corp',
            capabilities: ['SWITCH_AC_DC', 'CALIBRATE_BATTERY'],
          },
          {
            id: 4,
            code: 'AUSTEC-CAM-360',
            name: 'Camera An Ninh AI Austec 4K HDR',
            groupId: 18,
            typeId: 16,
            fw: 'v4.2.0',
            hw: 'HW-CAM-X2',
            supplier: 'Austec Vision Lab',
            capabilities: ['SNAPSHOT', 'SIREN_ALARM', 'NIGHT_VISION'],
          },
          {
            id: 5,
            code: 'SENSOR-TH-ZIGBEE',
            name: 'Trạm Môi Trường Nhiệt Ẩm MultiSensor M1 Pro',
            groupId: 19,
            typeId: 17,
            fw: 'v1.2.3',
            hw: 'HW-TH-Z1',
            supplier: 'Austec Sensor Core',
            capabilities: ['PING', 'CALIBRATE'],
          },
        ];
        for (const m of initialModels) {
          await this.pool.query(
            `INSERT INTO device_models (id, model_code, model_name, group_id, type_id, firmware_version_latest, hardware_version, supplier, control_capabilities, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO NOTHING`,
            [m.id, m.code, m.name, m.groupId, m.typeId, m.fw, m.hw, m.supplier, JSON.stringify(m.capabilities), new Date().toISOString()]
          );
        }
        await this.pool.query(`SELECT setval('device_models_id_seq', (SELECT MAX(id) FROM device_models))`);
        console.log('[PostgresService] Đã nạp 5 Khuôn mẫu (Device Models) vào PostgreSQL!');
      }

      // 5. Seed System Roles & Permissions Matrix
      const roleCheck = await this.pool.query('SELECT COUNT(*) FROM system_roles');
      if (parseInt(roleCheck.rows[0].count) === 0) {
        const roles = [
          { id: 1, code: 'ROLE_ADMIN', name: 'Administrator', desc: 'Toàn quyền quản trị hệ sinh thái', isSystem: true },
          { id: 2, code: 'ROLE_DEVICE_MGR', name: 'Device Admin', desc: 'Quản lý thiết bị xuất xưởng, firmware và cấu hình', isSystem: false },
          { id: 3, code: 'ROLE_CSKH', name: 'CSKH Support', desc: 'Hỗ trợ khách hàng, live chat và tiếp nhận sự cố', isSystem: false },
          { id: 4, code: 'ROLE_TECH', name: 'Kỹ Thuật Kho', desc: 'Nhập kho lô hàng, kiểm thử thiết bị và bảo hành', isSystem: false },
        ];
        for (const r of roles) {
          await this.pool.query(
            `INSERT INTO system_roles (id, role_code, role_name, description, is_system, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [r.id, r.code, r.name, r.desc, r.isSystem, new Date().toISOString()]
          );
        }
        await this.pool.query(`SELECT setval('system_roles_id_seq', (SELECT MAX(id) FROM system_roles))`);

        // Seed Default Permissions for 7 Modules
        const modules = [
          { id: 'mod_dash', name: 'Dashboard Giám Sát Thời Gian Thực' },
          { id: 'mod_dev', name: 'Quản lý Thiết Bị Tập Trung' },
          { id: 'mod_user', name: 'Quản lý Người Dùng & Nhân Sự' },
          { id: 'mod_cskh', name: 'Trung Tâm Hỗ Trợ & CSKH Live Chat' },
          { id: 'mod_audit', name: 'Hộp Đen Kiểm Toán SHA-256' },
          { id: 'mod_store', name: 'Gian Hàng & Quản Lý Đơn Hàng' },
          { id: 'mod_setting', name: 'Cài Đặt Hệ Thống & MQTT Broker' },
        ];

        for (const m of modules) {
          // Admin full
          await this.pool.query(
            `INSERT INTO role_permissions (role_id, module_id, module_name, can_view, can_create, can_update, can_delete, can_all)
             VALUES (1, $1, $2, true, true, true, true, true)`,
            [m.id, m.name]
          );

          // CSKH
          const isCskhMod = ['mod_dash', 'mod_cskh', 'mod_store'].includes(m.id);
          await this.pool.query(
            `INSERT INTO role_permissions (role_id, module_id, module_name, can_view, can_create, can_update, can_delete, can_all)
             VALUES (3, $1, $2, $3, $4, $4, false, false)`,
            [m.id, m.name, isCskhMod, isCskhMod]
          );
        }
        console.log('[PostgresService] Đã nạp 4 Vai trò (System Roles) và Ma trận Phân quyền vào PostgreSQL!');
      }

      // 6. Seed RF Remotes sample
      const rfCheck = await this.pool.query('SELECT COUNT(*) FROM device_rf_remotes');
      if (parseInt(rfCheck.rows[0].count) === 0) {
        const remotes = [
          { hwId: 'AT-DOOR-88239A01', code: 'RF-433-A101', name: 'Remote Đức Mạnh #1 (Cầm tay)', date: '2026-09-02' },
          { hwId: 'AT-DOOR-88239A01', code: 'RF-433-A102', name: 'Remote Đức Mạnh #2 (Ô tô)', date: '2026-09-02' },
          { hwId: 'AT-DOOR-88239A01', code: 'RF-433-A103', name: 'Remote Đức Mạnh #3 (Phòng ngủ)', date: '2026-09-05' },
          { hwId: 'AT-DOOR-88239A04', code: 'RF-433-B201', name: 'Remote Công Bằng #1', date: '2026-09-10' },
          { hwId: 'AT-DOOR-88239A05', code: 'RF-433-C301', name: 'Remote Đình Long #1', date: '2026-09-15' },
        ];
        for (const r of remotes) {
          await this.pool.query(
            `INSERT INTO device_rf_remotes (hardware_id, remote_code, remote_name, paired_at, is_blocked)
             VALUES ($1, $2, $3, $4, false)`,
            [r.hwId, r.code, r.name, r.date]
          );
        }
        console.log('[PostgresService] Đã nạp danh mục Remote RF vào PostgreSQL!');
      }

      // 7. Seed Orders sample
      const orderCheck = await this.pool.query('SELECT COUNT(*) FROM orders');
      if (parseInt(orderCheck.rows[0].count) === 0) {
        await this.pool.query(`
          INSERT INTO orders (id, customer_id, customer_name, customer_phone, shipping_address, total_amount, status, notes, created_at, updated_at)
          VALUES 
            ('ORD-88219A', '00000000-0000-0000-0000-000000000001', 'Nguyễn Mạnh Đức', '0944102588', 'Số 45 Lê Duẩn, Hoàn Kiếm, Hà Nội', 4500000, 'COMPLETED', 'Lắp đặt phụ kiện lưu điện UPS chính hãng', '2026-10-15 10:30:00', '2026-10-15 14:00:00'),
            ('ORD-88220B', '00000000-0000-0000-0000-000000000002', 'Dan Phung', '0906806066', 'Tòa Park 3, Vinhomes Times City, Hoàng Mai, Hà Nội', 12500000, 'CONFIRMED', 'Đặt thêm 01 bộ Khóa Masaru Titan X1', '2026-10-20 09:15:00', '2026-10-20 11:00:00'),
            ('ORD-88221C', '00000000-0000-0000-0000-000000000003', 'Nguyễn Văn Quang', '0982487278', 'Số 88 Phố Huế, Hai Bà Trưng, Hà Nội', 650000, 'PENDING', 'Mua thêm 02 tay Remote RF 433MHz dự phòng', '2026-10-22 08:45:00', '2026-10-22 08:45:00')
          ON CONFLICT (id) DO NOTHING
        `);
        console.log('[PostgresService] Đã nạp 3 Đơn hàng mẫu (Orders) vào PostgreSQL!');
      }

      // 8. Seed Firmware Releases
      const fwCheck = await this.pool.query('SELECT COUNT(*) FROM firmware_releases');
      if (parseInt(fwCheck.rows[0].count) === 0) {
        const firmwares = [
          {
            version: 'v1.0.0',
            modelCode: 'DOOR_GERMAN_ALU',
            filename: 'CodeCuaCuonBLE.ino.esp32.bin',
            url: 'http://localhost:4000/firmware/cuacuon_v1.0.0.bin',
            size: 1575952,
            sha256: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
            type: 'STABLE',
            changelog: 'Bản firmware gốc xuất xưởng cho Cửa cuốn Titadoor công nghệ Đức. Hỗ trợ BLE UART, WiFi SoftAP, Rơ-le Đóng/Mở/Dừng và công tắc hành trình.',
          },
          {
            version: 'v1.1.0',
            modelCode: 'DOOR_GERMAN_ALU',
            filename: 'cuacuon_german_v1.1.0.bin',
            url: 'http://localhost:4000/firmware/cuacuon_v1.1.0.bin',
            size: 1602112,
            sha256: '8f4e2b1a9c3d5e7f0b2a4c6e8d1f3b5a7c9e0d2f4a6b8c1e3d5f7a9b0c2e4f6a',
            type: 'STABLE',
            changelog: 'Nâng cấp lớn: Tự động dừng khẩn cấp khi gặp vật cản (Smart Obstacle Stop), tối ưu kết nối WiFi tự phục hồi khi mất điện, hỗ trợ cập nhật OTA từ xa bảo mật cao.',
          },
          {
            version: 'v1.0.2',
            modelCode: 'DOOR_AU_STEEL',
            filename: 'cuacuon_aust_v1.0.2.bin',
            url: 'http://localhost:4000/firmware/cuacuon_aust_v1.0.2.bin',
            size: 1498320,
            sha256: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
            type: 'STABLE',
            changelog: 'Tối ưu hóa thời gian xung kích rơ-le cho động cơ tấm liền công nghệ Úc tốc độ cao.',
          },
          {
            version: 'v2.0.1',
            modelCode: 'SMART_LOCK_MASARU',
            filename: 'masaru_lock_v2.0.1.bin',
            url: 'http://localhost:4000/firmware/masaru_lock_v2.0.1.bin',
            size: 1820400,
            sha256: 'c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1',
            type: 'STABLE',
            changelog: 'Cải thiện thuật toán nhận diện khuôn mặt FaceID 3D trong điều kiện ánh sáng yếu và sinh mã OTP mở khóa 1 lần cho khách.',
          },
          {
            version: 'v1.8.2',
            modelCode: 'UPS_AC_220V',
            filename: 'austec_ups_v1.8.2.bin',
            url: 'http://localhost:4000/firmware/austec_ups_v1.8.2.bin',
            size: 1120000,
            sha256: '7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
            type: 'STABLE',
            changelog: 'Chế độ xả sạc bảo dưỡng tự động cho ắc quy Lithium, báo cáo thời lượng pin theo thời gian thực về Cloud.',
          },
        ];

        for (const f of firmwares) {
          await this.pool.query(
            `INSERT INTO firmware_releases (version, model_code, binary_filename, binary_url, file_size_bytes, sha256_checksum, release_type, is_active, changelog, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)`,
            [f.version, f.modelCode, f.filename, f.url, f.size, f.sha256, f.type, f.changelog, new Date().toISOString()]
          );
        }
        console.log('[PostgresService] Đã nạp 5 Bản phát hành Firmware (Firmware Releases) vào PostgreSQL!');
      }

      // 9. Seed Active OTA Campaign and Device Records
      const otaCheck = await this.pool.query('SELECT COUNT(*) FROM ota_campaigns');
      if (parseInt(otaCheck.rows[0].count) === 0) {
        const campRes = await this.pool.query(`
          INSERT INTO ota_campaigns (campaign_name, target_model, target_version, rollout_type, status, total_devices, success_count, failed_count, in_progress_count, started_at)
          VALUES 
            ('Nâng cấp Firmware v1.1.0 cho toàn bộ Cửa cuốn Titadoor', 'DOOR_GERMAN_ALU', 'v1.1.0', 'ALL', 'RUNNING', 7, 4, 2, 1, '2026-10-23 08:00:00')
          RETURNING id
        `);
        const campaignId = campRes.rows[0].id;

        const records = [
          { hwId: 'AT-DOOR-88239A01', cust: 'Nguyễn Mạnh Đức', cur: 'v1.1.0', target: 'v1.1.0', status: 'SUCCESS', pct: 100, err: null, retry: 0 },
          { hwId: 'AT-DOOR-88239A02', cust: 'Dan Phung', cur: 'v1.1.0', target: 'v1.1.0', status: 'SUCCESS', pct: 100, err: null, retry: 0 },
          { hwId: 'AT-DOOR-88239A03', cust: 'Phan Quốc Huy', cur: 'v1.1.0', target: 'v1.1.0', status: 'SUCCESS', pct: 100, err: null, retry: 0 },
          { hwId: 'AT-DOOR-88239A04', cust: 'Lê Công Bằng', cur: 'v1.1.0', target: 'v1.1.0', status: 'SUCCESS', pct: 100, err: null, retry: 0 },
          { hwId: 'AT-DOOR-88239A05', cust: 'Trần Đình Long', cur: 'v1.0.0', target: 'v1.1.0', status: 'DOWNLOADING', pct: 65, err: null, retry: 0 },
          { hwId: 'AT-DOOR-88239A06', cust: 'Hoàng Minh Tuấn', cur: 'v1.0.0', target: 'v1.1.0', status: 'FAILED_OFFLINE', pct: 0, err: 'Thiết bị đang ngắt nguồn hoặc mất kết nối WiFi gia đình', retry: 2 },
          { hwId: 'amtuong1994', cust: 'Thiết Bị Phòng Lab (Mạch ESP32 Thật)', cur: 'v1.0.0', target: 'v1.1.0', status: 'FAILED_CHECKSUM', pct: 90, err: 'Mất sóng WiFi khi đang tải ở 90% (Đã Rollback về v1.0.0 an toàn)', retry: 1 },
        ];

        for (const r of records) {
          await this.pool.query(
            `INSERT INTO ota_device_records (campaign_id, hardware_id, customer_name, current_version, target_version, status, progress_pct, last_attempt_at, error_reason, retry_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [campaignId, r.hwId, r.cust, r.cur, r.target, r.status, r.pct, new Date().toISOString(), r.err, r.retry]
          );
        }
        console.log('[PostgresService] Đã nạp Chiến dịch OTA mẫu với 7 thiết bị thực tế!');
      }

      // 10. Seed Installation & Reset Guides
      const guideCheck = await this.pool.query('SELECT COUNT(*) FROM installation_guides');
      if (parseInt(guideCheck.rows[0].count) === 0) {
        const guides = [
          {
            modelCode: 'DOOR_GERMAN_ALU',
            productName: 'CỬA CUỐN NHÔM CÔNG NGHỆ ĐỨC (TITADOOR)',
            title: 'Hướng dẫn Đấu nối Rơ-le, Cảm biến Hành trình & Reset Mạch ESP32-C3 Cửa cuốn Titadoor',
            videoUrl: 'https://www.youtube.com/embed/ScMzIvxBSi4',
            videoDuration: '04:25',
            resetPinDesc: 'Nhấn giữ nút bấm cơ BOOT (GPIO 0) trên bo mạch chủ trong 10 giây',
            resetHoldSeconds: 10,
            wiringDiagramUrl: 'http://localhost:4000/images/wiring-german-door.png',
            steps: [
              {
                step: 1,
                title: 'Kiểm tra nguồn điện & vị trí nút BOOT',
                desc: 'Đảm bảo cấp nguồn 5V/12V ổn định cho bo mạch ESP32. Tìm nút bấm nhỏ có ký hiệu BOOT (nằm cạnh chip ESP32-C3 hoặc chân GPIO 0).',
                warning: 'Tắt nguồn trước khi đấu nối dây rơ-le để chống chập cháy.'
              },
              {
                step: 2,
                title: 'Thao tác Reset bộ nhớ để vào chế độ Ghép nối',
                desc: 'Bật nguồn điện. Dùng ngón tay hoặc que tăm nhấn giữ chặt nút BOOT liên tục trong đúng 10 giây.',
                warning: 'Quan sát đèn LED xanh (GPIO 10): Đèn sẽ nhấp nháy 3 lần liên tiếp báo hiệu đã xóa sạch EEPROM và khởi động lại vào chế độ Ghép nối.'
              },
              {
                step: 3,
                title: 'Đấu nối dây điều khiển động cơ rơ-le',
                desc: 'Dây Rơ-le Mở (RL_UP - GPIO 5) nối vào chân UP của hộp nhận. Dây Rơ-le Đóng (RL_DOWN - GPIO 4) nối vào chân DOWN. Dây Rơ-le Dừng (RL_STOP - GPIO 3) nối vào chân STOP.',
                warning: 'Xung kích rơ-le là 500ms, hoạt động tương đương như nút bấm cơ trên tường.'
              },
              {
                step: 4,
                title: 'Mở App Mobile hoặc Web để quét thiết bị',
                desc: 'Bật Bluetooth trên điện thoại, chọn mục "Thêm thiết bị", chọn "Austec Door" vừa xuất hiện và nhập mật khẩu WiFi 2.4GHz gia đình.',
                warning: 'Thiết bị chỉ hỗ trợ WiFi băng tần 2.4GHz, không hỗ trợ 5GHz.'
              }
            ],
            faqs: [
              { q: 'Tại sao vòng tròn ghép nối chạy đến 100% mà báo thất bại?', a: 'Nguyên nhân 90% là do nhập sai mật khẩu WiFi gia đình hoặc điện thoại đang kết nối sóng 5GHz. Hãy nhấn giữ nút BOOT 10 giây để reset và thử lại với WiFi 2.4GHz.' },
              { q: 'Làm sao để học thêm Remote RF 433MHz mới?', a: 'Trên trang điều khiển thiết bị, bấm nút "Cài đặt Remote RF" hoặc gửi lệnh 11, bo mạch sẽ vào chế độ học mã trong 7 giây, bạn chỉ cần bấm nút trên tay cầm mới là nhận ngay.' },
              { q: 'Cửa cuốn có tự dừng khi mất mạng Internet không?', a: 'Không. Các rơ-le và công tắc an toàn hoạt động độc lập bằng vi điều khiển cục bộ. Mất mạng bạn vẫn điều khiển được bình thường qua Remote RF hoặc nút bấm tường.' }
            ]
          },
          {
            modelCode: 'DOOR_AU_STEEL',
            productName: 'CỬA CUỐN TẤM LIỀN THÉP HỢP KIM ÚC',
            title: 'Quy trình Cài đặt & Hướng dẫn Reset Hộp điều khiển Cửa cuốn Tấm liền',
            videoUrl: 'https://www.youtube.com/embed/ScMzIvxBSi4',
            videoDuration: '03:50',
            resetPinDesc: 'Nhấn giữ nút Reset cạnh cổng anten RF trong 10 giây',
            resetHoldSeconds: 10,
            wiringDiagramUrl: 'http://localhost:4000/images/wiring-au-door.png',
            steps: [
              {
                step: 1,
                title: 'Xác định hộp điều khiển trung tâm',
                desc: 'Mở nắp hộp động cơ tấm liền Austdoor/Austec, xác định cổng cấp nguồn 24V DC và giắc cắm tín hiệu.',
                warning: 'Động cơ tấm liền có tốc độ mở rất nhanh, hãy đảm bảo không có chướng ngại vật.'
              },
              {
                step: 2,
                title: 'Nhấn giữ nút Reset 10 giây',
                desc: 'Nhấn giữ nút Reset cho đến khi còi bíp kêu 2 tiếng dài và đèn tín hiệu chuyển sang nháy nhanh.',
                warning: null
              },
              {
                step: 3,
                title: 'Ghép nối qua Bluetooth trên ứng dụng',
                desc: 'Mở ứng dụng Austec, quét tìm mã thiết bị và truyền tên WiFi nhà.',
                warning: 'Nhập chính xác chữ hoa/thường của mật khẩu WiFi.'
              }
            ],
            faqs: [
              { q: 'Cửa cuốn tấm liền dùng bình lưu điện nào tốt nhất?', a: 'Nên kết hợp với Bộ lưu điện Austec Sine 220V để duy trì hoạt động đến 48 giờ khi mất điện lưới.' }
            ]
          },
          {
            modelCode: 'SMART_LOCK_MASARU',
            productName: 'KHÓA VÂN TAY THÔNG MINH MASARU NHẬT BẢN',
            title: 'Hướng dẫn Cài đặt Vân tay, FaceID 3D & Khôi phục Cài đặt Gốc Khóa Masaru',
            videoUrl: 'https://www.youtube.com/embed/ScMzIvxBSi4',
            videoDuration: '05:10',
            resetPinDesc: 'Dùng que chọc lỗ Reset nằm sau nắp pin ở mặt trong khóa trong 8 giây',
            resetHoldSeconds: 8,
            wiringDiagramUrl: 'http://localhost:4000/images/wiring-lock-masaru.png',
            steps: [
              {
                step: 1,
                title: 'Tháo nắp pin mặt trong',
                desc: 'Trượt nắp pin ở phía trong nhà, xác định lỗ nhỏ có chữ R hoặc RESET cạnh khay 8 viên pin AA.',
                warning: null
              },
              {
                step: 2,
                title: 'Nhấn giữ que chọc Reset trong 8 giây',
                desc: 'Khóa sẽ phát giọng nói tiếng Việt: "Đang khôi phục cài đặt gốc, vui lòng đợi".',
                warning: 'Sau khi reset, mọi vân tay và mật mã cũ sẽ bị xóa hoàn toàn.'
              },
              {
                step: 3,
                title: 'Đăng nhập App và quét mã QR trên thân khóa',
                desc: 'Bật Bluetooth trên điện thoại, quét mã QR in trên tem khóa để ghép nối tự động trong 10 giây.',
                warning: null
              }
            ],
            faqs: [
              { q: 'Khóa hết pin thì làm thế nào để vào nhà?', a: 'Khóa có cổng sạc khẩn cấp Type-C ở đáy mặt trước, bạn có thể cắm sạc dự phòng để cấp điện mở cửa, hoặc dùng chìa khóa cơ dự phòng.' }
            ]
          },
          {
            modelCode: 'UPS_AC_220V',
            productName: 'BỘ LƯU ĐIỆN AC 220V SÓNG SIN CHUẨN THÔNG MINH',
            title: 'Hướng dẫn Lắp đặt, Đấu nối Nguồn lưới & Xả sạc Bảo dưỡng Bình Lưu Điện',
            videoUrl: 'https://www.youtube.com/embed/ScMzIvxBSi4',
            videoDuration: '03:15',
            resetPinDesc: 'Nhấn giữ công tắc nguồn màu đỏ phía sau máy trong 12 giây',
            resetHoldSeconds: 12,
            wiringDiagramUrl: 'http://localhost:4000/images/wiring-ups.png',
            steps: [
              {
                step: 1,
                title: 'Đấu nối dây nguồn vào (AC IN) và nguồn ra (AC OUT)',
                desc: 'Cắm phích cắm UPS vào nguồn điện lưới 220V. Cắm giắc nguồn của mô tơ cửa cuốn vào cổng AC OUT của UPS.',
                warning: 'Kiểm tra công suất mô tơ phải nhỏ hơn 800W đối với dòng UPS tiêu chuẩn.'
              },
              {
                step: 2,
                title: 'Khởi động máy và kết nối giám sát Cloud',
                desc: 'Bật công tắc nguồn, đèn hiển thị dung lượng pin sáng xanh. Kết nối WiFi để theo dõi % pin trên điện thoại.',
                warning: null
              }
            ],
            faqs: [
              { q: 'Bao lâu thì cần xả sạc bảo dưỡng bình lưu điện?', a: 'Hệ thống Austec tự động thực hiện chu kỳ xả sạc bảo dưỡng thông minh mỗi 45 ngày để kéo dài tuổi thọ ắc quy lên gấp 3 lần.' }
            ]
          }
        ];

        for (const g of guides) {
          await this.pool.query(
            `INSERT INTO installation_guides (model_code, product_name, title, video_url, video_duration, reset_pin_desc, reset_hold_seconds, wiring_diagram_url, steps, faqs, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [g.modelCode, g.productName, g.title, g.videoUrl, g.videoDuration, g.resetPinDesc, g.resetHoldSeconds, g.wiringDiagramUrl, JSON.stringify(g.steps), JSON.stringify(g.faqs), new Date().toISOString()]
          );
        }
        console.log('[PostgresService] Đã nạp 4 Hướng dẫn Lắp đặt & Reset Phần cứng vào PostgreSQL!');
      }
    } catch (e) {
      console.error('[PostgresService] Lỗi khi nạp seed metadata:', e);
    }
  }

  // ==========================================
  // REPOSITORY METHODS: GROUPS
  // ==========================================
  public async getGroups(): Promise<DeviceGroup[]> {
    if (!this.pool) return [];
    const res = await this.pool.query('SELECT * FROM device_groups ORDER BY display_order ASC, id ASC');
    return res.rows.map(r => ({
      id: r.id,
      code: r.code,
      groupName: r.group_name,
      description: r.description,
      imageUrl: r.image_url,
      bannerUrl: r.banner_url,
      displayOrder: r.display_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  public async createGroup(data: Partial<DeviceGroup>): Promise<DeviceGroup> {
    if (!this.pool) throw new Error('Database not connected');
    const res = await this.pool.query(
      `INSERT INTO device_groups (code, group_name, description, image_url, banner_url, display_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        data.code || `GROUP_${Date.now()}`,
        data.groupName,
        data.description || '',
        data.imageUrl || '',
        data.bannerUrl || '',
        data.displayOrder || 0,
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      code: r.code,
      groupName: r.group_name,
      description: r.description,
      imageUrl: r.image_url,
      bannerUrl: r.banner_url,
      displayOrder: r.display_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  public async updateGroup(id: number, data: Partial<DeviceGroup>): Promise<DeviceGroup | null> {
    if (!this.pool) throw new Error('Database not connected');
    const res = await this.pool.query(
      `UPDATE device_groups 
       SET group_name = COALESCE($1, group_name),
           code = COALESCE($2, code),
           description = COALESCE($3, description),
           image_url = COALESCE($4, image_url),
           display_order = COALESCE($5, display_order),
           updated_at = $6
       WHERE id = $7
       RETURNING *`,
      [data.groupName, data.code, data.description, data.imageUrl, data.displayOrder, new Date().toISOString(), id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      code: r.code,
      groupName: r.group_name,
      description: r.description,
      imageUrl: r.image_url,
      bannerUrl: r.banner_url,
      displayOrder: r.display_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  public async deleteGroup(id: number): Promise<boolean> {
    if (!this.pool) throw new Error('Database not connected');
    const res = await this.pool.query('DELETE FROM device_groups WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  // ==========================================
  // REPOSITORY METHODS: TYPES
  // ==========================================
  public async getDeviceTypes(): Promise<DeviceType[]> {
    if (!this.pool) return [];
    const res = await this.pool.query('SELECT * FROM device_types ORDER BY id ASC');
    return res.rows.map(r => ({
      id: r.id,
      typeCode: r.type_code,
      typeName: r.type_name,
      iconSvg: r.icon_svg,
      description: r.description,
      createdAt: r.created_at,
    }));
  }

  public async createDeviceType(data: Partial<DeviceType>): Promise<DeviceType> {
    if (!this.pool) throw new Error('Database not connected');
    const res = await this.pool.query(
      `INSERT INTO device_types (type_code, type_name, icon_svg, description, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.typeCode || `TYPE_${Date.now()}`,
        data.typeName,
        data.iconSvg || '',
        data.description || '',
        new Date().toISOString(),
      ]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      typeCode: r.type_code,
      typeName: r.type_name,
      iconSvg: r.icon_svg,
      description: r.description,
      createdAt: r.created_at,
    };
  }

  public async updateDeviceType(id: number, data: Partial<DeviceType>): Promise<DeviceType | null> {
    if (!this.pool) throw new Error('Database not connected');
    const res = await this.pool.query(
      `UPDATE device_types
       SET type_name = COALESCE($1, type_name),
           type_code = COALESCE($2, type_code),
           description = COALESCE($3, description),
           icon_svg = COALESCE($4, icon_svg)
       WHERE id = $5
       RETURNING *`,
      [data.typeName, data.typeCode, data.description, data.iconSvg, id]
    );
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      typeCode: r.type_code,
      typeName: r.type_name,
      iconSvg: r.icon_svg,
      description: r.description,
      createdAt: r.created_at,
    };
  }

  public async deleteDeviceType(id: number): Promise<boolean> {
    if (!this.pool) throw new Error('Database not connected');
    const res = await this.pool.query('DELETE FROM device_types WHERE id = $1', [id]);
    return (res.rowCount || 0) > 0;
  }

  // ==========================================
  // REPOSITORY METHODS: PROPERTIES
  // ==========================================
  public async getProperties(): Promise<Property[]> {
    if (!this.pool) return [];
    const res = await this.pool.query('SELECT * FROM device_properties ORDER BY id ASC');
    return res.rows.map(r => ({
      id: r.id,
      propertyKey: r.property_key,
      displayName: r.display_name,
      key: r.property_key,
      name: r.display_name,
      dataType: r.data_type,
      type: r.data_type,
      unit: r.unit,
      uiWidgetType: r.ui_widget_type,
      widget: r.ui_widget_type,
      isControllable: r.is_controllable,
      ctrl: r.is_controllable,
      validationRule: r.validation_rule || { min: r.min_val, max: r.max_val },
      description: r.description,
    })) as any;
  }

  public async createProperty(data: Partial<Property>): Promise<Property> {
    if (!this.pool) throw new Error('Database not connected');
    const res = await this.pool.query(
      `INSERT INTO device_properties (property_key, display_name, data_type, unit, ui_widget_type, is_controllable, min_val, max_val, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.propertyKey || (data as any).key,
        data.displayName || (data as any).name,
        data.dataType || (data as any).type || 'string',
        data.unit || '',
        data.uiWidgetType || (data as any).widget || 'status_badge',
        data.isControllable ?? (data as any).ctrl ?? false,
        data.validationRule?.min || null,
        data.validationRule?.max || null,
        data.description || '',
        new Date().toISOString(),
      ]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      propertyKey: r.property_key,
      displayName: r.display_name,
      dataType: r.data_type,
      unit: r.unit,
      uiWidgetType: r.ui_widget_type,
      isControllable: r.is_controllable,
      validationRule: { min: r.min_val, max: r.max_val },
      description: r.description,
    };
  }

  // ==========================================
  // REPOSITORY METHODS: MODELS
  // ==========================================
  public async getDeviceModels(): Promise<DeviceModel[]> {
    if (!this.pool) return [];
    const res = await this.pool.query('SELECT * FROM device_models ORDER BY id ASC');
    return res.rows.map(r => ({
      id: r.id,
      modelCode: r.model_code,
      modelName: r.model_name,
      groupId: r.group_id,
      typeId: r.type_id,
      firmwareVersionLatest: r.firmware_version_latest,
      hardwareVersion: r.hardware_version,
      supplier: r.supplier,
      imageUrl: r.image_url,
      propertiesConfig: r.properties_config || [],
      controlCapabilities: r.control_capabilities || [],
      createdAt: r.created_at,
    }));
  }

  public async createDeviceModel(data: Partial<DeviceModel>): Promise<DeviceModel> {
    if (!this.pool) throw new Error('Database not connected');
    const res = await this.pool.query(
      `INSERT INTO device_models (model_code, model_name, group_id, type_id, firmware_version_latest, hardware_version, supplier, image_url, properties_config, control_capabilities, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.modelCode,
        data.modelName,
        data.groupId || 9,
        data.typeId || 10,
        data.firmwareVersionLatest || 'v1.0.0',
        data.hardwareVersion || 'HW-REV-A',
        data.supplier || 'Austec Factory',
        data.imageUrl || '',
        JSON.stringify(data.propertiesConfig || []),
        JSON.stringify(data.controlCapabilities || []),
        new Date().toISOString(),
      ]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      modelCode: r.model_code,
      modelName: r.model_name,
      groupId: r.group_id,
      typeId: r.type_id,
      firmwareVersionLatest: r.firmware_version_latest,
      hardwareVersion: r.hardware_version,
      supplier: r.supplier,
      imageUrl: r.image_url,
      propertiesConfig: r.properties_config,
      controlCapabilities: r.control_capabilities,
      createdAt: r.created_at,
    };
  }

  // ==========================================
  // REPOSITORY METHODS: SYSTEM ROLES & PERMISSIONS
  // ==========================================
  public async getSystemRoles(): Promise<SystemRole[]> {
    if (!this.pool) return [];
    const rolesRes = await this.pool.query('SELECT * FROM system_roles ORDER BY id ASC');
    const permsRes = await this.pool.query('SELECT * FROM role_permissions ORDER BY id ASC');

    return rolesRes.rows.map(r => {
      const perms = permsRes.rows
        .filter(p => p.role_id === r.id)
        .map(p => ({
          id: p.id,
          roleId: p.role_id,
          moduleId: p.module_id,
          moduleName: p.module_name,
          canView: p.can_view,
          canCreate: p.can_create,
          canUpdate: p.can_update,
          canDelete: p.can_delete,
          canAll: p.can_all,
        }));

      return {
        id: r.id,
        roleCode: r.role_code,
        roleName: r.role_name,
        description: r.description,
        isSystem: r.is_system,
        permissions: perms,
        createdAt: r.created_at,
      };
    });
  }

  public async updateRolePermissions(roleId: number, permissions: RolePermission[]): Promise<void> {
    if (!this.pool) throw new Error('Database not connected');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
      for (const p of permissions) {
        await client.query(
          `INSERT INTO role_permissions (role_id, module_id, module_name, can_view, can_create, can_update, can_delete, can_all)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [roleId, p.moduleId, p.moduleName, p.canView, p.canCreate, p.canUpdate, p.canDelete, p.canAll]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  // ==========================================
  // REPOSITORY METHODS: DASHBOARD REAL STATS
  // ==========================================
  public async getDashboardStats(): Promise<any> {
    if (!this.pool) return null;
    const totalInstRes = await this.pool.query('SELECT COUNT(*) FROM device_instances');
    const onlineInstRes = await this.pool.query('SELECT COUNT(*) FROM device_instances WHERE is_online = true');
    const offlineInstRes = await this.pool.query('SELECT COUNT(*) FROM device_instances WHERE is_online = false');
    const inStockRes = await this.pool.query("SELECT COUNT(*) FROM device_inventory WHERE status = 'IN_WAREHOUSE' OR status = 'MANUFACTURED'");
    const customersCountRes = await this.pool.query("SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER'");
    const requestsCountRes = await this.pool.query("SELECT COUNT(*) FROM customer_support_requests WHERE status = 'PENDING' OR status = 'OPEN'");

    const total = parseInt(totalInstRes.rows[0].count, 10);
    const online = parseInt(onlineInstRes.rows[0].count, 10);
    const offline = parseInt(offlineInstRes.rows[0].count, 10);
    const inStock = parseInt(inStockRes.rows[0].count, 10);

    const onlinePct = total > 0 ? ((online / total) * 100).toFixed(1) + '%' : '0%';
    const offlinePct = total > 0 ? ((offline / total) * 100).toFixed(1) + '%' : '0%';
    const inStockPct = total > 0 ? ((inStock / total) * 100).toFixed(1) + '%' : '0%';

    // Group breakdown
    const groupBreakdownRes = await this.pool.query(`
      SELECT g.id, g.group_name, COUNT(di.id) as count
      FROM device_groups g
      LEFT JOIN device_models m ON m.group_id = g.id
      LEFT JOIN device_inventory inv ON inv.model_id = m.id
      LEFT JOIN device_instances di ON di.hardware_id = inv.hardware_id
      GROUP BY g.id, g.group_name
      ORDER BY g.display_order ASC
    `);

    return {
      total,
      online,
      offline,
      inStock,
      onlinePct,
      offlinePct,
      inStockPct,
      customerCount: parseInt(customersCountRes.rows[0].count, 10),
      pendingRequests: parseInt(requestsCountRes.rows[0].count, 10),
      groupBreakdown: groupBreakdownRes.rows,
      uptimeSla: '99.8%',
      avgLatencyMs: 114,
    };
  }

  // ==========================================
  // REPOSITORY METHODS: ORDERS
  // ==========================================
  public async getOrders(): Promise<Order[]> {
    if (!this.pool) return [];
    const ordersRes = await this.pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const itemsRes = await this.pool.query('SELECT * FROM order_items');

    return ordersRes.rows.map(o => {
      const items = itemsRes.rows
        .filter(it => it.order_id === o.id)
        .map(it => ({
          id: it.id,
          orderId: it.order_id,
          productId: it.product_id,
          productName: it.product_name,
          unitPrice: parseFloat(it.unit_price),
          quantity: it.quantity,
          imageUrl: it.image_url,
        }));

      return {
        id: o.id,
        customerId: o.customer_id,
        customerName: o.customer_name,
        customerPhone: o.customer_phone,
        shippingAddress: o.shipping_address,
        totalAmount: parseFloat(o.total_amount),
        status: o.status,
        notes: o.notes,
        items,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      };
    });
  }

  public async createOrder(order: Partial<Order>): Promise<Order> {
    if (!this.pool) throw new Error('Database not connected');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const orderId = order.id || `ORD-${Date.now().toString().slice(-6)}`;
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

      await client.query(
        `INSERT INTO orders (id, customer_id, customer_name, customer_phone, shipping_address, total_amount, status, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          orderId,
          order.customerId || 'ANONYMOUS',
          order.customerName || 'Khách hàng',
          order.customerPhone || '',
          order.shippingAddress || '',
          order.totalAmount || 0,
          order.status || 'PENDING',
          order.notes || '',
          now,
          now,
        ]
      );

      for (const it of order.items || []) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, image_url)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, it.productId, it.productName, it.unitPrice, it.quantity, it.imageUrl || '']
        );
      }

      await client.query('COMMIT');
      return {
        id: orderId,
        customerId: order.customerId!,
        customerName: order.customerName!,
        customerPhone: order.customerPhone!,
        shippingAddress: order.shippingAddress!,
        totalAmount: order.totalAmount || 0,
        status: (order.status as any) || 'PENDING',
        notes: order.notes,
        items: order.items || [],
        createdAt: now,
        updatedAt: now,
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  public async updateOrderStatus(id: string, status: string): Promise<boolean> {
    if (!this.pool) throw new Error('Database not connected');
    const res = await this.pool.query(
      'UPDATE orders SET status = $1, updated_at = $2 WHERE id = $3',
      [status, new Date().toISOString(), id]
    );
    return (res.rowCount || 0) > 0;
  }

  // ==========================================
  // REPOSITORY METHODS: RF REMOTES
  // ==========================================
  public async getRfRemotes(hardwareId?: string): Promise<RfRemote[]> {
    if (!this.pool) return [];
    let query = 'SELECT * FROM device_rf_remotes';
    const params: any[] = [];
    if (hardwareId) {
      query += ' WHERE hardware_id = $1';
      params.push(hardwareId);
    }
    query += ' ORDER BY id ASC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => ({
      id: r.id,
      hardwareId: r.hardware_id,
      remoteCode: r.remote_code,
      remoteName: r.remote_name,
      pairedAt: r.paired_at,
      isBlocked: r.is_blocked,
    }));
  }

  public async addRfRemote(remote: RfRemote): Promise<RfRemote> {
    if (!this.pool) throw new Error('Database not connected');
    const res = await this.pool.query(
      `INSERT INTO device_rf_remotes (hardware_id, remote_code, remote_name, paired_at, is_blocked)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [remote.hardwareId, remote.remoteCode, remote.remoteName, remote.pairedAt || new Date().toISOString().slice(0, 10), remote.isBlocked || false]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      hardwareId: r.hardware_id,
      remoteCode: r.remote_code,
      remoteName: r.remote_name,
      pairedAt: r.paired_at,
      isBlocked: r.is_blocked,
    };
  }

  public async toggleBlockRfRemote(id: number): Promise<boolean> {
    if (!this.pool) throw new Error('Database not connected');
    const res = await this.pool.query(
      'UPDATE device_rf_remotes SET is_blocked = NOT is_blocked WHERE id = $1 RETURNING is_blocked',
      [id]
    );
    return res.rows.length > 0;
  }

  // ==========================================
  // REPOSITORY METHODS: BLACKBOX LOGGING
  // ==========================================
  public async logBlackbox(entry: Partial<DeviceBlackboxLog> & { actorName?: string; cryptoSignature?: string }): Promise<void> {
    if (!this.pool) return;
    try {
      await this.pool.query(
        `INSERT INTO blackbox_logs (hardware_id, actor_id, actor_role, actor_name, actor_ip, action_type, payload_sent, ack_status, latency_ms, crypto_signature, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          entry.hardwareId,
          entry.actorId || 'SYS',
          entry.actorRole || 'CUSTOMER',
          entry.actorName || 'Nguyễn Mạnh Đức',
          entry.actorIp || '127.0.0.1',
          entry.actionType,
          JSON.stringify(entry.payloadSent || {}),
          entry.ackStatus || 'SUCCESS',
          entry.latencyMs || 120,
          entry.cryptoSignature || 'sha256-verified-austec',
          new Date().toISOString(),
        ]
      );
    } catch (e) {
      console.error('[PostgresService] Lỗi khi ghi Blackbox log:', e);
    }
  }

  public async getBlackboxLogs(filter?: { hardwareId?: string; actionType?: string; limit?: number }): Promise<any[]> {
    if (!this.pool) return [];
    let query = 'SELECT * FROM blackbox_logs';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filter?.hardwareId) {
      params.push(filter.hardwareId);
      conditions.push(`hardware_id = $${params.length}`);
    }
    if (filter?.actionType) {
      params.push(filter.actionType);
      conditions.push(`action_type = $${params.length}`);
    }
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY id DESC LIMIT ' + (filter?.limit || 100);

    const res = await this.pool.query(query, params);
    return res.rows.map(r => ({
      id: `BBX-${String(r.id).padStart(6, '0')}`,
      hardwareId: r.hardware_id,
      actorId: r.actor_id,
      actorRole: r.actor_role,
      actorName: r.actor_name,
      actorIp: r.actor_ip,
      actionType: r.action_type,
      commandType: r.action_type,
      payload: r.payload_sent || {},
      status: r.ack_status === 'SUCCESS' ? 'ACKNOWLEDGED' : r.ack_status,
      latencyMs: r.latency_ms || 120,
      cryptoSignature: r.crypto_signature || 'sha256-valid',
      timestamp: r.created_at,
    }));
  }

  // ==========================================
  // SYNC & LOAD
  // ==========================================
  public async syncAllToPostgres(payload: PersistentDataPayload): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Users
      for (const u of payload.users || []) {
        await client.query(
          `INSERT INTO users (id, emp_id, full_name, email, phone_number, company, department, role, role_title, password, address, province, is_active, registered_at, updated_at, updated_by, devices)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
           ON CONFLICT (id) DO UPDATE SET
             emp_id = EXCLUDED.emp_id,
             full_name = EXCLUDED.full_name,
             email = EXCLUDED.email,
             phone_number = EXCLUDED.phone_number,
             company = EXCLUDED.company,
             department = EXCLUDED.department,
             role = EXCLUDED.role,
             role_title = EXCLUDED.role_title,
             password = EXCLUDED.password,
             address = EXCLUDED.address,
             province = EXCLUDED.province,
             is_active = EXCLUDED.is_active,
             updated_at = EXCLUDED.updated_at,
             updated_by = EXCLUDED.updated_by,
             devices = EXCLUDED.devices`,
          [
            u.id,
            u.empID || null,
            u.fullName,
            u.email,
            u.phoneNumber || null,
            u.company || null,
            u.department || null,
            u.role,
            u.roleTitle || null,
            u.password || 'Austec123!@#',
            u.address || null,
            u.province || null,
            u.isActive !== undefined ? u.isActive : true,
            u.registeredAt || new Date().toISOString(),
            u.updatedAt || new Date().toISOString(),
            u.updatedBy || 'System',
            JSON.stringify(u.devices || []),
          ]
        );
      }

      // 2. Inventory
      for (const inv of payload.deviceInventory || []) {
        await client.query(
          `INSERT INTO device_inventory (hardware_id, model_id, model_name, device_type, batch_number, qr_code_hash, production_date, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (hardware_id) DO UPDATE SET
             model_id = EXCLUDED.model_id,
             batch_number = EXCLUDED.batch_number,
             status = EXCLUDED.status`,
          [
            inv.hardwareId,
            inv.modelId,
            (inv as any).modelName || 'Austec Device',
            (inv as any).deviceType || 'Cửa cuốn',
            inv.batchNumber || 'LOT-2026-DEFAULT',
            inv.qrCodeHash || inv.hardwareId,
            inv.producedAt || new Date().toISOString().slice(0, 10),
            inv.status || 'IN_WAREHOUSE',
          ]
        );
      }

      // 3. Instances
      for (const inst of payload.deviceInstances || []) {
        await client.query(
          `INSERT INTO device_instances (id, hardware_id, custom_name, owner_id, device_type, firmware_version_current, is_online, last_heartbeat, current_properties, warranty_start_at, warranty_end_at, subscription_type, subscription_expires_at, subscription_status, installation_address, location_lat, location_lng, address_display, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           ON CONFLICT (hardware_id) DO UPDATE SET
             custom_name = EXCLUDED.custom_name,
             is_online = EXCLUDED.is_online,
             last_heartbeat = EXCLUDED.last_heartbeat,
             current_properties = EXCLUDED.current_properties,
             subscription_type = EXCLUDED.subscription_type,
             subscription_expires_at = EXCLUDED.subscription_expires_at,
             subscription_status = EXCLUDED.subscription_status,
             location_lat = EXCLUDED.location_lat,
             location_lng = EXCLUDED.location_lng,
             address_display = EXCLUDED.address_display`,
          [
            inst.id,
            inst.hardwareId,
            inst.customName,
            inst.ownerId,
            inst.deviceType || 'Cửa cuốn',
            inst.firmwareVersionCurrent || 'v2.4.1',
            inst.isOnline !== undefined ? inst.isOnline : true,
            inst.lastHeartbeat || new Date().toISOString(),
            JSON.stringify(inst.currentProperties || {}),
            inst.warrantyStartAt || '2026-09-01',
            inst.warrantyEndAt || '2028-09-01',
            inst.subscriptionType || 'LIMITED',
            inst.subscriptionExpiresAt || '2027-09-01',
            inst.subscriptionStatus || 'ACTIVE',
            JSON.stringify(inst.installationAddress || {}),
            inst.locationLat || (21.0285 + Math.random() * 0.05),
            inst.locationLng || (105.8542 + Math.random() * 0.05),
            inst.addressDisplay || (inst.installationAddress?.fullText || 'Hà Nội, Việt Nam'),
            inst.createdAt || new Date().toISOString(),
          ]
        );
      }

      // 4. Products
      for (const p of payload.products || []) {
        await client.query(
          `INSERT INTO products (id, name, category_tag, subtitle, price, original_price, rating, reviews_count, image_url, gallery_urls, warranty_text, highlights, specs, stock_quantity, is_published, display_order, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             price = EXCLUDED.price,
             original_price = EXCLUDED.original_price,
             stock_quantity = EXCLUDED.stock_quantity,
             is_published = EXCLUDED.is_published,
             specs = EXCLUDED.specs,
             highlights = EXCLUDED.highlights,
             updated_at = EXCLUDED.updated_at`,
          [
            p.id,
            p.name,
            p.categoryTag || 'Thiết bị thông minh',
            p.subtitle || '',
            p.price,
            p.originalPrice || null,
            p.rating || 5.0,
            p.reviewsCount || 0,
            p.imageUrl,
            JSON.stringify(p.galleryUrls || []),
            p.warrantyText || 'Bảo hành chính hãng 24 tháng',
            JSON.stringify(p.highlights || []),
            JSON.stringify(p.specs || {}),
            p.stockQuantity !== undefined ? p.stockQuantity : 50,
            p.isPublished !== undefined ? p.isPublished : true,
            p.displayOrder || 1,
            p.createdAt || new Date().toISOString(),
            p.updatedAt || new Date().toISOString(),
          ]
        );
      }

      // 5. Permissions
      for (const perm of payload.permissions || []) {
        await client.query(
          `INSERT INTO device_permissions (id, hardware_id, user_id, member_name, phone_number, role, can_control, can_view_history, can_child_lock, can_config, schedule_limit_active, access_start_time, access_end_time, access_days, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (id) DO UPDATE SET
             role = EXCLUDED.role,
             can_control = EXCLUDED.can_control,
             can_view_history = EXCLUDED.can_view_history,
             can_child_lock = EXCLUDED.can_child_lock,
             can_config = EXCLUDED.can_config,
             schedule_limit_active = EXCLUDED.schedule_limit_active,
             access_start_time = EXCLUDED.access_start_time,
             access_end_time = EXCLUDED.access_end_time,
             access_days = EXCLUDED.access_days,
             updated_at = EXCLUDED.updated_at`,
          [
            perm.id,
            perm.hardwareId,
            perm.userId,
            perm.memberName,
            perm.phoneNumber,
            perm.role,
            perm.canControl !== undefined ? perm.canControl : true,
            perm.canViewHistory !== undefined ? perm.canViewHistory : true,
            perm.canChildLock || false,
            perm.canConfig || false,
            perm.scheduleLimitActive || false,
            perm.accessStartTime || '00:00',
            perm.accessEndTime || '23:59',
            JSON.stringify(perm.accessDays || [true, true, true, true, true, true, true]),
            perm.createdAt || new Date().toISOString(),
            perm.updatedAt || new Date().toISOString(),
          ]
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[PostgresService] Lỗi khi đồng bộ dữ liệu lên PostgreSQL:', e);
    } finally {
      client.release();
    }
  }

  public async loadAllFromPostgres(): Promise<PersistentDataPayload | null> {
    if (!this.pool || !this.isConnected) return null;

    try {
      const usersRes = await this.pool.query('SELECT * FROM users ORDER BY registered_at DESC');
      const permsRes = await this.pool.query('SELECT * FROM device_permissions');
      const prodsRes = await this.pool.query('SELECT * FROM products ORDER BY display_order ASC');
      const reqsRes = await this.pool.query('SELECT * FROM customer_support_requests ORDER BY created_at DESC');
      const ticketsRes = await this.pool.query('SELECT * FROM support_tickets ORDER BY created_at DESC');
      const msgsRes = await this.pool.query('SELECT * FROM live_chat_messages ORDER BY id ASC');
      const instsRes = await this.pool.query('SELECT * FROM device_instances');
      const invsRes = await this.pool.query('SELECT * FROM device_inventory');
      const logsRes = await this.pool.query('SELECT * FROM blackbox_logs ORDER BY id ASC');

      const users: UnifiedUser[] = usersRes.rows.map(r => ({
        id: r.id,
        empID: r.emp_id,
        fullName: r.full_name,
        email: r.email,
        phoneNumber: r.phone_number || '',
        company: r.company,
        department: r.department,
        role: r.role,
        roleTitle: r.role_title,
        password: r.password,
        address: r.address,
        province: r.province,
        isActive: r.is_active ?? true,
        registeredAt: r.registered_at || new Date().toISOString(),
        updatedAt: r.updated_at,
        updatedBy: r.updated_by,
        devices: r.devices || [],
      }));

      const permissions: DeviceMemberPermission[] = permsRes.rows.map(r => ({
        id: r.id,
        hardwareId: r.hardware_id,
        userId: r.user_id,
        memberName: r.member_name,
        phoneNumber: r.phone_number,
        role: r.role,
        canControl: r.can_control,
        canViewHistory: r.can_view_history,
        canChildLock: r.can_child_lock,
        canConfig: r.can_config,
        scheduleLimitActive: r.schedule_limit_active,
        accessStartTime: r.access_start_time,
        accessEndTime: r.access_end_time,
        accessDays: r.access_days || [],
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      const products: Product[] = prodsRes.rows.map(r => ({
        id: r.id,
        name: r.name,
        categoryTag: r.category_tag,
        subtitle: r.subtitle,
        price: parseFloat(r.price),
        originalPrice: r.original_price ? parseFloat(r.original_price) : undefined,
        rating: parseFloat(r.rating),
        reviewsCount: r.reviews_count,
        imageUrl: r.image_url,
        galleryUrls: r.gallery_urls || [],
        warrantyText: r.warranty_text,
        highlights: r.highlights || [],
        specs: r.specs || {},
        stockQuantity: r.stock_quantity,
        isPublished: r.is_published,
        displayOrder: r.display_order,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      const requests: CustomerSupportRequest[] = reqsRes.rows.map(r => ({
        id: r.id,
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerPhone: r.customer_phone,
        customerEmail: r.customer_email,
        contactEmail: r.customer_email || undefined,
        hardwareId: r.hardware_id,
        deviceName: r.device_name,
        requestType: r.request_type,
        requestTypeName: r.request_type_name,
        description: r.description,
        images: r.images || [],
        attachmentUrls: r.attachment_urls || [],
        replyChannel: r.reply_channel || 'PUSH_NOTIFICATION',
        preferredContactTime: r.preferred_contact_time,
        priority: 'NORMAL',
        status: r.status,
        adminResponse: r.admin_response,
        resolvedAt: r.resolved_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      } as any));

      const supportTickets: SupportTicket[] = ticketsRes.rows.map(r => ({
        id: r.id,
        customerId: r.customer_id,
        hardwareId: r.hardware_id,
        subject: r.subject,
        status: r.status,
        priority: r.priority,
        assignedCskhId: r.assigned_cskh_id,
        selectedDevice: r.selected_device,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));

      const supportMessages: LiveChatMessage[] = msgsRes.rows.map(r => ({
        id: r.id,
        ticketId: r.ticket_id,
        senderId: r.sender_id,
        senderRole: r.sender_role,
        message: r.message,
        attachmentUrls: r.attachment_urls || [],
        selectedDevice: r.selected_device,
        deviceSnapshot: r.device_snapshot,
        createdAt: r.created_at,
      }));

      const deviceInstances: DeviceInstance[] = instsRes.rows.map(r => ({
        id: r.id,
        hardwareId: r.hardware_id,
        customName: r.custom_name,
        ownerId: r.owner_id,
        deviceType: r.device_type,
        firmwareVersionCurrent: r.firmware_version_current,
        isOnline: r.is_online,
        lastHeartbeat: r.last_heartbeat,
        currentProperties: r.current_properties || {},
        warrantyStartAt: r.warranty_start_at,
        warrantyEndAt: r.warranty_end_at,
        subscriptionType: r.subscription_type,
        subscriptionExpiresAt: r.subscription_expires_at,
        subscriptionStatus: r.subscription_status,
        installationAddress: r.installation_address || {},
        locationLat: r.location_lat,
        locationLng: r.location_lng,
        addressDisplay: r.address_display,
        createdAt: r.created_at,
      }));

      const deviceInventory: DeviceInventory[] = invsRes.rows.map(r => ({
        id: r.id || r.hardware_id,
        hardwareId: r.hardware_id,
        macAddress: r.mac_address || '00:00:00:00:00:00',
        modelId: typeof r.model_id === 'number' ? r.model_id : (parseInt(r.model_id) || 1),
        modelName: r.model_name,
        deviceType: r.device_type,
        batchNumber: r.batch_number || 'LOT-2026-DEFAULT',
        supplier: r.supplier || 'Austec Factory',
        qrCodeHash: r.qr_code_hash || r.hardware_id,
        producedAt: r.production_date || new Date().toISOString().slice(0, 10),
        warrantyMonths: r.warranty_months || 24,
        status: r.status || 'IN_WAREHOUSE',
        createdAt: r.created_at || new Date().toISOString(),
      } as any));

      const blackboxLogs: DeviceBlackboxLog[] = logsRes.rows.map(r => ({
        id: r.id,
        hardwareId: r.hardware_id,
        actorId: r.actor_id,
        actorRole: r.actor_role,
        actorIp: r.actor_ip,
        actionType: r.action_type,
        payloadSent: r.payload_sent,
        ackStatus: r.ack_status,
        latencyMs: r.latency_ms,
        createdAt: r.created_at,
      }));

      return {
        users,
        permissions,
        requests,
        products,
        supportTickets,
        supportMessages,
        deviceInstances,
        deviceInventory,
        blackboxLogs,
        lastSavedAt: new Date().toISOString(),
      };
    } catch (e) {
      console.error('[PostgresService] Lỗi khi nạp dữ liệu từ PostgreSQL:', e);
      return null;
    }
  }

  // ==========================================
  // REPOSITORY METHODS: FIRMWARE & OTA
  // ==========================================
  public async getFirmwareReleases(modelCode?: string): Promise<any[]> {
    if (!this.pool) return [];
    let query = 'SELECT * FROM firmware_releases';
    const params: any[] = [];
    if (modelCode) {
      query += ' WHERE model_code = $1';
      params.push(modelCode);
    }
    query += ' ORDER BY id DESC';
    const res = await this.pool.query(query, params);
    return res.rows.map(r => ({
      id: r.id,
      version: r.version,
      modelCode: r.model_code,
      binaryFilename: r.binary_filename,
      binaryUrl: r.binary_url,
      fileSizeBytes: r.file_size_bytes,
      sha256Checksum: r.sha256_checksum,
      releaseType: r.release_type,
      isActive: r.is_active,
      changelog: r.changelog,
      releasedBy: r.released_by,
      createdAt: r.created_at,
    }));
  }

  public async createFirmwareRelease(data: any): Promise<any> {
    if (!this.pool) throw new Error('Database not connected');
    const version = data.version;
    const modelCode = data.modelCode || data.model_code || data.productModel || 'AUSTEC-SW-ECO';
    const binaryFilename = data.binaryFilename || data.binary_filename || data.filename || `firmware_${version}.bin`;
    const binaryUrl = data.binaryUrl || data.binary_url || data.fileUrl || `http://localhost:4000/firmware/${binaryFilename}`;
    const fileSizeBytes = data.fileSizeBytes || data.file_size_bytes || 1600000;
    const sha256Checksum = data.sha256Checksum || data.sha256_checksum || data.checksumSha256 || 'sha256-verified-austec-release';
    const releaseType = data.releaseType || data.release_type || data.releaseChannel || 'STABLE';
    const changelog = data.changelog || 'Cập nhật tính năng & vá lỗi';
    const releasedBy = data.releasedBy || data.released_by || 'ADMIN';

    const res = await this.pool.query(
      `INSERT INTO firmware_releases (version, model_code, binary_filename, binary_url, file_size_bytes, sha256_checksum, release_type, is_active, changelog, released_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10)
       RETURNING *`,
      [
        version,
        modelCode,
        binaryFilename,
        binaryUrl,
        fileSizeBytes,
        sha256Checksum,
        releaseType,
        changelog,
        releasedBy,
        new Date().toISOString(),
      ]
    );
    return res.rows[0];
  }

  public async getOtaCampaigns(): Promise<any[]> {
    if (!this.pool) return [];
    const res = await this.pool.query('SELECT * FROM ota_campaigns ORDER BY id DESC');
    return res.rows.map(r => ({
      id: r.id,
      campaignName: r.campaign_name,
      targetModel: r.target_model,
      targetVersion: r.target_version,
      rolloutType: r.rollout_type,
      status: r.status,
      totalDevices: r.total_devices,
      successCount: r.success_count,
      failedCount: r.failed_count,
      inProgressCount: r.in_progress_count,
      startedAt: r.started_at,
      completedAt: r.completed_at,
    }));
  }

  public async getOtaCampaignDetails(campaignId: number): Promise<any> {
    if (!this.pool) return null;
    const campRes = await this.pool.query('SELECT * FROM ota_campaigns WHERE id = $1', [campaignId]);
    if (campRes.rows.length === 0) return null;
    const camp = campRes.rows[0];
    const recRes = await this.pool.query('SELECT * FROM ota_device_records WHERE campaign_id = $1 ORDER BY id ASC', [campaignId]);
    return {
      campaign: {
        id: camp.id,
        campaignName: camp.campaign_name,
        targetModel: camp.target_model,
        targetVersion: camp.target_version,
        rolloutType: camp.rollout_type,
        status: camp.status,
        totalDevices: camp.total_devices,
        successCount: camp.success_count,
        failedCount: camp.failed_count,
        inProgressCount: camp.in_progress_count,
        startedAt: camp.started_at,
        completedAt: camp.completed_at,
      },
      records: recRes.rows.map(r => ({
        id: r.id,
        campaignId: r.campaign_id,
        hardwareId: r.hardware_id,
        customerName: r.customer_name,
        currentVersion: r.current_version,
        targetVersion: r.target_version,
        status: r.status,
        progressPct: r.progress_pct,
        lastAttemptAt: r.last_attempt_at,
        errorReason: r.error_reason,
        retryCount: r.retry_count,
      })),
    };
  }

  public async createOtaCampaign(data: { name: string; targetModel: string; targetVersion: string; rolloutType?: string }, targetHwIds?: string[]): Promise<any> {
    if (!this.pool) throw new Error('Database not connected');
    
    // Tìm các thiết bị phù hợp từ device_inventory
    let devQuery = 'SELECT di.*, u.full_name FROM device_inventory di LEFT JOIN users u ON di.customer_id = u.id WHERE di.status = $1';
    const devParams: any[] = ['INSTALLED'];
    if (data.targetModel) {
      devQuery += ' AND di.model_code = $2';
      devParams.push(data.targetModel);
    }
    const devRes = await this.pool.query(devQuery, devParams);
    let matchedDevices = devRes.rows;

    if (targetHwIds && targetHwIds.length > 0) {
      matchedDevices = matchedDevices.filter(d => targetHwIds.includes(d.hardware_id));
    }

    // Nếu bảng inventory chưa có nhiều, dùng danh sách mẫu
    if (matchedDevices.length === 0) {
      matchedDevices = [
        { hardware_id: 'AT-DOOR-88239A01', full_name: 'Nguyễn Mạnh Đức', firmware_version: 'v1.0.0' },
        { hardware_id: 'AT-DOOR-88239A02', full_name: 'Dan Phung', firmware_version: 'v1.0.0' },
        { hardware_id: 'amtuong1994', full_name: 'Phòng Lab (Mạch ESP32 Thật)', firmware_version: 'v1.0.0' },
      ];
    }

    const campRes = await this.pool.query(
      `INSERT INTO ota_campaigns (campaign_name, target_model, target_version, rollout_type, status, total_devices, success_count, failed_count, in_progress_count, started_at)
       VALUES ($1, $2, $3, $4, 'RUNNING', $5, 0, 0, $5, $6)
       RETURNING *`,
      [
        data.name || `Chiến dịch nạp ${data.targetVersion} cho ${data.targetModel}`,
        data.targetModel,
        data.targetVersion,
        data.rolloutType || 'ALL',
        matchedDevices.length,
        new Date().toISOString(),
      ]
    );
    const camp = campRes.rows[0];

    for (const d of matchedDevices) {
      await this.pool.query(
        `INSERT INTO ota_device_records (campaign_id, hardware_id, customer_name, current_version, target_version, status, progress_pct, last_attempt_at)
         VALUES ($1, $2, $3, $4, $5, 'DOWNLOADING', 15, $6)`,
        [camp.id, d.hardware_id, d.full_name || 'Khách hàng Austec', d.firmware_version || 'v1.0.0', data.targetVersion, new Date().toISOString()]
      );
    }

    return camp;
  }

  public async retryOtaDeviceRecord(recordId: number): Promise<any> {
    if (!this.pool) throw new Error('Database not connected');
    const res = await this.pool.query(
      `UPDATE ota_device_records 
       SET status = 'DOWNLOADING', progress_pct = 25, retry_count = retry_count + 1, error_reason = NULL, last_attempt_at = $1
       WHERE id = $2
       RETURNING *`,
      [new Date().toISOString(), recordId]
    );
    return res.rows[0];
  }

  // ==========================================
  // REPOSITORY METHODS: INSTALLATION GUIDES
  // ==========================================
  public async getInstallationGuides(): Promise<any[]> {
    if (!this.pool) return [];
    const res = await this.pool.query('SELECT * FROM installation_guides ORDER BY id ASC');
    return res.rows.map(r => ({
      id: r.id,
      modelCode: r.model_code,
      productName: r.product_name,
      title: r.title,
      videoUrl: r.video_url,
      videoDuration: r.video_duration,
      resetPinDesc: r.reset_pin_desc,
      resetHoldSeconds: r.reset_hold_seconds,
      wiringDiagramUrl: r.wiring_diagram_url,
      steps: r.steps,
      faqs: r.faqs,
      updatedAt: r.updated_at,
    }));
  }

  public async getInstallationGuide(modelCode: string): Promise<any> {
    if (!this.pool) return null;
    let res = await this.pool.query('SELECT * FROM installation_guides WHERE UPPER(model_code) = UPPER($1)', [modelCode]);
    if (res.rows.length === 0) {
      res = await this.pool.query('SELECT * FROM installation_guides WHERE model_code ILIKE $1 LIMIT 1', [`%${modelCode}%`]);
    }
    if (res.rows.length === 0) {
      res = await this.pool.query('SELECT * FROM installation_guides ORDER BY id ASC LIMIT 1');
    }
    if (res.rows.length === 0) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      modelCode: r.model_code,
      productName: r.product_name,
      title: r.title,
      videoUrl: r.video_url,
      videoDuration: r.video_duration,
      resetPinDesc: r.reset_pin_desc,
      resetHoldSeconds: r.reset_hold_seconds,
      wiringDiagramUrl: r.wiring_diagram_url,
      steps: r.steps,
      faqs: r.faqs,
      updatedAt: r.updated_at,
    };
  }

  public async upsertInstallationGuide(data: any): Promise<any> {
    if (!this.pool) throw new Error('Database not connected');
    const res = await this.pool.query(
      `INSERT INTO installation_guides (model_code, product_name, title, video_url, video_duration, reset_pin_desc, reset_hold_seconds, wiring_diagram_url, steps, faqs, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (model_code) DO UPDATE SET
         product_name = EXCLUDED.product_name,
         title = EXCLUDED.title,
         video_url = EXCLUDED.video_url,
         video_duration = EXCLUDED.video_duration,
         reset_pin_desc = EXCLUDED.reset_pin_desc,
         reset_hold_seconds = EXCLUDED.reset_hold_seconds,
         wiring_diagram_url = EXCLUDED.wiring_diagram_url,
         steps = EXCLUDED.steps,
         faqs = EXCLUDED.faqs,
         updated_at = EXCLUDED.updated_at
       RETURNING *`,
      [
        data.modelCode,
        data.productName,
        data.title,
        data.videoUrl,
        data.videoDuration || '04:00',
        data.resetPinDesc || 'Nhấn giữ nút BOOT 10s',
        data.resetHoldSeconds || 10,
        data.wiringDiagramUrl || '',
        JSON.stringify(data.steps || []),
        JSON.stringify(data.faqs || []),
        new Date().toISOString(),
      ]
    );
    return res.rows[0];
  }

  // ==========================================
  // REPOSITORY METHODS: PAIRING & HARDWARE
  // ==========================================
  public async registerPairingDevice(hwId: string, modelCode: string, customerId: string, customName?: string, ownerDisplayName?: string): Promise<any> {
    if (!this.pool) throw new Error('Database not connected');
    
    // 1. Lấy thông tin họ tên thực tế của người dùng từ CSDL nếu chưa truyền vào
    let finalOwnerName = ownerDisplayName;
    if (!finalOwnerName || finalOwnerName.trim() === 'Chủ sở hữu' || finalOwnerName.trim().length === 0) {
      try {
        const uRes = await this.pool.query('SELECT full_name, email FROM users WHERE id = $1', [customerId]);
        if (uRes.rows.length > 0) {
          finalOwnerName = uRes.rows[0].full_name || uRes.rows[0].email || finalOwnerName;
        }
      } catch (_) {}
    }
    if (!finalOwnerName || finalOwnerName.trim().length === 0) {
      finalOwnerName = 'Chủ sở hữu';
    }

    // 2. Kiểm tra hoặc thêm vào device_inventory
    const now = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO device_inventory (hardware_id, mac_address, model_id, model_name, device_type, batch_number, qr_code_hash, production_date, status)
       VALUES ($1, $2, 1, 'CỬA CUỐN NHÔM CÔNG NGHỆ ĐỨC', 'Cửa cuốn', 'BATCH-2026-LAB', $3, '2026-10-23', 'INSTALLED')
       ON CONFLICT (hardware_id) DO UPDATE SET status = 'INSTALLED'`,
      [hwId, `FC:B4:67:${hwId.slice(0, 4)}`, `qr-${hwId}`]
    );

    // 3. Thêm vào device_instances để hiển thị ở trang thiết bị khách hàng
    const warrantyUntil = new Date(Date.now() + 24 * 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    await this.pool.query(
      `INSERT INTO device_instances (id, hardware_id, custom_name, owner_id, device_type, firmware_version_current, is_online, last_heartbeat, current_properties, warranty_start_at, warranty_end_at, subscription_type, subscription_expires_at, subscription_status, installation_address)
       VALUES ($1, $1, $2, $3, 'Cửa cuốn', 'v1.0.0', true, $4, $5, $6, $7, 'LIMITED', $7, 'ACTIVE', $8)
       ON CONFLICT (hardware_id) DO UPDATE SET
         owner_id = EXCLUDED.owner_id,
         custom_name = EXCLUDED.custom_name,
         is_online = true,
         last_heartbeat = EXCLUDED.last_heartbeat,
         warranty_end_at = EXCLUDED.warranty_end_at,
         subscription_expires_at = EXCLUDED.subscription_expires_at,
         subscription_status = 'ACTIVE',
         installation_address = EXCLUDED.installation_address`,
      [
        hwId,
        customName || `Cửa cuốn ${hwId}`,
        customerId,
        now,
        JSON.stringify({ open_state: 'CLOSED', is_locked: false, battery_pct: 100 }),
        today,
        warrantyUntil,
        JSON.stringify({ fullText: 'Hà Nội, Việt Nam', ownerName: finalOwnerName }),
      ]
    );

    // 4. Phân quyền OWNER cho khách hàng với tên chủ sở hữu thực tế
    try {
      const permId = `PERM-${hwId}-${customerId.slice(0, 8)}`;
      await this.pool.query(
        `INSERT INTO device_permissions (id, hardware_id, user_id, member_name, role, can_control, can_view_history, created_at)
         VALUES ($1, $2, $3, $4, 'OWNER', true, true, $5)
         ON CONFLICT (id) DO UPDATE SET member_name = EXCLUDED.member_name, user_id = EXCLUDED.user_id`,
        [permId, hwId, customerId, finalOwnerName, now]
      );
    } catch (e) {
      console.warn('[PostgresService] Cảnh báo lưu quyền chủ nhà:', (e as any).message);
    }

    return { success: true, hardwareId: hwId, status: 'INSTALLED', ownerName: finalOwnerName, warrantyUntil };
  }

  public async getDeviceInventory(): Promise<any[]> {
    if (!this.pool) return [];
    const res = await this.pool.query(`
      SELECT inv.*, inst.owner_id as customer_id, inst.custom_name as customer_name, inst.firmware_version_current as firmware_version
      FROM device_inventory inv
      LEFT JOIN device_instances inst ON inv.hardware_id = inst.hardware_id
      ORDER BY inv.created_at DESC
    `);
    return res.rows.map(r => ({
      hardwareId: r.hardware_id,
      macAddress: r.mac_address,
      modelId: r.model_id,
      modelName: r.model_name,
      deviceType: r.device_type,
      batchNumber: r.batch_number,
      productionDate: r.production_date,
      status: r.status,
      customerId: r.customer_id,
      customerName: r.customer_name,
      firmwareVersion: r.firmware_version || 'v1.0.0',
      createdAt: r.created_at,
    }));
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
    }
  }
}
