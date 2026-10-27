import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service.js';

export class DashboardController {
  constructor(private service: DashboardService = new DashboardService()) {}

  public getStats = async (_req: Request, res: Response) => {
    try {
      const stats = await this.service.getStats();
      res.json({ success: true, stats });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  };
}
