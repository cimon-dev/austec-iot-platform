import { Request, Response } from 'express';
import { WebSocket } from 'ws';
import { Controller, Get, Post, Put, Patch, Delete } from '../../core/decorators/index.js';
import { authenticate, AuthenticatedRequest } from '../../core/middlewares/auth.middleware.js';
import { PostgresClient, postgresClient } from '../../core/database/postgres.client.js';

export interface DeviceOperationsDependencies {
  client?: PostgresClient;
  postgresService?: any;
  provisioningService?: any;
  commandService?: any;
  mqttGateway?: any;
  wss?: any;
  persistAll?: (force?: boolean) => void;
}

@Controller('/devices')
export class DeviceOperationsController {
  private client: PostgresClient;
  private postgresService?: any;
  private provisioningService?: any;
  private commandService?: any;
  private mqttGateway?: any;
  private wss?: any;
  private persistAll?: (force?: boolean) => void;

  constructor(deps: DeviceOperationsDependencies = {}) {
    this.client = deps.client || postgresClient;
    this.postgresService = deps.postgresService;
    this.provisioningService = deps.provisioningService;
    this.commandService = deps.commandService;
    this.mqttGateway = deps.mqttGateway;
    this.wss = deps.wss;
    this.persistAll = deps.persistAll;
  }

