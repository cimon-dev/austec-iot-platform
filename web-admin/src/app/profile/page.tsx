"use client";

import React, { useState, useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useCustomerAuth } from "@/customer/context/CustomerAuthContext";
import { customerApi } from "@/customer/services/customer-api-client";
import { CustomerStepUpModal } from "@/customer/components/CustomerStepUpModal";
import {
  Trash2,
  Camera,
  Save,
  KeyRound,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";

export default function CustomerProfilePage() {
  const { user, authConfig, updateProfile, refreshProfile, logout } =
    useCustomerAuth();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [address, setAddress] = useState(user?.address || "");
  const [province, setProvince] = useState(user?.province || "Hà Nội");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPwdStepUp, setShowPwdStepUp] = useState(false);

  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [newPhone, setNewPhone] = useState(user?.phoneNumber || "");
  const [showContactStepUp, setShowContactStepUp] = useState(false);

  const [showUnlinkGoogleStepUp, setShowUnlinkGoogleStepUp] = useState(false);
  const [showDeleteAccountStepUp, setShowDeleteAccountStepUp] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName(user.fullName || "");
    setAddress(user.address || "");
    setProvince(user.province || "Hà Nội");
    setNewEmail(user.email || "");
    setNewPhone(user.phoneNumber || "");
  }, [user]);

  const handleSaveBasicProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await updateProfile({
        fullName: fullName.trim(),
        address: address.trim(),
        province,
      });
      if (res.success) {
        toast.success("Đã lưu thông tin hồ sơ cá nhân");
      } else {
        toast.error(res.error || "Không thể cập nhật hồ sơ");
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const up = await customerApi.uploadFile(file, "/api/upload/image");
    const url = up.url || up.data?.url;
    if (up.success && url) {
      await updateProfile({ avatarUrl: url });
      toast.success("Đã cập nhật ảnh đại diện");
    } else {
      toast.error(up.error || "Không thể tải ảnh lên");
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 overflow-hidden">
      {/* Top Profile Banner */}
      <div className="shrink-0 p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <label className="relative w-14 h-14 rounded-xl bg-blue-600 text-white font-semibold text-lg flex items-center justify-center overflow-hidden cursor-pointer group shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              user?.fullName?.charAt(0) || "U"
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </label>
          <div>
            <h1 className="text-base font-semibold">{user?.fullName}</h1>
            <p className="text-xs text-[#525D6F] dark:text-[#9BA4B2] font-mono">
              {user?.email} · {user?.phoneNumber || "Chưa cập nhật SĐT"}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-600/12 text-blue-500 text-[10px] font-medium">
                Gia chủ Austec
              </span>
              {user?.googleLinked && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/12 text-emerald-500 text-[10px] font-medium">
                  Đã liên kết Google
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Inner Content */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 max-w-6xl mx-auto">
          {/* Left 6 cols */}
          <div className="lg:col-span-6 space-y-3">
            <form
              onSubmit={handleSaveBasicProfile}
              className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-3"
            >
              <h2 className="text-xs font-semibold">Thông tin gia chủ</h2>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Tỉnh / Thành phố
                </label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Địa chỉ nhà thông minh
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu thông tin hồ sơ</span>
              </button>
            </form>

            <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-3">
              <h2 className="text-xs font-semibold">
                Email & số điện thoại nhận OTP (Step-up OTP)
              </h2>
              <div>
                <label className="block text-xs font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Số điện thoại Zalo ZNS
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowContactStepUp(true)}
                className="h-8 px-3.5 rounded-lg border border-blue-500/35 bg-blue-600/10 text-blue-500 text-xs font-medium cursor-pointer"
              >
                Xác thực OTP & cập nhật liên hệ
              </button>
            </div>
          </div>

          {/* Right 6 cols */}
          <div className="lg:col-span-6 space-y-3">
            <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-3">
              <h2 className="text-xs font-semibold">
                Đổi mật khẩu bảo mật (Step-up OTP)
              </h2>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Mật khẩu mới (tối thiểu 6 ký tự)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Nhập lại mật khẩu mới
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (newPassword.length < 6) {
                    toast.error("Mật khẩu mới phải từ 6 ký tự trở lên");
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    toast.error("Mật khẩu nhập lại không khớp");
                    return;
                  }
                  setShowPwdStepUp(true);
                }}
                className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Đổi mật khẩu</span>
              </button>
            </div>

            <div className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] space-y-2.5">
              <h2 className="text-xs font-semibold">Liên kết tài khoản Google</h2>
              <p className="text-xs text-[#525D6F] dark:text-[#9BA4B2]">
                Cho phép đăng nhập nhanh bằng tài khoản Google trên cả Web và Mobile App.
              </p>
              {user?.googleLinked ? (
                <button
                  type="button"
                  onClick={() => setShowUnlinkGoogleStepUp(true)}
                  className="h-8 px-3.5 rounded-lg border border-amber-500/35 text-amber-500 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Hủy liên kết Google</span>
                </button>
              ) : (
                authConfig.googleWebClientId && (
                  <GoogleLogin
                    onSuccess={async (cred) => {
                      if (!cred.credential) return;
                      const res = await customerApi.post("/api/auth/google/link", {
                        idToken: cred.credential,
                      });
                      if (res.success) {
                        toast.success("Đã liên kết tài khoản Google thành công");
                        refreshProfile();
                      } else {
                        toast.error(res.error || "Không thể liên kết Google");
                      }
                    }}
                    onError={() => toast.error("Lỗi xác thực Google")}
                  />
                )
              )}
            </div>

            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2.5">
              <h2 className="text-xs font-semibold text-rose-500">
                Xóa tài khoản vĩnh viễn
              </h2>
              <p className="text-xs text-[#525D6F] dark:text-[#9BA4B2]">
                Xóa toàn bộ thông tin cá nhân và gỡ liên kết tất cả thiết bị khỏi hệ thống Austec. Thao tác không thể hoàn tác.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      "Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản này? Hệ thống sẽ gửi mã OTP xác nhận bước cuối."
                    )
                  ) {
                    setShowDeleteAccountStepUp(true);
                  }
                }}
                className="h-8 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yêu cầu xóa tài khoản vĩnh viễn</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Step-up Modals */}
      <CustomerStepUpModal
        isOpen={showPwdStepUp}
        purpose="CHANGE_PASSWORD"
        title="Xác thực OTP để đổi mật khẩu"
        onClose={() => setShowPwdStepUp(false)}
        onVerified={async (stepUpToken) => {
          setShowPwdStepUp(false);
          const res = await customerApi.post(
            "/api/auth/change-password",
            { currentPassword, newPassword },
            { stepUpToken }
          );
          if (res.success) {
            toast.success("Đổi mật khẩu thành công");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
          } else {
            toast.error(res.error || "Không thể đổi mật khẩu");
          }
        }}
      />

      <CustomerStepUpModal
        isOpen={showContactStepUp}
        purpose="UPDATE_CONTACT"
        title="Xác thực OTP để cập nhật Email & SĐT"
        onClose={() => setShowContactStepUp(false)}
        onVerified={async (stepUpToken) => {
          setShowContactStepUp(false);
          const res = await customerApi.put(
            "/api/auth/contact",
            { email: newEmail.trim(), phoneNumber: newPhone.trim() },
            { stepUpToken }
          );
          if (res.success) {
            toast.success("Đã cập nhật thông tin liên hệ");
            refreshProfile();
          } else {
            toast.error(res.error || "Không thể cập nhật thông tin liên hệ");
          }
        }}
      />

      <CustomerStepUpModal
        isOpen={showUnlinkGoogleStepUp}
        purpose="UNLINK_GOOGLE"
        title="Xác thực OTP để hủy liên kết Google"
        onClose={() => setShowUnlinkGoogleStepUp(false)}
        onVerified={async (stepUpToken) => {
          setShowUnlinkGoogleStepUp(false);
          const res = await customerApi.post(
            "/api/auth/google/unlink",
            {},
            { stepUpToken }
          );
          if (res.success) {
            toast.success("Đã hủy liên kết tài khoản Google");
            refreshProfile();
          } else {
            toast.error(res.error || "Không thể hủy liên kết Google");
          }
        }}
      />

      <CustomerStepUpModal
        isOpen={showDeleteAccountStepUp}
        purpose="DELETE_ACCOUNT"
        title="Xác thực OTP để xóa vĩnh viễn tài khoản"
        onClose={() => setShowDeleteAccountStepUp(false)}
        onVerified={async (stepUpToken) => {
          setShowDeleteAccountStepUp(false);
          const res = await customerApi.delete("/api/auth/account", {
            stepUpToken,
          });
          if (res.success) {
            toast.success("Tài khoản đã được xóa vĩnh viễn");
            logout();
          } else {
            toast.error(res.error || "Không thể xóa tài khoản");
          }
        }}
      />
    </div>
  );
}
