import { DevicesRepository } from './devices.repository.js';
import {
  CreateGroupSchema,
  CreateDeviceTypeSchema,
  CreatePropertySchema,
  CreateModelSchema,
} from './dto/device.dto.js';

export class DevicesService {
  constructor(private repo: DevicesRepository = new DevicesRepository()) {}

  // Groups
  public async getGroups() {
    return await this.repo.getGroups();
  }

  public async createGroup(raw: unknown) {
    const v = CreateGroupSchema.parse(raw);
    return await this.repo.createGroup({
      code: v.code,
      groupName: v.groupName || v.name || v.group_name,
      imageUrl: v.imageUrl || v.image_url,
      bannerUrl: v.bannerUrl || v.banner_url,
      description: v.description,
      displayOrder: v.displayOrder ?? v.display_order ?? 0,
    } as any);
  }

  public async updateGroup(id: number, raw: unknown) {
    return await this.repo.updateGroup(id, raw as any);
  }

  public async deleteGroup(id: number) {
    return await this.repo.deleteGroup(id);
  }

  // Device Types
  public async getDeviceTypes() {
    return await this.repo.getDeviceTypes();
  }

  public async createDeviceType(raw: unknown) {
    const v = CreateDeviceTypeSchema.parse(raw);
    return await this.repo.createDeviceType({
      typeCode: v.typeCode || v.type_code || v.code,
      typeName: v.typeName || v.type_name || v.name,
      imageUrl: v.imageUrl || v.image_url || v.iconSvg || v.icon_svg,
      iconSvg: v.iconSvg || v.icon_svg || v.imageUrl || v.image_url,
      description: v.description,
    } as any);
  }

  public async updateDeviceType(id: number, raw: unknown) {
    return await this.repo.updateDeviceType(id, raw as any);
  }

  public async deleteDeviceType(id: number) {
    return await this.repo.deleteDeviceType(id);
  }

  // Properties
  public async getProperties() {
    return await this.repo.getProperties();
  }

  public async createProperty(raw: unknown) {
    const v = CreatePropertySchema.parse(raw);
    return await this.repo.createProperty({
      propertyKey: v.propertyKey || v.property_key,
      displayName: v.displayName || v.display_name,
      dataType: v.dataType || v.data_type || 'BOOLEAN',
      unit: v.unit || '',
      uiWidgetType: v.uiWidgetType || v.ui_widget_type || 'TOGGLE',
      isControllable: v.isControllable ?? v.is_controllable ?? true,
      minVal: v.minVal ?? v.min_val,
      maxVal: v.maxVal ?? v.max_val,
      description: v.description || '',
    } as any);
  }

  public async updateProperty(id: number, raw: unknown) {
    return await this.repo.updateProperty(id, raw as any);
  }

  public async deleteProperty(id: number) {
    return await this.repo.deleteProperty(id);
  }

  // Models
  public async getModels() {
    return await this.repo.getModels();
  }

  public async createModel(raw: unknown) {
    const v = CreateModelSchema.parse(raw);
    return await this.repo.createModel({
      modelCode: v.modelCode || v.model_code,
      modelName: v.modelName || v.model_name,
      groupId: v.groupId || v.group_id,
      typeId: v.typeId || v.type_id,
      imageUrl: v.imageUrl || v.image_url,
      firmwareVersionLatest: v.firmwareVersionLatest || v.firmware_version_latest,
      hardwareVersion: v.hardwareVersion || v.hardware_version,
      supplier: v.supplier,
      assignedProperties: v.assignedProperties || v.assigned_properties || [],
    } as any);
  }

  public async updateModel(id: number, raw: unknown) {
    return await this.repo.updateModel(id, raw as any);
  }

  public async deleteModel(id: number) {
    return await this.repo.deleteModel(id);
  }

  // Devices & Inventory
  public async getDevices(page: number, limit: number, status?: string, search?: string) {
    return await this.repo.getDevices(page, limit, status, search);
  }

  public async deleteDevice(hardwareId: string) {
    return await this.repo.deleteDevice(hardwareId);
  }

  // RF Remotes
  public async getRfRemotes(hardwareId?: string) {
    return await this.repo.getRfRemotes(hardwareId);
  }

  public async addRfRemote(raw: unknown) {
    return await this.repo.addRfRemote(raw);
  }

  public async toggleBlockRfRemote(id: number) {
    return await this.repo.toggleBlockRfRemote(id);
  }
}
