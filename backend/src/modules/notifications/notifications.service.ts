import { NotificationsRepository, NotificationEntity } from './notifications.repository.js';
import { CreateNotificationDto } from './notifications.dto.js';

export class NotificationsService {
  constructor(private repo: NotificationsRepository) {}

  public async getAll(): Promise<NotificationEntity[]> {
    return this.repo.getAll();
  }

  public async create(dto: CreateNotificationDto): Promise<NotificationEntity> {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new Error('Tiêu đề thông báo không được để trống');
    }
    return this.repo.create(dto);
  }

  public async delete(id: number): Promise<boolean> {
    return this.repo.delete(id);
  }

  public async markAsRead(id: number): Promise<boolean> {
    return this.repo.markAsRead(id);
  }
}
