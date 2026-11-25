import { postgresClient } from '../core/database/postgres.client.js';
import { StepUpPurpose } from './auth.service.js';

export interface ZaloSendResult {
  delivered: boolean;
  devConsoleFallback: boolean;
  msgId?: string;
}

export class ZaloZnsService {
  public static isEnabled(): boolean {
    return (process.env.ZALO_OTP_ENABLED || 'false').toLowerCase() === 'true';
  }

  public static isFullyConfigured(): boolean {
    return (
      this.isEnabled() &&
      Boolean(process.env.ZALO_APP_ID?.trim()) &&
      Boolean(process.env.ZALO_APP_SECRET?.trim()) &&
      Boolean(process.env.ZALO_OA_ID?.trim()) &&
      Boolean(process.env.ZALO_ZNS_OTP_TEMPLATE_ID?.trim())
    );
  }

  /**
   * Chuẩn hóa SĐT Việt Nam sang chuẩn Zalo ZNS: 84xxxxxxxxx
   */
  public static normalizeVietnamPhone(phone: string): string {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.startsWith('84') && digits.length >= 11) {
      return digits;
    }
    if (digits.startsWith('0') && digits.length >= 9) {
      return `84${digits.slice(1)}`;
    }
    return digits;
  }

  /**
   * Lấy Access Token hợp lệ từ PostgreSQL; tự khởi tạo từ .env và tự xoay vòng Refresh Token dùng 1 lần
   */
  private static async getValidAccessToken(): Promise<string> {
    const oaId = (process.env.ZALO_OA_ID || '').trim();
    const appId = (process.env.ZALO_APP_ID || '').trim();
    const appSecret = (process.env.ZALO_APP_SECRET || '').trim();

    if (!oaId || !appId || !appSecret) {
      throw new Error('Thiếu cấu hình ZALO_APP_ID / ZALO_APP_SECRET / ZALO_OA_ID trong backend/.env');
    }

    let tokenRow: { access_token: string; refresh_token: string; expires_at: Date } | null = null;

    if (postgresClient.getConnected()) {
      const res = await postgresClient.query(
        'SELECT access_token, refresh_token, expires_at FROM zalo_oa_tokens WHERE oa_id = $1 LIMIT 1',
        [oaId]
      );
      if (res.rows.length > 0) {
        tokenRow = {
          access_token: res.rows[0].access_token,
          refresh_token: res.rows[0].refresh_token,
          expires_at: new Date(res.rows[0].expires_at),
        };
      } else {
        const initAccess = (process.env.ZALO_OA_INITIAL_ACCESS_TOKEN || '').trim();
        const initRefresh = (process.env.ZALO_OA_INITIAL_REFRESH_TOKEN || '').trim();
        if (initAccess && initRefresh) {
          const expiresAt = new Date(Date.now() + 20 * 3600 * 1000);
          await postgresClient.query(
            `INSERT INTO zalo_oa_tokens (oa_id, access_token, refresh_token, expires_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (oa_id) DO NOTHING`,
            [oaId, initAccess, initRefresh, expiresAt]
          );
          tokenRow = { access_token: initAccess, refresh_token: initRefresh, expires_at: expiresAt };
        }
      }
    }

    if (!tokenRow) {
      const initAccess = (process.env.ZALO_OA_INITIAL_ACCESS_TOKEN || '').trim();
      const initRefresh = (process.env.ZALO_OA_INITIAL_REFRESH_TOKEN || '').trim();
      if (!initAccess && !initRefresh) {
        throw new Error(
          'Chưa có token Zalo OA (ZALO_OA_INITIAL_ACCESS_TOKEN / ZALO_OA_INITIAL_REFRESH_TOKEN trong backend/.env).'
        );
      }
      tokenRow = {
        access_token: initAccess,
        refresh_token: initRefresh,
        expires_at: initAccess ? new Date(Date.now() + 3600 * 1000) : new Date(0),
      };
    }

    // Nếu Access Token còn hạn hơn 10 phút -> dùng luôn
    if (tokenRow.access_token && tokenRow.expires_at.getTime() > Date.now() + 10 * 60 * 1000) {
      return tokenRow.access_token;
    }

    // Tự động làm mới bằng Refresh Token (chỉ dùng 1 lần -> phải lưu Refresh Token mới ngay vào DB!)
    const form = new URLSearchParams({
      refresh_token: tokenRow.refresh_token,
      app_id: appId,
      grant_type: 'refresh_token',
    });

    const refreshRes = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        secret_key: appSecret,
      },
      body: form.toString(),
    });

    const data: any = await refreshRes.json().catch(() => ({}));
    if (!refreshRes.ok || !data.access_token || !data.refresh_token) {
      throw new Error(
        `Làm mới Zalo OA Token thất bại: ${data.error_description || data.error_name || refreshRes.status}`
      );
    }

    const expiresInSec = Number(data.expires_in || 90000);
    const newExpiresAt = new Date(Date.now() + Math.max(expiresInSec - 600, 300) * 1000);

    if (postgresClient.getConnected()) {
      await postgresClient.query(
        `INSERT INTO zalo_oa_tokens (oa_id, access_token, refresh_token, expires_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (oa_id) DO UPDATE SET
           access_token = EXCLUDED.access_token,
           refresh_token = EXCLUDED.refresh_token,
           expires_at = EXCLUDED.expires_at,
           updated_at = NOW()`,
        [oaId, data.access_token, data.refresh_token, newExpiresAt]
      );
    }

    return data.access_token;
  }

  public static async sendOtp(params: {
    phoneNumber: string;
    code: string;
    purpose: StepUpPurpose;
    trackingId: string;
  }): Promise<ZaloSendResult> {
    if (!this.isEnabled()) {
      throw new Error('Kênh xác thực Zalo ZNS chưa được kích hoạt trên hệ thống. Vui lòng chọn xác thực qua Gmail.');
    }

    const normalizedPhone = this.normalizeVietnamPhone(params.phoneNumber);
    if (!normalizedPhone || normalizedPhone.length < 10) {
      throw new Error('Số điện thoại tài khoản không hợp lệ để nhận mã OTP qua Zalo.');
    }

    // Nếu bật ZALO_OTP_ENABLED=true nhưng chưa điền đủ key ở môi trường dev -> log console dev
    if (!this.isFullyConfigured()) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n============================================================');
        console.log(`[DEV ZALO ZNS OTP] Phone: ${normalizedPhone}`);
        console.log(`[DEV ZALO ZNS OTP] Purpose: ${params.purpose}`);
        console.log(`[DEV ZALO ZNS OTP] CODE: >>> ${params.code} <<<`);
        console.log('============================================================\n');
        return { delivered: true, devConsoleFallback: true };
      }
      throw new Error('Thiếu cấu hình Zalo ZNS trong backend/.env. Vui lòng sử dụng kênh Gmail.');
    }

    const accessToken = await this.getValidAccessToken();
    const templateId = (process.env.ZALO_ZNS_OTP_TEMPLATE_ID || '').trim();
    const mode = (process.env.ZALO_ZNS_MODE || 'development').trim().toLowerCase();

    const bodyPayload: Record<string, any> = {
      phone: normalizedPhone,
      template_id: templateId,
      template_data: {
        otp: params.code,
      },
      tracking_id: params.trackingId,
    };
    if (mode === 'development') {
      bodyPayload.mode = 'development';
    }

    const res = await fetch('https://business.openapi.zalo.me/message/template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        access_token: accessToken,
      },
      body: JSON.stringify(bodyPayload),
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || (data.error !== undefined && data.error !== 0)) {
      throw new Error(
        `Gửi mã OTP qua Zalo ZNS thất bại (${data.error ?? res.status}): ${data.message || 'Vui lòng thử lại hoặc chuyển sang kênh Gmail.'}`
      );
    }

    return {
      delivered: true,
      devConsoleFallback: false,
      msgId: data.data?.msg_id,
    };
  }
}

