import crypto from 'crypto';
import { postgresClient } from '../core/database/postgres.client.js';
import { AuthService, StepUpPurpose } from './auth.service.js';
import { EmailOtpService } from './email-otp.service.js';
import { ZaloZnsService } from './zalo-zns.service.js';

export type OtpChannel = 'EMAIL' | 'ZALO';

export interface AvailableChannelsInfo {
  email: {
    available: boolean;
    maskedTarget: string;
  };
  zalo: {
    available: boolean;
    enabledOnServer: boolean;
    hasPhone: boolean;
    maskedTarget: string;
  };
}

function getOtpExpiresMinutes(): number {
  const n = Number(process.env.OTP_EXPIRES_MINUTES || 5);
  return Number.isFinite(n) && n > 0 ? n : 5;
}

function hashOtp(id: string, code: string): string {
  const secret = process.env.STEPUP_JWT_SECRET || process.env.JWT_SECRET || 'austec-otp-salt';
  return crypto.createHmac('sha256', secret).update(`${id}:${code}`).digest('hex');
}

export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export function maskPhone(phone?: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 7) return '';
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
}

export class VerificationService {
  public static getAvailableChannels(user: { email?: string; phoneNumber?: string }): AvailableChannelsInfo {
    const emailValid = Boolean(user.email && user.email.includes('@') && !user.email.endsWith('@austec.customer'));
    const cleanPhone = (user.phoneNumber || '').replace(/\D/g, '');
    const hasPhone = cleanPhone.length >= 9 && cleanPhone !== '0900000000';
    const zaloEnabled = ZaloZnsService.isEnabled();

    return {
      email: {
        available: emailValid,
        maskedTarget: emailValid ? maskEmail(user.email) : '',
      },
      zalo: {
        available: zaloEnabled && hasPhone,
        enabledOnServer: zaloEnabled,
        hasPhone,
        maskedTarget: hasPhone ? maskPhone(user.phoneNumber) : '',
      },
    };
  }

  public static async requestOtp(params: {
    userId?: string;
    identifier?: string;
    purpose: StepUpPurpose;
    channel: OtpChannel;
    target: string;
    recipientName?: string;
  }): Promise<{
    challengeId: string;
    channel: OtpChannel;
    maskedTarget: string;
    expiresInSeconds: number;
    cooldownSeconds: number;
    devConsoleMode: boolean;
  }> {
    const { userId, identifier, purpose, channel, target, recipientName } = params;
    const cleanTarget = (target || '').trim();
    if (!cleanTarget) {
      throw new Error(
        channel === 'EMAIL'
          ? 'Tài khoản chưa có địa chỉ Email hợp lệ để nhận mã xác thực.'
          : 'Tài khoản chưa có Số điện thoại hợp lệ để nhận mã xác thực qua Zalo.'
      );
    }

    // Chống spam: kiểm tra cooldown 60 giây gần nhất
    if (postgresClient.getConnected()) {
      const recent = await postgresClient.query(
        `SELECT created_at FROM otp_verifications
         WHERE purpose = $1 AND target = $2 AND consumed_at IS NULL
           AND created_at > NOW() - INTERVAL '45 seconds'
         ORDER BY created_at DESC LIMIT 1`,
        [purpose, cleanTarget]
      );
      if (recent.rows.length > 0) {
        const diffSec = Math.ceil(45 - (Date.now() - new Date(recent.rows[0].created_at).getTime()) / 1000);
        if (diffSec > 0) {
          throw new Error(`Vui lòng chờ ${diffSec} giây trước khi gửi lại mã OTP mới.`);
        }
      }
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const challengeId = `OTP-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const expiresMinutes = getOtpExpiresMinutes();
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
    const codeHash = hashOtp(challengeId, code);

    // Gửi mã thực tế qua kênh đã chọn trước khi lưu
    let devConsoleMode = false;
    if (channel === 'EMAIL') {
      const sendRes = await EmailOtpService.sendOtp({
        toEmail: cleanTarget,
        code,
        purpose,
        expiresMinutes,
        recipientName,
      });
      devConsoleMode = sendRes.devConsoleFallback;
    } else if (channel === 'ZALO') {
      const sendRes = await ZaloZnsService.sendOtp({
        phoneNumber: cleanTarget,
        code,
        purpose,
        trackingId: challengeId,
      });
      devConsoleMode = sendRes.devConsoleFallback;
    } else {
      throw new Error('Kênh xác thực không hợp lệ (chỉ hỗ trợ EMAIL hoặc ZALO).');
    }

    if (postgresClient.getConnected()) {
      // Vô hiệu hóa các mã cũ cùng user + purpose
      if (userId) {
        await postgresClient.query(
          `UPDATE otp_verifications SET consumed_at = NOW()
           WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
          [userId, purpose]
        );
      } else if (identifier) {
        await postgresClient.query(
          `UPDATE otp_verifications SET consumed_at = NOW()
           WHERE identifier = $1 AND purpose = $2 AND consumed_at IS NULL`,
          [identifier.toLowerCase(), purpose]
        );
      }

