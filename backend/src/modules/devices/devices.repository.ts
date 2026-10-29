import { postgresClient, PostgresClient } from '../../core/database/postgres.client.js';
import {
  DeviceGroupEntity,
  DeviceTypeEntity,
  DevicePropertyEntity,
  DeviceModelEntity,
  DeviceInstanceEntity,
} from './entities/device.entity.js';

export class DevicesRepository {
  private client: PostgresClient;
  private fallbacks: {
    groups?: any[];
    types?: any[];
    properties?: any[];
    models?: any[];
  };

  constructor(
    client: PostgresClient = postgresClient,
    fallbacks: {
      groups?: any[];
      types?: any[];
      properties?: any[];
      models?: any[];
    } = {}
  ) {
    this.client = client;
    this.fallbacks = fallbacks;
  }

  // ==========================================
  // GROUPS
  // ==========================================
  public async getGroups(): Promise<DeviceGroupEntity[]> {
    try {
      const res = await this.client.query('SELECT * FROM device_groups ORDER BY display_order ASC, id ASC');
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
    } catch (e: any) {
      console.error('[DevicesRepository] getGroups error:', e.message);
      throw new Error('Lỗi truy vấn danh sách nhóm sản phẩm từ CSDL PostgreSQL: ' + e.message);
    }
  }