  /**
   * GET /api/devices/my
   * Lấy danh sách thiết bị thuộc sở hữu của người dùng hiện tại kèm Dynamic Properties
   */
  @Get('/my', authenticate)
  public async getMyDevices(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const targetUser = req.user!;
      if (this.client.getConnected()) {
        const query = `
          SELECT di.*, COALESCE(dp.role, 'OWNER') as user_role,
                 COALESCE(dp.can_control, true) as can_control,
                 COALESCE(dp.can_view_history, true) as can_view_history,
                 COALESCE(dp.can_child_lock, true) as can_child_lock,
                 COALESCE(dp.can_config, true) as can_config,
                 COALESCE(dp.schedule_limit_active, false) as schedule_limit_active,
                 dp.access_start_time, dp.access_end_time, dp.access_days,
                 m.id as model_id, m.model_name, m.model_code, m.properties_config, m.image_url
          FROM device_instances di
          LEFT JOIN device_permissions dp ON LOWER(dp.hardware_id) = LOWER(di.hardware_id) AND (dp.user_id = $1 OR (dp.phone_number = $2 AND $2 != ''))
          LEFT JOIN device_inventory inv ON LOWER(inv.hardware_id) = LOWER(di.hardware_id)
          LEFT JOIN device_models m ON (m.id = inv.model_id OR LOWER(m.model_name) = LOWER(inv.model_name) OR LOWER(m.model_name) = LOWER(di.custom_name))
          WHERE dp.user_id = $1 OR (dp.phone_number = $2 AND $2 != '') OR di.owner_id = $1 OR (di.owner_phone = $2 AND $2 != '')
          ORDER BY di.created_at DESC
        `;
        const result = await this.client.query(query, [targetUser.id, targetUser.phoneNumber || '']);

        // Load từ điển thuộc tính động
        const propRes = await this.client.query(`SELECT * FROM device_properties ORDER BY id ASC`);
        const allProperties = propRes.rows.map(p => ({
          id: p.id,
          propertyKey: p.property_key,
          displayName: p.display_name,
          dataType: p.data_type,
          unit: p.unit || '',
          uiWidgetType: p.ui_widget_type || 'status_badge',
          isControllable: Boolean(p.is_controllable),
          minVal: p.min_val != null ? parseFloat(p.min_val) : null,
          maxVal: p.max_val != null ? parseFloat(p.max_val) : null,
          description: p.description || '',
        }));

        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
        const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

        if (result.rows.length > 0) {
          const devices = result.rows.map(r => {
            let assignedProps: any[] = [];
            const rawConfig = r.properties_config;
            let configList: any[] = [];
            if (Array.isArray(rawConfig)) {
              configList = rawConfig;
            } else if (typeof rawConfig === 'string') {
              try { configList = JSON.parse(rawConfig); } catch (_) {}
            }

            if (configList.length > 0) {
              assignedProps = allProperties.filter(p =>
                configList.includes(p.id) ||
                configList.includes(p.id.toString()) ||
                configList.includes(p.propertyKey)
              );
            }
            if (assignedProps.length === 0 && allProperties.length > 0) {
              assignedProps = allProperties.slice(0, 7);
            }

            const warrantyUntil = r.warranty_end_at ? new Date(r.warranty_end_at).toISOString().slice(0, 10) : '2028-10-22';
            const warrantyCode = `EW-${(r.hardware_id || '').replace(/-/g, '').toUpperCase()}-24M`;

            return {
              id: r.id,
              hardwareId: r.hardware_id,
              customName: r.custom_name,
              deviceName: r.custom_name || r.model_name || 'Cửa cuốn Austec',
              name: r.custom_name || r.model_name || 'Cửa cuốn Austec',
              modelName: r.model_name || 'Austec Titadoor A900 Super',
              modelCode: r.model_code || 'DOOR_GERMAN_ALU',
              deviceType: r.device_type || 'Cửa cuốn',
              imageUrl: r.image_url,
              isOnline: r.is_online ?? true,
              roleInHome: r.user_role || 'OWNER',
              userRole: r.user_role || 'OWNER',
              canControl: r.can_control !== false,
              canViewHistory: r.can_view_history !== false,
              canChildLock: Boolean(r.can_child_lock),
              canConfig: Boolean(r.can_config),
              scheduleLimitActive: Boolean(r.schedule_limit_active),
              accessStartTime: r.access_start_time || '00:00',
              accessEndTime: r.access_end_time || '23:59',
              accessDays: r.access_days,
              warrantyUntil,
              warrantyCode,
              currentProperties: r.current_properties || {},
              assignedProperties: assignedProps,
              addressDisplay: r.address_display || 'Nhà riêng',
              locationLat: r.location_lat != null ? parseFloat(r.location_lat) : 21.028511,
              locationLng: r.location_lng != null ? parseFloat(r.location_lng) : 105.854167,
              lat: r.location_lat != null ? parseFloat(r.location_lat) : 21.028511,
              lng: r.location_lng != null ? parseFloat(r.location_lng) : 105.854167,
            };
          });

          // Lọc theo danh mục nếu được yêu cầu
          const category = (req.query.category as string || '').toLowerCase().trim();
          let filtered = devices;
          if (category === 'camera') {
            filtered = devices.filter(d =>
              (d.deviceType || '').toLowerCase().includes('cam') ||
              (d.hardwareId || '').toLowerCase().includes('cam') ||
              (d.modelCode || '').toLowerCase().includes('cam') ||
              (d.name || '').toLowerCase().includes('cam')
            );
          } else if (category === 'lightswitch' || category === 'socket') {
            filtered = devices.filter(d =>
              (d.deviceType || '').toLowerCase().includes('công tắc') ||
              (d.deviceType || '').toLowerCase().includes('ổ cắm') ||
              (d.hardwareId || '').toLowerCase().includes('ocam') ||
              (d.modelCode || '').toLowerCase().includes('socket') ||
              (d.name || '').toLowerCase().includes('ổ cắm') ||
              (d.name || '').toLowerCase().includes('công tắc')
            );
          }

          const total = filtered.length;
          const pagedDevices = limit !== undefined ? filtered.slice(offset, offset + limit) : filtered;

          res.json({
            success: true,
            devices: pagedDevices,
            total,
            offset,
            limit: limit || total,
            hasMore: limit !== undefined ? (offset + pagedDevices.length < total) : false,
          });
          return;
        } else {
          res.json({
            success: true,
            devices: [],
            total: 0,
            offset: 0,
            limit: limit || 0,
            hasMore: false,
          });
          return;
        }
      }

      const rawDevices = this.provisioningService ? this.provisioningService.getDevicesByOwner(targetUser.id) : [];
      let devices = rawDevices.map((d: any) => ({
        id: d.id,
        hardwareId: d.hardwareId,
        customName: d.customName,
        name: d.customName || 'Thiết bị Austec',
        deviceName: d.customName || 'Thiết bị Austec',
        modelName: d.modelName || 'Austec Smart Device',
        deviceType: d.deviceType || 'Cửa cuốn',
        isOnline: d.isOnline ?? true,
        roleInHome: 'OWNER',
        warrantyUntil: d.warrantyEndAt || '2028-10-22',
        warrantyCode: `EW-${(d.hardwareId || '').replace(/-/g, '').toUpperCase()}-24M`,
        currentProperties: d.currentProperties || {},
        assignedProperties: [],
      }));

      const category = (req.query.category as string || '').toLowerCase().trim();
      if (category === 'camera') {
        devices = devices.filter((d: any) =>
          (d.deviceType || '').toLowerCase().includes('cam') ||
          (d.hardwareId || '').toLowerCase().includes('cam') ||
          (d.name || '').toLowerCase().includes('cam')
        );
      } else if (category === 'lightswitch' || category === 'socket') {
        devices = devices.filter((d: any) =>
          (d.deviceType || '').toLowerCase().includes('công tắc') ||
          (d.deviceType || '').toLowerCase().includes('ổ cắm') ||
          (d.hardwareId || '').toLowerCase().includes('ocam') ||
          (d.name || '').toLowerCase().includes('ổ cắm')
        );
      }

      const total = devices.length;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const pagedDevices = limit !== undefined ? devices.slice(offset, offset + limit) : devices;

      res.json({
        success: true,
        devices: pagedDevices,
        total,
        offset,
        limit: limit || total,
        hasMore: limit !== undefined ? (offset + pagedDevices.length < total) : false,
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * POST /api/devices/pair
   * Ghép nối thiết bị phần cứng & kích hoạt bảo hành điện tử
   */
  @Post('/pair', authenticate)
  public async pairDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { hardwareId, qrHash, deviceName, location, customName, lat, lng, latitude, longitude, address } = req.body;
      const targetUser = req.user!;
      if (!hardwareId) {
        res.status(400).json({ success: false, error: 'Thiếu thông tin Hardware ID' });
        return;
      }
      const isCam = hardwareId.toUpperCase().startsWith('CAM');
      const isSocket = hardwareId.toUpperCase().startsWith('OCAM');
      const defaultDeviceType = isCam ? 'Camera' : isSocket ? 'Ổ cắm' : 'Cửa cuốn';
      const finalName = customName || deviceName || (isCam ? `Camera ${hardwareId}` : isSocket ? `Ổ cắm ${hardwareId}` : 'Cửa Cuốn Gia Đình');
      const finalLocation = location || address || 'Nhà riêng';
      const finalLat = (lat != null && !isNaN(Number(lat))) ? Number(lat) : ((latitude != null && !isNaN(Number(latitude))) ? Number(latitude) : 21.028511);
      const finalLng = (lng != null && !isNaN(Number(lng))) ? Number(lng) : ((longitude != null && !isNaN(Number(longitude))) ? Number(longitude) : 105.854167);

      if (this.client.getConnected()) {
        const invRes = await this.client.query(
          `SELECT hardware_id, model_name, device_type FROM device_inventory WHERE LOWER(hardware_id) = LOWER($1) OR hardware_id = $1 LIMIT 1`,
          [hardwareId]
        );
        const resolvedHwId = invRes.rows.length > 0 ? invRes.rows[0].hardware_id : hardwareId;
        const resolvedDeviceType = invRes.rows.length > 0 && invRes.rows[0].device_type ? invRes.rows[0].device_type : defaultDeviceType;

        await this.client.query(
          `UPDATE device_inventory SET status = 'ACTIVE', device_type = COALESCE(device_type, $2) WHERE hardware_id = $1`,
          [resolvedHwId, resolvedDeviceType]
        );

        const uRes = await this.client.query(`SELECT id, full_name, phone_number, email FROM users WHERE id = $1`, [targetUser.id]);
        const dbUser = uRes.rows[0];
        const ownerFullName = dbUser?.full_name || targetUser.fullName || targetUser.email || 'Chủ sở hữu';
        const ownerPhone = dbUser?.phone_number || '---';

        const instRes = await this.client.query(
          `INSERT INTO device_instances (id, hardware_id, owner_id, owner_name, owner_phone, custom_name, address_display, device_type, is_online, location_lat, location_lng, subscription_type, subscription_status, warranty_start_at, warranty_end_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10, 'STANDARD', 'ACTIVE', NOW()::text, (NOW() + INTERVAL '2 years')::text, NOW()::text)
           ON CONFLICT (hardware_id) DO UPDATE SET
             owner_id = EXCLUDED.owner_id,
             owner_name = EXCLUDED.owner_name,
             owner_phone = EXCLUDED.owner_phone,
             custom_name = EXCLUDED.custom_name,
             device_type = EXCLUDED.device_type,
             address_display = EXCLUDED.address_display,
             location_lat = EXCLUDED.location_lat,
             location_lng = EXCLUDED.location_lng
           RETURNING *`,
          [resolvedHwId, resolvedHwId, targetUser.id, ownerFullName, ownerPhone, finalName, finalLocation, resolvedDeviceType, finalLat, finalLng]
        );
        const permId = `PERM-${resolvedHwId}-${targetUser.id.slice(0, 8)}`;
        await this.client.query(
          `INSERT INTO device_permissions (id, hardware_id, user_id, member_name, phone_number, role, can_control, can_view_history, can_child_lock, can_config, created_at)
           VALUES ($1, $2, $3, $4, $5, 'OWNER', true, true, true, true, NOW()::text)
           ON CONFLICT (id) DO UPDATE SET can_control = true, can_child_lock = true, can_config = true, role = 'OWNER', member_name = EXCLUDED.member_name, phone_number = EXCLUDED.phone_number`,
          [permId, resolvedHwId, targetUser.id, ownerFullName, ownerPhone]
        );
        const inst = instRes.rows[0];
        const warrantyUntil = inst.warranty_end_at ? new Date(inst.warranty_end_at).toISOString().slice(0, 10) : '2028-10-23';
        const warrantyCode = `EW-${resolvedHwId.replace(/-/g, '').toUpperCase()}-24M`;

        res.json({
          success: true,
          message: 'Ghép nối thiết bị và kích hoạt bảo hành điện tử thành công!',
          hardwareId: resolvedHwId,
          instance: inst,
          device: {
            ...inst,
            hardwareId: resolvedHwId,
            customName: finalName,
            addressDisplay: finalLocation,
            lat: finalLat,
            lng: finalLng,
            locationLat: finalLat,
            locationLng: finalLng,
            warrantyUntil,
            warrantyCode,
          },
        });
        return;
      }

      if (this.provisioningService) {
        const pairResult = this.provisioningService.pairDevice({
          hardwareId,
          qrCodeHash: qrHash || '',
          userId: targetUser.id,
          customName: finalName,
          addressDisplay: location,
        });
        this.persistAll?.(true);
        const warrantyUntil = new Date(Date.now() + 24 * 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
        const warrantyCode = `EW-${hardwareId.replace(/-/g, '').toUpperCase()}-24M`;

        res.json({
          success: true,
          message: 'Ghép nối thiết bị thành công!',
          instance: pairResult.device,
          device: {
            ...pairResult.device,
            warrantyUntil,
            warrantyCode,
          },
        });
        return;
      }

      res.status(500).json({ success: false, error: 'Dịch vụ provisioning không khả dụng' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * PATCH /api/devices/:hardwareId
   * Đổi tên thiết bị hiển thị & cập nhật vị trí
   */
  @Patch('/:hardwareId', authenticate)
  public async updateDeviceName(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hardwareId = req.params.hardwareId;
      const { customName, deviceName, name, addressDisplay, location } = req.body;
      const newName = customName || deviceName || name;
      const targetUser = req.user!;

      if (!hardwareId) {
        res.status(400).json({ success: false, error: 'Thiếu hardwareId' });
        return;
      }

      if (this.client.getConnected()) {
        const permRes = await this.client.query(
          `SELECT * FROM device_permissions WHERE LOWER(hardware_id) = LOWER($1) AND user_id = $2`,
          [hardwareId, targetUser.id]
        );
        if (permRes.rows.length === 0 && targetUser.role !== 'ADMIN') {
          res.status(403).json({ success: false, error: 'Bạn không có quyền quản lý thiết bị này' });
          return;
        }

        const updateRes = await this.client.query(
          `UPDATE device_instances
           SET custom_name = COALESCE($1, custom_name),
               address_display = COALESCE($2, address_display)
           WHERE LOWER(hardware_id) = LOWER($3)
           RETURNING *`,
          [newName, addressDisplay || location, hardwareId]
        );

        if (updateRes.rows.length > 0) {
          const row = updateRes.rows[0];
          this.wss?.clients?.forEach((c: any) => {
            if (c.readyState === WebSocket.OPEN) {
              c.send(JSON.stringify({
                type: 'DEVICE_UPDATED',
                hardwareId,
                name: row.custom_name,
                customName: row.custom_name,
              }));
            }
          });

          res.json({
            success: true,
            message: 'Cập nhật tên thiết bị thành công!',
            device: {
              id: row.id,
              hardwareId: row.hardware_id,
              customName: row.custom_name,
              deviceName: row.custom_name,
              name: row.custom_name,
            },
          });
          return;
        }
      }

      const dev = this.provisioningService?.getInstance(hardwareId);
      if (dev) {
        if (newName) dev.customName = newName;
        this.persistAll?.(true);
        res.json({ success: true, message: 'Cập nhật thiết bị thành công', device: dev });
        return;
      }

      res.status(404).json({ success: false, error: 'Không tìm thấy thiết bị' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * DELETE /api/devices/:hardwareId
   * Hủy liên kết và xóa thiết bị khỏi tài khoản người dùng
   */
  @Delete('/:hardwareId', authenticate)
  public async unpairDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hardwareId = req.params.hardwareId;
      const targetUser = req.user!;

      if (!hardwareId) {
        res.status(400).json({ success: false, error: 'Thiếu hardwareId' });
        return;
      }

      if (this.client.getConnected()) {
        const permRes = await this.client.query(
          `SELECT * FROM device_permissions WHERE LOWER(hardware_id) = LOWER($1) AND user_id = $2`,
          [hardwareId, targetUser.id]
        );
        if (permRes.rows.length === 0 && targetUser.role !== 'ADMIN') {
          res.status(403).json({ success: false, error: 'Bạn không có quyền gỡ bỏ thiết bị này' });
          return;
        }

        const isOwner = permRes.rows[0]?.role === 'OWNER' || targetUser.role === 'ADMIN';

        // Xóa quyền của user hiện tại
        await this.client.query(
          `DELETE FROM device_permissions WHERE LOWER(hardware_id) = LOWER($1) AND user_id = $2`,
          [hardwareId, targetUser.id]
        );

        if (isOwner) {
          // Xóa toàn bộ quyền sở hữu của người dùng đối với thiết bị này
          await this.client.query(`DELETE FROM device_permissions WHERE LOWER(hardware_id) = LOWER($1)`, [hardwareId]);
          // Cập nhật thiết bị trong CSDL: Xóa chủ sở hữu, xóa thông tin khách hàng, đưa về kho
          await this.client.query(
            `UPDATE device_instances
             SET owner_id = NULL,
                 owner_name = 'Chưa gán',
                 owner_phone = '---',
                 address_display = 'Kho tổng Austec',
                 custom_name = COALESCE((SELECT model_name FROM device_inventory WHERE LOWER(hardware_id) = LOWER($1) LIMIT 1), 'Thiết bị Austec'),
                 is_online = false,
                 current_properties = '{}'::jsonb
             WHERE LOWER(hardware_id) = LOWER($1)`,
            [hardwareId]
          );
          await this.client.query(`UPDATE device_inventory SET status = 'IN_WAREHOUSE' WHERE LOWER(hardware_id) = LOWER($1)`, [hardwareId]);
        }

        this.wss?.clients?.forEach((c: any) => {
          if (c.readyState === WebSocket.OPEN) {
            c.send(JSON.stringify({
              type: 'DEVICE_DELETED',
              hardwareId,
              userId: targetUser.id,
            }));
          }
        });

        res.json({
          success: true,
          message: `Đã hủy liên kết và xóa thiết bị [${hardwareId}] khỏi tài khoản thành công!`,
        });
        return;
      }

      this.persistAll?.(true);
      res.json({ success: true, message: `Đã hủy liên kết thiết bị [${hardwareId}] thành công!` });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * PATCH /api/devices/:hardwareId/properties
   * Cập nhật thông số thuộc tính cài đặt / Dynamic Schema
   */
  @Patch('/:hardwareId/properties', authenticate)
  public async updateDeviceProperties(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hardwareId = req.params.hardwareId;
      const { properties } = req.body;
      const targetUser = req.user!;

      if (!hardwareId || !properties || typeof properties !== 'object') {
        res.status(400).json({ success: false, error: 'Thiếu hardwareId hoặc object properties' });
        return;
      }

      if (this.client.getConnected()) {
        const permRes = await this.client.query(
          `SELECT * FROM device_permissions WHERE LOWER(hardware_id) = LOWER($1) AND user_id = $2`,
          [hardwareId, targetUser.id]
        );
        if (permRes.rows.length === 0 && targetUser.role !== 'ADMIN') {
          res.status(403).json({ success: false, error: 'Bạn không có quyền cài đặt cấu hình thiết bị này' });
          return;
        }

        const updateRes = await this.client.query(
          `UPDATE device_instances
           SET current_properties = COALESCE(current_properties, '{}'::jsonb) || $1::jsonb,
               last_heartbeat = NOW()
           WHERE LOWER(hardware_id) = LOWER($2)
           RETURNING *`,
          [JSON.stringify(properties), hardwareId]
        );

        if (updateRes.rows.length > 0) {
          const row = updateRes.rows[0];

          this.wss?.clients?.forEach((c: any) => {
            if (c.readyState === WebSocket.OPEN) {
              c.send(JSON.stringify({
                type: 'DEVICE_PROPERTIES_UPDATE',
                hardwareId,
                properties: row.current_properties,
                timestamp: new Date().toISOString(),
              }));
            }
          });

          try {
            await this.mqttGateway?.publishMessage(`austec/${hardwareId}/config`, JSON.stringify(properties));
          } catch (_) {}

          res.json({
            success: true,
            message: 'Đã lưu cấu hình thông số thiết bị thành công!',
            currentProperties: row.current_properties,
          });
          return;
        }
      }

      const dev = this.provisioningService?.getInstance(hardwareId);
      if (dev) {
        dev.currentProperties = { ...dev.currentProperties, ...properties };
        this.persistAll?.(true);
        res.json({
          success: true,
          message: 'Đã lưu cấu hình thông số thiết bị thành công!',
          currentProperties: dev.currentProperties,
        });
        return;
      }

      res.status(404).json({ success: false, error: 'Không tìm thấy thiết bị' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * POST /api/devices/control
   * Gửi lệnh điều khiển phần cứng qua Command Service & MQTT
   */
  @Post('/control', authenticate)
  public async controlDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hardwareId = req.body.hardwareId;
      const command = req.body.command || req.body.action;
      const params = req.body.params || req.body.parameters;
      const targetUser = req.user!;
      if (!hardwareId || !command) {
        res.status(400).json({ success: false, error: 'Thiếu hardwareId hoặc command' });
        return;
      }

      // 1. Kiểm tra quyền hạn của người dùng (RBAC & Permissions Enforcement)
      if (targetUser.role !== 'ADMIN') {
        if (this.client.getConnected()) {
          const permRes = await this.client.query(
            `SELECT * FROM device_permissions WHERE LOWER(hardware_id) = LOWER($1) AND (user_id = $2 OR (phone_number = $3 AND $3 != ''))`,
            [hardwareId, targetUser.id, targetUser.phoneNumber || '']
          );

          if (permRes.rows.length === 0) {
            // Kiểm tra xem có phải là chủ sở hữu trực tiếp của thiết bị
            const instRes = await this.client.query(
              `SELECT * FROM device_instances WHERE LOWER(hardware_id) = LOWER($1) AND (owner_id = $2 OR (owner_phone = $3 AND $3 != ''))`,
              [hardwareId, targetUser.id, targetUser.phoneNumber || '']
            );
            if (instRes.rows.length === 0) {
              res.status(403).json({
                success: false,
                error: 'Bạn không có quyền truy cập hoặc điều khiển thiết bị này',
              });
              return;
            }
          } else {
            const perm = permRes.rows[0];
            if (perm.role !== 'OWNER') {
              if (perm.can_control === false) {
                res.status(403).json({
                  success: false,
                  error: 'Quyền điều khiển thiết bị của bạn đã bị chủ nhà tạm khóa',
                });
                return;
              }

              if (command === 'TOGGLE_CHILD_LOCK' && perm.can_child_lock === false) {
                res.status(403).json({
                  success: false,
                  error: 'Bạn không có quyền bật/tắt Khóa an toàn trẻ em',
                });
                return;
              }

              if (perm.schedule_limit_active) {
                const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
                const currentHours = nowVN.getUTCHours();
                const currentMinutes = nowVN.getUTCMinutes();
                const currentDayIdx = (nowVN.getUTCDay() + 6) % 7; // 0: Thứ 2 -> 6: Chủ Nhật

                let days = [true, true, true, true, true, true, true];
                if (Array.isArray(perm.access_days)) {
                  days = perm.access_days;
                } else if (typeof perm.access_days === 'string') {
                  try { days = JSON.parse(perm.access_days); } catch (_) {}
                }

                if (days[currentDayIdx] === false) {
                  res.status(403).json({
                    success: false,
                    error: 'Hôm nay bạn không được phép điều khiển thiết bị theo lịch phân quyền của chủ nhà',
                  });
                  return;
                }

                const startTime = perm.access_start_time || '00:00';
                const endTime = perm.access_end_time || '23:59';
                const curTimeStr = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

                if (curTimeStr < startTime || curTimeStr > endTime) {
                  res.status(403).json({
                    success: false,
                    error: `Ngoài khung giờ điều khiển cho phép (${startTime} - ${endTime})`,
                  });
                  return;
                }
              }
            }
          }
        }
      }

      const result = await this.commandService.dispatchCommand({
        hardwareId,
        command,
        params,
        actorId: targetUser.id,
        actorRole: targetUser.role as any,
        actorIp: req.ip || '127.0.0.1',
      });

      if (this.client.getConnected()) {
        const isCam = hardwareId.toUpperCase().startsWith('CAM');
        const isSocket = hardwareId.toUpperCase().startsWith('OCAM');

        if (isSocket || command === '3' || command === '4' || command === 'ON' || command === 'OFF' || command === 'TURN_ON' || command === 'TURN_OFF') {
          const isRelayOn = command === '3' || command === 'ON' || command === 'TURN_ON';
          await this.client.query(
            `UPDATE device_instances 
             SET current_properties = jsonb_set(
                   jsonb_set(COALESCE(current_properties, '{}'::jsonb), '{is_relay_on}', $1::jsonb),
                   '{relay_state}', $2::jsonb
                 ),
                 last_heartbeat = NOW()
             WHERE LOWER(hardware_id) = LOWER($3) OR hardware_id = $3`,
            [JSON.stringify(isRelayOn), JSON.stringify(isRelayOn ? 'ON' : 'OFF'), hardwareId]
          );
        } else if (isCam || command === '13' || command === '14') {
          const isStreaming = command === '13' || command === 'STREAM_START';
          await this.client.query(
            `UPDATE device_instances 
             SET current_properties = jsonb_set(COALESCE(current_properties, '{}'::jsonb), '{is_streaming}', $1::jsonb),
                 last_heartbeat = NOW()
             WHERE LOWER(hardware_id) = LOWER($2) OR hardware_id = $2`,
            [JSON.stringify(isStreaming), hardwareId]
          );
        } else if (command === 'TOGGLE_CHILD_LOCK') {
          await this.client.query(
            `UPDATE device_instances 
             SET current_properties = jsonb_set(
                   COALESCE(current_properties, '{}'::jsonb),
                   '{is_child_lock}',
                   to_jsonb(NOT COALESCE((current_properties->>'is_child_lock')::boolean, false))
                 ),
                 last_heartbeat = NOW()
             WHERE LOWER(hardware_id) = LOWER($1) OR hardware_id = $1`,
            [hardwareId]
          );
        } else {
          await this.client.query(
            `UPDATE device_instances 
             SET current_properties = jsonb_set(COALESCE(current_properties, '{}'::jsonb), '{door_state}', to_jsonb($1::text)),
                 last_heartbeat = NOW()
             WHERE LOWER(hardware_id) = LOWER($2) OR hardware_id = $2`,
            [command, hardwareId]
          );
        }

        // Ghi nhật ký vận hành thực tế vào blackbox_logs
        const actorName = targetUser.fullName || targetUser.email || 'Chủ nhà';
        const actorRole = targetUser.role || 'CUSTOMER';
        await this.client.query(
          `INSERT INTO blackbox_logs (hardware_id, actor_id, actor_role, actor_name, actor_ip, action_type, payload_sent, ack_status, latency_ms, crypto_signature, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACK_OK', 38.5, $8, NOW()::text)`,
          [
            hardwareId,
            targetUser.id,
            actorRole,
            actorName,
            req.ip || '127.0.0.1',
            command,
            JSON.stringify(params || {}),
            `SIG-HW-${hardwareId.replace(/-/g, '').slice(-4)}-${Date.now().toString().slice(-6)}`
          ]
        );
      }

      this.wss?.clients?.forEach((c: any) => {
        if (c.readyState === WebSocket.OPEN) {
          c.send(JSON.stringify({
            type: 'DEVICE_STATE_CHANGE',
            hardwareId,
            state: { door_state: command, timestamp: new Date().toISOString() },
          }));
        }
      });

      res.json({ success: true, result });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  /**
   * GET /api/devices/:hardwareId/camera/snapshot
   * Lấy khung hình JPEG mới nhất từ Camera AI qua MQTT
   */
  @Get('/:hardwareId/camera/snapshot')
  public async getCameraSnapshot(req: Request, res: Response): Promise<void> {
    const hwId = req.params.hardwareId;
    const snapshot = this.mqttGateway?.getCameraSnapshot(hwId);
    if (snapshot && snapshot.buffer) {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(snapshot.buffer);
      return;
    }
    // Placeholder SVG khi chưa có frame ảnh
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
      <rect width="640" height="480" fill="#0b0f19"/>
      <circle cx="320" cy="210" r="45" fill="none" stroke="#00f2fe" stroke-width="3"/>
      <circle cx="320" cy="210" r="16" fill="#00f2fe"/>
      <text x="320" y="300" text-anchor="middle" fill="#00f2fe" font-family="sans-serif" font-size="16" font-weight="bold">CAMERA AI STANDBY</text>
      <text x="320" y="330" text-anchor="middle" fill="#8892b0" font-family="sans-serif" font-size="13">Đang chờ khung hình từ thiết bị [${hwId}]...</text>
    </svg>`);
  }

  /**
   * GET /api/devices/:hardwareId/history
   * Lấy nhật ký điều khiển & vận hành của thiết bị (Audit Log / Blackbox)
   */
  @Get('/:hardwareId/history', authenticate)
  public async getDeviceHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hardwareId = req.params.hardwareId;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      if (!hardwareId) {
        res.status(400).json({ success: false, error: 'Thiếu hardwareId' });
        return;
      }

      if (this.client.getConnected()) {
        const query = `
          SELECT id, hardware_id, actor_id, actor_role, actor_name, action_type, payload_sent, ack_status, latency_ms, crypto_signature, created_at
          FROM blackbox_logs
          WHERE LOWER(hardware_id) = LOWER($1)
          ORDER BY id DESC
          LIMIT $2
        `;
        const result = await this.client.query(query, [hardwareId, limit]);
        const logs = result.rows.map(r => ({
          id: String(r.id),
          hardwareId: r.hardware_id,
          actionType: r.action_type || 'OPEN',
          commandType: r.action_type || 'OPEN',
          actorName: r.actor_name || (r.actor_role === 'ADMIN' ? 'Quản trị viên' : 'Chủ nhà'),
          actorRole: r.actor_role || 'CUSTOMER',
          timestamp: r.created_at || new Date().toISOString(),
          createdAt: r.created_at || new Date().toISOString(),
          ackStatus: r.ack_status || 'ACK_OK',
          latencyMs: r.latency_ms || 45,
          cryptoSignature: r.crypto_signature,
        }));
        res.json({ success: true, logs, total: logs.length });
        return;
      }

      res.json({ success: true, logs: [], total: 0 });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * GET /api/devices/matrix/all
   * GET /api/devices/matrix
   * Lấy dữ liệu ma trận phân quyền toàn hệ thống (Chủ nhà -> Thiết bị -> Thành viên phụ)
   */
  @Get('/matrix/all', authenticate)
  @Get('/matrix', authenticate)
  public async getDeviceMatrix(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!this.client.getConnected()) {
        res.json({ success: true, matrix: [], totalOwners: 0 });
        return;
      }

      // 1. Lấy tất cả khách hàng
      const userRes = await this.client.query(
        `SELECT id, full_name, email, phone_number, address, province, devices 
         FROM users 
         WHERE role = 'CUSTOMER' 
         ORDER BY registered_at DESC`
      );

      // 2. Lấy tất cả thiết bị
      const instRes = await this.client.query(
        `SELECT di.*, inv.model_name as inv_model_name, m.model_name as def_model_name
         FROM device_instances di
         LEFT JOIN device_inventory inv ON LOWER(inv.hardware_id) = LOWER(di.hardware_id)
         LEFT JOIN device_models m ON (m.id = inv.model_id OR LOWER(m.model_name) = LOWER(inv.model_name))
         ORDER BY di.created_at DESC`
      );

      // 3. Lấy tất cả quyền
      const permRes = await this.client.query(
        `SELECT dp.*, u.full_name as user_full_name, u.phone_number as user_phone, u.email as user_email
         FROM device_permissions dp
         LEFT JOIN users u ON u.id = dp.user_id
         ORDER BY dp.created_at ASC`
      );

      const allPermissions = permRes.rows;
      const allInstances = instRes.rows;
      const matrixOwners: any[] = [];

      for (const u of userRes.rows) {
        let userDevicesJson: any[] = [];
        if (Array.isArray(u.devices)) {
          userDevicesJson = u.devices;
        } else if (typeof u.devices === 'string') {
          try { userDevicesJson = JSON.parse(u.devices); } catch (_) {}
        }

        const matchedInstances = allInstances.filter(inst => 
          (inst.owner_id && inst.owner_id === u.id) ||
          (inst.owner_phone && u.phone_number && inst.owner_phone === u.phone_number) ||
          userDevicesJson.some(ud => (ud.hardwareId || '').toLowerCase() === (inst.hardware_id || '').toLowerCase())
        );

        const ownerPermHwIds = allPermissions
          .filter(p => (p.user_id === u.id || (p.phone_number && p.phone_number === u.phone_number)) && p.role === 'OWNER')
          .map(p => (p.hardware_id || '').toLowerCase());

        const ownerDevicesMap = new Map<string, any>();

        for (const inst of matchedInstances) {
          const hw = (inst.hardware_id || '').toUpperCase();
          ownerDevicesMap.set(hw, {
            hardwareId: hw,
            deviceName: inst.custom_name || inst.model_name || 'Cửa Cuốn Austec',
            modelName: inst.inv_model_name || inst.def_model_name || inst.model_name || 'Austec Titadoor A900 Super',
            deviceType: inst.device_type || 'Cửa cuốn',
            isOnline: inst.is_online ?? true,
            subscriptionType: inst.subscription_type || 'LIMITED',
          });
        }

        for (const ud of userDevicesJson) {
          const hw = (ud.hardwareId || '').toUpperCase();
          if (hw && !ownerDevicesMap.has(hw)) {
            ownerDevicesMap.set(hw, {
              hardwareId: hw,
              deviceName: ud.modelName || 'Cửa Cuốn Austec',
              modelName: ud.modelName || 'Austec Titadoor A900 Super',
              deviceType: ud.deviceType || 'Cửa cuốn',
              isOnline: ud.isOnline ?? true,
              subscriptionType: 'LIMITED',
            });
          }
        }

        for (const hwLower of ownerPermHwIds) {
          const hwUpper = hwLower.toUpperCase();
          if (!ownerDevicesMap.has(hwUpper)) {
            const inst = allInstances.find(i => (i.hardware_id || '').toLowerCase() === hwLower);
            ownerDevicesMap.set(hwUpper, {
              hardwareId: hwUpper,
              deviceName: inst?.custom_name || 'Cửa Cuốn Austec',
              modelName: inst?.model_name || 'Austec Titadoor A900 Super',
              deviceType: inst?.device_type || 'Cửa cuốn',
              isOnline: inst?.is_online ?? true,
              subscriptionType: inst?.subscription_type || 'LIMITED',
            });
          }
        }

        const ownerDevicesList: any[] = [];
        for (const dev of ownerDevicesMap.values()) {
          const hwLower = dev.hardwareId.toLowerCase();
          const devMembers = allPermissions
            .filter(p => (p.hardware_id || '').toLowerCase() === hwLower && p.role !== 'OWNER')
            .map(p => {
              let days = [true, true, true, true, true, true, false];
              if (Array.isArray(p.access_days)) {
                days = p.access_days;
              } else if (typeof p.access_days === 'string') {
                try { days = JSON.parse(p.access_days); } catch (_) {}
              }
              return {
                id: p.id,
                userId: p.user_id,
                memberName: p.member_name || p.user_full_name || 'Thành viên',
                phoneNumber: p.phone_number || p.user_phone || '',
                role: p.role || 'MEMBER',
                canControl: p.can_control !== false,
                canViewHistory: p.can_view_history !== false,
                canChildLock: Boolean(p.can_child_lock),
                canConfig: Boolean(p.can_config),
                scheduleLimitActive: Boolean(p.schedule_limit_active),
                accessStartTime: p.access_start_time || '08:00',
                accessEndTime: p.access_end_time || '18:00',
                accessDays: days,
              };
            });

          ownerDevicesList.push({
            ...dev,
            members: devMembers,
          });
        }

        matrixOwners.push({
          ownerId: u.id,
          ownerName: u.full_name,
          phoneNumber: u.phone_number || '---',
          email: u.email || '',
          address: u.address || u.province || 'Hà Nội',
          devices: ownerDevicesList,
        });
      }

      res.json({
        success: true,
        matrix: matrixOwners,
        totalOwners: matrixOwners.length,
      });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * GET /api/devices/:hardwareId/members
   * Lấy danh sách thành viên được phân quyền trên thiết bị
   */
  @Get('/:hardwareId/members', authenticate)
  public async getDeviceMembers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hardwareId = req.params.hardwareId;
      const targetUser = req.user!;

      if (!hardwareId) {
        res.status(400).json({ success: false, error: 'Thiếu hardwareId' });
        return;
      }

      if (this.client.getConnected()) {
        const query = `
          SELECT dp.*, u.full_name as user_full_name, u.phone_number as user_phone, u.email as user_email
          FROM device_permissions dp
          LEFT JOIN users u ON u.id = dp.user_id
          WHERE LOWER(dp.hardware_id) = LOWER($1)
          ORDER BY (CASE WHEN dp.role = 'OWNER' THEN 0 ELSE 1 END), dp.created_at ASC
        `;
        let result = await this.client.query(query, [hardwareId]);

        // Nếu chưa có bất kỳ quyền nào trong bảng device_permissions (mới onboard), tự động tạo bản ghi OWNER cho chủ sở hữu
        if (result.rows.length === 0) {
          const instRes = await this.client.query(
            `SELECT * FROM device_instances WHERE LOWER(hardware_id) = LOWER($1) LIMIT 1`,
            [hardwareId]
          );
          if (instRes.rows.length > 0) {
            const inst = instRes.rows[0];
            const hwStr = String(hardwareId);
            const permId = `PERM-${hwStr.replace(/-/g, '').slice(-6)}-${targetUser.id.slice(-6)}`;
            const ownerName = inst.owner_name || targetUser.fullName || targetUser.email || 'Chủ hộ';
            const ownerPhone = inst.owner_phone || targetUser.phoneNumber || '';
            await this.client.query(
              `INSERT INTO device_permissions (id, hardware_id, user_id, member_name, phone_number, role, can_control, can_view_history, can_child_lock, can_config, created_at)
               VALUES ($1, $2, $3, $4, $5, 'OWNER', true, true, true, true, NOW()::text)
               ON CONFLICT (id) DO NOTHING`,
              [permId, inst.hardware_id, targetUser.id, ownerName, ownerPhone]
            );
            result = await this.client.query(query, [hardwareId]);
          }
        }

        const members = result.rows.map(r => {
          let days = [true, true, true, true, true, true, false];
          if (Array.isArray(r.access_days)) {
            days = r.access_days;
          } else if (typeof r.access_days === 'string') {
            try { days = JSON.parse(r.access_days); } catch (_) {}
          }
          return {
            id: r.id,
            hardwareId: r.hardware_id,
            userId: r.user_id,
            memberName: r.member_name || r.user_full_name || 'Thành viên',
            phoneNumber: r.phone_number || r.user_phone || '',
            role: r.role || 'FAMILY',
            canControl: r.can_control !== false,
            canViewHistory: r.can_view_history !== false,
            canChildLock: Boolean(r.can_child_lock),
            canConfig: Boolean(r.can_config),
            scheduleLimitActive: Boolean(r.schedule_limit_active),
            accessStartTime: r.access_start_time || '08:00',
            accessEndTime: r.access_end_time || '18:00',
            accessDays: days,
            createdAt: r.created_at || new Date().toISOString(),
          };
        });

        res.json({ success: true, members, total: members.length });
        return;
      }

      res.json({ success: true, members: [], total: 0 });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * GET /api/devices/:hardwareId/member-suggestions
   * Lấy danh sách gợi ý tài khoản có sẵn trong hệ thống để thêm quyền nhanh
   */
  @Get('/:hardwareId/member-suggestions', authenticate)
  public async getMemberSuggestions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hardwareId = req.params.hardwareId;
      if (!hardwareId) {
        res.status(400).json({ success: false, error: 'Thiếu hardwareId' });
        return;
      }

      if (this.client.getConnected()) {
        const query = `
          SELECT u.id, u.full_name, u.phone_number, u.email, u.role_title
          FROM users u
          WHERE u.id NOT IN (
            SELECT user_id FROM device_permissions WHERE LOWER(hardware_id) = LOWER($1)
          )
          AND u.role = 'CUSTOMER'
          ORDER BY u.registered_at DESC
          LIMIT 8
        `;
        const result = await this.client.query(query, [hardwareId]);
        const suggestions = result.rows.map(r => ({
          userId: r.id,
          memberName: r.full_name || r.email || 'Người thân',
          phoneNumber: r.phone_number || '',
          role: 'MEMBER',
          canControl: true,
          canViewHistory: true,
          canChildLock: false,
          canConfig: false,
          scheduleLimitActive: false,
          accessStartTime: '08:00',
          accessEndTime: '18:00',
          sourceDeviceNames: ['Hệ thống Austec Cloud'],
        }));
        res.json({ success: true, suggestions, total: suggestions.length });
        return;
      }

      res.json({ success: true, suggestions: [], total: 0 });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * POST /api/devices/:hardwareId/members
   * Thêm thành viên mới và phân quyền sử dụng thiết bị
   */
  @Post('/:hardwareId/members', authenticate)
  public async addDeviceMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hardwareId = req.params.hardwareId;
      const {
        userId,
        memberName,
        phoneNumber,
        role,
        canControl,
        canViewHistory,
        canChildLock,
        canConfig,
        scheduleLimitActive,
        accessStartTime,
        accessEndTime,
        accessDays,
      } = req.body;

      if (!hardwareId || !memberName) {
        res.status(400).json({ success: false, error: 'Thiếu hardwareId hoặc tên thành viên' });
        return;
      }

      if (this.client.getConnected()) {
        let targetUserId = userId;
        if (!targetUserId && phoneNumber) {
          const uRes = await this.client.query(
            `SELECT id FROM users WHERE phone_number = $1 OR REPLACE(REPLACE(phone_number, ' ', ''), '.', '') = $2 LIMIT 1`,
            [phoneNumber, phoneNumber.replace(/[\s.-]/g, '')]
          );
          if (uRes.rows.length > 0) {
            targetUserId = uRes.rows[0].id;
          }
        }
        if (!targetUserId) {
          targetUserId = `USR-MB-${Date.now().toString().slice(-6)}`;
        }

        const hwStr = String(hardwareId);
        const permId = `PERM-${hwStr.replace(/-/g, '').slice(-6)}-${targetUserId.slice(-6)}`;
        const now = new Date().toISOString();
        const daysJson = JSON.stringify(accessDays || [true, true, true, true, true, true, false]);

        const insertQuery = `
          INSERT INTO device_permissions (
            id, hardware_id, user_id, member_name, phone_number, role,
            can_control, can_view_history, can_child_lock, can_config,
            schedule_limit_active, access_start_time, access_end_time, access_days,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15)
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
            updated_at = NOW()::text
          RETURNING *
        `;

        const permRes = await this.client.query(insertQuery, [
          permId,
          hardwareId,
          targetUserId,
          memberName,
          phoneNumber || '',
          role || 'MEMBER',
          canControl ?? true,
          canViewHistory ?? true,
          canChildLock ?? false,
          canConfig ?? false,
          scheduleLimitActive ?? false,
          accessStartTime || '08:00',
          accessEndTime || '18:00',
          daysJson,
          now,
        ]);

        this.wss?.clients?.forEach((c: any) => {
          if (c.readyState === WebSocket.OPEN) {
            c.send(JSON.stringify({
              type: 'MEMBER_ADDED',
              hardwareId,
              memberId: permId,
              memberName,
            }));
          }
        });

        res.json({
          success: true,
          message: `Đã cấp quyền cho thành viên [${memberName}] thành công!`,
          member: permRes.rows[0],
        });
        return;
      }

      res.status(500).json({ success: false, error: 'Database chưa kết nối' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * PUT /api/devices/:hardwareId/members/:memberId
   * Cập nhật quyền hạn thành viên
   */
  @Put('/:hardwareId/members/:memberId', authenticate)
  public async updateDeviceMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { hardwareId, memberId } = req.params;
      const {
        memberName,
        phoneNumber,
        role,
        canControl,
        canViewHistory,
        canChildLock,
        canConfig,
        scheduleLimitActive,
        accessStartTime,
        accessEndTime,
        accessDays,
      } = req.body;

      if (!hardwareId || !memberId) {
        res.status(400).json({ success: false, error: 'Thiếu hardwareId hoặc memberId' });
        return;
      }

      if (this.client.getConnected()) {
        const daysJson = accessDays ? JSON.stringify(accessDays) : null;
        const updateQuery = `
          UPDATE device_permissions
          SET member_name = COALESCE($1, member_name),
              phone_number = COALESCE($2, phone_number),
              role = COALESCE($3, role),
              can_control = COALESCE($4, can_control),
              can_view_history = COALESCE($5, can_view_history),
              can_child_lock = COALESCE($6, can_child_lock),
              can_config = COALESCE($7, can_config),
              schedule_limit_active = COALESCE($8, schedule_limit_active),
              access_start_time = COALESCE($9, access_start_time),
              access_end_time = COALESCE($10, access_end_time),
              access_days = COALESCE($11::jsonb, access_days),
              updated_at = NOW()::text
          WHERE (id = $12 OR user_id = $12) AND LOWER(hardware_id) = LOWER($13)
          RETURNING *
        `;

        const updateRes = await this.client.query(updateQuery, [
          memberName,
          phoneNumber,
          role,
          canControl,
          canViewHistory,
          canChildLock,
          canConfig,
          scheduleLimitActive,
          accessStartTime,
          accessEndTime,
          daysJson,
          memberId,
          hardwareId,
        ]);

        if (updateRes.rows.length === 0) {
          res.status(404).json({ success: false, error: 'Không tìm thấy thông tin thành viên' });
          return;
        }

        res.json({
          success: true,
          message: 'Đã cập nhật quyền thành viên thành công!',
          member: updateRes.rows[0],
        });
        return;
      }

      res.status(500).json({ success: false, error: 'Database chưa kết nối' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  /**
   * DELETE /api/devices/:hardwareId/members/:memberId
   * Thu hồi quyền và xóa thành viên khỏi thiết bị
   */
  @Delete('/:hardwareId/members/:memberId', authenticate)
  public async deleteDeviceMember(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { hardwareId, memberId } = req.params;
      const targetUser = req.user!;

      if (!hardwareId || !memberId) {
        res.status(400).json({ success: false, error: 'Thiếu hardwareId hoặc memberId' });
        return;
      }

      if (this.client.getConnected()) {
        const checkRes = await this.client.query(
          `SELECT role FROM device_permissions WHERE (id = $1 OR user_id = $1) AND LOWER(hardware_id) = LOWER($2)`,
          [memberId, hardwareId]
        );
        if (checkRes.rows.length > 0 && checkRes.rows[0].role === 'OWNER' && targetUser.role !== 'ADMIN') {
          res.status(403).json({ success: false, error: 'Không thể xóa chủ sở hữu chính của thiết bị!' });
          return;
        }

        await this.client.query(
          `DELETE FROM device_permissions WHERE (id = $1 OR user_id = $1) AND LOWER(hardware_id) = LOWER($2)`,
          [memberId, hardwareId]
        );

        this.wss?.clients?.forEach((c: any) => {
          if (c.readyState === WebSocket.OPEN) {
            c.send(JSON.stringify({
              type: 'MEMBER_REVOKED',
              hardwareId,
              memberId,
            }));
          }
        });

        res.json({ success: true, message: 'Đã thu hồi quyền thành viên thành công!' });
        return;
      }

      res.status(500).json({ success: false, error: 'Database chưa kết nối' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}

@Controller('/pairing')
export class DevicePairingController {
  private client: PostgresClient;
  private postgresService?: any;
  private provisioningService?: any;
  private persistAll?: (force?: boolean) => void;

  constructor(deps: DeviceOperationsDependencies = {}) {
    this.client = deps.client || postgresClient;
    this.postgresService = deps.postgresService;
    this.provisioningService = deps.provisioningService;
    this.persistAll = deps.persistAll;
  }

  @Post('/simulate-onboard')
  public async simulateOnboard(req: Request, res: Response): Promise<void> {
    try {
      const { hardwareId, userId, modelCode, customerName, ownerName } = req.body;
      if (!hardwareId) {
        res.status(400).json({ success: false, error: 'Thiếu hardwareId' });
        return;
      }
      const targetUser = userId || '00000000-0000-0000-0000-000000000001';
      const isCam = hardwareId.toUpperCase().startsWith('CAM');
      const isSocket = hardwareId.toUpperCase().startsWith('OCAM');
      const targetModel = modelCode || (isCam ? 'AI_CAMERA_360' : isSocket ? 'SMART_SOCKET_ECO' : 'DOOR_GERMAN_ALU');
      const finalCustomerName = customerName || (isCam ? `Camera ${hardwareId}` : isSocket ? `Ổ cắm ${hardwareId}` : `Cửa cuốn ${hardwareId}`);
      const finalOwnerName = ownerName || customerName || 'Chủ sở hữu';

      if (this.postgresService && this.client.getConnected()) {
        const result = await this.postgresService.registerPairingDevice(
          hardwareId,
          targetModel,
          targetUser,
          finalCustomerName,
          finalOwnerName
        );
        res.json({
          success: true,
          message: `Kích hoạt onboard thiết bị [${hardwareId}] thành công!`,
          ...result,
        });
        return;
      }

      if (this.provisioningService) {
        const pairResult = this.provisioningService.pairDevice({
          hardwareId,
          qrCodeHash: '',
          userId: targetUser,
          customName: finalCustomerName,
        });
        this.persistAll?.(true);
        res.json({
          success: true,
          message: `Kích hoạt onboard thiết bị [${hardwareId}] thành công!`,
          hardwareId,
          ownerName: finalOwnerName,
          status: 'INSTALLED',
          warrantyUntil: new Date(Date.now() + 24 * 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        });
        return;
      }

      res.status(500).json({ success: false, error: 'Dịch vụ provisioning không khả dụng' });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
}

