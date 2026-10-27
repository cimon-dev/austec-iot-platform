import { BlackboxRepository } from './blackbox.repository.js';
import { CreateBlackboxLogDto, QueryBlackboxLogsDto } from './dto/blackbox.dto.js';
import { BlackboxLogEntity } from './entities/blackbox-log.entity.js';

export class BlackboxService {
  constructor(private repo: BlackboxRepository = new BlackboxRepository()) {}

  public async logCommand(data: CreateBlackboxLogDto): Promise<BlackboxLogEntity> {
    return this.repo.insertLog(data);
  }

  public async getLogs(query: QueryBlackboxLogsDto): Promise<BlackboxLogEntity[]> {
    return this.repo.getLogs(query);
  }
}
