"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Users, 
  Search, 
  Filter, 
  Smartphone, 
  ShieldCheck, 
  Calendar, 
  MapPin, 
  Radio, 
  X, 
  Lock, 
  Unlock, 
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Phone,
  Mail
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { usePermissions } from "../../context/PermissionContext";
import { AccessDenied } from "../../components/AccessDenied";
import { Pagination } from "@/components/Pagination";

interface CustomerDevice {
  hardwareId: string;
  modelName: string;
  deviceType: string;
  pairedAt: string;
  warrantyUntil: string;
  isOnline: boolean;
  roleInHome: "OWNER" | "MEMBER" | "GUEST";
}

interface CustomerAccount {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  province: string;
  registeredAt: string;
  isActive: boolean;
  devices: CustomerDevice[];
}

const MOCK_CUSTOMERS: CustomerAccount[] = [
  {
    id: "USR-001928",
    fullName: "Nguyễn Văn Nam",
    email: "nguyen.vannam@gmail.com",
    phoneNumber: "0912345678",
    address: "Số 45, Đường Lê Duẩn, P. Bến Nghé",
    province: "TP. Hồ Chí Minh",
    registeredAt: "2025-08-12",
    isActive: true,
    devices: [
      {
        hardwareId: "AT-DOOR-88239A",
        modelName: "Austec Titadoor A900 Super",
        deviceType: "Cửa cuốn",
        pairedAt: "2025-08-12 10:15",
        warrantyUntil: "2027-08-12",
        isOnline: true,
        roleInHome: "OWNER"
      },
      {
        hardwareId: "UPS-220V-77192C",
        modelName: "Bộ Lưu Điện Austec Sin Chuẩn Pro",
        deviceType: "Bộ lưu điện",
        pairedAt: "2025-08-12 10:25",
        warrantyUntil: "2027-08-12",
        isOnline: true,
        roleInHome: "OWNER"
      }
    ]
  },
  {
    id: "USR-004312",
    fullName: "Lê Văn Thành",
    email: "le.vanthanh@gmail.com",
    phoneNumber: "0987654321",
    address: "Tòa Park 3, Vinhomes Times City",
    province: "Hà Nội",
    registeredAt: "2025-11-20",
    isActive: true,
    devices: [
      {
        hardwareId: "MS-LOCK-99120B",
        modelName: "Khóa Masaru Titan X1",
        deviceType: "Khóa thông minh",
        pairedAt: "2025-11-20 14:00",
        warrantyUntil: "2027-11-20",
        isOnline: true,
        roleInHome: "OWNER"
      }
    ]
  },
  {
    id: "USR-008712",
    fullName: "Phạm Đức Mạnh",
    email: "pham.ducmanh@gmail.com",
    phoneNumber: "0944102588",
    address: "Số 88, Phố Huế, P. Ngô Thì Nhậm, Q. Hai Bà Trưng",
    province: "Hà Nội",
    registeredAt: "2026-01-05",
    isActive: true,
    devices: [
      {
        hardwareId: "AT-DOOR-33019F",
        modelName: "Austec Titadoor A900 Super",
        deviceType: "Cửa cuốn",
        pairedAt: "2026-01-05 08:30",
        warrantyUntil: "2028-01-05",
        isOnline: false,
        roleInHome: "OWNER"
      }
    ]
  },
  {
    id: "USR-009941",
    fullName: "Trần Thị Bích Ngọc",
    email: "bichngoc.tran@gmail.com",
    phoneNumber: "0933556677",
    address: "Đường Nguyễn Hữu Thọ, Q. Cẩm Lệ",
    province: "Đà Nẵng",
    registeredAt: "2026-02-14",
    isActive: false,
    devices: [
      {
        hardwareId: "MS-LOCK-33219E",
        modelName: "Khóa Masaru Titan X1",
        deviceType: "Khóa thông minh",
        pairedAt: "2026-02-14 16:45",
        warrantyUntil: "2028-02-14",
        isOnline: true,
        roleInHome: "MEMBER"
      }
    ]
  },
  {
    id: "USR-010452",
    fullName: "Hoàng Minh Tuấn",
    email: "tuan.hoangminh@gmail.com",
    phoneNumber: "0915889001",
    address: "12 Lạch Tray, Ngô Quyền",
    province: "Hải Phòng",
    registeredAt: "2026-02-28",
    isActive: true,
    devices: [
      {
        hardwareId: "AT-BIKE-55410D",
        modelName: "GSHT Austec 4G",
        deviceType: "GSHT",
        pairedAt: "2026-02-28 09:10",
        warrantyUntil: "2027-02-28",
        isOnline: true,
        roleInHome: "OWNER"
      }
    ]
  },
  {
    id: "USR-011203",
    fullName: "Vũ Đình Long",
    email: "long.vd@gmail.com",
    phoneNumber: "0977641983",
    address: "Khu đô thị Starlake, Tây Hồ",
    province: "Hà Nội",
    registeredAt: "2026-03-01",
    isActive: true,
    devices: [
      {
        hardwareId: "AT-DOOR-88239A05",
        modelName: "Austec Titadoor A900 Super",
        deviceType: "Cửa cuốn",
        pairedAt: "2026-03-01 11:20",
        warrantyUntil: "2028-03-01",
        isOnline: true,
        roleInHome: "OWNER"
      }
    ]
  },
  {
    id: "USR-012890",
    fullName: "Nguyễn Công Bằng",
    email: "bang.nguyen@yahoo.com",
    phoneNumber: "0933753799",
    address: "Khu dân cư Him Lam, Quận 7",
    province: "TP. Hồ Chí Minh",
    registeredAt: "2026-03-15",
    isActive: true,
    devices: [
      {
        hardwareId: "AT-DOOR-88239A04",
        modelName: "Austec Titadoor A900 Super",
        deviceType: "Cửa cuốn",
        pairedAt: "2026-03-15 15:30",
        warrantyUntil: "2028-03-15",
        isOnline: false,
        roleInHome: "OWNER"
      }
    ]
  },
  {
    id: "USR-013441",
    fullName: "Lò Thị Mai",
    email: "mai.lothi@gmail.com",
    phoneNumber: "0362227229",
    address: "Bản Mòn, Phường Chiềng Cơi",
    province: "Khác",
    registeredAt: "2026-03-22",
    isActive: true,
    devices: [
      {
        hardwareId: "AT-DOOR-88239A06",
        modelName: "Cửa Cuốn Tấm Liền Công Nghệ Úc",
        deviceType: "Cửa cuốn",
        pairedAt: "2026-03-22 17:00",
        warrantyUntil: "2027-09-22",
        isOnline: true,
        roleInHome: "OWNER"
      }
    ]
  },
  {
    id: "USR-014520",
    fullName: "Đặng Thùy Dung",
    email: "thuydung.dang@gmail.com",
    phoneNumber: "0908123899",
    address: "Đường 30/4, P. Hưng Lợi, Q. Ninh Kiều",
    province: "Cần Thơ",
    registeredAt: "2026-04-02",
    isActive: true,
    devices: [
      {
        hardwareId: "MS-LOCK-77124B",
        modelName: "Khóa Masaru Titan X1",
        deviceType: "Khóa thông minh",
        pairedAt: "2026-04-02 08:45",
        warrantyUntil: "2028-04-02",
        isOnline: true,
        roleInHome: "OWNER"
      }
    ]
  },
  {
    id: "USR-015891",
    fullName: "Bùi Quang Huy",
    email: "huy.quangbui@gmail.com",
    phoneNumber: "0982487278",
    address: "Đường Bạch Đằng, Q. Hải Châu",
    province: "Đà Nẵng",
    registeredAt: "2026-04-10",
    isActive: true,
    devices: [
      {
        hardwareId: "UPS-220V-99011C",
        modelName: "Bộ Lưu Điện Austec Sin Chuẩn Pro",
        deviceType: "Bộ lưu điện",
        pairedAt: "2026-04-10 14:15",
        warrantyUntil: "2027-04-10",
        isOnline: true,
        roleInHome: "OWNER"
      }
    ]
  }
];

