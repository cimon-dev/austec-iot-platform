import { PostgresService } from './postgres.service.js';
import { CommandService } from './command.service.js';

export interface AutomationScheduleItem {
  id?: string;
  title?: string;
  time?: string;                // "HH:mm" e.g. "07:30"
  action?: string;              // "OPEN", "CLOSE", "TURN_ON", "TURN_OFF", etc.
  enabled?: boolean;
  days?: string | boolean[];    // "T2, T3, T4..." or [true, true, ...] or "Hàng ngày"
  scheduleTypeLabel?: string;
}

export class AutomationSchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private lastExecutedMinute: string = '';

  constructor(
    private postgresService: PostgresService,
    private commandService: CommandService
  ) {}

  /**
   * Khởi động vòng lặp kiểm tra lịch trình định kỳ mỗi 60 giây
   */
  public start(intervalMs: number = 60000) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[AutomationScheduler] ⏰ Đã kích hoạt bộ lập lịch tự động ngầm (Kiểm tra mỗi 60s, Múi giờ GMT+7)...`);

    // Chạy kiểm tra ngay sau 5 giây khởi động
    setTimeout(() => this.checkAndExecuteSchedules(), 5000);

    this.timer = setInterval(() => {
      this.checkAndExecuteSchedules();
    }, intervalMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log(`[AutomationScheduler] 🛑 Đã dừng bộ lập lịch tự động.`);
  }

  /**
   * Quét và thực thi các lịch trình khớp với thời gian thực tế hiện tại
   */
  public async checkAndExecuteSchedules(): Promise<void> {
    try {
      if (!this.postgresService || typeof this.postgresService.query !== 'function') return;

      // 1. Tính toán giờ hiện tại theo chuẩn Múi giờ Việt Nam (GMT+7)
      const now = new Date();
      const vnTimeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      }); // "07:30"

      const vnDateStr = now.toLocaleDateString('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        weekday: 'short',
      }); // "Mon", "Tue", ...

      // Chuyển weekday sang index 0-6 (0: CN, 1: T2, 2: T3, ..., 6: T7)
      const vnDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
      const dayOfWeek = vnDate.getDay(); // 0 = CN, 1 = T2, ...

      // Tránh thực thi lặp lại 2 lần trong cùng một phút
      const currentMinuteKey = `${vnDateStr}_${vnTimeStr}`;
      if (this.lastExecutedMinute === currentMinuteKey) {
        return;
      }
      this.lastExecutedMinute = currentMinuteKey;

      // 2. Truy vấn tất cả thiết bị có cấu hình schedules trong thuộc tính
      const queryRes = await this.postgresService.query(`
        SELECT hardware_id, custom_name, owner_id, current_properties, is_online
        FROM device_instances
        WHERE current_properties ? 'schedules'
      `);

      if (!queryRes || !queryRes.rows || queryRes.rows.length === 0) return;

      for (const row of queryRes.rows) {
        const hwId = row.hardware_id;
        const devName = row.custom_name || hwId;
        const ownerId = row.owner_id || '00000000-0000-0000-0000-000000000001';
        const props = row.current_properties || {};
        const schedules: AutomationScheduleItem[] = Array.isArray(props.schedules) ? props.schedules : [];

        for (const sch of schedules) {
          // Bỏ qua nếu lịch bị tắt
          if (sch.enabled === false) continue;

          // Kiểm tra giờ
          const schTime = (sch.time || '').trim();
          if (!schTime || schTime !== vnTimeStr) continue;

          // Kiểm tra thứ trong tuần (nếu có cấu hình days dạng mảng boolean)
          if (Array.isArray(sch.days) && sch.days.length === 7) {
            // Index 0: CN, 1: T2, ..., 6: T7
            if (!sch.days[dayOfWeek]) {
              continue; // Hôm nay không nằm trong ngày lặp lại của lịch
            }
          }

          // 3. Khớp lịch trình -> Phát lệnh thực tế xuống thiết bị
          const actionToExecute = sch.action || 'OPEN';
          console.log(`[AutomationScheduler] 🎯 KÍCH HOẠT LỊCH TRÌNH [${sch.title || actionToExecute}] trên [${devName} (${hwId})] lúc ${vnTimeStr}!`);

          try {
            const cmdRes = await this.commandService.dispatchCommand({
              hardwareId: hwId,
              command: actionToExecute,
              actorId: ownerId,
              actorRole: 'SYSTEM' as any,
              actorIp: '127.0.0.1 (Scheduler)',
            });

            // Gửi thông báo đến chủ sở hữu thiết bị
            const notifId = `NOTIF-SCHED-${Date.now()}`;
            await this.postgresService.query(
              `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
               VALUES ($1, $2, $3, $4, 'AUTO_SCHEDULE', false, NOW()::text)`,
              [
                notifId,
                ownerId,
                `Lịch trình tự động: ${devName}`,
                `Hệ thống đã kích hoạt lịch hẹn '${sch.title || actionToExecute}' (${actionToExecute}) trên thiết bị '${devName}'. Kết quả: ${cmdRes.success ? 'Thành công' : 'Không có phản hồi'}.`,
              ]
            );
          } catch (cmdErr: any) {
            console.warn(`[AutomationScheduler] Lỗi phát lệnh lịch trình [${hwId}]:`, cmdErr.message);
          }
        }
      }
    } catch (e: any) {
      console.warn(`[AutomationScheduler] Lỗi kiểm tra lịch trình tự động:`, e.message);
    }
  }
}

