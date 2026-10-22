import { Pool, PoolClient } from 'pg';
import { UnifiedUser } from '../server.js';
import {
  Product,
  DeviceMemberPermission,
  CustomerSupportRequest,
  SupportTicket,
  LiveChatMessage,
  DeviceInstance,
  DeviceInventory,
  DeviceBlackboxLog,
} from '@austec/database';
import { PersistentDataPayload } from './persistence.service.js';

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
        max: 15,
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

  /**
   * Tạo toàn bộ bảng cấu trúc dữ liệu nếu chưa tồn tại
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

      -- 2. BẢNG KHO XUẤT XƯỞNG (INVENTORY)
      CREATE TABLE IF NOT EXISTS device_inventory (
        hardware_id VARCHAR(100) PRIMARY KEY,
        model_id INT,
        model_name VARCHAR(255),
        device_type VARCHAR(100),
        batch_number VARCHAR(100),
        qr_code_hash VARCHAR(255),
        production_date VARCHAR(50),
        status VARCHAR(50) DEFAULT 'MANUFACTURED',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- 3. BẢNG THIẾT BỊ NGƯỜI DÙNG (DEVICE INSTANCES)
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

      -- 4. BẢNG PHÂN QUYỀN THÀNH VIÊN GIA ĐÌNH (RBAC)
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

      -- 5. BẢNG SẢN PHẨM GIAN HÀNG (STORE PRODUCTS)
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

      -- 6. BẢNG PHIẾU YÊU CẦU HỖ TRỢ (SUPPORT REQUESTS)
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
        resolved_at VARCHAR(50),
        created_at VARCHAR(50),
        updated_at VARCHAR(50)
      );

      -- 7. BẢNG TICKET CSKH LIVE CHAT
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

      -- 8. BẢNG TIN NHẮN LIVE CHAT
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

      -- 9. BẢNG NHẬT KÝ HỘP ĐEN (BLACKBOX AUDIT LOGS)
      CREATE TABLE IF NOT EXISTS blackbox_logs (
        id SERIAL PRIMARY KEY,
        hardware_id VARCHAR(100) NOT NULL,
        actor_id VARCHAR(100),
        actor_role VARCHAR(50) NOT NULL,
        actor_ip VARCHAR(100),
        action_type VARCHAR(100) NOT NULL,
        payload_sent JSONB,
        ack_status VARCHAR(50),
        latency_ms FLOAT,
        created_at VARCHAR(50)
      );

      -- INDEXES TĂNG TỐC TRUY VẤN
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
      CREATE INDEX IF NOT EXISTS idx_permissions_hw ON device_permissions(hardware_id);
      CREATE INDEX IF NOT EXISTS idx_permissions_user ON device_permissions(user_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_cust ON support_tickets(customer_id);
      CREATE INDEX IF NOT EXISTS idx_messages_ticket ON live_chat_messages(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_blackbox_hw ON blackbox_logs(hardware_id);
    `;

    await this.pool.query(ddl);
    console.log('[PostgresService] Đã khởi tạo hoàn tất cấu trúc bảng trong PostgreSQL (9 Bảng quan hệ + Index)!');
  }

  /**
   * Đồng bộ toàn bộ dữ liệu từ Persistent Payload sang PostgreSQL (Upsert an toàn)
   */
  public async syncAllToPostgres(payload: PersistentDataPayload): Promise<void> {
    if (!this.pool || !this.isConnected) return;
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Đồng bộ Users
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

      // 2. Đồng bộ Device Inventory
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
            inv.batchNumber,
            inv.qrCodeHash,
            (inv as any).producedAt || (inv as any).productionDate || new Date().toISOString().split('T')[0],
            inv.status || 'IN_WAREHOUSE',
          ]
        );
      }

      // 3. Đồng bộ Device Instances
      for (const inst of payload.deviceInstances || []) {
        await client.query(
          `INSERT INTO device_instances (id, hardware_id, custom_name, owner_id, device_type, firmware_version_current, is_online, last_heartbeat, current_properties, warranty_start_at, warranty_end_at, subscription_type, subscription_expires_at, subscription_status, installation_address, location_lat, location_lng, address_display, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
           ON CONFLICT (hardware_id) DO UPDATE SET
             custom_name = EXCLUDED.custom_name,
             owner_id = EXCLUDED.owner_id,
             is_online = EXCLUDED.is_online,
             last_heartbeat = EXCLUDED.last_heartbeat,
             current_properties = EXCLUDED.current_properties,
             subscription_status = EXCLUDED.subscription_status,
             address_display = EXCLUDED.address_display`,
          [
            inst.id || `inst-${inst.hardwareId}`,
            inst.hardwareId,
            inst.customName,
            inst.ownerId,
            inst.deviceType || 'Cửa cuốn',
            inst.firmwareVersionCurrent || 'v2.4.1',
            inst.isOnline !== undefined ? inst.isOnline : true,
            inst.lastHeartbeat || new Date().toISOString(),
            JSON.stringify(inst.currentProperties || {}),
            inst.warrantyStartAt || null,
            inst.warrantyEndAt || null,
            inst.subscriptionType || 'LIMITED',
            inst.subscriptionExpiresAt || null,
            inst.subscriptionStatus || 'ACTIVE',
            JSON.stringify(inst.installationAddress || {}),
            inst.locationLat || null,
            inst.locationLng || null,
            inst.addressDisplay || null,
            inst.createdAt || new Date().toISOString(),
          ]
        );
      }

      // 4. Đồng bộ Device Permissions
      for (const p of payload.permissions || []) {
        await client.query(
          `INSERT INTO device_permissions (id, hardware_id, user_id, member_name, phone_number, role, can_control, can_view_history, can_child_lock, can_config, schedule_limit_active, access_start_time, access_end_time, access_days, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
           ON CONFLICT (id) DO UPDATE SET
             member_name = EXCLUDED.member_name,
             phone_number = EXCLUDED.phone_number,
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
            p.id,
            p.hardwareId,
            p.userId,
            p.memberName,
            p.phoneNumber || null,
            p.role,
            Boolean(p.canControl),
            Boolean(p.canViewHistory),
            Boolean(p.canChildLock),
            Boolean(p.canConfig),
            Boolean(p.scheduleLimitActive),
            p.accessStartTime || '00:00',
            p.accessEndTime || '23:59',
            JSON.stringify(p.accessDays || [true, true, true, true, true, true, true]),
            p.createdAt || new Date().toISOString(),
            p.updatedAt || new Date().toISOString(),
          ]
        );
      }

      // 5. Đồng bộ Products
      for (const prod of payload.products || []) {
        await client.query(
          `INSERT INTO products (id, name, category_tag, subtitle, price, original_price, rating, reviews_count, image_url, gallery_urls, warranty_text, highlights, specs, stock_quantity, is_published, display_order, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             category_tag = EXCLUDED.category_tag,
             subtitle = EXCLUDED.subtitle,
             price = EXCLUDED.price,
             original_price = EXCLUDED.original_price,
             rating = EXCLUDED.rating,
             reviews_count = EXCLUDED.reviews_count,
             image_url = EXCLUDED.image_url,
             gallery_urls = EXCLUDED.gallery_urls,
             warranty_text = EXCLUDED.warranty_text,
             highlights = EXCLUDED.highlights,
             specs = EXCLUDED.specs,
             stock_quantity = EXCLUDED.stock_quantity,
             is_published = EXCLUDED.is_published,
             display_order = EXCLUDED.display_order,
             updated_at = EXCLUDED.updated_at`,
          [
            prod.id,
            prod.name,
            prod.categoryTag || 'Khác',
            prod.subtitle || null,
            prod.price,
            prod.originalPrice || null,
            prod.rating || 5.0,
            prod.reviewsCount || 0,
            prod.imageUrl,
            JSON.stringify(prod.galleryUrls || []),
            prod.warrantyText || null,
            JSON.stringify(prod.highlights || []),
            JSON.stringify(prod.specs || {}),
            prod.stockQuantity || 50,
            prod.isPublished !== undefined ? prod.isPublished : true,
            prod.displayOrder || 1,
            prod.createdAt || new Date().toISOString(),
            prod.updatedAt || new Date().toISOString(),
          ]
        );
      }

      // 6. Đồng bộ Support Requests
      for (const req of payload.requests || []) {
        const rAny = req as any;
        await client.query(
          `INSERT INTO customer_support_requests (id, customer_id, customer_name, customer_phone, customer_email, hardware_id, device_name, request_type, request_type_name, description, images, attachment_urls, reply_channel, preferred_contact_time, status, resolved_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status,
             description = EXCLUDED.description,
             resolved_at = EXCLUDED.resolved_at,
             updated_at = EXCLUDED.updated_at`,
          [
            rAny.id,
            rAny.customerId || null,
            rAny.customerName || null,
            rAny.customerPhone || null,
            rAny.customerEmail || rAny.contactEmail || null,
            rAny.hardwareId || null,
            rAny.deviceName || null,
            rAny.requestType || 'TECHNICAL',
            rAny.requestTypeName || null,
            rAny.description || '',
            JSON.stringify(rAny.images || []),
            JSON.stringify(rAny.attachmentUrls || []),
            rAny.replyChannel || 'APP',
            rAny.preferredContactTime || null,
            rAny.status || 'PENDING',
            rAny.resolvedAt || null,
            rAny.createdAt || new Date().toISOString(),
            rAny.updatedAt || new Date().toISOString(),
          ]
        );
      }

      // 7. Đồng bộ Support Tickets
      for (const t of payload.supportTickets || []) {
        await client.query(
          `INSERT INTO support_tickets (id, customer_id, hardware_id, subject, status, priority, assigned_cskh_id, selected_device, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status,
             priority = EXCLUDED.priority,
             assigned_cskh_id = EXCLUDED.assigned_cskh_id,
             selected_device = EXCLUDED.selected_device,
             updated_at = EXCLUDED.updated_at`,
          [
            t.id,
            t.customerId,
            t.hardwareId || null,
            t.subject,
            t.status || 'OPEN',
            t.priority || 'NORMAL',
            t.assignedCskhId || null,
            JSON.stringify((t as any).selectedDevice || null),
            t.createdAt || new Date().toISOString(),
            t.updatedAt || new Date().toISOString(),
          ]
        );
      }

      // 8. Đồng bộ Live Chat Messages
      for (const m of payload.supportMessages || []) {
        if (m.id) {
          await client.query(
            `INSERT INTO live_chat_messages (id, ticket_id, sender_id, sender_role, message, attachment_urls, selected_device, device_snapshot, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET
               message = EXCLUDED.message`,
            [
              m.id,
              m.ticketId,
              m.senderId,
              m.senderRole,
              m.message,
              JSON.stringify(m.attachmentUrls || []),
              JSON.stringify(m.selectedDevice || null),
              JSON.stringify(m.deviceSnapshot || null),
              m.createdAt || new Date().toISOString(),
            ]
          );
        }
      }

      // 9. Đồng bộ Blackbox Logs
      for (const l of payload.blackboxLogs || []) {
        if (l.id) {
          await client.query(
            `INSERT INTO blackbox_logs (id, hardware_id, actor_id, actor_role, actor_ip, action_type, payload_sent, ack_status, latency_ms, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO NOTHING`,
            [
              l.id,
              l.hardwareId,
              l.actorId || null,
              l.actorRole,
              l.actorIp || '127.0.0.1',
              l.actionType,
              JSON.stringify(l.payloadSent || null),
              l.ackStatus,
              l.latencyMs || 0,
              l.createdAt || new Date().toISOString(),
            ]
          );
        }
      }

      await client.query('COMMIT');
      console.log(`[PostgresService] Đồng bộ toàn bộ dữ liệu lên PostgreSQL thành công (${payload.users?.length || 0} users, ${payload.products?.length || 0} products, ${payload.permissions?.length || 0} permissions)`);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error('[PostgresService] Lỗi khi đồng bộ dữ liệu lên PostgreSQL:', e);
    } finally {
      client.release();
    }
  }

  /**
   * Đọc toàn bộ dữ liệu từ PostgreSQL về dạng PersistentDataPayload
   */
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
        phoneNumber: r.phone_number,
        company: r.company,
        department: r.department,
        role: r.role,
        roleTitle: r.role_title,
        password: r.password,
        address: r.address,
        province: r.province,
        isActive: r.is_active,
        registeredAt: r.registered_at,
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

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
    }
  }
}