export default function CustomersManagementPage() {
  const { t, language } = useLanguage();
  const { canView, canUpdate } = usePermissions();

  const [customers, setCustomers] = useState<CustomerAccount[]>(MOCK_CUSTOMERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("ALL");
  const [viewCustomer, setViewCustomer] = useState<CustomerAccount | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      const q = searchTerm.toLowerCase();
      const matchSearch = 
        cust.fullName.toLowerCase().includes(q) ||
        cust.email.toLowerCase().includes(q) ||
        cust.phoneNumber.includes(q) ||
        cust.id.toLowerCase().includes(q);
      
      const matchProvince = selectedProvince === "ALL" || cust.province === selectedProvince;

      return matchSearch && matchProvince;
    });
  }, [customers, searchTerm, selectedProvince]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProvince]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const toggleAccountStatus = (id: string) => {
    if (!canUpdate("mod_user")) return;

    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, isActive: !c.isActive };
      }
      return c;
    }));

    if (viewCustomer && viewCustomer.id === id) {
      setViewCustomer(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
    }
  };

  // RBAC Gating
  if (!canView("mod_user")) {
    return (
      <AccessDenied 
        moduleName="Khách Hàng App (Customer Hub)"
        requiredModule="mod_user"
      />
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2 overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {language === "vi" ? "Quản Lý Khách Hàng (Customer Hub)" : "Customer Identity Hub"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-medium">
            {language === "vi" ? "Tổng tài khoản:" : "Total Accounts:"} <strong className="text-slate-900 dark:text-white font-mono">{customers.length}</strong>
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder={language === "vi" ? "Tìm theo tên, SĐT hoặc email..." : "Search by customer name, phone, or email..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select 
            value={selectedProvince} 
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">{language === "vi" ? "Mọi tỉnh thành" : "All Provinces"}</option>
            <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
            <option value="Hà Nội">Hà Nội</option>
            <option value="Đà Nẵng">Đà Nẵng</option>
            <option value="Bình Dương">Bình Dương</option>
          </select>
        </div>
      </div>

      {/* Main Split Content: Table on Left, Docked Details on Right (if selected) */}
      <div className="flex-1 min-h-0 flex gap-2.5 overflow-hidden">
        {/* Table Area */}
        <div className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-[11px] uppercase font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-2.5">{language === "vi" ? "Khách hàng" : "Customer"}</th>
                  <th className="p-2.5">{language === "vi" ? "Liên hệ & Địa chỉ" : "Contact & Address"}</th>
                  <th className="p-2.5">{language === "vi" ? "Khu vực" : "Province"}</th>
                  <th className="p-2.5 text-center">{language === "vi" ? "Thiết bị" : "Devices"}</th>
                  <th className="p-2.5 text-center">{language === "vi" ? "Trạng thái" : "Status"}</th>
                  <th className="p-2.5 text-right">{language === "vi" ? "Thao tác" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedCustomers.map((customer) => {
                  const isSelected = viewCustomer?.id === customer.id;
                  return (
                    <tr 
                      key={customer.id} 
                      onClick={() => setViewCustomer(customer)}
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? "bg-blue-500/10 border-l-4 border-blue-600 dark:border-blue-400" 
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-900 dark:text-white">{customer.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{customer.id}</div>
                      </td>
                      <td className="p-2.5">
                        <div className="font-mono text-cyan-600 dark:text-cyan-400 font-medium">{customer.phoneNumber}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{customer.email}</div>
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-1 text-[11px] text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{customer.province}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{customer.address}</div>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                          <Smartphone className="w-3 h-3" />
                          {customer.devices.length}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        {customer.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {language === "vi" ? "Hoạt động" : "Active"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            {language === "vi" ? "Đang khóa" : "Locked"}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewCustomer(customer);
                          }}
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition-colors inline-flex items-center gap-1 cursor-pointer ${
                            isSelected 
                              ? "bg-blue-600 text-white border-blue-600" 
                              : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                          }`}
                        >
                          <span>{language === "vi" ? "Chi tiết" : "Details"}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                      {language === "vi" ? "Không tìm thấy khách hàng nào khớp với tìm kiếm." : "No customers found matching search query."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredCustomers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[10, 15, 20, 50, 100]}
            itemName={language === "vi" ? "khách hàng" : "customers"}
          />
        </div>

        {/* Docked Right Inspector Pane (No backdrop, No dimming) */}
        {viewCustomer && (
          <div className="w-80 md:w-96 lg:w-[410px] shrink-0 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col min-h-0 overflow-hidden animate-in slide-in-from-right-4 duration-150">
            {/* Inspector Top */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-800/50">
              <div>
                <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">{viewCustomer.id}</span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{viewCustomer.fullName}</h2>
              </div>
              <button 
                onClick={() => setViewCustomer(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Đóng bảng chi tiết"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inspector Scrollable Body */}
            <div className="flex-1 min-h-0 p-3 overflow-y-auto space-y-3 text-xs">
              {/* Customer Profile Card */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Số điện thoại:</span>
                  <span className="text-slate-900 dark:text-white font-mono font-bold">{viewCustomer.phoneNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Email:</span>
                  <span className="text-slate-800 dark:text-slate-200 text-[11px] font-mono">{viewCustomer.email}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] shrink-0 mr-2">Địa chỉ:</span>
                  <span className="text-slate-700 dark:text-slate-300 text-[11px] text-right">{viewCustomer.address}, {viewCustomer.province}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">Ngày đăng ký:</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{viewCustomer.registeredAt}</span>
                </div>

                {canUpdate("mod_user") && (
                  <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700/60 pt-2 mt-1">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">Khóa tài khoản:</span>
                    <button 
                      onClick={() => toggleAccountStatus(viewCustomer.id)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all shadow-sm cursor-pointer ${
                        viewCustomer.isActive 
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                      }`}
                    >
                      {viewCustomer.isActive ? (
                        <>
                          <Lock className="w-3 h-3" /> <span>Khóa truy cập</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3 h-3" /> <span>Mở khóa tài khoản</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Owned Devices List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Thiết Bị Đang Sở Hữu ({viewCustomer.devices.length})
                  </h3>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold">
                    Bảo hành chính hãng
                  </span>
                </div>

                <div className="space-y-2">
                  {viewCustomer.devices.map(device => (
                    <div 
                      key={device.hardwareId}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">{device.hardwareId}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{device.modelName}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                          device.isOnline 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                        }`}>
                          {device.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-white dark:bg-slate-900/60 p-2 rounded-md border border-slate-200 dark:border-slate-800">
                        <div>
                          <span className="block text-slate-400 text-[9px]">Kích hoạt:</span>
                          <span className="text-slate-700 dark:text-slate-300">{device.pairedAt}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 text-[9px]">Hạn BH:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{device.warrantyUntil}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span className="text-slate-500 dark:text-slate-400">
                          Vai trò: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{device.roleInHome}</strong>
                        </span>
                        <a 
                          href={`/devices?tab=list&search=${device.hardwareId}`}
                          className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 flex items-center gap-1 font-semibold text-[11px]"
                        >
                          <span>Soi chi tiết</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-slate-400 font-mono">Austec Cloud ID</span>
              <button 
                onClick={() => setViewCustomer(null)}
                className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
