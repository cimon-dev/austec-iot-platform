import { Request, Response } from 'express';
import { BlackboxService } from './blackbox.service.js';
import { QueryBlackboxLogsSchema, CreateBlackboxLogSchema } from './dto/blackbox.dto.js';

export class BlackboxController {
  constructor(private service: BlackboxService = new BlackboxService()) {}

  public getLogs = async (req: Request, res: Response) => {
    try {
      const parsed = QueryBlackboxLogsSchema.parse(req.query);
      const logs = await this.service.getLogs(parsed);
      res.json({ success: true, total: logs.length, logs });
    } catch (err: any) {
      console.error('[Blackbox API] Lỗi truy vấn hộp đen:', err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  };

  public createLog = async (req: Request, res: Response) => {
    try {
      const parsed = CreateBlackboxLogSchema.parse(req.body);
      const log = await this.service.logCommand(parsed);
      res.status(201).json({ success: true, message: 'Ghi log hộp đen thành công!', log });
    } catch (err: any) {
      console.error('[Blackbox API] Lỗi ghi log hộp đen:', err.message);
      res.status(400).json({ success: false, error: err.message });
    }
  };
}