      await postgresClient.query(
        `INSERT INTO otp_verifications (id, user_id, identifier, purpose, channel, target, code_hash, attempts, max_attempts, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 5, $8, NOW())`,
        [
          challengeId,
          userId || null,
          identifier ? identifier.toLowerCase() : null,
          purpose,
          channel,
          cleanTarget,
          codeHash,
          expiresAt,
        ]
      );
    }

    return {
      challengeId,
      channel,
      maskedTarget: channel === 'EMAIL' ? maskEmail(cleanTarget) : maskPhone(cleanTarget),
      expiresInSeconds: expiresMinutes * 60,
      cooldownSeconds: 45,
      devConsoleMode,
    };
  }

  public static async verifyOtp(params: {
    userId?: string;
    identifier?: string;
    purpose: StepUpPurpose;
    code: string;
    challengeId?: string;
  }): Promise<{
    verified: boolean;
    channel: OtpChannel;
    target: string;
    userId: string | null;
  }> {
    const cleanCode = (params.code || '').trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      throw new Error('Mã OTP phải gồm đúng 6 chữ số.');
    }

    if (!postgresClient.getConnected()) {
      throw new Error('Cơ sở dữ liệu chưa sẵn sàng để xác minh mã OTP.');
    }

    let queryRes;
    if (params.challengeId) {
      queryRes = await postgresClient.query(
        `SELECT * FROM otp_verifications WHERE id = $1 AND purpose = $2 AND consumed_at IS NULL LIMIT 1`,
        [params.challengeId, params.purpose]
      );
    } else if (params.userId) {
      queryRes = await postgresClient.query(
        `SELECT * FROM otp_verifications
         WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [params.userId, params.purpose]
      );
    } else if (params.identifier) {
      queryRes = await postgresClient.query(
        `SELECT * FROM otp_verifications
         WHERE identifier = $1 AND purpose = $2 AND consumed_at IS NULL
         ORDER BY created_at DESC LIMIT 1`,
        [params.identifier.toLowerCase(), params.purpose]
      );
    } else {
      throw new Error('Thiếu thông tin phiên xác thực OTP.');
    }

    if (!queryRes || queryRes.rows.length === 0) {
      throw new Error('Không tìm thấy mã OTP đang hoạt động hoặc mã đã được sử dụng. Vui lòng gửi lại mã mới.');
    }

    const record = queryRes.rows[0];
    if (new Date(record.expires_at).getTime() < Date.now()) {
      await postgresClient.query('UPDATE otp_verifications SET consumed_at = NOW() WHERE id = $1', [record.id]);
      throw new Error('Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.');
    }

    if (record.attempts >= (record.max_attempts || 5)) {
      await postgresClient.query('UPDATE otp_verifications SET consumed_at = NOW() WHERE id = $1', [record.id]);
      throw new Error('Bạn đã nhập sai mã OTP quá 5 lần. Mã đã bị hủy, vui lòng gửi lại mã mới.');
    }

    const expectedHash = hashOtp(record.id, cleanCode);
    const matched = crypto.timingSafeEqual(
      Buffer.from(expectedHash, 'hex'),
      Buffer.from(record.code_hash, 'hex')
    );

    if (!matched) {
      const nextAttempts = Number(record.attempts || 0) + 1;
      await postgresClient.query('UPDATE otp_verifications SET attempts = $1 WHERE id = $2', [
        nextAttempts,
        record.id,
      ]);
      const remaining = Math.max((record.max_attempts || 5) - nextAttempts, 0);
      throw new Error(
        remaining > 0
          ? `Mã OTP không chính xác. Bạn còn ${remaining} lần thử.`
          : 'Bạn đã nhập sai mã OTP quá số lần cho phép. Vui lòng yêu cầu mã mới.'
      );
    }

    // Đánh dấu đã sử dụng (1 lần duy nhất)
    await postgresClient.query('UPDATE otp_verifications SET consumed_at = NOW() WHERE id = $1', [record.id]);

    return {
      verified: true,
      channel: record.channel as OtpChannel,
      target: record.target,
      userId: record.user_id || null,
    };
  }

  public static async confirmAndIssueStepUpToken(params: {
    userId: string;
    purpose: StepUpPurpose;
    code: string;
    challengeId?: string;
  }) {
    const verified = await this.verifyOtp({
      userId: params.userId,
      purpose: params.purpose,
      code: params.code,
      challengeId: params.challengeId,
    });
    const issued = AuthService.signStepUpToken(params.userId, params.purpose, verified.channel);
    return {
      stepUpToken: issued.token,
      expiresInSeconds: issued.expiresInSeconds,
      purpose: params.purpose,
      channel: verified.channel,
      target: verified.target,
    };
  }
}

