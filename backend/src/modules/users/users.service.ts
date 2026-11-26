import bcrypt from 'bcryptjs';
import { UsersRepository } from './users.repository.js';
import { LoginDto, RegisterDto, CreateStaffDto, CreateCustomerDto } from './dto/user.dto.js';
import { AuthService } from '../../services/auth.service.js';
import { GoogleAuthService } from '../../services/google-auth.service.js';
import { OtpChannel, VerificationService } from '../../services/verification.service.js';
import { UserEntity } from './entities/user.entity.js';
import { UnifiedUser } from '../../app.js';

const BCRYPT_ROUNDS = 10;

export class UsersService {
  constructor(private repo: UsersRepository) {}

  public async findByIdAsync(userId: string) {
    return this.repo.findByIdAsync(userId);
  }

  public buildUserPayload(userRecord: UserEntity) {
    return {
      id: userRecord.id,
      email: userRecord.email,
      phoneNumber: userRecord.phoneNumber,
      role: userRecord.role,
      fullName: userRecord.fullName,
      address: userRecord.address,
      province: userRecord.province,
      avatarUrl: userRecord.avatarUrl,
      company: userRecord.company,
      department: userRecord.department,
      empID: userRecord.empID,
      googleLinked: Boolean(userRecord.googleId),
      hasPassword: userRecord.hasPassword !== false && Boolean(userRecord.password),
      emailVerified: Boolean(userRecord.emailVerified),
      phoneVerified: Boolean(userRecord.phoneVerified),
      approvalStatus: userRecord.approvalStatus || 'APPROVED',
    };
  }

  private async verifyPasswordWithAutoUpgrade(
    userRecord: UserEntity,
    plainPassword: string
  ): Promise<boolean> {
    if (!plainPassword || !userRecord.password) {
      return false;
    }

    if (userRecord.password.startsWith('$2')) {
      return bcrypt.compare(plainPassword, userRecord.password);
    }

    // Tự động nâng cấp mật khẩu plaintext cũ sang bcrypt sau lần đăng nhập đúng đầu tiên
    if (userRecord.password === plainPassword) {
      try {
        const hashed = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
        await this.repo.updatePasswordHash(userRecord.id, hashed);
        userRecord.password = hashed;
        userRecord.hasPassword = true;
      } catch (e: any) {
        console.warn('[UsersService] Auto-upgrade password hash warning:', e.message);
      }
      return true;
    }

    return false;
  }

  public async login(dto: LoginDto) {
    const targetInput = (dto.identifier || dto.email || dto.phone || dto.phoneNumber || '')
      .trim()
      .toLowerCase();
    const cleanPhone = targetInput.replace(/[\s.-]/g, '');

    if (!targetInput) {
      throw new Error('Vui lòng nhập Email hoặc Số điện thoại.');
    }
    if (!dto.password || !dto.password.trim()) {
      throw new Error('Vui lòng nhập mật khẩu.');
    }

    const userRecord = await this.repo.findUserForAuthAsync(targetInput, cleanPhone);
    if (!userRecord) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
    }

    if (userRecord.approvalStatus === 'PENDING') {
      throw new Error('Tài khoản CSKH của bạn đang chờ Quản trị viên phê duyệt.');
    }
    if (userRecord.approvalStatus === 'REJECTED') {
      throw new Error('Yêu cầu đăng ký tài khoản của bạn đã bị Quản trị viên từ chối.');
    }
    if (!userRecord.isActive) {
      throw new Error('Tài khoản này đang bị tạm khóa. Vui lòng liên hệ quản trị viên.');
    }

    if (dto.portal === 'admin' && userRecord.role === 'CUSTOMER') {
      throw new Error('Tài khoản Khách hàng chỉ sử dụng trên Ứng dụng di động (Mobile App).');
    }

    if (!userRecord.password || userRecord.hasPassword === false) {
      throw new Error(
        'Tài khoản này đăng ký bằng Google và chưa thiết lập mật khẩu. Vui lòng đăng nhập bằng Google hoặc dùng Quên mật khẩu.'
      );
    }