  public async createGroup(data: Partial<DeviceGroupEntity>): Promise<DeviceGroupEntity> {
    const code = data.code || `GROUP_${Date.now()}`;
    const name = data.groupName || (data as any).name || (data as any).group_name || 'Nhóm sản phẩm mới';
    const desc = data.description || (data as any).desc || '';
    const img = data.imageUrl || (data as any).image_url || '';
    const banner = data.bannerUrl || (data as any).banner_url || '';
    const order = data.displayOrder || 0;
    const now = new Date().toISOString();

    try {
      const res = await this.client.query(
        `INSERT INTO device_groups (code, group_name, description, image_url, banner_url, display_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [code, name, desc, img, banner, order, now, now]
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
      };
    } catch (e: any) {
      console.error('[DevicesRepository] createGroup error:', e.message);
      throw new Error('Lỗi thêm nhóm sản phẩm vào CSDL PostgreSQL: ' + e.message);
    }
  }

  public async updateGroup(id: number, data: Partial<DeviceGroupEntity>): Promise<DeviceGroupEntity | null> {
    const name = data.groupName || (data as any).name || (data as any).group_name;
    const desc = data.description || (data as any).desc;
    const img = data.imageUrl || (data as any).image_url;
    const banner = data.bannerUrl || (data as any).banner_url;
    const order = data.displayOrder;
    const now = new Date().toISOString();

    try {
      const res = await this.client.query(
        `UPDATE device_groups SET
           group_name = COALESCE($1, group_name),
           description = COALESCE($2, description),
           image_url = COALESCE($3, image_url),
           banner_url = COALESCE($4, banner_url),
           display_order = COALESCE($5, display_order),
           updated_at = $6
         WHERE id = $7
         RETURNING *`,
        [name, desc, img, banner, order, now, id]
      );
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          code: r.code,
          groupName: r.group_name,
          description: r.description,
          imageUrl: r.image_url,
          bannerUrl: r.banner_url,
          displayOrder: r.display_order,
          updatedAt: r.updated_at,
        };
      }
      return null;
    } catch (e: any) {
      console.error('[DevicesRepository] updateGroup error:', e.message);
      throw new Error('Lỗi cập nhật nhóm sản phẩm trong CSDL PostgreSQL: ' + e.message);
    }
  }

  public async deleteGroup(id: number): Promise<boolean> {
    try {
      await this.client.query('DELETE FROM device_groups WHERE id = $1', [id]);
      return true;
    } catch (e: any) {
      console.error('[DevicesRepository] deleteGroup error:', e.message);
      throw new Error('Lỗi xóa nhóm sản phẩm trong CSDL PostgreSQL: ' + e.message);
    }
  }

  // ==========================================
  // DEVICE TYPES
  // ==========================================
  // DEVICE TYPES
  // ==========================================
  public async getDeviceTypes(): Promise<DeviceTypeEntity[]> {
    try {
      const res = await this.client.query('SELECT * FROM device_types ORDER BY id ASC');
      return res.rows.map(r => ({
        id: r.id,
        typeCode: r.type_code,
        typeName: r.type_name,
        description: r.description,
        imageUrl: r.icon_svg,
        iconSvg: r.icon_svg,
        assignedProperties: typeof r.default_properties === 'string' ? JSON.parse(r.default_properties) : (r.default_properties || []),
        createdAt: r.created_at,
      }));
    } catch (e: any) {
      console.error('[DevicesRepository] getDeviceTypes error:', e.message);
      throw new Error('Lỗi truy vấn danh sách loại thiết bị từ CSDL PostgreSQL: ' + e.message);
    }
  }

  public async createDeviceType(data: Partial<DeviceTypeEntity>): Promise<DeviceTypeEntity> {
    const code = data.typeCode || (data as any).type_code || `TYPE_${Date.now()}`;
    const name = data.typeName || (data as any).type_name || 'Loại thiết bị mới';
    const desc = data.description || '';
    const img = data.imageUrl || (data as any).image_url || data.iconSvg || '';
    const props = data.assignedProperties !== undefined ? data.assignedProperties : ((data as any).assigned_properties || (data as any).defaultProperties || (data as any).default_properties || []);
    const now = new Date().toISOString();

    try {
      const res = await this.client.query(
        `INSERT INTO device_types (type_code, type_name, description, icon_svg, default_properties, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [code, name, desc, img, JSON.stringify(props), now]
      );
      const r = res.rows[0];
      return { 
        id: r.id, 
        typeCode: r.type_code, 
        typeName: r.type_name, 
        description: r.description, 
        imageUrl: r.icon_svg, 
        assignedProperties: typeof r.default_properties === 'string' ? JSON.parse(r.default_properties) : (r.default_properties || []),
        createdAt: r.created_at 
      };
    } catch (e: any) {
      console.error('[DevicesRepository] createDeviceType error:', e.message);
      throw new Error('Lỗi thêm loại thiết bị vào CSDL PostgreSQL: ' + e.message);
    }
  }

  public async updateDeviceType(id: number, data: Partial<DeviceTypeEntity>): Promise<DeviceTypeEntity | null> {
    const name = data.typeName || (data as any).type_name;
    const desc = data.description;
    const img = data.imageUrl || (data as any).image_url || data.iconSvg;
    const props = data.assignedProperties !== undefined ? data.assignedProperties : ((data as any).assigned_properties || (data as any).defaultProperties || (data as any).default_properties);

    try {
      const res = await this.client.query(
        `UPDATE device_types SET
           type_name = COALESCE($1, type_name),
           description = COALESCE($2, description),
           icon_svg = COALESCE($3, icon_svg),
           default_properties = CASE WHEN $4::text IS NOT NULL THEN $4::jsonb ELSE default_properties END
         WHERE id = $5
         RETURNING *`,
        [name, desc, img, props !== undefined ? JSON.stringify(props) : null, id]
      );
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return { 
          id: r.id, 
          typeCode: r.type_code, 
          typeName: r.type_name, 
          description: r.description, 
          imageUrl: r.icon_svg,
          assignedProperties: typeof r.default_properties === 'string' ? JSON.parse(r.default_properties) : (r.default_properties || [])
        };
      }
      return null;
    } catch (e: any) {
      console.error('[DevicesRepository] updateDeviceType error:', e.message);
      throw new Error('Lỗi cập nhật loại thiết bị trong CSDL PostgreSQL: ' + e.message);
    }
  }

  public async deleteDeviceType(id: number): Promise<boolean> {
    try {
      await this.client.query('DELETE FROM device_types WHERE id = $1', [id]);
      return true;
    } catch (e: any) {
      console.warn('[DevicesRepository] deleteDeviceType error:', e.message);
      return false;
    }
  }

