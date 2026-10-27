import { Request, Response } from 'express';
import { DevicesService } from './devices.service.js';

export class DevicesController {
  constructor(private service: DevicesService) {}

  // Groups
  public getGroups = async (_req: Request, res: Response) => {
    try {
      const groups = await this.service.getGroups();
      res.json({ success: true, groups });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public createGroup = async (req: Request, res: Response) => {
    try {
      const group = await this.service.createGroup(req.body);
      res.json({ success: true, group, message: 'Tạo nhóm sản phẩm thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public updateGroup = async (req: Request, res: Response) => {
    try {
      const group = await this.service.updateGroup(Number(req.params.id), req.body);
      res.json({ success: true, group, message: 'Cập nhật nhóm sản phẩm thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public deleteGroup = async (req: Request, res: Response) => {
    try {
      await this.service.deleteGroup(Number(req.params.id));
      res.json({ success: true, message: 'Xóa nhóm sản phẩm thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  // Device Types
  public getDeviceTypes = async (_req: Request, res: Response) => {
    try {
      const deviceTypes = await this.service.getDeviceTypes();
      res.json({ success: true, deviceTypes });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public createDeviceType = async (req: Request, res: Response) => {
    try {
      const deviceType = await this.service.createDeviceType(req.body);
      res.json({ success: true, deviceType, message: 'Tạo loại thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public updateDeviceType = async (req: Request, res: Response) => {
    try {
      const deviceType = await this.service.updateDeviceType(Number(req.params.id), req.body);
      res.json({ success: true, deviceType, message: 'Cập nhật loại thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public deleteDeviceType = async (req: Request, res: Response) => {
    try {
      await this.service.deleteDeviceType(Number(req.params.id));
      res.json({ success: true, message: 'Xóa loại thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  // Properties
  public getProperties = async (_req: Request, res: Response) => {
    try {
      const properties = await this.service.getProperties();
      res.json({ success: true, properties });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public createProperty = async (req: Request, res: Response) => {
    try {
      const property = await this.service.createProperty(req.body);
      res.json({ success: true, property, message: 'Tạo thuộc tính thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public updateProperty = async (req: Request, res: Response) => {
    try {
      const property = await this.service.updateProperty(Number(req.params.id), req.body);
      res.json({ success: true, property, message: 'Cập nhật thuộc tính thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public deleteProperty = async (req: Request, res: Response) => {
    try {
      await this.service.deleteProperty(Number(req.params.id));
      res.json({ success: true, message: 'Xóa thuộc tính thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  // Models
  public getModels = async (_req: Request, res: Response) => {
    try {
      const models = await this.service.getModels();
      res.json({ success: true, models });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public createModel = async (req: Request, res: Response) => {
    try {
      const model = await this.service.createModel(req.body);
      res.json({ success: true, model, message: 'Tạo mẫu thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public updateModel = async (req: Request, res: Response) => {
    try {
      const model = await this.service.updateModel(Number(req.params.id), req.body);
      res.json({ success: true, model, message: 'Cập nhật mẫu thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public deleteModel = async (req: Request, res: Response) => {
    try {
      await this.service.deleteModel(Number(req.params.id));
      res.json({ success: true, message: 'Xóa mẫu thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  // Devices & Inventory
  public getDevices = async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;
      const status = req.query.status as string;
      const search = req.query.search as string;
      const result = await this.service.getDevices(page, limit, status, search);
      res.json({ success: true, ...result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public createDevice = async (req: Request, res: Response) => {
    try {
      const device = await this.service.createDevice(req.body);
      res.json({ success: true, device, message: 'Khởi tạo thiết bị vào CSDL thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public updateDevice = async (req: Request, res: Response) => {
    try {
      const device = await this.service.updateDevice(String(req.params.hardwareId), req.body);
      res.json({ success: true, device, message: 'Cập nhật thiết bị trong CSDL thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public deleteDevice = async (req: Request, res: Response) => {
    try {
      await this.service.deleteDevice(String(req.params.hardwareId));
      res.json({ success: true, message: 'Xóa thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  // RF Remotes
  public getRfRemotes = async (req: Request, res: Response) => {
    try {
      const remotes = await this.service.getRfRemotes(req.query.hardwareId as string);
      res.json({ success: true, remotes });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };

  public addRfRemote = async (req: Request, res: Response) => {
    try {
      const remote = await this.service.addRfRemote(req.body);
      res.json({ success: true, remote, message: 'Thêm tay remote RF thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };

  public toggleBlockRfRemote = async (req: Request, res: Response) => {
    try {
      const isBlocked = await this.service.toggleBlockRfRemote(Number(req.params.id));
      res.json({ success: true, message: 'Cập nhật trạng thái khóa remote thành công!', isBlocked });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  };
}
