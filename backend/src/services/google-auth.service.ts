import { OAuth2Client } from 'google-auth-library';

export interface VerifiedGoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  avatarUrl?: string;
}

export class GoogleAuthService {
  public static getAllowedClientIds(): string[] {
    return [
      process.env.GOOGLE_WEB_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
    ]
      .map(v => (v || '').trim())
      .filter(Boolean);
  }

  public static isConfigured(): boolean {
    return this.getAllowedClientIds().length > 0;
  }

  public static getWebClientId(): string {
    return (process.env.GOOGLE_WEB_CLIENT_ID || '').trim();
  }

  public static async verifyIdToken(idToken: string): Promise<VerifiedGoogleProfile> {
    const audiences = this.getAllowedClientIds();
    if (audiences.length === 0) {
      throw new Error(
        'Hệ thống chưa cấu hình Google OAuth (GOOGLE_WEB_CLIENT_ID trong backend/.env). Vui lòng điền key để kích hoạt đăng nhập Google.'
      );
    }

    if (!idToken || !idToken.trim()) {
      throw new Error('Thiếu mã xác thực Google (idToken).');
    }

    const client = new OAuth2Client(audiences[0]);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: idToken.trim(),
        audience: audiences,
      });
    } catch (err: any) {
      throw new Error(`Mã xác thực Google không hợp lệ hoặc đã hết hạn: ${err.message}`);
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new Error('Không đọc được thông tin tài khoản Gmail từ Google.');
    }

    if (!payload.email_verified) {
      throw new Error('Địa chỉ Gmail này chưa được Google xác minh.');
    }

    return {
      googleId: payload.sub,
      email: payload.email.trim().toLowerCase(),
      emailVerified: true,
      fullName: (payload.name || payload.email.split('@')[0] || 'Người dùng Austec').trim(),
      avatarUrl: payload.picture || undefined,
    };
  }
}