  // ==========================================
  // PROPERTIES (DICTIONARY)
  // ==========================================
  public async getProperties(): Promise<DevicePropertyEntity[]> {
    try {
      const res = await this.client.query('SELECT * FROM device_properties ORDER BY id ASC');
      return res.rows.map(r => ({
        id: r.id,
        propertyKey: r.property_key,
        displayName: r.display_name,
        dataType: r.data_type,
        unit: r.unit,
        uiWidgetType: r.ui_widget_type,
        isControllable: r.is_controllable,
        minVal: r.min_val,
        maxVal: r.max_val,
        description: r.description,
        createdAt: r.created_at,
      }));
    } catch (e: any) {
      console.error('[DevicesRepository] getProperties error:', e.message);
      throw new Error('Lỗi truy vấn danh mục thuộc tính từ CSDL PostgreSQL: ' + e.message);
    }
  }

  public async createProperty(data: Partial<DevicePropertyEntity>): Promise<DevicePropertyEntity> {
    const key = data.propertyKey || (data as any).property_key || `prop_${Date.now()}`;
    const name = data.displayName || (data as any).display_name || 'Thuộc tính mới';
    const type = data.dataType || (data as any).data_type || 'BOOLEAN';
    const unit = data.unit || '';
    const widget = data.uiWidgetType || (data as any).ui_widget_type || 'TOGGLE';
    const controllable = data.isControllable ?? (data as any).is_controllable ?? true;
    const min = data.minVal ?? (data as any).min_val ?? null;
    const max = data.maxVal ?? (data as any).max_val ?? null;
    const desc = data.description || '';
    const now = new Date().toISOString();

    try {
      const res = await this.client.query(
        `INSERT INTO device_properties (property_key, display_name, data_type, unit, ui_widget_type, is_controllable, min_val, max_val, description, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [key, name, type, unit, widget, controllable, min, max, desc, now]
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
        minVal: r.min_val,
        maxVal: r.max_val,
        description: r.description,
        createdAt: r.created_at,
      };
    } catch (e: any) {
      console.error('[DevicesRepository] createProperty error:', e.message);
      throw new Error('Lỗi thêm thuộc tính vào CSDL PostgreSQL: ' + e.message);
    }
  }

  public async updateProperty(id: number, data: Partial<DevicePropertyEntity>): Promise<DevicePropertyEntity | null> {
    const name = data.displayName || (data as any).display_name;
    const unit = data.unit;
    const widget = data.uiWidgetType || (data as any).ui_widget_type;
    const controllable = data.isControllable ?? (data as any).is_controllable;
    const desc = data.description;

    try {
      const res = await this.client.query(
        `UPDATE device_properties SET
           display_name = COALESCE($1, display_name),
           unit = COALESCE($2, unit),
           ui_widget_type = COALESCE($3, ui_widget_type),
           is_controllable = COALESCE($4, is_controllable),
           description = COALESCE($5, description)
         WHERE id = $6
         RETURNING *`,
        [name, unit, widget, controllable, desc, id]
      );
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          propertyKey: r.property_key,
          displayName: r.display_name,
          dataType: r.data_type,
          unit: r.unit,
          uiWidgetType: r.ui_widget_type,
          isControllable: r.is_controllable,
        };
      }
      return null;
    } catch (e: any) {
      console.error('[DevicesRepository] updateProperty error:', e.message);
      throw new Error('Lỗi cập nhật thuộc tính trong CSDL PostgreSQL: ' + e.message);
    }
  }

  public async deleteProperty(id: number): Promise<boolean> {
    try {
      await this.client.query('DELETE FROM device_properties WHERE id = $1', [id]);
      return true;
    } catch (e: any) {
      console.warn('[DevicesRepository] deleteProperty error:', e.message);
      return false;
    }
  }

  // ==========================================
  // DEVICE MODELS
  // ==========================================
  public async getDeviceModels(): Promise<DeviceModelEntity[]> {
    try {
      const res = await this.client.query(`
        SELECT dm.*, dg.group_name, dt.type_name
        FROM device_models dm
        LEFT JOIN device_groups dg ON dg.id = dm.group_id
        LEFT JOIN device_types dt ON dt.id = dm.type_id
        ORDER BY dm.id ASC
      `);
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
        assignedProperties: typeof r.properties_config === 'string' ? JSON.parse(r.properties_config) : (r.properties_config || []),
        controlCapabilities: typeof r.control_capabilities === 'string' ? JSON.parse(r.control_capabilities) : (r.control_capabilities || []),
        createdAt: r.created_at,
      }));
    } catch (e: any) {
      console.error('[DevicesRepository] getDeviceModels error:', e.message);
      throw new Error('Lỗi truy vấn danh sách khuôn mẫu từ CSDL PostgreSQL: ' + e.message);
    }
  }

  public async getModels(): Promise<DeviceModelEntity[]> {
    return this.getDeviceModels();
  }

  public async createDeviceModel(data: Partial<DeviceModelEntity>): Promise<DeviceModelEntity> {
    const code = data.modelCode || (data as any).model_code || `MODEL_${Date.now()}`;
    const name = data.modelName || (data as any).model_name || 'Mẫu thiết bị mới';
    const groupId = data.groupId || (data as any).group_id || null;
    const typeId = data.typeId || (data as any).type_id || null;
    const fw = data.firmwareVersionLatest || (data as any).firmware_version_latest || 'v1.0.0';
    const hw = data.hardwareVersion || (data as any).hardware_version || 'HW-REV-A';
    const img = data.imageUrl || (data as any).image_url || '';
    const props = data.assignedProperties || (data as any).assigned_properties || [];
    const caps = data.controlCapabilities || (data as any).control_capabilities || [];
    const now = new Date().toISOString();

    try {
      const res = await this.client.query(
        `INSERT INTO device_models (model_code, model_name, group_id, type_id, firmware_version_latest, hardware_version, image_url, properties_config, control_capabilities, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [code, name, groupId, typeId, fw, hw, img, JSON.stringify(props), JSON.stringify(caps), now]
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
        imageUrl: r.image_url,
        assignedProperties: typeof r.properties_config === 'string' ? JSON.parse(r.properties_config) : (r.properties_config || []),
        controlCapabilities: typeof r.control_capabilities === 'string' ? JSON.parse(r.control_capabilities) : (r.control_capabilities || []),
        createdAt: r.created_at,
      };
    } catch (e: any) {
      console.error('[DevicesRepository] createDeviceModel error:', e.message);
      throw new Error('Lỗi thêm khuôn mẫu vào CSDL PostgreSQL: ' + e.message);
    }
  }

  public async createModel(data: Partial<DeviceModelEntity>): Promise<DeviceModelEntity> {
    return this.createDeviceModel(data);
  }

  public async updateDeviceModel(id: number, data: Partial<DeviceModelEntity>): Promise<DeviceModelEntity | null> {
    const name = data.modelName || (data as any).model_name;
    const groupId = data.groupId !== undefined ? data.groupId : (data as any).group_id;
    const typeId = data.typeId !== undefined ? data.typeId : (data as any).type_id;
    const fw = data.firmwareVersionLatest || (data as any).firmware_version_latest;
    const hw = data.hardwareVersion || (data as any).hardware_version;
    const img = data.imageUrl || (data as any).image_url;
    const props = data.assignedProperties !== undefined ? data.assignedProperties : (data as any).assigned_properties;

    try {
      const res = await this.client.query(
        `UPDATE device_models SET
           model_name = COALESCE($1, model_name),
           group_id = COALESCE($2, group_id),
           type_id = COALESCE($3, type_id),
           firmware_version_latest = COALESCE($4, firmware_version_latest),
           hardware_version = COALESCE($5, hardware_version),
           image_url = COALESCE($6, image_url),
           properties_config = CASE WHEN $7::text IS NOT NULL THEN $7::jsonb ELSE properties_config END
         WHERE id = $8
         RETURNING *`,
        [name, groupId, typeId, fw, hw, img, props !== undefined ? JSON.stringify(props) : null, id]
      );
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return {
          id: r.id,
          modelCode: r.model_code,
          modelName: r.model_name,
          groupId: r.group_id,
          typeId: r.type_id,
          firmwareVersionLatest: r.firmware_version_latest,
          hardwareVersion: r.hardware_version,
          imageUrl: r.image_url,
          assignedProperties: typeof r.properties_config === 'string' ? JSON.parse(r.properties_config) : (r.properties_config || []),
          controlCapabilities: typeof r.control_capabilities === 'string' ? JSON.parse(r.control_capabilities) : (r.control_capabilities || []),
        };
      }
      return null;
    } catch (e: any) {
      console.error('[DevicesRepository] updateDeviceModel error:', e.message);
      throw new Error('Lỗi cập nhật khuôn mẫu trong CSDL PostgreSQL: ' + e.message);
    }
  }

