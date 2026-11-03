import { Request, Response } from 'express';
import { DevicesService } from './devices.service.js';
import { Controller, Get, Post, Put, Delete } from '../../core/decorators/index.js';
import { authenticate, requireRole } from '../../core/middlewares/auth.middleware.js';

@Controller('/admin')
export class DevicesController {
  constructor(private service: DevicesService) {}

  // Groups
  @Get('/groups', authenticate)
  public async getGroups(_req: Request, res: Response) {
    try {
      const groups = await this.service.getGroups();
      res.json({ success: true, groups });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/groups', authenticate, requireRole(['ADMIN']))
  public async createGroup(req: Request, res: Response) {
    try {
      const group = await this.service.createGroup(req.body);
      res.json({ success: true, group, message: 'Tạo nhóm sản phẩm thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/groups/:id', authenticate, requireRole(['ADMIN']))
  public async updateGroup(req: Request, res: Response) {
    try {
      const group = await this.service.updateGroup(Number(req.params.id), req.body);
      res.json({ success: true, group, message: 'Cập nhật nhóm sản phẩm thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Delete('/groups/:id', authenticate, requireRole(['ADMIN']))
  public async deleteGroup(req: Request, res: Response) {
    try {
      await this.service.deleteGroup(Number(req.params.id));
      res.json({ success: true, message: 'Xóa nhóm sản phẩm thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // Device Types
  @Get('/device-types', authenticate)
  public async getDeviceTypes(_req: Request, res: Response) {
    try {
      const deviceTypes = await this.service.getDeviceTypes();
      res.json({ success: true, deviceTypes });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/device-types', authenticate, requireRole(['ADMIN']))
  public async createDeviceType(req: Request, res: Response) {
    try {
      const deviceType = await this.service.createDeviceType(req.body);
      res.json({ success: true, deviceType, message: 'Tạo loại thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/device-types/:id', authenticate, requireRole(['ADMIN']))
  public async updateDeviceType(req: Request, res: Response) {
    try {
      const deviceType = await this.service.updateDeviceType(Number(req.params.id), req.body);
      res.json({ success: true, deviceType, message: 'Cập nhật loại thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Delete('/device-types/:id', authenticate, requireRole(['ADMIN']))
  public async deleteDeviceType(req: Request, res: Response) {
    try {
      await this.service.deleteDeviceType(Number(req.params.id));
      res.json({ success: true, message: 'Xóa loại thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // Properties
  @Get('/properties', authenticate)
  public async getProperties(_req: Request, res: Response) {
    try {
      const properties = await this.service.getProperties();
      res.json({ success: true, properties });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/properties', authenticate, requireRole(['ADMIN']))
  public async createProperty(req: Request, res: Response) {
    try {
      const property = await this.service.createProperty(req.body);
      res.json({ success: true, property, message: 'Tạo thuộc tính thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/properties/:id', authenticate, requireRole(['ADMIN']))
  public async updateProperty(req: Request, res: Response) {
    try {
      const property = await this.service.updateProperty(Number(req.params.id), req.body);
      res.json({ success: true, property, message: 'Cập nhật thuộc tính thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Delete('/properties/:id', authenticate, requireRole(['ADMIN']))
  public async deleteProperty(req: Request, res: Response) {
    try {
      await this.service.deleteProperty(Number(req.params.id));
      res.json({ success: true, message: 'Xóa thuộc tính thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // Models
  @Get('/models', authenticate)
  public async getModels(_req: Request, res: Response) {
    try {
      const models = await this.service.getModels();
      res.json({ success: true, models });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/models', authenticate, requireRole(['ADMIN']))
  public async createModel(req: Request, res: Response) {
    try {
      const model = await this.service.createModel(req.body);
      res.json({ success: true, model, message: 'Tạo mẫu thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/models/:id', authenticate, requireRole(['ADMIN']))
  public async updateModel(req: Request, res: Response) {
    try {
      const model = await this.service.updateModel(Number(req.params.id), req.body);
      res.json({ success: true, model, message: 'Cập nhật mẫu thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Delete('/models/:id', authenticate, requireRole(['ADMIN']))
  public async deleteModel(req: Request, res: Response) {
    try {
      await this.service.deleteModel(Number(req.params.id));
      res.json({ success: true, message: 'Xóa mẫu thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // Devices & Inventory
  @Get('/devices', authenticate)
  public async getDevices(req: Request, res: Response) {
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
  }

  @Post('/devices', authenticate, requireRole(['ADMIN']))
  public async createDevice(req: Request, res: Response) {
    try {
      const device = await this.service.createDevice(req.body);
      res.json({ success: true, device, message: 'Khởi tạo thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Post('/devices/batch', authenticate, requireRole(['ADMIN']))
  public async createDevicesBatch(req: Request, res: Response) {
    try {
      const items = Array.isArray(req.body) ? req.body : req.body.devices;
      if (!Array.isArray(items)) {
        res.status(400).json({ success: false, error: 'Dữ liệu thiết bị gửi lên phải là một mảng!' });
        return;
      }
      const result = await this.service.createDevicesBatch(items);
      res.json({ success: true, ...result, message: `Đã lưu thành công ${result.count} thiết bị!` });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/devices/:hardwareId', authenticate, requireRole(['ADMIN']))
  public async updateDevice(req: Request, res: Response) {
    try {
      const device = await this.service.updateDevice(String(req.params.hardwareId), req.body);
      res.json({ success: true, device, message: 'Cập nhật thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Delete('/devices/:hardwareId', authenticate, requireRole(['ADMIN']))
  public async deleteDevice(req: Request, res: Response) {
    try {
      await this.service.deleteDevice(String(req.params.hardwareId));
      res.json({ success: true, message: 'Xóa thiết bị thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // RF Remotes
  @Get('/rf-remotes', authenticate)
  public async getRfRemotes(req: Request, res: Response) {
    try {
      const remotes = await this.service.getRfRemotes(req.query.hardwareId as string);
      res.json({ success: true, remotes });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/rf-remotes', authenticate, requireRole(['ADMIN']))
  public async addRfRemote(req: Request, res: Response) {
    try {
      const remote = await this.service.addRfRemote(req.body);
      res.json({ success: true, remote, message: 'Thêm tay remote RF thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Put('/rf-remotes/:id/toggle-block', authenticate, requireRole(['ADMIN']))
  public async toggleBlockRfRemote(req: Request, res: Response) {
    try {
      const isBlocked = await this.service.toggleBlockRfRemote(Number(req.params.id));
      res.json({ success: true, message: 'Cập nhật trạng thái khóa remote thành công!', isBlocked });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // Firmware
  @Get('/firmware', authenticate)
  public async getFirmwareReleases(req: Request, res: Response) {
    try {
      const releases = await this.service.getFirmwareReleases(req.query.modelCode as string);
      res.json({ success: true, releases });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/firmware', authenticate, requireRole(['ADMIN']))
  public async createFirmwareRelease(req: Request, res: Response) {
    try {
      const release = await this.service.createFirmwareRelease(req.body);
      res.json({ success: true, release, message: 'Tạo bản phát hành firmware thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Delete('/firmware/:id', authenticate, requireRole(['ADMIN']))
  public async deleteFirmwareRelease(req: Request, res: Response) {
    try {
      await this.service.deleteFirmwareRelease(Number(req.params.id));
      res.json({ success: true, message: 'Xóa bản phát hành firmware thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // OTA Campaigns
  @Get('/ota/campaigns', authenticate)
  public async getOtaCampaigns(_req: Request, res: Response) {
    try {
      const campaigns = await this.service.getOtaCampaigns();
      res.json({ success: true, campaigns });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Get('/ota/campaigns/:id', authenticate)
  public async getOtaCampaignDetails(req: Request, res: Response) {
    try {
      const details = await this.service.getOtaCampaignDetails(Number(req.params.id));
      if (!details) {
        res.status(404).json({ success: false, error: 'Không tìm thấy chiến dịch OTA' });
        return;
      }
      res.json({ success: true, ...details });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/ota/deploy', authenticate, requireRole(['ADMIN']))
  public async deployOtaCampaign(req: Request, res: Response) {
    try {
      const campaign = await this.service.createOtaCampaign(req.body);
      res.json({ success: true, campaign, message: 'Khởi chạy chiến dịch nạp OTA thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  @Post('/ota/retry/:id', authenticate, requireRole(['ADMIN']))
  public async retryOtaDeviceRecord(req: Request, res: Response) {
    try {
      const record = await this.service.retryOtaDeviceRecord(Number(req.params.id));
      res.json({ success: true, record, message: 'Đã gửi lại yêu cầu cập nhật OTA!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }

  // Installation & Reset Guides
  @Get('/guides')
  public async getInstallationGuides(_req: Request, res: Response) {
    try {
      const guides = await this.service.getInstallationGuides();
      res.json({ success: true, guides });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  }

  @Post('/guides')
  public async upsertInstallationGuide(req: Request, res: Response) {
    try {
      const guide = await this.service.upsertInstallationGuide(req.body);
      res.json({ success: true, guide, message: 'Cập nhật hướng dẫn lắp đặt & reset thành công!' });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }
}
