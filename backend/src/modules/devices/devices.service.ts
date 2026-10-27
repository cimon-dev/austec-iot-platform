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
    const validated = CreateGroupSchema.parse(raw);
    return await this.repo.createGroup(validated as any);
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
    const validated = CreateDeviceTypeSchema.parse(raw);
    return await this.repo.createDeviceType(validated as any);
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
    const validated = CreatePropertySchema.parse(raw);
    return await this.repo.createProperty(validated as any);
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
    const validated = CreateModelSchema.parse(raw);
    return await this.repo.createModel(validated as any);
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