  public async updateModel(id: number, data: Partial<DeviceModelEntity>): Promise<DeviceModelEntity | null> {
    return this.updateDeviceModel(id, data);
  }

  public async deleteDeviceModel(id: number): Promise<boolean> {
    try {
      await this.client.query('DELETE FROM device_models WHERE id = $1', [id]);
      return true;
    } catch (e: any) {
      console.warn('[DevicesRepository] deleteDeviceModel error:', e.message);
      return false;
    }
  }

  public async deleteModel(id: number): Promise<boolean> {
    return this.deleteDeviceModel(id);
  }

  // ==========================================
  // DEVICE INSTANCES (LIVE DEVICES)
  // ==========================================
  public async getDevices(page: number = 1, limit: number = 100, status?: string, search?: string): Promise<{ devices: DeviceInstanceEntity[]; total: number }> {
    try {
      let query = `
        SELECT 
          di.*,
          COALESCE(NULLIF(di.owner_name, 'Chưa gán'), u.full_name, 'Chưa gán') as resolved_owner_name,
          COALESCE(NULLIF(di.owner_phone, '---'), u.phone_number, '---') as resolved_owner_phone,
          COALESCE(di.model_name, m.model_name, inv.model_name, 'AUSTEC-A900') as resolved_model_name,
          COALESCE(di.group_name, 'Chưa phân nhóm') as resolved_group_name,
          m.model_code,
          m.hardware_version as model_hardware_version,
          m.firmware_version_latest as model_firmware_version_latest,
          COALESCE(m.supplier, inv.supplier, 'Austec Smart Factory') as model_supplier,
          m.image_url as model_image_url,
          inv.batch_number,
          inv.production_date,
          inv.mac_address
        FROM device_instances di
        LEFT JOIN users u ON u.id = di.owner_id
        LEFT JOIN device_inventory inv ON inv.hardware_id = di.hardware_id
        LEFT JOIN device_models m ON (m.id = inv.model_id OR m.model_code = di.model_name OR m.model_name = di.model_name)
        WHERE 1=1
      `;
      const params: any[] = [];
      let idx = 1;

      if (status === 'online') {
        query += ` AND di.is_online = true`;
      } else if (status === 'offline') {
        query += ` AND di.is_online = false`;
      }

      if (search) {
        query += ` AND (LOWER(di.hardware_id) LIKE $${idx} OR LOWER(di.custom_name) LIKE $${idx} OR LOWER(COALESCE(di.owner_name, u.full_name, '')) LIKE $${idx} OR LOWER(COALESCE(di.group_name, '')) LIKE $${idx} OR LOWER(COALESCE(di.model_name, '')) LIKE $${idx})`;
        params.push(`%${search.toLowerCase()}%`);
        idx++;
      }

      const offset = (page - 1) * limit;
      query += ` ORDER BY di.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
      params.push(limit, offset);

      const res = await this.client.query(query, params);
      const devices = res.rows.map(r => ({
        id: r.id,
        hwId: r.hardware_id,
        hardwareId: r.hardware_id,
        name: r.custom_name || r.hardware_id,
        customName: r.custom_name || r.hardware_id,
        ownerId: r.owner_id,
        owner: r.resolved_owner_name || 'Chưa gán',
        ownerName: r.resolved_owner_name || 'Chưa gán',
        phone: r.resolved_owner_phone || '---',
        ownerPhone: r.resolved_owner_phone || '---',
        type: r.device_type || 'DOOR',
        deviceType: r.device_type || 'DOOR',
        model: r.resolved_model_name || 'AUSTEC-A900',
        modelName: r.resolved_model_name || 'AUSTEC-A900',
        modelCode: r.model_code || '',
        group: r.resolved_group_name || 'Chưa phân nhóm',
        groupName: r.resolved_group_name || 'Chưa phân nhóm',
        firmwareVersionCurrent: r.firmware_version_current || 'v2.4.1',
        firmwareVersionLatest: r.model_firmware_version_latest || 'v2.4.2',
        hardwareVersion: r.model_hardware_version || 'HW-REV-A',
        supplier: r.model_supplier || 'Austec Smart Factory',
        imageUrl: r.model_image_url || '',
        batchNumber: r.batch_number || '',
        productionDate: r.production_date || '',
        macAddress: r.mac_address || '',
        isOnline: !!r.is_online,
        status: r.is_online ? 'online' : (r.resolved_owner_name && r.resolved_owner_name !== 'Chưa gán' ? 'offline' : 'in_stock'),
        lastHeartbeat: r.last_heartbeat,
        currentProperties: r.current_properties || {},
        battery: (r.current_properties && r.current_properties.battery_level) || 100,
        openState: (r.current_properties && (r.current_properties.door_state || r.current_properties.state)) || (r.is_online ? 'CLOSED' : 'STOCK'),
        isLocked: !!(r.current_properties && r.current_properties.is_locked),
        signal: -65,
        warranty: r.warranty_end_at || '12/2028',
        warrantyStartAt: r.warranty_start_at,
        warrantyEndAt: r.warranty_end_at || '12/2028',
        subscriptionType: r.subscription_type || 'LIMITED',
        subscriptionExpiresAt: r.subscription_expires_at || '2028-12-31T00:00:00.000Z',
        subscriptionStatus: r.subscription_status || 'ACTIVE',
        address: r.address_display || 'Kho tổng Austec',
        addressDisplay: r.address_display || 'Kho tổng Austec',
        createdAt: r.created_at,
      }));

      return { devices, total: devices.length };
    } catch (e: any) {
      console.warn('[DevicesRepository] getDevices error:', e.message);
    }
    return { devices: [], total: 0 };
  }

  public async createDevice(data: any): Promise<any> {
    const hwId = (data.hwId || data.hardwareId || `AT-${Date.now()}`).trim();
    const name = data.name || data.customName || `Thiết bị ${hwId}`;
    const model = data.model || data.modelName || 'AUSTEC-A900';
    const type = data.type || data.deviceType || 'DOOR';
    const group = data.group || data.groupName || 'Chưa phân nhóm';
    const owner = data.owner || data.ownerName || 'Chưa gán';
    const phone = data.phone || data.ownerPhone || '---';
    const warranty = data.warranty || data.warrantyEndAt || '12/2028';
    const address = data.address || data.addressDisplay || 'Kho tổng Austec';
    const subType = data.subscriptionType || 'LIMITED';
    const subExpires = data.subscriptionExpiresAt || '2028-12-31T00:00:00.000Z';
    const subStatus = data.subscriptionStatus || 'ACTIVE';
    const id = data.id || `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    try {
      // 1. Insert into device_inventory
      await this.client.query(
        `INSERT INTO device_inventory (hardware_id, model_name, device_type, supplier, status, created_at)
         VALUES ($1, $2, $3, 'Austec Smart Factory', 'IN_USE', NOW())
         ON CONFLICT (hardware_id) DO UPDATE SET
           model_name = EXCLUDED.model_name,
           device_type = EXCLUDED.device_type,
           status = EXCLUDED.status`,
        [hwId, model, type]
      );

      // 2. Insert into device_instances
      const res = await this.client.query(
        `INSERT INTO device_instances (
           id, hardware_id, custom_name, device_type, is_online, address_display,
           model_name, group_name, owner_name, owner_phone,
           warranty_start_at, warranty_end_at, subscription_type, subscription_expires_at, subscription_status, created_at
         ) VALUES ($1, $2, $3, $4, false, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (hardware_id) DO UPDATE SET
           custom_name = EXCLUDED.custom_name,
           device_type = EXCLUDED.device_type,
           address_display = EXCLUDED.address_display,
           model_name = EXCLUDED.model_name,
           group_name = EXCLUDED.group_name,
           owner_name = EXCLUDED.owner_name,
           owner_phone = EXCLUDED.owner_phone,
           warranty_end_at = EXCLUDED.warranty_end_at,
           subscription_type = EXCLUDED.subscription_type,
           subscription_expires_at = EXCLUDED.subscription_expires_at,
           subscription_status = EXCLUDED.subscription_status
         RETURNING *`,
        [id, hwId, name, type, address, model, group, owner, phone, now, warranty, subType, subExpires, subStatus, now]
      );
      const r = res.rows[0];
      return {
        id: r.id,
        hwId: r.hardware_id,
        hardwareId: r.hardware_id,
        name: r.custom_name,
        customName: r.custom_name,
        model: r.model_name || model,
        modelName: r.model_name || model,
        group: r.group_name || group,
        groupName: r.group_name || group,
        type: r.device_type,
        deviceType: r.device_type,
        owner: r.owner_name || owner,
        ownerName: r.owner_name || owner,
        phone: r.owner_phone || phone,
        ownerPhone: r.owner_phone || phone,
        status: (r.owner_name && r.owner_name !== 'Chưa gán') ? 'offline' : 'in_stock',
        isOnline: false,
        battery: 100,
        openState: 'STOCK',
        isLocked: false,
        signal: 0,
        warranty: r.warranty_end_at,
        warrantyEndAt: r.warranty_end_at,
        address: r.address_display,
        addressDisplay: r.address_display,
        subscriptionType: r.subscription_type,
        subscriptionExpiresAt: r.subscription_expires_at,
        subscriptionStatus: r.subscription_status,
        createdAt: r.created_at,
      };
    } catch (e: any) {
      console.warn('[DevicesRepository] createDevice error:', e.message);
      throw e;
    }
  }

  public async createDevicesBatch(items: any[]): Promise<{ count: number; devices: any[] }> {
    const created: any[] = [];
    for (const item of items) {
      try {
        const dev = await this.createDevice(item);
        created.push(dev);
      } catch (err: any) {
        console.warn(`[DevicesRepository] createDevicesBatch item error (${item.hwId || item.hardwareId}):`, err.message);
      }
    }
    return { count: created.length, devices: created };
  }

  public async updateDevice(hardwareId: string, data: any): Promise<any> {
    const hwId = hardwareId.trim();
    const name = data.name || data.customName;
    const model = data.model || data.modelName;
    const type = data.type || data.deviceType;
    const group = data.group || data.groupName;
    const owner = data.owner || data.ownerName;
    const phone = data.phone || data.ownerPhone;
    const address = data.address || data.addressDisplay;
    const warranty = data.warranty || data.warrantyEndAt;
    const subType = data.subscriptionType;
    const subExpires = data.subscriptionExpiresAt;
    const subStatus = data.subscriptionStatus;

    try {
      if (model || type) {
        await this.client.query(
          `UPDATE device_inventory SET
             model_name = COALESCE($1, model_name),
             device_type = COALESCE($2, device_type)
           WHERE hardware_id = $3`,
          [model, type, hwId]
        );
      }

      const res = await this.client.query(
        `UPDATE device_instances SET
           custom_name = COALESCE($1, custom_name),
           device_type = COALESCE($2, device_type),
           address_display = COALESCE($3, address_display),
           warranty_end_at = COALESCE($4, warranty_end_at),
           subscription_type = COALESCE($5, subscription_type),
           subscription_expires_at = COALESCE($6, subscription_expires_at),
           subscription_status = COALESCE($7, subscription_status),
           model_name = COALESCE($8, model_name),
           group_name = COALESCE($9, group_name),
           owner_name = COALESCE($10, owner_name),
           owner_phone = COALESCE($11, owner_phone)
         WHERE hardware_id = $12
         RETURNING *`,
        [name, type, address, warranty, subType, subExpires, subStatus, model, group, owner, phone, hwId]
      );

      if (res.rows.length === 0) {
        throw new Error(`Không tìm thấy thiết bị với Hardware ID: ${hwId}`);
      }

      const r = res.rows[0];
      return {
        id: r.id,
        hwId: r.hardware_id,
        hardwareId: r.hardware_id,
        name: r.custom_name,
        customName: r.custom_name,
        model: r.model_name || model || 'AUSTEC-A900',
        modelName: r.model_name || model || 'AUSTEC-A900',
        type: r.device_type,
        deviceType: r.device_type,
        group: r.group_name || group || 'Chưa phân nhóm',
        groupName: r.group_name || group || 'Chưa phân nhóm',
        owner: r.owner_name || owner || 'Chưa gán',
        ownerName: r.owner_name || owner || 'Chưa gán',
        phone: r.owner_phone || phone || '---',
        ownerPhone: r.owner_phone || phone || '---',
        status: r.is_online ? 'online' : (r.owner_name && r.owner_name !== 'Chưa gán' ? 'offline' : 'in_stock'),
        isOnline: !!r.is_online,
        battery: 100,
        openState: r.is_online ? 'CLOSED' : 'STOCK',
        isLocked: false,
        signal: -65,
        warranty: r.warranty_end_at,
        warrantyEndAt: r.warranty_end_at,
        address: r.address_display,
        addressDisplay: r.address_display,
        subscriptionType: r.subscription_type,
        subscriptionExpiresAt: r.subscription_expires_at,
        subscriptionStatus: r.subscription_status,
        createdAt: r.created_at,
      };
    } catch (e: any) {
      console.warn('[DevicesRepository] updateDevice error:', e.message);
      throw e;
    }
  }

  public async deleteDevice(hardwareId: string): Promise<boolean> {
    try {
      const hwId = hardwareId.trim();
      await this.client.query('DELETE FROM device_instances WHERE hardware_id = $1', [hwId]);
      await this.client.query('DELETE FROM device_inventory WHERE hardware_id = $1', [hwId]);
      await this.client.query('DELETE FROM device_permissions WHERE hardware_id = $1', [hwId]);
      await this.client.query('DELETE FROM device_rf_remotes WHERE hardware_id = $1', [hwId]);
      return true;
    } catch (e: any) {
      console.warn('[DevicesRepository] deleteDevice error:', e.message);
      return false;
    }
  }

  // ==========================================
  // RF REMOTES
  // ==========================================
  public async getRfRemotes(hardwareId?: string): Promise<any[]> {
    try {
      let query = 'SELECT * FROM device_rf_remotes WHERE 1=1';
      const params: any[] = [];
      if (hardwareId) {
        query += ' AND hardware_id = $1';
        params.push(hardwareId);
      }
      query += ' ORDER BY id ASC';
      const res = await this.client.query(query, params);
      return res.rows.map(r => ({
        id: r.id,
        hardwareId: r.hardware_id,
        remoteCode: r.remote_code,
        remoteName: r.remote_name,
        pairedAt: r.paired_at,
        isBlocked: r.is_blocked,
      }));
    } catch (e: any) {
      console.warn('[DevicesRepository] getRfRemotes error:', e.message);
      return [];
    }
  }

  public async addRfRemote(data: any): Promise<any> {
    try {
      const res = await this.client.query(
        `INSERT INTO device_rf_remotes (hardware_id, remote_code, remote_name, paired_at, is_blocked)
         VALUES ($1, $2, $3, $4, false)
         RETURNING *`,
        [data.hardwareId, data.remoteCode || `RF-${Date.now()}`, data.remoteName || 'Remote mới', new Date().toISOString()]
      );
      return res.rows[0];
    } catch (e: any) {
      console.warn('[DevicesRepository] addRfRemote error:', e.message);
      return data;
    }
  }

  public async deleteRfRemote(id: number): Promise<boolean> {
    try {
      await this.client.query('DELETE FROM device_rf_remotes WHERE id = $1', [id]);
      return true;
    } catch (e: any) {
      console.warn('[DevicesRepository] deleteRfRemote error:', e.message);
      return false;
    }
  }

  public async toggleBlockRfRemote(id: number): Promise<boolean> {
    try {
      const res = await this.client.query(
        'UPDATE device_rf_remotes SET is_blocked = NOT is_blocked WHERE id = $1 RETURNING is_blocked',
        [id]
      );
      return res.rows[0]?.is_blocked ?? false;
    } catch (e: any) {
      console.warn('[DevicesRepository] toggleBlockRfRemote error:', e.message);
      return false;
    }
  }
}