    const isMatched = await this.verifyPasswordWithAutoUpgrade(userRecord, dto.password);
    if (!isMatched) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
    }

    // Chức năng #1: Bắt buộc xác thực bước 2 (2FA OTP qua Gmail hoặc Zalo) cho tài khoản ADMIN khi đăng nhập cổng Quản trị (portal === 'admin')
    if (userRecord.role === 'ADMIN' && dto.portal === 'admin') {
      const preAuthToken = AuthService.signPreAuthToken({
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.role,
      });
      const channels = VerificationService.getAvailableChannels(userRecord);
      return {
        require2FA: true,
        preAuthToken,
        channels,
        user: this.buildUserPayload(userRecord),
        message: 'Mật khẩu hợp lệ. Vui lòng xác thực mã OTP 2FA qua Gmail hoặc Zalo để hoàn tất đăng nhập.',
      };
    }

    const payload = this.buildUserPayload(userRecord);
    const token = AuthService.signToken(payload as any);
    return { token, user: payload, require2FA: false };
  }

  public async verifyAdminLogin2FA(preAuthToken: string, code: string, challengeId?: string) {
    const preAuth = AuthService.verifyPreAuthToken(preAuthToken);
    if (!preAuth) {
      throw new Error('Phiên xác thực 2FA không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.');
    }

    await VerificationService.verifyOtp({
      userId: preAuth.userId,
      purpose: 'ADMIN_LOGIN_2FA',
      code,
      challengeId,
    });

    const userRecord = await this.repo.findByIdAsync(preAuth.userId);
    if (!userRecord || !userRecord.isActive || userRecord.approvalStatus === 'PENDING') {
      throw new Error('Tài khoản không khả dụng.');
    }

    const payload = this.buildUserPayload(userRecord);
    const token = AuthService.signToken(payload as any);
    return { token, user: payload };
  }

  public async googleAuth(params: {
    idToken: string;
    portal: 'admin' | 'mobile';
    mode?: 'login' | 'register';
    phoneNumber?: string;
    department?: string;
    company?: string;
  }) {
    const profile = await GoogleAuthService.verifyIdToken(params.idToken);
    const mode = params.mode || 'login';
    const cleanPhone = (params.phoneNumber || '').trim().replace(/[\s.-]/g, '');

    let userRecord =
      (await this.repo.findByGoogleIdAsync(profile.googleId)) ||
      (await this.repo.findByEmailOrPhoneAsync(profile.email, ''));

    // ========================
    // LUỒNG WEB ADMIN
    // ========================
    if (params.portal === 'admin') {
      if (mode === 'register') {
        if (userRecord) {
          if (userRecord.approvalStatus === 'PENDING') {
            throw new Error(
              'Email Google này đã gửi yêu cầu đăng ký CSKH và đang chờ Quản trị viên phê duyệt.'
            );
          }
          if (userRecord.role === 'CUSTOMER') {
            throw new Error(
              'Email Google này đã thuộc tài khoản Khách hàng Mobile App. Vui lòng dùng Email công vụ khác.'
            );
          }
          throw new Error('Email Google này đã có trên hệ thống quản trị. Vui lòng chuyển sang Đăng nhập.');
        }

        const newStaff: UnifiedUser = {
          id: `staff-${Date.now()}`,
          fullName: profile.fullName,
          email: profile.email,
          phoneNumber: cleanPhone || undefined,
          company: params.company?.trim() || 'AUSTEC GROUP',
          department: params.department?.trim() || 'Chăm Sóc Khách Hàng',
          role: 'CSKH',
          roleTitle: 'CSKH Support',
          password: undefined,
          googleId: profile.googleId,
          authProvider: 'google',
          hasPassword: false,
          emailVerified: true,
          phoneVerified: false,
          approvalStatus: 'PENDING',
          avatarUrl: profile.avatarUrl,
          isActive: false,
          registeredAt: new Date().toISOString().split('T')[0],
          updatedBy: 'Self-Register (Google)',
        };

        await this.repo.add(newStaff);
        return {
          pendingApproval: true,
          message:
            'Đăng ký tài khoản CSKH bằng Google thành công! Tài khoản đang chờ Quản trị viên phê duyệt.',
          user: this.buildUserPayload(newStaff),
        };
      }

      // Admin/CSKH Login bằng Google
      if (!userRecord) {
        throw new Error(
          'Tài khoản Google này chưa được đăng ký trên cổng quản trị. Bạn có thể đăng ký tài khoản CSKH chờ duyệt.'
        );
      }
      if (userRecord.role === 'CUSTOMER') {
        throw new Error('Tài khoản Khách hàng chỉ được phép đăng nhập trên Ứng dụng di động (Mobile App).');
      }
      if (userRecord.approvalStatus === 'PENDING') {
        throw new Error('Tài khoản CSKH của bạn đang chờ Quản trị viên phê duyệt.');
      }
      if (userRecord.approvalStatus === 'REJECTED') {
        throw new Error('Yêu cầu đăng ký tài khoản của bạn đã bị Quản trị viên từ chối.');
      }
      if (!userRecord.isActive) {
        throw new Error('Tài khoản này đang bị tạm khóa. Vui lòng liên hệ quản trị viên.');
      }

      if (!userRecord.googleId) {
        userRecord =
          (await this.repo.linkGoogleAccount(userRecord.id, profile.googleId, profile.avatarUrl)) ||
          userRecord;
      }

      // Nếu là ADMIN -> vẫn bắt buộc xác thực bước 2 (2FA OTP qua Gmail hoặc Zalo)
      if (userRecord.role === 'ADMIN') {
        const preAuthToken = AuthService.signPreAuthToken({
          id: userRecord.id,
          email: userRecord.email,
          role: userRecord.role,
        });
        const channels = VerificationService.getAvailableChannels(userRecord);
        return {
          require2FA: true,
          preAuthToken,
          channels,
          user: this.buildUserPayload(userRecord),
          message:
            'Xác thực Google thành công. Vui lòng nhập mã OTP 2FA (Gmail hoặc Zalo) để vào cổng Quản trị.',
        };
      }

      const payload = this.buildUserPayload(userRecord);
      const token = AuthService.signToken(payload as any);
      return { token, user: payload, require2FA: false };
    }

    // ========================
    // LUỒNG MOBILE APP (CUSTOMER)
    // ========================
    if (userRecord) {
      if (userRecord.approvalStatus === 'PENDING') {
        throw new Error('Tài khoản đang chờ phê duyệt.');
      }
      if (!userRecord.isActive) {
        throw new Error('Tài khoản này đang bị tạm khóa. Vui lòng liên hệ tổng đài hỗ trợ.');
      }
      if (!userRecord.googleId) {
        userRecord =
          (await this.repo.linkGoogleAccount(userRecord.id, profile.googleId, profile.avatarUrl)) ||
          userRecord;
      }
      const payload = this.buildUserPayload(userRecord);
      const token = AuthService.signToken(payload as any);
      return { token, user: payload, isNewUser: false };
    }

    const newId = `USR-${Date.now().toString().slice(-6)}`;
    const newCustomer: UnifiedUser = {
      id: newId,
      fullName: profile.fullName,
      email: profile.email,
      phoneNumber: cleanPhone || undefined,
      address: '',
      province: 'Hà Nội',
      role: 'CUSTOMER',
      roleTitle: 'Khách hàng',
      password: undefined,
      googleId: profile.googleId,
      authProvider: 'google',
      hasPassword: false,
      emailVerified: true,
      phoneVerified: false,
      approvalStatus: 'APPROVED',
      avatarUrl: profile.avatarUrl,
      isActive: true,
      registeredAt: new Date().toISOString().split('T')[0],
      devices: [],
    };

    await this.repo.add(newCustomer);
    const payload = this.buildUserPayload(newCustomer);
    const token = AuthService.signToken(payload as any);
    return { token, user: payload, isNewUser: true };
  }

  public async register(dto: RegisterDto) {
    const cleanEmail = (dto.email || '').trim().toLowerCase();
    const cleanPhone = (dto.phoneNumber || '').trim().replace(/[\s.-]/g, '');

    if (!dto.fullName || dto.fullName.trim().length < 2) {
      throw new Error('Họ và tên không được để trống.');
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Địa chỉ Email không hợp lệ.');
    }
    if (!dto.password || dto.password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
    }

    const existing = await this.repo.findByEmailOrPhoneAsync(cleanEmail, cleanPhone);
    if (existing) {
      if (existing.approvalStatus === 'PENDING') {
        throw new Error('Email hoặc số điện thoại này đã đăng ký và đang chờ Quản trị viên phê duyệt.');
      }
      throw new Error('Email hoặc số điện thoại này đã được đăng ký trong hệ thống.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const isAdminPortal = dto.portal === 'admin';

    // Web Admin /register: Luôn mặc định CSKH + trạng thái PENDING chờ Admin phê duyệt
    if (isAdminPortal) {
      const newStaff: UnifiedUser = {
        id: `staff-${Date.now()}`,
        fullName: dto.fullName.trim(),
        email: cleanEmail,
        phoneNumber: cleanPhone || undefined,
        company: dto.company?.trim() || 'AUSTEC GROUP',
        department: dto.department?.trim() || 'Chăm Sóc Khách Hàng',
        role: 'CSKH',
        roleTitle: 'CSKH Support',
        password: hashedPassword,
        authProvider: 'local',
        hasPassword: true,
        emailVerified: false,
        phoneVerified: false,
        approvalStatus: 'PENDING',
        isActive: false,
        registeredAt: new Date().toISOString().split('T')[0],
        updatedBy: 'Self-Register',
      };

      await this.repo.add(newStaff);
      return {
        pendingApproval: true,
        user: this.buildUserPayload(newStaff),
        message: 'Đã gửi yêu cầu đăng ký tài khoản CSKH! Vui lòng chờ Quản trị viên phê duyệt.',
      };
    }

    // Mobile App /register: Luôn tạo CUSTOMER kích hoạt ngay (KHÔNG tạo thiết bị giả!)
    const newId = `USR-${Date.now().toString().slice(-6)}`;
    const newUser: UnifiedUser = {
      id: newId,
      fullName: dto.fullName.trim(),
      email: cleanEmail,
      phoneNumber: cleanPhone || undefined,
      address: dto.address ? dto.address.trim() : '',
      province: dto.province || 'Hà Nội',
      role: 'CUSTOMER',
      roleTitle: 'Khách hàng',
      password: hashedPassword,
      authProvider: 'local',
      hasPassword: true,
      emailVerified: false,
      phoneVerified: false,
      approvalStatus: 'APPROVED',
      isActive: true,
      registeredAt: new Date().toISOString().split('T')[0],
      devices: [],
    };

    try {
      await this.repo.add(newUser);
    } catch (dbErr: any) {
      if (dbErr.message?.includes('duplicate key') || dbErr.message?.includes('unique constraint')) {
        throw new Error('Email hoặc số điện thoại này đã tồn tại trong hệ thống.');
      }
      throw dbErr;
    }

    const payload = this.buildUserPayload(newUser);
    const token = AuthService.signToken(payload as any);
    return { token, user: payload, pendingApproval: false };
  }

  public async changePassword(
    userId: string,
    currentPass: string | undefined,
    newPass: string
  ) {
    if (!newPass || newPass.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }

    const userRecord = await this.repo.findByIdAsync(userId);
    if (!userRecord) {
      throw new Error('Không tìm thấy tài khoản người dùng.');
    }

    const userHasPassword = userRecord.hasPassword !== false && Boolean(userRecord.password);
    if (userHasPassword) {
      if (!currentPass) {
        throw new Error('Vui lòng nhập mật khẩu hiện tại.');
      }
      if (currentPass === newPass) {
        throw new Error('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      }
      const matched = await this.verifyPasswordWithAutoUpgrade(userRecord, currentPass);
      if (!matched) {
        throw new Error('Mật khẩu hiện tại không chính xác!');
      }
    }

    const hashed = await bcrypt.hash(newPass, BCRYPT_ROUNDS);
    await this.repo.updatePasswordHash(userId, hashed);
    return {
      wasInitialSetup: !userHasPassword,
      message: userHasPassword ? 'Đổi mật khẩu thành công!' : 'Thiết lập mật khẩu thành công!',
    };
  }

  public async getForgotPasswordOptions(identifier: string) {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPhone = cleanId.replace(/[\s.-]/g, '');
    if (!cleanId) {
      throw new Error('Vui lòng nhập Email hoặc Số điện thoại đã đăng ký.');
    }
    const user = await this.repo.findUserForAuthAsync(cleanId, cleanPhone);
    if (!user) {
      throw new Error('Không tìm thấy tài khoản tương ứng trên hệ thống.');
    }
    if (user.approvalStatus === 'PENDING') {
      throw new Error('Tài khoản đang chờ Quản trị viên phê duyệt.');
    }
    if (!user.isActive) {
      throw new Error('Tài khoản này đang bị tạm khóa.');
    }

    return {
      userId: user.id,
      fullName: user.fullName,
      channels: VerificationService.getAvailableChannels(user),
    };
  }

  public async requestForgotPasswordOtp(identifier: string, channel: OtpChannel) {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPhone = cleanId.replace(/[\s.-]/g, '');
    const user = await this.repo.findUserForAuthAsync(cleanId, cleanPhone);
    if (!user || !user.isActive || user.approvalStatus === 'PENDING') {
      throw new Error('Không tìm thấy tài khoản hợp lệ để khôi phục mật khẩu.');
    }

    const target = channel === 'EMAIL' ? user.email : user.phoneNumber || '';
    return VerificationService.requestOtp({
      userId: user.id,
      identifier: cleanId,
      purpose: 'FORGOT_PASSWORD',
      channel,
      target,
      recipientName: user.fullName,
    });
  }

  public async confirmForgotPassword(
    identifier: string,
    code: string,
    newPassword: string,
    challengeId?: string
  ) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }

    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanPhone = cleanId.replace(/[\s.-]/g, '');
    const user = await this.repo.findUserForAuthAsync(cleanId, cleanPhone);
    if (!user) {
      throw new Error('Không tìm thấy tài khoản tương ứng.');
    }

    await VerificationService.verifyOtp({
      userId: user.id,
      identifier: cleanId,
      purpose: 'FORGOT_PASSWORD',
      code,
      challengeId,
    });

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.repo.updatePasswordHash(user.id, hashed);
    return { message: 'Đặt lại mật khẩu mới thành công! Vui lòng đăng nhập lại.' };
  }

  public async updateProfile(
    userId: string,
    data: { fullName?: string; address?: string; province?: string; avatarUrl?: string }
  ) {
    const updated = await this.repo.updateProfile(userId, {
      fullName: data.fullName,
      address: data.address,
      province: data.province,
      avatarUrl: data.avatarUrl,
    });
    if (!updated) {
      throw new Error('Không tìm thấy tài khoản người dùng.');
    }
    return this.buildUserPayload(updated);
  }

  public async updateContact(
    userId: string,
    data: { email?: string; phoneNumber?: string }
  ) {
    const cleanEmail = data.email ? data.email.trim().toLowerCase() : undefined;
    const cleanPhone = data.phoneNumber ? data.phoneNumber.trim().replace(/[\s.-]/g, '') : undefined;

    if (!cleanEmail && !cleanPhone) {
      throw new Error('Vui lòng cung cấp Email hoặc Số điện thoại mới cần cập nhật.');
    }
    if (cleanEmail && !cleanEmail.includes('@')) {
      throw new Error('Địa chỉ Email mới không đúng định dạng.');
    }
    if (cleanPhone && cleanPhone.length < 9) {
      throw new Error('Số điện thoại mới không hợp lệ.');
    }

    const dup = await this.repo.findByEmailOrPhoneAsync(cleanEmail, cleanPhone, userId);
    if (dup) {
      throw new Error('Email hoặc Số điện thoại này đã được sử dụng bởi một tài khoản khác.');
    }

    const updated = await this.repo.updateContact(userId, {
      email: cleanEmail,
      phoneNumber: cleanPhone,
      emailVerified: cleanEmail ? true : undefined,
      phoneVerified: cleanPhone ? true : undefined,
    });
    if (!updated) {
      throw new Error('Không tìm thấy tài khoản người dùng.');
    }
    return this.buildUserPayload(updated);
  }

  public async linkGoogleAccount(userId: string, idToken: string) {
    const profile = await GoogleAuthService.verifyIdToken(idToken);
    const existingByGoogle = await this.repo.findByGoogleIdAsync(profile.googleId);
    if (existingByGoogle && existingByGoogle.id !== userId) {
      throw new Error('Tài khoản Google này đã được liên kết với một tài khoản Austec khác.');
    }
    const updated = await this.repo.linkGoogleAccount(userId, profile.googleId, profile.avatarUrl);
    if (!updated) {
      throw new Error('Không tìm thấy tài khoản người dùng.');
    }
    return this.buildUserPayload(updated);
  }

  public async unlinkGoogleAccount(userId: string) {
    const user = await this.repo.findByIdAsync(userId);
    if (!user) {
      throw new Error('Không tìm thấy tài khoản người dùng.');
    }
    if (!user.googleId) {
      throw new Error('Tài khoản hiện chưa liên kết với Google.');
    }
    if (user.hasPassword === false || !user.password) {
      throw new Error(
        'Bạn cần thiết lập mật khẩu trước khi hủy liên kết Google để tránh bị khóa khỏi tài khoản.'
      );
    }
    const updated = await this.repo.unlinkGoogleAccount(userId);
    if (!updated) {
      throw new Error('Không thể hủy liên kết Google.');
    }
    return this.buildUserPayload(updated);
  }

  public async deleteOwnAccount(userId: string) {
    return this.repo.deleteOwnAccount(userId);
  }

  // ==========================================
  // STAFF & APPROVAL QUEUE
  // ==========================================
  public isAdminRoleInput(role?: string, systemRole?: string): boolean {
    const val = `${systemRole || ''} ${role || ''}`.toUpperCase();
    return val.includes('ADMIN');
  }

  public async getStaff() {
    const staffList = await this.repo.getStaff();
    return staffList.map((u, idx) => ({
      id: u.id,
      empID: u.empID || `AUSTEC${String(idx + 1).padStart(3, '0')}`,
      name: u.fullName,
      fullName: u.fullName,
      email: u.email,
      phone: u.phoneNumber || '',
      phoneNumber: u.phoneNumber || '',
      company: u.company || 'AUSTEC GROUP',
      department: u.department || 'Ban Điều Hành',
      role: u.roleTitle || (u.role === 'ADMIN' ? 'Administrator' : 'CSKH Support'),
      systemRole: u.role,
      authProvider: u.authProvider || 'local',
      googleLinked: Boolean(u.googleId),
      approvalStatus: u.approvalStatus || 'APPROVED',
      isActive: u.isActive,
      updatedBy: u.updatedBy || 'System',
      updatedAt: u.updatedAt || u.registeredAt,
    }));
  }

  public async getPendingStaff() {
    const list = await this.repo.getPendingStaff();
    return list.map(u => ({
      id: u.id,
      name: u.fullName,
      fullName: u.fullName,
      email: u.email,
      phone: u.phoneNumber || '',
      phoneNumber: u.phoneNumber || '',
      company: u.company || 'AUSTEC GROUP',
      department: u.department || 'Chăm Sóc Khách Hàng',
      role: u.roleTitle || 'CSKH Support',
      systemRole: u.role,
      authProvider: u.authProvider || 'local',
      googleLinked: Boolean(u.googleId),
      avatarUrl: u.avatarUrl,
      approvalStatus: u.approvalStatus || 'PENDING',
      registeredAt: u.registeredAt,
    }));
  }

  public async approvePendingStaff(id: string, approverEmail: string) {
    const existingStaff = await this.repo.getStaff();
    const newEmpId = `AUSTEC${String(existingStaff.length + 1).padStart(3, '0')}`;
    const approved = await this.repo.approvePendingStaff(id, approverEmail, newEmpId);
    if (!approved) {
      throw new Error('Không tìm thấy yêu cầu đăng ký chờ duyệt này (có thể đã được xử lý).');
    }
    return approved;
  }

  public async rejectPendingStaff(id: string, approverEmail: string) {
    const ok = await this.repo.rejectPendingStaff(id, approverEmail);
    if (!ok) {
      throw new Error('Không tìm thấy yêu cầu đăng ký chờ duyệt này.');
    }
    return true;
  }

  public async createStaff(dto: CreateStaffDto, creatorEmail: string) {
    const cleanEmail = dto.email.trim().toLowerCase();
    const cleanPhone = (dto.phoneNumber || dto.phone || '').trim().replace(/[\s.-]/g, '');

    const existing = await this.repo.findByEmailOrPhoneAsync(cleanEmail, cleanPhone);
    if (existing) {
      throw new Error('Email hoặc số điện thoại này đã tồn tại trong hệ thống.');
    }

    const actualRole: 'ADMIN' | 'CSKH' = this.isAdminRoleInput(dto.role, dto.systemRole)
      ? 'ADMIN'
      : 'CSKH';
    const staffList = await this.repo.getStaff();
    const newEmpId = `AUSTEC${String(staffList.length + 1).padStart(3, '0')}`;

    const rawPassword = dto.password && dto.password.trim().length >= 6 ? dto.password.trim() : null;
    if (!rawPassword) {
      throw new Error('Vui lòng nhập mật khẩu khởi tạo (tối thiểu 6 ký tự) cho cán bộ mới.');
    }
    const hashedPassword = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS);

    const newStaff: UnifiedUser = {
      id: `staff-${Date.now()}`,
      empID: newEmpId,
      fullName: dto.fullName.trim(),
      email: cleanEmail,
      phoneNumber: cleanPhone || undefined,
      company: dto.company || 'AUSTEC',
      department:
        dto.department ||
        (actualRole === 'ADMIN' ? 'Phòng Kỹ Thuật IoT' : 'Chăm Sóc Khách Hàng'),
      role: actualRole,
      roleTitle: dto.role || (actualRole === 'ADMIN' ? 'Administrator' : 'CSKH Support'),
      password: hashedPassword,
      authProvider: 'local',
      hasPassword: true,
      emailVerified: true,
      approvalStatus: 'APPROVED',
      isActive: true,
      registeredAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      updatedBy: creatorEmail,
    };

    await this.repo.add(newStaff);
    return newStaff;
  }

  public async updateStaff(id: string, updates: any, updaterEmail: string) {
    let staff = this.repo.findById(id);
    if (!staff) {
      staff = (await this.repo.findByIdAsync(id)) || undefined;
    }
    if (!staff || staff.role === 'CUSTOMER') {
      throw new Error('Không tìm thấy cán bộ quản trị.');
    }

    if (updates.fullName || updates.name) staff.fullName = (updates.fullName || updates.name).trim();
    if (updates.email) staff.email = updates.email.trim().toLowerCase();
    if (updates.phone || updates.phoneNumber) {
      staff.phoneNumber = (updates.phoneNumber || updates.phone).trim();
    }
    if (updates.company) staff.company = updates.company;
    if (updates.department) staff.department = updates.department;
    if (updates.role) {
      staff.roleTitle = updates.role;
      staff.role = this.isAdminRoleInput(updates.role, updates.systemRole) ? 'ADMIN' : 'CSKH';
    } else if (updates.systemRole) {
      staff.role = updates.systemRole;
    }
    if (updates.password && updates.password.trim().length >= 6) {
      staff.password = await bcrypt.hash(updates.password.trim(), BCRYPT_ROUNDS);
      staff.hasPassword = true;
    } else {
      delete (updates as any).password;
    }
    staff.updatedAt = new Date().toISOString().split('T')[0];
    staff.updatedBy = updaterEmail;

    await this.repo.update(id, staff);
    return staff;
  }

  public async deleteStaff(id: string) {
    let staff = this.repo.findById(id);
    if (!staff) {
      staff = (await this.repo.findByIdAsync(id)) || undefined;
    }
    if (!staff || staff.role === 'CUSTOMER') {
      throw new Error('Không tìm thấy cán bộ.');
    }
    return await this.repo.remove(id);
  }

  public async toggleStaffStatus(id: string, isActive?: boolean) {
    let staff = this.repo.findById(id);
    if (!staff) {
      staff = (await this.repo.findByIdAsync(id)) || undefined;
    }
    if (!staff || staff.role === 'CUSTOMER') {
      throw new Error('Không tìm thấy cán bộ.');
    }
    staff.isActive = isActive !== undefined ? Boolean(isActive) : !staff.isActive;
    staff.updatedAt = new Date().toISOString().split('T')[0];
    await this.repo.update(id, staff);
    return staff;
  }

  public async getCustomers() {
    return await this.repo.getCustomers();
  }

  public async createCustomer(dto: CreateCustomerDto) {
    const cleanEmail = (dto.email || '').trim().toLowerCase();
    const cleanPhone = (dto.phoneNumber || '').trim().replace(/[\s.-]/g, '');

    const existing = await this.repo.findByEmailOrPhoneAsync(cleanEmail, cleanPhone);
    if (existing) {
      throw new Error('Khách hàng với Email hoặc Số điện thoại này đã tồn tại.');
    }

    const newId = `USR-${Date.now().toString().slice(-6)}`;
    const rawPassword = dto.password && dto.password.trim().length >= 6 ? dto.password.trim() : null;
    if (!rawPassword) {
      throw new Error('Vui lòng nhập mật khẩu (tối thiểu 6 ký tự) cho tài khoản khách hàng.');
    }
    const hashedPassword = await bcrypt.hash(rawPassword, BCRYPT_ROUNDS);

    const newCust: UnifiedUser = {
      id: newId,
      fullName: dto.fullName.trim(),
      email: cleanEmail || `${cleanPhone}@customer.austec.vn`,
      phoneNumber: cleanPhone,
      address: dto.address ? dto.address.trim() : '',
      province: dto.province || 'Hà Nội',
      role: 'CUSTOMER',
      roleTitle: 'Khách hàng',
      password: hashedPassword,
      authProvider: 'local',
      hasPassword: true,
      approvalStatus: 'APPROVED',
      isActive: dto.isActive !== false,
      registeredAt: new Date().toISOString().split('T')[0],
      devices: [],
    };

    await this.repo.add(newCust);
    return newCust;
  }

  public async toggleCustomerStatus(id: string, isActive?: boolean) {
    let cust = this.repo.findById(id);
    if (!cust) {
      cust = (await this.repo.findByIdAsync(id)) || undefined;
    }
    if (!cust) {
      throw new Error('Không tìm thấy khách hàng.');
    }
    cust.isActive = isActive !== undefined ? Boolean(isActive) : !cust.isActive;
    await this.repo.update(id, cust);
    return cust;
  }

  public async updateCustomer(id: string, updates: any) {
    let cust = this.repo.findById(id);
    if (!cust) {
      cust = (await this.repo.findByIdAsync(id)) || undefined;
    }
    if (!cust) {
      throw new Error('Không tìm thấy khách hàng.');
    }

    if (updates.fullName || updates.name) cust.fullName = (updates.fullName || updates.name).trim();
    if (updates.email) cust.email = updates.email.trim().toLowerCase();
    if (updates.phone || updates.phoneNumber) {
      cust.phoneNumber = (updates.phoneNumber || updates.phone).trim();
    }
    if (updates.address !== undefined) cust.address = updates.address.trim();
    if (updates.province !== undefined) cust.province = updates.province.trim();
    if (updates.isActive !== undefined) cust.isActive = Boolean(updates.isActive);
    cust.updatedAt = new Date().toISOString().split('T')[0];

    await this.repo.update(id, cust);
    return cust;
  }

  public async deleteCustomer(id: string) {
    let cust = this.repo.findById(id);
    if (!cust) {
      cust = (await this.repo.findByIdAsync(id)) || undefined;
    }
    if (!cust) {
      throw new Error('Không tìm thấy khách hàng.');
    }
    return await this.repo.remove(id);
  }

  public async getRoles() {
    return this.repo.getRoles();
  }

  public async updateRole(roleId: number, data: { name: string; description?: string }) {
    return this.repo.updateRole(roleId, data);
  }

  public async updateRolePermissions(roleId: number, permissions: any[]) {
    return this.repo.updateRolePermissions(roleId, permissions);
  }

  public async saveRoles(roles: any[]) {
    return this.repo.saveRoles(roles);
  }

  public async deleteRole(roleId: number) {
    return this.repo.deleteRole(roleId);
  }
}
