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
      if (res.rows.length > 0) {
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
    } catch (e: any) {
      console.warn('[DevicesRepository] getGroups fallback:', e.message);
    }
    return (this.fallbacks.groups || []).map(g => ({
      id: g.id,
      code: g.code,
      groupName: g.groupName || g.name || g.group_name,
      description: g.description || g.desc,
      imageUrl: g.imageUrl || g.image_url,
      displayOrder: g.displayOrder || g.order,
      createdAt: g.createdAt,
    }));
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
      console.warn('[DevicesRepository] createGroup DB error, returning memory item:', e.message);
      return { id: Date.now(), code, groupName: name, description: desc, imageUrl: img, displayOrder: order, createdAt: now };
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
    } catch (e: any) {
      console.warn('[DevicesRepository] updateGroup DB error:', e.message);
    }
    return null;
  }

  public async deleteGroup(id: number): Promise<boolean> {
    try {
      await this.client.query('DELETE FROM device_groups WHERE id = $1', [id]);
      return true;
    } catch (e: any) {
      console.warn('[DevicesRepository] deleteGroup DB error:', e.message);
      return false;
    }
  }

  // ==========================================
  // DEVICE TYPES
  // ==========================================
  public async getDeviceTypes(): Promise<DeviceTypeEntity[]> {
    try {
      const res = await this.client.query('SELECT * FROM device_types ORDER BY id ASC');
      if (res.rows.length > 0) {
        return res.rows.map(r => ({
          id: r.id,
          typeCode: r.type_code,
          typeName: r.type_name,
          description: r.description,
          imageUrl: r.icon_svg,
          iconSvg: r.icon_svg,
          createdAt: r.created_at,
        }));
      }
    } catch (e: any) {
      console.warn('[DevicesRepository] getDeviceTypes fallback:', e.message);
    }
    return (this.fallbacks.types || []).map(t => ({
      id: t.id,
      typeCode: t.typeCode || t.type_code || t.code,
      typeName: t.typeName || t.type_name || t.name,
      description: t.description || t.desc,
      imageUrl: t.imageUrl || t.image_url || t.iconSvg,
      createdAt: t.createdAt,
    }));
  }

  public async createDeviceType(data: Partial<DeviceTypeEntity>): Promise<DeviceTypeEntity> {
    const code = data.typeCode || (data as any).type_code || `TYPE_${Date.now()}`;
    const name = data.typeName || (data as any).type_name || 'Loại thiết bị mới';
    const desc = data.description || '';
    const img = data.imageUrl || (data as any).image_url || data.iconSvg || '';
    const now = new Date().toISOString();

    try {
      const res = await this.client.query(
        `INSERT INTO device_types (type_code, type_name, description, icon_svg, created_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [code, name, desc, img, now]
      );
      const r = res.rows[0];
      return { id: r.id, typeCode: r.type_code, typeName: r.type_name, description: r.description, imageUrl: r.icon_svg, createdAt: r.created_at };
    } catch (e: any) {
      console.warn('[DevicesRepository] createDeviceType error:', e.message);
      return { id: Date.now(), typeCode: code, typeName: name, description: desc, imageUrl: img, createdAt: now };
    }
  }

  public async updateDeviceType(id: number, data: Partial<DeviceTypeEntity>): Promise<DeviceTypeEntity | null> {
    const name = data.typeName || (data as any).type_name;
    const desc = data.description;
    const img = data.imageUrl || (data as any).image_url || data.iconSvg;

    try {
      const res = await this.client.query(
        `UPDATE device_types SET
           type_name = COALESCE($1, type_name),
           description = COALESCE($2, description),
           icon_svg = COALESCE($3, icon_svg)
         WHERE id = $4
         RETURNING *`,
        [name, desc, img, id]
      );
      if (res.rows.length > 0) {
        const r = res.rows[0];
        return { id: r.id, typeCode: r.type_code, typeName: r.type_name, description: r.description, imageUrl: r.icon_svg };
      }
    } catch (e: any) {
      console.warn('[DevicesRepository] updateDeviceType error:', e.message);
    }
    return null;
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
      if (res.rows.length > 0) {
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
      }
    } catch (e: any) {
      console.warn('[DevicesRepository] getProperties fallback:', e.message);
    }
    return (this.fallbacks.properties || []).map(p => ({
      id: p.id,
      propertyKey: p.propertyKey || p.property_key || p.key,
      displayName: p.displayName || p.display_name || p.name,
      dataType: p.dataType || p.data_type || 'STRING',
      unit: p.unit,
      uiWidgetType: p.uiWidgetType || p.ui_widget_type || 'status_badge',
      isControllable: p.isControllable ?? p.is_controllable ?? false,
      minVal: p.minVal,
      maxVal: p.maxVal,
      description: p.description,
      createdAt: p.createdAt,
    }));
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
      console.warn('[DevicesRepository] createProperty error:', e.message);
      return { id: Date.now(), propertyKey: key, displayName: name, dataType: type, unit, uiWidgetType: widget, isControllable: controllable, createdAt: now };
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
    } catch (e: any) {
      console.warn('[DevicesRepository] updateProperty error:', e.message);
    }
    return null;
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
      if (res.rows.length > 0) {
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
      }
    } catch (e: any) {
      console.warn('[DevicesRepository] getDeviceModels fallback:', e.message);
    }
    return (this.fallbacks.models || []).map(m => ({
      id: m.id,
      modelCode: m.modelCode || m.model_code || m.code,
      modelName: m.modelName || m.model_name || m.name,
      groupId: m.groupId || m.group_id,
      typeId: m.typeId || m.type_id,
      firmwareVersionLatest: m.firmwareVersionLatest || m.firmware_version_latest || m.fw,
      hardwareVersion: m.hardwareVersion || m.hardware_version || m.hw,
      imageUrl: m.imageUrl || m.image_url,
      assignedProperties: m.assignedProperties || m.assigned_properties || [],
      controlCapabilities: m.controlCapabilities || m.control_capabilities || m.capabilities || [],
      createdAt: m.createdAt,
    }));
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
        createdAt: r.created_at,
      };
    } catch (e: any) {
      console.warn('[DevicesRepository] createDeviceModel error:', e.message);
      return { id: Date.now(), modelCode: code, modelName: name, groupId, typeId, firmwareVersionLatest: fw, hardwareVersion: hw, imageUrl: img, createdAt: now };
    }
  }

  public async createModel(data: Partial<DeviceModelEntity>): Promise<DeviceModelEntity> {
    return this.createDeviceModel(data);
  }

  public async updateDeviceModel(id: number, data: Partial<DeviceModelEntity>): Promise<DeviceModelEntity | null> {
    const name = data.modelName || (data as any).model_name;
    const groupId = data.groupId || (data as any).group_id;
    const typeId = data.typeId || (data as any).type_id;
    const fw = data.firmwareVersionLatest || (data as any).firmware_version_latest;
    const hw = data.hardwareVersion || (data as any).hardware_version;
    const img = data.imageUrl || (data as any).image_url;
    const props = data.assignedProperties || (data as any).assigned_properties;

    try {
      const res = await this.client.query(
        `UPDATE device_models SET
           model_name = COALESCE($1, model_name),
           group_id = COALESCE($2, group_id),
           type_id = COALESCE($3, type_id),
           firmware_version_latest = COALESCE($4, firmware_version_latest),
           hardware_version = COALESCE($5, hardware_version),
           image_url = COALESCE($6, image_url),
           properties_config = COALESCE($7, properties_config)
         WHERE id = $8
         RETURNING *`,
        [name, groupId, typeId, fw, hw, img, props ? JSON.stringify(props) : null, id]
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
        };
      }
    } catch (e: any) {
      console.warn('[DevicesRepository] updateDeviceModel error:', e.message);
    }
    return null;
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
          u.full_name as owner_name,
          u.phone_number as owner_phone,
          m.model_name
        FROM device_instances di
        LEFT JOIN users u ON u.id = di.owner_id
        LEFT JOIN device_inventory inv ON inv.hardware_id = di.hardware_id
        LEFT JOIN device_models m ON m.id = inv.model_id
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
        query += ` AND (LOWER(di.hardware_id) LIKE $${idx} OR LOWER(di.custom_name) LIKE $${idx} OR LOWER(u.full_name) LIKE $${idx})`;
        params.push(`%${search.toLowerCase()}%`);
        idx++;
      }

      const offset = (page - 1) * limit;
      query += ` ORDER BY di.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
      params.push(limit, offset);

      const res = await this.client.query(query, params);
      const devices: DeviceInstanceEntity[] = res.rows.map(r => ({
        id: r.id,
        hardwareId: r.hardware_id,
        customName: r.custom_name,
        ownerId: r.owner_id,
        ownerName: r.owner_name,
        ownerPhone: r.owner_phone,
        deviceType: r.device_type,
        modelName: r.model_name,
        firmwareVersionCurrent: r.firmware_version_current,
        isOnline: r.is_online,
        lastHeartbeat: r.last_heartbeat,
        currentProperties: r.current_properties || {},
        warrantyStartAt: r.warranty_start_at,
        warrantyEndAt: r.warranty_end_at,
        subscriptionType: r.subscription_type,
        subscriptionStatus: r.subscription_status,
        addressDisplay: r.address_display,
        createdAt: r.created_at,
      }));

      return { devices, total: devices.length };
    } catch (e: any) {
      console.warn('[DevicesRepository] getDevices error:', e.message);
    }
    return { devices: [], total: 0 };
  }

  public async deleteDevice(hardwareId: string): Promise<boolean> {
    try {
      await this.client.query('DELETE FROM device_instances WHERE hardware_id = $1', [hardwareId]);
      await this.client.query('DELETE FROM device_permissions WHERE hardware_id = $1', [hardwareId]);
      await this.client.query("UPDATE device_inventory SET status = 'MANUFACTURED' WHERE hardware_id = $1", [hardwareId]);
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
