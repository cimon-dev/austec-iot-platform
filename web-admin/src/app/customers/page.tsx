"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  Mail,
  Sliders,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Plus,
  Trash2,
  Clock,
  Check,
  UserPlus,
  Shield,
  Layers,
  DoorClosed,
  Video,
  Battery
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

interface MemberPermissionItem {
  id: string;
  userId: string;
  memberName: string;
  phoneNumber: string;
  role: "MEMBER" | "GUEST" | "TECH";
  canControl: boolean;
  canViewHistory: boolean;
  canChildLock: boolean;
  canConfig: boolean;
  scheduleLimitActive: boolean;
  accessStartTime: string;
  accessEndTime: string;
  accessDays: boolean[];
}

interface MatrixDeviceItem {
  hardwareId: string;
  deviceName: string;
  modelName: string;
  deviceType: string;
  isOnline: boolean;
  subscriptionType: "LIMITED" | "PERPETUAL";
  members: MemberPermissionItem[];
}

interface MatrixOwnerItem {
  ownerId: string;
  ownerName: string;
  phoneNumber: string;
  email: string;
  address: string;
  devices: MatrixDeviceItem[];
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
    fullName: "Nguyễn Mạnh Đức",
    email: "duc.nguyen@austec.vn",
    phoneNumber: "0944102588",
    address: "Số 88, Phố Huế, P. Ngô Thì Nhậm, Q. Hai Bà Trưng",
    province: "Hà Nội",
    registeredAt: "2026-01-05",
    isActive: true,
    devices: [
      {
        hardwareId: "AT-DOOR-88239A01",
        modelName: "Cửa cuốn Gara Đức Mạnh",
        deviceType: "Cửa cuốn",
        pairedAt: "2026-01-05 08:30",
        warrantyUntil: "2027-12-31",
        isOnline: true,
        roleInHome: "OWNER"
      },
      {
        hardwareId: "AT-CAM-00109A01",
        modelName: "Camera Cổng Chính Biệt Thự",
        deviceType: "Camera AI",
        pairedAt: "2026-01-05 09:15",
        warrantyUntil: "2027-12-31",
        isOnline: true,
        roleInHome: "OWNER"
      }
    ]
  },
  {
    id: "USR-009941",
    fullName: "Dan Phung",
    email: "dan.phung@austec.vn",
    phoneNumber: "0906806066",
    address: "Biệt thự Chateau, Phú Mỹ Hưng, Quận 7",
    province: "TP. Hồ Chí Minh",
    registeredAt: "2026-02-14",
    isActive: true,
    devices: [
      {
        hardwareId: "AT-LOCK-77124B02",
        modelName: "Khóa chính Biệt thự Dan Phung",
        deviceType: "Khóa thông minh",
        pairedAt: "2026-02-14 16:45",
        warrantyUntil: "2028-05-15",
        isOnline: true,
        roleInHome: "OWNER"
      },
      {
        hardwareId: "AT-CAM-00109A02",
        modelName: "Camera Sân Vườn Sau",
        deviceType: "Camera AI",
        pairedAt: "2026-02-14 17:00",
        warrantyUntil: "2028-05-15",
        isOnline: true,
        roleInHome: "OWNER"
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
        hardwareId: "AT-BIKE-55410D10",
        modelName: "GSHT Xe Giao Hàng 01",
        deviceType: "GSHT",
        pairedAt: "2026-02-28 09:10",
        warrantyUntil: "2027-06-15",
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
    address: "Biệt thự BT4, KĐT Mỹ Đình 2, Nam Từ Liêm",
    province: "Hà Nội",
    registeredAt: "2026-03-01",
    isActive: true,
    devices: [
      {
        hardwareId: "AT-DOOR-88239A05",
        modelName: "Cửa cuốn Đình Long",
        deviceType: "Cửa cuốn",
        pairedAt: "2026-03-01 11:20",
        warrantyUntil: "2027-11-15",
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
    address: "Số 120, Trần Hưng Đạo, Q. 1",
    province: "TP. Hồ Chí Minh",
    registeredAt: "2026-03-15",
    isActive: false,
    devices: [
      {
        hardwareId: "AT-DOOR-88239A04",
        modelName: "Cửa cuốn Công Bằng",
        deviceType: "Cửa cuốn",
        pairedAt: "2026-03-15 15:30",
        warrantyUntil: "2026-10-21",
        isOnline: false,
        roleInHome: "OWNER"
      }
    ]
  },
  {
    id: "USR-013441",
    fullName: "Hoàng Bích Thủy",
    email: "thuy.hb@gmail.com",
    phoneNumber: "0934556789",
    address: "Tòa Park 11, Vinhomes Times City, Hai Bà Trưng",
    province: "Hà Nội",
    registeredAt: "2026-03-25",
    isActive: true,
    devices: [
      {
        hardwareId: "AT-LOCK-77124B12",
        modelName: "Khóa Căn Hộ Penthouse 02",
        deviceType: "Khóa thông minh",
        pairedAt: "2026-03-25 10:00",
        warrantyUntil: "2027-03-25",
        isOnline: true,
        roleInHome: "OWNER"
      },
      {
        hardwareId: "AT-SENSOR-TH-8803",
        modelName: "Cảm Biến Nhiệt Ẩm Phòng Master",
        deviceType: "Cảm biến",
        pairedAt: "2026-03-25 10:30",
        warrantyUntil: "2027-03-10",
        isOnline: true,
        roleInHome: "OWNER"
      }
    ]
  }
];

const INITIAL_FAMILY_MATRIX: MatrixOwnerItem[] = [
  {
    ownerId: "USR-008712",
    ownerName: "Nguyễn Mạnh Đức",
    phoneNumber: "0944 102 588",
    email: "duc.nguyen@austec.vn",
    address: "Số 88, Phố Huế, P. Ngô Thì Nhậm, Q. Hai Bà Trưng, Hà Nội",
    devices: [
      {
        hardwareId: "AT-DOOR-88239A01",
        deviceName: "Cửa cuốn Gara Đức Mạnh",
        modelName: "AUSTEC-A900",
        deviceType: "Cửa cuốn",
        isOnline: true,
        subscriptionType: "LIMITED",
        members: [
          {
            id: "PERM-001",
            userId: "USER-FAMILY-01",
            memberName: "Trần Thu Hà (Vợ)",
            phoneNumber: "0988 123 456",
            role: "MEMBER",
            canControl: true,
            canViewHistory: true,
            canChildLock: true,
            canConfig: false,
            scheduleLimitActive: false,
            accessStartTime: "00:00",
            accessEndTime: "23:59",
            accessDays: [true, true, true, true, true, true, true]
          },
          {
            id: "PERM-002",
            userId: "USER-FAMILY-02",
            memberName: "Nguyễn Đức Anh (Con trai)",
            phoneNumber: "0977 234 567",
            role: "MEMBER",
            canControl: true,
            canViewHistory: false,
            canChildLock: false,
            canConfig: false,
            scheduleLimitActive: true,
            accessStartTime: "06:00",
            accessEndTime: "22:00",
            accessDays: [true, true, true, true, true, true, true]
          },
          {
            id: "PERM-003",
            userId: "USER-FAMILY-03",
            memberName: "Bác Bảo Vệ Dân Phố",
            phoneNumber: "0966 345 678",
            role: "GUEST",
            canControl: true,
            canViewHistory: false,
            canChildLock: false,
            canConfig: false,
            scheduleLimitActive: true,
            accessStartTime: "07:00",
            accessEndTime: "18:00",
            accessDays: [true, true, true, true, true, true, false]
          }
        ]
      },
      {
        hardwareId: "AT-CAM-00109A01",
        deviceName: "Camera Cổng Chính Biệt Thự",
        modelName: "AUSTEC-CAM-360",
        deviceType: "Camera AI",
        isOnline: true,
        subscriptionType: "LIMITED",
        members: [
          {
            id: "PERM-004",
            userId: "USER-FAMILY-01",
            memberName: "Trần Thu Hà (Vợ)",
            phoneNumber: "0988 123 456",
            role: "MEMBER",
            canControl: true,
            canViewHistory: true,
            canChildLock: false,
            canConfig: false,
            scheduleLimitActive: false,
            accessStartTime: "00:00",
            accessEndTime: "23:59",
            accessDays: [true, true, true, true, true, true, true]
          }
        ]
      }
    ]
  },
  {
    ownerId: "USR-009941",
    ownerName: "Dan Phung",
    phoneNumber: "0906 806 066",
    email: "dan.phung@austec.vn",
    address: "Biệt thự Chateau, Phú Mỹ Hưng, Quận 7, TP. Hồ Chí Minh",
    devices: [
      {
        hardwareId: "AT-LOCK-77124B02",
        deviceName: "Khóa chính Biệt thự Dan Phung",
        modelName: "MASARU-X1",
        deviceType: "Khóa thông minh",
        isOnline: true,
        subscriptionType: "PERPETUAL",
        members: [
          {
            id: "PERM-005",
            userId: "USER-FAMILY-04",
            memberName: "Phan Mai Linh (Vợ)",
            phoneNumber: "0903 999 888",
            role: "MEMBER",
            canControl: true,
            canViewHistory: true,
            canChildLock: true,
            canConfig: true,
            scheduleLimitActive: false,
            accessStartTime: "00:00",
            accessEndTime: "23:59",
            accessDays: [true, true, true, true, true, true, true]
          },
          {
            id: "PERM-006",
            userId: "USER-FAMILY-05",
            memberName: "Cô Giúp Việc Hoa",
            phoneNumber: "0908 111 222",
            role: "GUEST",
            canControl: true,
            canViewHistory: false,
            canChildLock: false,
            canConfig: false,
            scheduleLimitActive: true,
            accessStartTime: "08:00",
            accessEndTime: "17:00",
            accessDays: [true, true, true, true, true, false, false]
          }
        ]
      },
      {
        hardwareId: "AT-CAM-00109A02",
        deviceName: "Camera Sân Vườn Sau",
        modelName: "AUSTEC-CAM-360",
        deviceType: "Camera AI",
        isOnline: true,
        subscriptionType: "PERPETUAL",
        members: [
          {
            id: "PERM-007",
            userId: "USER-FAMILY-04",
            memberName: "Phan Mai Linh (Vợ)",
            phoneNumber: "0903 999 888",
            role: "MEMBER",
            canControl: true,
            canViewHistory: true,
            canChildLock: false,
            canConfig: false,
            scheduleLimitActive: false,
            accessStartTime: "00:00",
            accessEndTime: "23:59",
            accessDays: [true, true, true, true, true, true, true]
          }
        ]
      }
    ]
  },
  {
    ownerId: "USR-001928",
    ownerName: "Nguyễn Văn Nam",
    phoneNumber: "0912 345 678",
    email: "nguyen.vannam@gmail.com",
    address: "Số 45, Đường Lê Duẩn, Hoàn Kiếm, Hà Nội",
    devices: [
      {
        hardwareId: "AT-DOOR-88239A",
        deviceName: "Cửa Cuốn Austec Titadoor Super",
        modelName: "Titadoor A900 Super",
        deviceType: "Cửa cuốn",
        isOnline: true,
        subscriptionType: "LIMITED",
        members: [
          {
            id: "PERM-008",
            userId: "USER-FAMILY-06",
            memberName: "Nguyễn Lan Phương (Con gái)",
            phoneNumber: "0912 999 777",
            role: "MEMBER",
            canControl: true,
            canViewHistory: true,
            canChildLock: false,
            canConfig: false,
            scheduleLimitActive: false,
            accessStartTime: "00:00",
            accessEndTime: "23:59",
            accessDays: [true, true, true, true, true, true, true]
          }
        ]
      }
    ]
  },
  {
    ownerId: "USR-013441",
    ownerName: "Hoàng Bích Thủy",
    phoneNumber: "0934 556 789",
    email: "thuy.hb@gmail.com",
    address: "Tòa Park 11, Vinhomes Times City, Hai Bà Trưng, Hà Nội",
    devices: [
      {
        hardwareId: "AT-LOCK-77124B12",
        deviceName: "Khóa Căn Hộ Penthouse 02",
        modelName: "MASARU-X1",
        deviceType: "Khóa thông minh",
        isOnline: true,
        subscriptionType: "LIMITED",
        members: [
          {
            id: "PERM-009",
            userId: "USER-FAMILY-07",
            memberName: "Hoàng Quốc Việt (Em trai)",
            phoneNumber: "0934 111 222",
            role: "MEMBER",
            canControl: true,
            canViewHistory: true,
            canChildLock: true,
            canConfig: false,
            scheduleLimitActive: false,
            accessStartTime: "00:00",
            accessEndTime: "23:59",
            accessDays: [true, true, true, true, true, true, true]
          }
        ]
      }
    ]
  }
];

function CustomersPageContent() {
  const { t, language } = useLanguage();
  const { canView, canUpdate } = usePermissions();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "accounts";
  const [activeTab, setActiveTab] = useState<string>(initialTab === "matrix" ? "matrix" : "accounts");

  const switchTab = (tab: "accounts" | "matrix") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/customers?tab=${tab}`);
    }
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "matrix") setActiveTab("matrix");
    else if (tab === "accounts") setActiveTab("accounts");
  }, [searchParams]);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "warning" } | null>(null);
  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // =========================================================================
  // TAB 1: ACCOUNTS STATE
  // =========================================================================
  const [customers, setCustomers] = useState<CustomerAccount[]>(MOCK_CUSTOMERS);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("ALL");
  const [viewCustomer, setViewCustomer] = useState<CustomerAccount | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal thêm tài khoản khách hàng mới (Admin thêm)
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    fullName: "",
    phoneNumber: "",
    email: "",
    password: "Austec123!@#",
    province: "Hà Nội",
    address: "",
    isActive: true,
    initialHardwareId: "",
  });

  // Nạp danh sách khách hàng từ Backend
  useEffect(() => {
    fetch("http://localhost:4000/api/admin/customers", {
      headers: { "Authorization": "Bearer austec-admin-super-token" }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.customers) && data.customers.length > 0) {
          setCustomers(data.customers);
        }
      })
      .catch(() => {});
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.fullName.trim() || !newCustomerForm.phoneNumber.trim() || !newCustomerForm.email.trim()) {
      showToast("Vui lòng điền đầy đủ Họ tên, Số điện thoại và Email", "warning");
      return;
    }

    setIsSubmittingCustomer(true);
    try {
      const res = await fetch("http://localhost:4000/api/admin/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer austec-admin-super-token"
        },
        body: JSON.stringify(newCustomerForm)
      });
      const data = await res.json();
      if (data.success && data.customer) {
        setCustomers(prev => [data.customer, ...prev]);
        setIsAddCustomerModalOpen(false);
        setNewCustomerForm({
          fullName: "",
          phoneNumber: "",
          email: "",
          password: "Austec123!@#",
          province: "Hà Nội",
          address: "",
          isActive: true,
          initialHardwareId: "",
        });
        showToast(data.message || `Đã thêm tài khoản khách hàng ${data.customer.fullName} thành công!`, "success");
      } else {
        showToast(data.error || "Không thể tạo tài khoản khách hàng", "warning");
      }
    } catch (_) {
      // Fallback cục bộ
      const newCust: CustomerAccount = {
        id: `USR-${Date.now().toString().slice(-6)}`,
        fullName: newCustomerForm.fullName.trim(),
        email: newCustomerForm.email.trim(),
        phoneNumber: newCustomerForm.phoneNumber.trim(),
        province: newCustomerForm.province,
        address: newCustomerForm.address || "Địa chỉ đang cập nhật",
        registeredAt: new Date().toISOString().split("T")[0],
        isActive: newCustomerForm.isActive,
        devices: [
          {
            hardwareId: newCustomerForm.initialHardwareId || `AT-DOOR-${Date.now().toString().slice(-4)}`,
            modelName: "Austec Titadoor A900 Super",
            deviceType: "Cửa cuốn",
            pairedAt: new Date().toISOString().slice(0, 10),
            warrantyUntil: "2028-10-22",
            isOnline: true,
            roleInHome: "OWNER"
          }
        ]
      };
      setCustomers(prev => [newCust, ...prev]);
      setIsAddCustomerModalOpen(false);
      showToast(`Đã thêm tài khoản ${newCust.fullName} thành công!`, "success");
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

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

  const toggleAccountStatus = async (id: string) => {
    if (!canUpdate("mod_user")) return;
    const targetCust = customers.find(c => c.id === id);
    if (!targetCust) return;
    const nextStatus = !targetCust.isActive;

    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, isActive: nextStatus };
      }
      return c;
    }));
    if (viewCustomer && viewCustomer.id === id) {
      setViewCustomer(prev => prev ? { ...prev, isActive: nextStatus } : null);
    }

    try {
      await fetch(`http://localhost:4000/api/admin/customers/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer austec-admin-super-token"
        },
        body: JSON.stringify({ isActive: nextStatus })
      });
    } catch (_) {}

    showToast(nextStatus ? "Đã mở khóa tài khoản khách hàng" : "Đã tạm khóa tài khoản khách hàng", "info");
  };

  // =========================================================================
  // TAB 2: 3-COLUMN FAMILY RBAC MATRIX STATE
  // =========================================================================
  const [matrixData, setMatrixData] = useState<MatrixOwnerItem[]>(INITIAL_FAMILY_MATRIX);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("USR-008712");
  const [selectedHardwareId, setSelectedHardwareId] = useState<string>("AT-DOOR-88239A01");
  const [ownerSearchQuery, setOwnerSearchQuery] = useState("");
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);

  // New member form
  const [newMemberForm, setNewMemberForm] = useState({
    memberName: "",
    phoneNumber: "",
    role: "MEMBER" as "MEMBER" | "GUEST" | "TECH",
    canControl: true,
    canViewHistory: true,
    canChildLock: false,
    canConfig: false,
    scheduleLimitActive: false,
    accessStartTime: "08:00",
    accessEndTime: "18:00"
  });

  // Hydrate matrix data from backend if available
  useEffect(() => {
    fetch("http://localhost:4000/api/admin/family-matrix", {
      headers: { "Authorization": "Bearer austec-admin-super-token" }
    })
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.matrix) && res.matrix.length > 0) {
          setMatrixData(res.matrix);
        }
      })
      .catch(() => {});
  }, []);

  const filteredOwners = useMemo(() => {
    const q = ownerSearchQuery.toLowerCase().trim();
    if (!q) return matrixData;
    return matrixData.filter(o => 
      o.ownerName.toLowerCase().includes(q) ||
      o.phoneNumber.includes(q) ||
      o.email.toLowerCase().includes(q) ||
      o.address.toLowerCase().includes(q)
    );
  }, [matrixData, ownerSearchQuery]);

  const currentSelectedOwner = useMemo(() => {
    return matrixData.find(o => o.ownerId === selectedOwnerId) || matrixData[0] || null;
  }, [matrixData, selectedOwnerId]);

  const currentSelectedDevice = useMemo(() => {
    if (!currentSelectedOwner) return null;
    return currentSelectedOwner.devices.find(d => d.hardwareId === selectedHardwareId) || currentSelectedOwner.devices[0] || null;
  }, [currentSelectedOwner, selectedHardwareId]);

  // When owner changes, auto-select first device
  const handleSelectOwner = (ownerId: string) => {
    setSelectedOwnerId(ownerId);
    const owner = matrixData.find(o => o.ownerId === ownerId);
    if (owner && owner.devices.length > 0) {
      setSelectedHardwareId(owner.devices[0].hardwareId);
    }
  };

  // Toggle member permission toggle
  const handleToggleMemberPermission = (memberId: string, field: "canControl" | "canViewHistory" | "canChildLock" | "canConfig" | "scheduleLimitActive") => {
    if (!currentSelectedDevice) return;
    const hwId = currentSelectedDevice.hardwareId;

    setMatrixData(prev => prev.map(owner => ({
      ...owner,
      devices: owner.devices.map(dev => {
        if (dev.hardwareId !== hwId) return dev;
        return {
          ...dev,
          members: dev.members.map(m => {
            if (m.id !== memberId) return m;
            return { ...m, [field]: !m[field] };
          })
        };
      })
    })));

    // Send backend sync asynchronously
    fetch(`http://localhost:4000/api/devices/${hwId}/members/${memberId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer austec-admin-super-token"
      },
      body: JSON.stringify({ [field]: true })
    }).catch(() => {});

    showToast("Đã cập nhật phân quyền thành viên tức thì!", "success");
  };

  // Revoke member permission
  const handleRevokeMember = (memberId: string, memberName: string) => {
    if (!currentSelectedDevice) return;
    const hwId = currentSelectedDevice.hardwareId;

    if (!confirm(`Bạn có chắc chắn muốn thu hồi quyền truy cập của "${memberName}" trên thiết bị ${hwId}?`)) {
      return;
    }

    setMatrixData(prev => prev.map(owner => ({
      ...owner,
      devices: owner.devices.map(dev => {
        if (dev.hardwareId !== hwId) return dev;
        return {
          ...dev,
          members: dev.members.filter(m => m.id !== memberId)
        };
      })
    })));

    fetch(`http://localhost:4000/api/devices/${hwId}/members/${memberId}`, {
      method: "DELETE",
      headers: { "Authorization": "Bearer austec-admin-super-token" }
    }).catch(() => {});

    showToast(`Đã thu hồi quyền thành công của ${memberName}`, "info");
  };

  // Submit Add Member
  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSelectedDevice) return;
    const hwId = currentSelectedDevice.hardwareId;

    if (!newMemberForm.memberName.trim() || !newMemberForm.phoneNumber.trim()) {
      alert("Vui lòng nhập Họ tên và Số điện thoại thành viên!");
      return;
    }

    const newMember: MemberPermissionItem = {
      id: `PERM-${Date.now()}`,
      userId: `USER-${Date.now()}`,
      memberName: newMemberForm.memberName.trim(),
      phoneNumber: newMemberForm.phoneNumber.trim(),
      role: newMemberForm.role,
      canControl: newMemberForm.canControl,
      canViewHistory: newMemberForm.canViewHistory,
      canChildLock: newMemberForm.canChildLock,
      canConfig: newMemberForm.canConfig,
      scheduleLimitActive: newMemberForm.scheduleLimitActive,
      accessStartTime: newMemberForm.accessStartTime,
      accessEndTime: newMemberForm.accessEndTime,
      accessDays: [true, true, true, true, true, true, false]
    };

    setMatrixData(prev => prev.map(owner => ({
      ...owner,
      devices: owner.devices.map(dev => {
        if (dev.hardwareId !== hwId) return dev;
        return {
          ...dev,
          members: [...dev.members, newMember]
        };
      })
    })));

    fetch(`http://localhost:4000/api/devices/${hwId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer austec-admin-super-token"
      },
      body: JSON.stringify(newMember)
    }).catch(() => {});

    setIsAddMemberModalOpen(false);
    setNewMemberForm({
      memberName: "",
      phoneNumber: "",
      role: "MEMBER",
      canControl: true,
      canViewHistory: true,
      canChildLock: false,
      canConfig: false,
      scheduleLimitActive: false,
      accessStartTime: "08:00",
      accessEndTime: "18:00"
    });

    showToast(`Đã thêm thành viên "${newMember.memberName}" vào thiết bị ${hwId}!`, "success");
  };

  if (!canView("mod_user")) {
    return (
      <AccessDenied 
        moduleTitle="Quản Lý Khách Hàng & Phân Quyền Gia Đình"
        requiredPermission="Quyền truy cập Phân hệ Người dùng (mod_user)"
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] overflow-hidden bg-slate-100 dark:bg-slate-950 p-2.5 space-y-2.5">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-lg border transition-all animate-in slide-in-from-top-2 ${
          toast.type === "success" 
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
            : toast.type === "warning"
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Khách Hàng Ứng Dụng & Ma Trận Phân Quyền Gia Đình
              </h1>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                RBAC Multi-Level
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Quản lý tài khoản người dùng Mobile App, danh sách thiết bị và ủy quyền thành viên thứ cấp (Gia đình / Khách)
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/60 shrink-0">
          <button
            type="button"
            onClick={() => switchTab("accounts")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "accounts"
                ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Tài Khoản Khách Hàng ({customers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => switchTab("matrix")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
              activeTab === "matrix"
                ? "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ma Trận Phân Quyền 3 Khối (RBAC)</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: ACCOUNTS LIST VIEW */}
      {/* ===================================================================== */}
      {activeTab === "accounts" && (
        <div className="flex-1 min-h-0 flex gap-2.5 overflow-hidden">
          {/* Main Table Column */}
          <div className="flex-1 min-w-0 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Filter Toolbar */}
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm tên, SĐT, Email, ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="text-xs pl-7 pr-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white w-56 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <select
                  value={selectedProvince}
                  onChange={(e) => setSelectedProvince(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="ALL">Mọi tỉnh thành</option>
                  <option value="Hà Nội">Hà Nội</option>
                  <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                  <option value="Đà Nẵng">Đà Nẵng</option>
                  <option value="Hải Phòng">Hải Phòng</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Tìm thấy <strong className="text-purple-600 dark:text-purple-400">{filteredCustomers.length}</strong> khách hàng
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Thêm Tài Khoản Mới</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800 uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="p-2.5">User ID</th>
                    <th className="p-2.5">Họ và Tên</th>
                    <th className="p-2.5">Số Điện Thoại</th>
                    <th className="p-2.5">Tỉnh / Thành Phố</th>
                    <th className="p-2.5">Số Thiết Bị</th>
                    <th className="p-2.5">Trạng Thái</th>
                    <th className="p-2.5">Ngày Đăng Ký</th>
                    <th className="p-2.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                  {paginatedCustomers.map((cust) => {
                    const isSelected = viewCustomer?.id === cust.id;
                    return (
                      <tr 
                        key={cust.id}
                        onClick={() => setViewCustomer(cust)}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                          isSelected ? "bg-purple-50/70 dark:bg-purple-950/40 border-l-2 border-purple-500" : ""
                        }`}
                      >
                        <td className="p-2.5 font-mono text-purple-600 dark:text-purple-400 font-bold">{cust.id}</td>
                        <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{cust.fullName}</td>
                        <td className="p-2.5 font-mono text-slate-600 dark:text-slate-400">{cust.phoneNumber}</td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300">{cust.province}</td>
                        <td className="p-2.5">
                          <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/20">
                            {cust.devices.length} TB
                          </span>
                        </td>
                        <td className="p-2.5">
                          {cust.isActive ? (
                            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Hoạt động
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-full flex items-center gap-1.5 w-fit font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              Tạm khóa
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-slate-500 dark:text-slate-400">{cust.registeredAt}</td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewCustomer(viewCustomer?.id === cust.id ? null : cust);
                            }}
                            className={`text-[11px] px-2 py-1 rounded-md border font-semibold cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-purple-600 dark:text-purple-400 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {isSelected ? "Đang xem" : "Chi tiết ➔"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredCustomers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10, 15, 20, 50]}
              itemName="khách hàng"
            />
          </div>

          {/* Drawer Customer Details */}
          {viewCustomer && (
            <div className="w-80 lg:w-96 shrink-0 h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between overflow-hidden animate-in slide-in-from-right-3 duration-150">
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="min-w-0">
                  <div className="text-[10px] text-purple-600 dark:text-purple-400 font-mono tracking-wider uppercase font-bold">
                    Hồ Sơ Khách Hàng App
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">{viewCustomer.fullName}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setViewCustomer(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 space-y-3 overflow-y-auto flex-1 text-xs">
                {/* Basic Info */}
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Mã KH:</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{viewCustomer.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Số điện thoại:</span>
                    <span className="font-mono text-slate-900 dark:text-white font-semibold">{viewCustomer.phoneNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Email:</span>
                    <span className="text-slate-700 dark:text-slate-300">{viewCustomer.email}</span>
                  </div>
                  <div className="flex justify-between items-start gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <span className="text-slate-500 shrink-0">Địa chỉ:</span>
                    <span className="text-slate-800 dark:text-slate-200 text-right">{viewCustomer.address}, {viewCustomer.province}</span>
                  </div>
                </div>

                {/* Account Actions */}
                {canUpdate("mod_user") && (
                  <button
                    type="button"
                    onClick={() => toggleAccountStatus(viewCustomer.id)}
                    className={`w-full py-1.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      viewCustomer.isActive
                        ? "bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    }`}
                  >
                    {viewCustomer.isActive ? (
                      <><Lock className="w-3.5 h-3.5" /> <span>Khóa tài khoản khách hàng</span></>
                    ) : (
                      <><Unlock className="w-3.5 h-3.5" /> <span>Mở khóa tài khoản khách hàng</span></>
                    )}
                  </button>
                )}

                {/* Device List of Customer */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                    <span>Thiết Bị Sở Hữu ({viewCustomer.devices.length})</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOwnerId(viewCustomer.id);
                        switchTab("matrix");
                      }}
                      className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Xem ma trận RBAC ➔</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {viewCustomer.devices.map(dev => (
                      <div key={dev.hardwareId} className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-[11px] space-y-1">
                        <div className="flex justify-between items-center font-bold">
                          <span className="font-mono text-cyan-600 dark:text-cyan-400">{dev.hardwareId}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] ${dev.isOnline ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}>
                            {dev.isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                        <div className="text-slate-800 dark:text-slate-200">{dev.modelName}</div>
                        <div className="text-[10px] text-slate-500 flex justify-between">
                          <span>Vai trò: <strong className="text-purple-600 dark:text-purple-400">{dev.roleInHome}</strong></span>
                          <span>BH: {dev.warrantyUntil}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewCustomer(null)}
                  className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: 3-COLUMN FAMILY ACCESS & RBAC MATRIX */}
      {/* ===================================================================== */}
      {activeTab === "matrix" && (
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-2.5 overflow-hidden">
          {/* COLUMN 1: USERS / OWNERS LIST (4 cols) */}
          <div className="md:col-span-3 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Header Column 1 */}
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  <span>Chủ Sở Hữu (Chủ Nhà)</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  {filteredOwners.length} chủ nhà
                </span>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, SĐT..."
                  value={ownerSearchQuery}
                  onChange={(e) => setOwnerSearchQuery(e.target.value)}
                  className="w-full text-xs pl-7 pr-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* List of Owners */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredOwners.map((owner) => {
                const isSelected = selectedOwnerId === owner.ownerId;
                const totalMembers = owner.devices.reduce((acc, d) => acc + d.members.length, 0);
                return (
                  <div
                    key={owner.ownerId}
                    onClick={() => handleSelectOwner(owner.ownerId)}
                    className={`p-2.5 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-purple-50 dark:bg-purple-950/40 border-l-4 border-purple-600"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                        <Users className={`w-3.5 h-3.5 ${isSelected ? "text-purple-600 dark:text-purple-400" : "text-slate-400"}`} />
                        <span>{owner.ownerName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                        {owner.devices.length} TB
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1 flex items-center justify-between">
                      <span>{owner.phoneNumber}</span>
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-sans font-medium">
                        {totalMembers} thành viên phụ
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                      {owner.address}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: DEVICES OF SELECTED OWNER (4 cols) */}
          <div className="md:col-span-4 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Header Column 2 */}
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                  <span>Thiết Bị Của Chủ Nhà</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                  {currentSelectedOwner ? currentSelectedOwner.devices.length : 0} thiết bị
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                Chủ sở hữu: <strong className="text-slate-900 dark:text-white">{currentSelectedOwner?.ownerName || "Chưa chọn"}</strong>
              </div>
            </div>

            {/* List of Devices */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1.5">
              {currentSelectedOwner?.devices.map((device) => {
                const isSelected = selectedHardwareId === device.hardwareId;
                return (
                  <div
                    key={device.hardwareId}
                    onClick={() => setSelectedHardwareId(device.hardwareId)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-cyan-50/60 dark:bg-cyan-950/40 border-cyan-500 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 hover:border-cyan-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {device.deviceType === "Cửa cuốn" && <DoorClosed className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
                        {device.deviceType === "Khóa thông minh" && <Lock className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                        {device.deviceType === "Camera AI" && <Video className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                        {device.deviceType !== "Cửa cuốn" && device.deviceType !== "Khóa thông minh" && device.deviceType !== "Camera AI" && (
                          <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                        <span className="font-semibold text-slate-900 dark:text-white text-xs">{device.deviceName}</span>
                      </div>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                        device.isOnline ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                      }`}>
                        {device.isOnline ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                      <span>{device.hardwareId}</span>
                      <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400">
                        {device.subscriptionType === "PERPETUAL" ? "Vô thời hạn" : "Có thời hạn"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 mt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span>Model: {device.modelName}</span>
                      <span className="font-semibold text-cyan-600 dark:text-cyan-400">
                        {device.members.length} người được chia sẻ ➔
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMN 3: SECONDARY MEMBERS & PERMISSIONS (5 cols) */}
          <div className="md:col-span-5 flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Header Column 3 */}
            <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>Thành Viên Phụ & Ma Trận Phân Quyền</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Thiết bị: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{currentSelectedDevice?.hardwareId || "Chưa chọn"}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(true)}
                disabled={!currentSelectedDevice}
                className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm thành viên</span>
              </button>
            </div>

            {/* List of Shared Members with Granular Switches */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
              {(!currentSelectedDevice || currentSelectedDevice.members.length === 0) ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Shield className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <div className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                    Chưa có thành viên phụ nào được ủy quyền
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                    Ấn vào nút "Thêm thành viên" để cấp quyền điều khiển cho vợ/chồng, con cái hoặc người giúp việc.
                  </p>
                </div>
              ) : (
                currentSelectedDevice.members.map((member) => (
                  <div 
                    key={member.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2.5"
                  >
                    {/* Member Top Bar */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                          <span>{member.memberName}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            member.role === "MEMBER"
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                              : member.role === "GUEST"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                          }`}>
                            {member.role === "MEMBER" ? "GIA ĐÌNH" : member.role === "GUEST" ? "KHÁCH" : "KỸ THUẬT"}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">
                          {member.phoneNumber}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRevokeMember(member.id, member.memberName)}
                        className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        title="Thu hồi quyền thành viên"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Permissions Matrix Switches */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200 dark:border-slate-700/60">
                      {/* 1. Can Control */}
                      <label className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Quyền Điều Khiển:</span>
                        <input
                          type="checkbox"
                          checked={member.canControl}
                          onChange={() => handleToggleMemberPermission(member.id, "canControl")}
                          className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                        />
                      </label>

                      {/* 2. Can View History */}
                      <label className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Xem Lịch Sử:</span>
                        <input
                          type="checkbox"
                          checked={member.canViewHistory}
                          onChange={() => handleToggleMemberPermission(member.id, "canViewHistory")}
                          className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                        />
                      </label>

                      {/* 3. Can Child Lock */}
                      <label className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Khóa Trẻ Em:</span>
                        <input
                          type="checkbox"
                          checked={member.canChildLock}
                          onChange={() => handleToggleMemberPermission(member.id, "canChildLock")}
                          className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                        />
                      </label>

                      {/* 4. Can Config */}
                      <label className="flex items-center justify-between p-1.5 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">Cấu Hình TB:</span>
                        <input
                          type="checkbox"
                          checked={member.canConfig}
                          onChange={() => handleToggleMemberPermission(member.id, "canConfig")}
                          className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                        />
                      </label>
                    </div>

                    {/* Schedule Limit Section */}
                    <div className="p-2 rounded bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <span>Giới hạn khung giờ truy cập:</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={member.scheduleLimitActive}
                          onChange={() => handleToggleMemberPermission(member.id, "scheduleLimitActive")}
                          className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                        />
                      </div>

                      {member.scheduleLimitActive && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono">
                          <span className="text-slate-500">Cho phép trong khoảng:</span>
                          <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                            {member.accessStartTime} ➔ {member.accessEndTime} (Hàng ngày)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD SECONDARY MEMBER */}
      {/* ===================================================================== */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Ủy Quyền Thành Viên Mới Cho Thiết Bị
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="p-3.5 space-y-3 text-xs">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Thiết bị nhận phân quyền: <strong className="text-cyan-600 dark:text-cyan-400 font-mono">{currentSelectedDevice?.hardwareId}</strong> ({currentSelectedDevice?.deviceName})
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Họ và tên thành viên *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Trần Thu Hà (Vợ), Nguyễn Văn An..."
                  value={newMemberForm.memberName}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, memberName: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Số điện thoại đăng nhập App *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 0988 123 456..."
                  value={newMemberForm.phoneNumber}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, phoneNumber: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Vai trò phân định
                </label>
                <select
                  value={newMemberForm.role}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value as any })}
                  className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="MEMBER">Thành viên gia đình (Family Member)</option>
                  <option value="GUEST">Khách tạm thời / Người giúp việc (Guest)</option>
                  <option value="TECH">Kỹ thuật viên bảo trì (Technician)</option>
                </select>
              </div>

              {/* Granular permissions */}
              <div className="space-y-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Các quyền cho phép kích hoạt:
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMemberForm.canControl}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, canControl: e.target.checked })}
                    className="w-3.5 h-3.5 text-purple-600 rounded"
                  />
                  <span>Được phép điều khiển (Đóng / Mở / Khóa)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMemberForm.canViewHistory}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, canViewHistory: e.target.checked })}
                    className="w-3.5 h-3.5 text-purple-600 rounded"
                  />
                  <span>Xem lịch sử đóng mở và cảnh báo an ninh</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMemberForm.canChildLock}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, canChildLock: e.target.checked })}
                    className="w-3.5 h-3.5 text-purple-600 rounded"
                  />
                  <span>Kích hoạt Khóa Trẻ Em / Khóa Cứng</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMemberForm.scheduleLimitActive}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, scheduleLimitActive: e.target.checked })}
                    className="w-3.5 h-3.5 text-amber-600 rounded"
                  />
                  <span>Giới hạn khung giờ truy cập (08:00 - 18:00)</span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-xs cursor-pointer"
                >
                  Cấp Quyền & Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Tài Khoản Khách Hàng Mới (Admin thêm) */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Thêm Tài Khoản Khách Hàng Mới
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Khởi tạo thông tin người dùng quản lý thiết bị trên Mobile App & Web Admin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Họ và Tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn An"
                    value={newCustomerForm.fullName}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, fullName: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Số Điện Thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0912 345 678"
                    value={newCustomerForm.phoneNumber}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phoneNumber: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Địa Chỉ Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="nguyenvana@gmail.com"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mật Khẩu Ban Đầu
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.password}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, password: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-[11px] focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tỉnh / Thành Phố
                  </label>
                  <select
                    value={newCustomerForm.province}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, province: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                    <option value="Hải Phòng">Hải Phòng</option>
                    <option value="Cần Thơ">Cần Thơ</option>
                    <option value="Bình Dương">Bình Dương</option>
                    <option value="Đồng Nai">Đồng Nai</option>
                    <option value="Khác">Tỉnh thành khác</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mã Thiết Bị Kích Hoạt (Hardware ID)
                  </label>
                  <input
                    type="text"
                    placeholder="VD: AT-DOOR-88239A (Tuỳ chọn)"
                    value={newCustomerForm.initialHardwareId}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, initialHardwareId: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono text-[11px] focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Địa Chỉ Lắp Đặt Chi Tiết
                </label>
                <input
                  type="text"
                  placeholder="Số 45 Lê Duẩn, P. Bến Nghé, Quận 1"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkIsActive"
                  checked={newCustomerForm.isActive}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, isActive: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                />
                <label htmlFor="chkIsActive" className="text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                  Kích hoạt tài khoản ngay (Cho phép đăng nhập trên Mobile App)
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustomer}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isSubmittingCustomer ? "Đang xử lý..." : "Tạo Tài Khoản Khách Hàng"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersManagementPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-500 font-mono">Đang tải phân hệ khách hàng & RBAC...</div>}>
      <CustomersPageContent />
    </Suspense>
  );
}
