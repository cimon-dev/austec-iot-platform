import nodemailer from 'nodemailer';
import { StepUpPurpose } from './auth.service.js';

const PURPOSE_LABELS: Record<StepUpPurpose, string> = {
  ADMIN_LOGIN_2FA: 'Xác thực đăng nhập Quản trị viên (2FA)',
  CHANGE_PASSWORD: 'Đổi / Thiết lập mật khẩu tài khoản',
  FORGOT_PASSWORD: 'Khôi phục mật khẩu tài khoản',
  UPDATE_CONTACT: 'Thay đổi Email / Số điện thoại định danh',
  UNLINK_GOOGLE: 'Hủy liên kết tài khoản Google',
  DELETE_ACCOUNT: 'Xóa tài khoản vĩnh viễn',
  TRANSFER_DEVICE: 'Chuyển giao quyền sở hữu thiết bị IoT',
  UNPAIR_DEVICE: 'Hủy ghép nối & Khôi phục cài đặt gốc thiết bị',
  OTA_ADMIN: 'Phát hành Firmware / Đẩy chiến dịch OTA',
  ADMIN_ROLE_CHANGE: 'Cấp quyền / Thay đổi tài khoản Quản trị viên',
  SYSTEM_SETTINGS: 'Thay đổi cấu hình hạ tầng MQTT hệ thống',
};

export interface EmailSendResult {
  delivered: boolean;
  devConsoleFallback: boolean;
  provider: string;
}

export class EmailOtpService {
  public static isConfigured(): boolean {
    const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
    if (provider === 'resend') {
      return Boolean(process.env.RESEND_API_KEY?.trim());
    }
    return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
  }

  public static getPurposeLabel(purpose: StepUpPurpose): string {
    return PURPOSE_LABELS[purpose] || 'Xác thực bảo mật tài khoản';
  }

  public static async sendOtp(params: {
    toEmail: string;
    code: string;
    purpose: StepUpPurpose;
    expiresMinutes: number;
    recipientName?: string;
  }): Promise<EmailSendResult> {
    const { toEmail, code, purpose, expiresMinutes, recipientName } = params;
    const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
    const from = process.env.EMAIL_FROM || `Austec Smart IoT <${process.env.SMTP_USER || 'no-reply@austec.vn'}>`;
    const actionLabel = this.getPurposeLabel(purpose);
    const subject = `[Austec Security] Mã OTP ${code} - ${actionLabel}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #0f172a; font-size: 20px;">AUSTEC SMART IOT</h2>
          <p style="margin: 4px 0 0; color: #64748b; font-size: 13px;">Hệ thống Xác Thực Bảo Mật Đa Tầng</p>
        </div>
        <div style="background: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 12px; color: #334155; font-size: 14px;">Xin chào <strong>${recipientName || 'Quý khách'}</strong>,</p>
          <p style="margin: 0 0 16px; color: #475569; font-size: 14px; line-height: 1.5;">
            Bạn vừa yêu cầu xác thực cho thao tác: <strong style="color: #0f172a;">${actionLabel}</strong>.
          </p>
          <div style="text-align: center; margin: 24px 0; padding: 16px; background: #0f172a; border-radius: 10px;">
            <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #38bdf8;">${code}</span>
          </div>
          <p style="margin: 0 0 8px; color: #475569; font-size: 13px;">
            • Mã có hiệu lực trong <strong>${expiresMinutes} phút</strong> và chỉ sử dụng được 1 lần.<br/>
            • Tuyệt đối không chia sẻ mã này cho bất kỳ ai (kể cả nhân viên Austec).
          </p>
        </div>
        <p style="margin: 16px 0 0; text-align: center; color: #94a3b8; font-size: 11px;">
          Nếu bạn không thực hiện yêu cầu này, hãy đổi mật khẩu ngay lập tức.
        </p>
      </div>
    `;

    // Chế độ Resend HTTP API
    if (provider === 'resend' && process.env.RESEND_API_KEY?.trim()) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [toEmail],
          subject,
          html,
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Không thể gửi email OTP qua Resend (HTTP ${res.status}): ${errText}`);
      }
      return { delivered: true, devConsoleFallback: false, provider: 'resend' };
    }

    // Chế độ SMTP (Gmail / Google Workspace)
    if (process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim()) {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 465),
        secure: (process.env.SMTP_SECURE || 'true') === 'true',
        auth: {
          user: process.env.SMTP_USER.trim(),
          pass: process.env.SMTP_PASS.trim(),
        },
      });
      await transporter.sendMail({
        from,
        to: toEmail,
        subject,
        html,
      });
      return { delivered: true, devConsoleFallback: false, provider: 'smtp' };
    }

    // Chế độ Dev (NODE_ENV !== 'production') khi chưa điền SMTP/Resend key vào .env
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n============================================================');
      console.log(`[DEV EMAIL OTP] To: ${toEmail}`);
      console.log(`[DEV EMAIL OTP] Purpose: ${purpose} (${actionLabel})`);
      console.log(`[DEV EMAIL OTP] CODE: >>> ${code} <<< (hết hạn sau ${expiresMinutes} phút)`);
      console.log('============================================================\n');
      return { delivered: true, devConsoleFallback: true, provider: 'dev-console' };
    }

    throw new Error(
      'Hệ thống chưa cấu hình máy chủ gửi Email OTP (SMTP_USER/SMTP_PASS hoặc RESEND_API_KEY trong backend/.env).'
    );
  }
}

