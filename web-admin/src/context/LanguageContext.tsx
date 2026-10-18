"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "vi" | "en";

export interface Translations {
  [key: string]: {
    vi: string;
    en: string;
  };
}

export const DICTIONARY: Translations = {
  // Common / Navigation
  appName: { vi: "AUSTEC", en: "AUSTEC" },
  appSub: { vi: "HỆ SINH THÁI IOT", en: "IOT ECOSYSTEM" },
  dashboard: { vi: "Dashboard Tổng quan", en: "Overview Dashboard" },
  devices: { vi: "Quản lý Thiết bị", en: "Device Management" },
  deviceGroups: { vi: "Nhóm sản phẩm", en: "Product Groups" },
  deviceTypes: { vi: "Loại phần cứng", en: "Hardware Types" },
  deviceSchema: { vi: "Từ điển Schema", en: "Schema Properties" },
  deviceModels: { vi: "Mẫu thương phẩm", en: "Device Models" },
  deviceImport: { vi: "Nhập kho & Tem QR", en: "Import & QR Decals" },
  deviceList: { vi: "Danh sách thiết bị", en: "Device Inventory" },
  cskhHub: { vi: "CSKH Hub & Live Chat", en: "Support Hub & Live Chat" },
  blackbox: { vi: "Hộp đen Kiểm toán", en: "Blackbox Audit" },
  customers: { vi: "Quản lý Khách hàng", en: "Customer Management" },
  settings: { vi: "Cài đặt hệ thống", en: "System Settings" },
  searchPlaceholder: { vi: "Tìm thiết bị, IMEI, khách hàng (⌘K)...", en: "Search devices, IMEI, customers (⌘K)..." },
  logout: { vi: "Đăng xuất", en: "Sign Out" },
  login: { vi: "Đăng nhập", en: "Sign In" },
  register: { vi: "Đăng ký tài khoản", en: "Register Account" },
  notifications: { vi: "Thông báo hệ thống", en: "System Alerts" },
  allCaughtUp: { vi: "Đã đọc tất cả thông báo", en: "All notifications caught up" },
  viewAll: { vi: "Xem tất cả", en: "View All" },
  collapseSidebar: { vi: "Thu gọn thanh điều hướng", en: "Collapse Sidebar" },
  expandSidebar: { vi: "Mở rộng thanh điều hướng", en: "Expand Sidebar" },
  themeDark: { vi: "Giao diện Tối", en: "Dark Mode" },
  themeLight: { vi: "Giao diện Sáng", en: "Light Mode" },
  vietnamese: { vi: "Tiếng Việt", en: "Vietnamese" },
  english: { vi: "Tiếng Anh", en: "English" },
  statusOnline: { vi: "Trực tuyến", en: "Online" },
  statusOffline: { vi: "Ngoại tuyến", en: "Offline" },
  statusWarning: { vi: "Cảnh báo", en: "Warning" },
  liveTelemetry: { vi: "Viễn thám thời gian thực", en: "Live Telemetry" },
  activeDevices: { vi: "Thiết bị hoạt động", en: "Active Devices" },
  systemHealth: { vi: "Sức khỏe hạ tầng", en: "Infrastructure Health" },
  highSecurityNotice: { vi: "Bảo mật cấp Doanh nghiệp với SHA-256 & AES-256", en: "Enterprise Grade SHA-256 & AES-256 Security" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("vi");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("austec_lang") as Language;
      if (saved === "vi" || saved === "en") {
        setLanguageState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("austec_lang", lang);
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === "vi" ? "en" : "vi");
  };

  const t = (key: string, fallback?: string): string => {
    if (DICTIONARY[key]) {
      return DICTIONARY[key][language];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
