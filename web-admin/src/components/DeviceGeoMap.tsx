"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { 
  MapPin, 
  Search, 
  Wifi, 
  Battery, 
  Layers, 
  Radio, 
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Box,
  Navigation,
  Maximize2,
  Minimize2,
  X
} from "lucide-react";

export interface DeviceGeoLocation {
  hardwareId: string;
  serialNumber: string;
  deviceName: string;
  deviceType: "Cửa cuốn" | "Khóa thông minh" | "Bộ lưu điện";
  modelName: string;
  status: "ONLINE" | "OFFLINE" | "IN_STOCK";
  ownerName: string;
  phoneNumber: string;
  lat: number;
  lng: number;
  streetAddress: string;
  ward: string;
  district: string;
  province: string;
  formattedAddress: string;
  lastTelemetryAt: string;
  batteryLevel: number;
  signalDbm: number;
}

export const SAMPLE_GEO_DEVICES: DeviceGeoLocation[] = [
  // Hà Nội
  {
    hardwareId: "AT-DOOR-88239A",
    serialNumber: "SN-2026-DOOR-88239",
    deviceName: "Cửa Cuốn Austec Titadoor Super",
    deviceType: "Cửa cuốn",
    modelName: "Titadoor A900 Super",
    status: "ONLINE",
    ownerName: "Nguyễn Văn Nam",
    phoneNumber: "0912 345 678",
    lat: 21.0285,
    lng: 105.8542,
    streetAddress: "Số 45, Đường Lê Duẩn",
    ward: "Phường Bến Nghé",
    district: "Quận Hoàn Kiếm",
    province: "Hà Nội",
    formattedAddress: "Số 45, Lê Duẩn, Hoàn Kiếm, Hà Nội",
    lastTelemetryAt: "3 giây trước",
    batteryLevel: 98,
    signalDbm: -62
  },
  {
    hardwareId: "UPS-220V-77192C",
    serialNumber: "SN-2026-UPS-77192",
    deviceName: "Bộ Lưu Điện Sin Chuẩn Pro",
    deviceType: "Bộ lưu điện",
    modelName: "Austec Sin Chuẩn Pro 220V",
    status: "ONLINE",
    ownerName: "Nguyễn Văn Nam",
    phoneNumber: "0912 345 678",
    lat: 20.9950,
    lng: 105.8600,
    streetAddress: "Tòa Park 3, Vinhomes Times City",
    ward: "Phường Mai Động",
    district: "Quận Hoàng Mai",
    province: "Hà Nội",
    formattedAddress: "Park 3 Vinhomes Times City, Hoàng Mai, Hà Nội",
    lastTelemetryAt: "10 giây trước",
    batteryLevel: 94,
    signalDbm: -58
  },
  {
    hardwareId: "AT-DOOR-33019F",
    serialNumber: "SN-2026-DOOR-33019",
    deviceName: "Cửa Cuốn Gara Đức Mạnh",
    deviceType: "Cửa cuốn",
    modelName: "Titadoor A900 Super",
    status: "OFFLINE",
    ownerName: "Phạm Đức Mạnh",
    phoneNumber: "0944 102 588",
    lat: 21.0125,
    lng: 105.8480,
    streetAddress: "Số 88, Phố Huế",
    ward: "Phường Ngô Thì Nhậm",
    district: "Quận Hai Bà Trưng",
    province: "Hà Nội",
    formattedAddress: "Số 88, Phố Huế, Hai Bà Trưng, Hà Nội",
    lastTelemetryAt: "45 phút trước (Mất nguồn)",
    batteryLevel: 12,
    signalDbm: -89
  },
  {
    hardwareId: "AT-DOOR-STOCK-01",
    serialNumber: "SN-2026-DOOR-99101",
    deviceName: "Cửa Cuốn Titadoor Xuất Kho",
    deviceType: "Cửa cuốn",
    modelName: "Titadoor A500 Eco",
    status: "IN_STOCK",
    ownerName: "Tổng Kho Austec Bắc Ninh",
    phoneNumber: "1900 6868",
    lat: 21.0500,
    lng: 105.7800,
    streetAddress: "Lô C2, KCN Quế Võ",
    ward: "Xã Phương Liễu",
    district: "Thị xã Quế Võ",
    province: "Hà Nội",
    formattedAddress: "Kho Tổng Phía Bắc - KCN Quế Võ",
    lastTelemetryAt: "Chờ kích hoạt QR Code",
    batteryLevel: 100,
    signalDbm: 0
  },

  // TP. Hồ Chí Minh
  {
    hardwareId: "MS-LOCK-99120B",
    serialNumber: "SN-2026-LOCK-99120",
    deviceName: "Khóa Thông Minh Masaru X1",
    deviceType: "Khóa thông minh",
    modelName: "Masaru Titan X1",
    status: "ONLINE",
    ownerName: "Lê Văn Thành",
    phoneNumber: "0987 654 321",
    lat: 10.7769,
    lng: 106.7009,
    streetAddress: "Số 120, Đường Nguyễn Thị Minh Khai",
    ward: "Phường Bến Thành",
    district: "Quận 1",
    province: "TP. Hồ Chí Minh",
    formattedAddress: "Số 120, Nguyễn Thị Minh Khai, Quận 1, TP.HCM",
    lastTelemetryAt: "5 giây trước",
    batteryLevel: 92,
    signalDbm: -55
  },
  {
    hardwareId: "AT-DOOR-44120D",
    serialNumber: "SN-2026-DOOR-44120",
    deviceName: "Cửa Cuốn Biệt Thự An Phú",
    deviceType: "Cửa cuốn",
    modelName: "Titadoor A900 Super",
    status: "ONLINE",
    ownerName: "Trần Anh Dũng",
    phoneNumber: "0903 889 911",
    lat: 10.8231,
    lng: 106.6297,
    streetAddress: "Số 18, Đường số 7, KDC An Phú An Khánh",
    ward: "Phường An Phú",
    district: "TP. Thủ Đức",
    province: "TP. Hồ Chí Minh",
    formattedAddress: "KDC An Phú An Khánh, TP. Thủ Đức, TP.HCM",
    lastTelemetryAt: "1 giây trước",
    batteryLevel: 96,
    signalDbm: -60
  },
  {
    hardwareId: "UPS-220V-99411E",
    serialNumber: "SN-2026-UPS-99411",
    deviceName: "Bộ Lưu Điện Chợ Lớn",
    deviceType: "Bộ lưu điện",
    modelName: "Austec Sin Chuẩn Pro 220V",
    status: "OFFLINE",
    ownerName: "Hoàng Minh Trí",
    phoneNumber: "0938 112 233",
    lat: 10.7550,
    lng: 106.6600,
    streetAddress: "Số 234, Đường Trần Hưng Đạo",
    ward: "Phường 11",
    district: "Quận 5",
    province: "TP. Hồ Chí Minh",
    formattedAddress: "Số 234, Trần Hưng Đạo, Quận 5, TP.HCM",
    lastTelemetryAt: "2 giờ trước (Mất Wi-Fi)",
    batteryLevel: 45,
    signalDbm: -92
  },
  {
    hardwareId: "AT-LOCK-STOCK-02",
    serialNumber: "SN-2026-LOCK-55201",
    deviceName: "Khóa Masaru Titan X1 Kho",
    deviceType: "Khóa thông minh",
    modelName: "Masaru Titan X1",
    status: "IN_STOCK",
    ownerName: "Kho Tổng Austec Miền Nam",
    phoneNumber: "1900 6868",
    lat: 10.8500,
    lng: 106.7700,
    streetAddress: "KCN Sóng Thần 1, Dĩ An",
    ward: "Phường An Bình",
    district: "Thành phố Dĩ An",
    province: "Bình Dương",
    formattedAddress: "Kho Tổng Miền Nam - KCN Sóng Thần",
    lastTelemetryAt: "Chờ xuất kho & kích hoạt",
    batteryLevel: 100,
    signalDbm: 0
  },

  // Đà Nẵng
  {
    hardwareId: "MS-LOCK-33219E",
    serialNumber: "SN-2026-LOCK-33219",
    deviceName: "Khóa Masaru Hải Châu",
    deviceType: "Khóa thông minh",
    modelName: "Masaru Titan X1",
    status: "ONLINE",
    ownerName: "Trần Thị Bích Ngọc",
    phoneNumber: "0933 556 677",
    lat: 16.0544,
    lng: 108.2022,
    streetAddress: "Số 56, Đường Nguyễn Văn Linh",
    ward: "Phường Nam Dương",
    district: "Quận Hải Châu",
    province: "Đà Nẵng",
    formattedAddress: "Số 56, Nguyễn Văn Linh, Hải Châu, Đà Nẵng",
    lastTelemetryAt: "8 giây trước",
    batteryLevel: 88,
    signalDbm: -64
  },
  {
    hardwareId: "AT-DOOR-55190B",
    serialNumber: "SN-2026-DOOR-55190",
    deviceName: "Cửa Cuốn Cẩm Lệ",
    deviceType: "Cửa cuốn",
    modelName: "Titadoor A500 Eco",
    status: "ONLINE",
    ownerName: "Võ Văn Hùng",
    phoneNumber: "0905 443 322",
    lat: 16.0200,
    lng: 108.2100,
    streetAddress: "Đường Nguyễn Hữu Thọ",
    ward: "Phường Khuê Trung",
    district: "Quận Cẩm Lệ",
    province: "Đà Nẵng",
    formattedAddress: "Đường Nguyễn Hữu Thọ, Cẩm Lệ, Đà Nẵng",
    lastTelemetryAt: "12 giây trước",
    batteryLevel: 95,
    signalDbm: -68
  },

  // Hải Phòng
  {
    hardwareId: "AT-DOOR-66120H",
    serialNumber: "SN-2026-DOOR-66120",
    deviceName: "Cửa Cuốn Lạch Tray",
    deviceType: "Cửa cuốn",
    modelName: "Titadoor A900 Super",
    status: "ONLINE",
    ownerName: "Bùi Quang Huy",
    phoneNumber: "0913 221 100",
    lat: 20.8449,
    lng: 106.6881,
    streetAddress: "Số 92, Đường Lạch Tray",
    ward: "Phường Lạch Tray",
    district: "Quận Ngô Quyền",
    province: "Hải Phòng",
    formattedAddress: "Số 92, Lạch Tray, Ngô Quyền, Hải Phòng",
    lastTelemetryAt: "4 giây trước",
    batteryLevel: 97,
    signalDbm: -59
  },

  // Cần Thơ
  {
    hardwareId: "AT-DOOR-77130K",
    serialNumber: "SN-2026-DOOR-77130",
    deviceName: "Cửa Cuốn Ninh Kiều",
    deviceType: "Cửa cuốn",
    modelName: "Titadoor A500 Eco",
    status: "ONLINE",
    ownerName: "Đặng Thị Mai",
    phoneNumber: "0949 778 899",
    lat: 10.0452,
    lng: 105.7469,
    streetAddress: "Số 42, Đại lộ Hòa Bình",
    ward: "Phường Tân An",
    district: "Quận Ninh Kiều",
    province: "Cần Thơ",
    formattedAddress: "Số 42, Đại lộ Hòa Bình, Ninh Kiều, Cần Thơ",
    lastTelemetryAt: "7 giây trước",
    batteryLevel: 91,
    signalDbm: -66
  }
];

export function DeviceGeoMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const leafletLibRef = useRef<any>(null);

  const [mapStyle, setMapStyle] = useState<"google" | "satellite" | "osm">("google");
  const [selectedProvince, setSelectedProvince] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [selectedDevice, setSelectedDevice] = useState<DeviceGeoLocation | null>(SAMPLE_GEO_DEVICES[0]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Re-fit Leaflet map bounds when toggling fullscreen dialog mode
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 150);
    }
  }, [isFullscreen]);

  // Close fullscreen on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Switch Tile Layer function (Real maps with 0 watermark)
  const applyTileLayer = (style: "google" | "satellite" | "osm") => {
    if (!mapInstanceRef.current || !leafletLibRef.current) return;
    const map = mapInstanceRef.current;
    const L = leafletLibRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    let layer: any;
    if (style === "google") {
      // Real Google Maps Streets (Official high-res tiles, completely free, no watermark)
      layer = L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        subdomains: ["0", "1", "2", "3"],
        attribution: "Google Maps"
      });
    } else if (style === "satellite") {
      // Real Google Maps Hybrid (Satellite Imagery + Street Labels)
      layer = L.tileLayer("https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        subdomains: ["0", "1", "2", "3"],
        attribution: "Google Maps Satellite"
      });
    } else {
      // OpenStreetMap Standard
      layer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "OpenStreetMap"
      });
    }

    layer.addTo(map);
    tileLayerRef.current = layer;
    setMapStyle(style);
  };

  // Filtered devices
  const filteredDevices = SAMPLE_GEO_DEVICES.filter((d) => {
    const matchProvince = selectedProvince === "ALL" || d.province === selectedProvince;
    const matchStatus = selectedStatus === "ALL" || d.status === selectedStatus;
    const q = searchFilter.toLowerCase().trim();
    const matchSearch = !q || 
      d.hardwareId.toLowerCase().includes(q) ||
      d.deviceName.toLowerCase().includes(q) ||
      d.ownerName.toLowerCase().includes(q) ||
      d.formattedAddress.toLowerCase().includes(q);
    return matchProvince && matchStatus && matchSearch;
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    async function initLeaflet() {
      const L = (await import("leaflet")).default;

      if (!isMounted || !mapContainerRef.current) return;

      // Clean up previous instance if exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Create map centered on Vietnam
      const map = L.map(mapContainerRef.current, {
        center: [16.0544, 107.5],
        zoom: 6,
        zoomControl: false,
        attributionControl: false
      });

      // Add Zoom control on top right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Add default tile layer: Real Google Maps Streets (Clean, crisp, no API Key / Watermark error)
      const baseLayer = L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        subdomains: ["0", "1", "2", "3"],
        attribution: "Google Maps"
      }).addTo(map);

      tileLayerRef.current = baseLayer;
      leafletLibRef.current = L;

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
      setIsMapLoaded(true);
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers whenever filtered devices or selection changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || typeof window === "undefined") return;

    async function updateMarkers() {
      const L = (await import("leaflet")).default;
      const markersGroup = markersLayerRef.current;
      markersGroup.clearLayers();

      filteredDevices.forEach((device) => {
        const isSelected = selectedDevice?.hardwareId === device.hardwareId;

        const colorClass = 
          device.status === "ONLINE" ? "bg-emerald-500 border-emerald-200" :
          device.status === "OFFLINE" ? "bg-rose-500 border-rose-200" :
          "bg-sky-500 border-sky-200";

        const pulseClass = device.status === "ONLINE" ? "animate-ping" : "";

        const markerHtml = `
          <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${device.status === "ONLINE" ? `<span style="position: absolute; width: 100%; height: 100%; border-radius: 9999px; background-color: #10b981; opacity: 0.75;" class="${pulseClass}"></span>` : ""}
            <div style="width: 14px; height: 14px; border-radius: 9999px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); background-color: ${
              device.status === "ONLINE" ? "#10b981" : device.status === "OFFLINE" ? "#f43f5e" : "#0284c7"
            }; ${isSelected ? "transform: scale(1.4); outline: 2px solid #06b6d4;" : ""}"></div>
          </div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: "custom-device-marker",
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([device.lat, device.lng], { icon });

        marker.on("click", () => {
          setSelectedDevice(device);
        });

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 11px; padding: 4px; min-width: 190px;">
            <div style="font-weight: bold; color: #0f172a; margin-bottom: 2px; font-size: 12px;">${device.deviceName}</div>
            <div style="font-family: monospace; color: #0284c7; font-weight: 600; font-size: 10px; margin-bottom: 4px;">${device.hardwareId} • ${device.modelName}</div>
            <div style="color: #475569; margin-bottom: 6px; line-height: 1.35;">📍 ${device.formattedAddress}</div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-weight: bold; color: ${device.status === "ONLINE" ? "#059669" : device.status === "OFFLINE" ? "#e11d48" : "#0284c7"}">
                ● ${device.status === "ONLINE" ? "Trực tuyến" : device.status === "OFFLINE" ? "Ngoại tuyến" : "Tồn kho"}
              </span>
              <span style="font-size: 9px; color: #64748b; font-family: monospace;">${device.lat.toFixed(4)}, ${device.lng.toFixed(4)}</span>
            </div>
            <div style="border-top: 1px solid #e2e8f0; padding-top: 6px;">
              <a href="https://www.google.com/maps/search/?api=1&query=${device.lat},${device.lng}" 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 style="display: flex; align-items: center; justify-content: center; gap: 4px; padding: 5px 8px; background-color: #059669; color: white; border-radius: 6px; font-weight: 600; font-size: 10px; text-decoration: none; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                🧭 Mở Chỉ Đường Google Maps ↗
              </a>
            </div>
          </div>
        `);

        marker.addTo(markersGroup);
      });
    }

    updateMarkers();
  }, [filteredDevices, selectedDevice]);

  // Jump to Province
  const handleFlyToProvince = (prov: string) => {
    setSelectedProvince(prov);
    if (!mapInstanceRef.current) return;

    if (prov === "ALL") {
      mapInstanceRef.current.flyTo([16.0544, 107.5], 6);
    } else {
      const match = SAMPLE_GEO_DEVICES.find(d => d.province === prov);
      if (match) {
        mapInstanceRef.current.flyTo([match.lat, match.lng], 12);
        setSelectedDevice(match);
      }
    }
  };

  // Fly to specific device
  const handleSelectDevice = (dev: DeviceGeoLocation) => {
    setSelectedDevice(dev);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([dev.lat, dev.lng], 14);
    }
  };

  return (
    <>
      {isFullscreen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-150" 
          onClick={() => setIsFullscreen(false)} 
        />
      )}
      <div className={`${
        isFullscreen 
          ? "fixed inset-3 md:inset-6 z-50 rounded-xl shadow-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          : "rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col overflow-hidden"
      }`}>
        {/* Top Map Header & Filter Controls */}
        <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Bản Đồ Phân Bố Cụm Thiết Bị Toàn Quốc
              </h2>
              <span className="text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Leaflet Engine
              </span>
            </div>
          </div>

          {/* Quick Filter Inputs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Search Device by Serial / Address */}
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo Serial, địa chỉ..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="text-[11px] pl-6 pr-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white w-40 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Filter Status Combobox */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-[11px] px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">Mọi trạng thái ({SAMPLE_GEO_DEVICES.length})</option>
              <option value="ONLINE">● Trực tuyến</option>
              <option value="OFFLINE">● Ngoại tuyến</option>
              <option value="IN_STOCK">● Tồn kho</option>
            </select>

            {/* Quick Jump Province Buttons */}
            <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-slate-800/80 p-0.5 rounded-md">
              {[
                { id: "ALL", label: "Toàn quốc" },
                { id: "Hà Nội", label: "Hà Nội" },
                { id: "TP. Hồ Chí Minh", label: "TP.HCM" },
                { id: "Đà Nẵng", label: "Đà Nẵng" },
                { id: "Hải Phòng", label: "Hải Phòng" },
                { id: "Cần Thơ", label: "Cần Thơ" },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleFlyToProvince(p.id)}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded transition-colors cursor-pointer ${
                    selectedProvince === p.id
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Fullscreen Expand / Shrink Dialog Button */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer ml-0.5"
              title={isFullscreen ? "Thu nhỏ (Esc)" : "Phóng to bản đồ (Fullscreen Dialog)"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Thu nhỏ</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span className="hidden sm:inline">Phóng to</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Main Map Body + Side Inspector Split Pane */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 relative overflow-hidden ${isFullscreen ? "flex-1 min-h-0" : "h-[420px]"}`}>
        {/* Leaflet Map Canvas (8.5 cols) */}
        <div className="lg:col-span-8 relative h-full w-full bg-slate-100 dark:bg-slate-950">
          <div ref={mapContainerRef} className="h-full w-full z-0" />

          {/* Floating Map Style Switcher (Top Left) */}
          <div className="absolute top-2.5 left-2.5 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-lg p-1 shadow-md flex items-center gap-1 text-[11px]">
            <button
              type="button"
              onClick={() => applyTileLayer("google")}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                mapStyle === "google" 
                  ? "bg-emerald-600 text-white shadow-xs font-bold" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Bản đồ đường bộ Google Maps (Độ nét cao, không watermark)"
            >
              🗺️ Google Maps
            </button>
            <button
              type="button"
              onClick={() => applyTileLayer("satellite")}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                mapStyle === "satellite" 
                  ? "bg-emerald-600 text-white shadow-xs font-bold" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Ảnh vệ tinh độ phân giải cao kết hợp đường bộ"
            >
              🛰️ Vệ Tinh Google
            </button>
            <button
              type="button"
              onClick={() => applyTileLayer("osm")}
              className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                mapStyle === "osm" 
                  ? "bg-emerald-600 text-white shadow-xs font-bold" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Bản đồ mã nguồn mở OpenStreetMap"
            >
              🌍 OpenStreetMap
            </button>
          </div>

          {/* Map legend overlay (Bottom Left) */}
          <div className="absolute bottom-2 left-2 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-md p-1.5 shadow-sm text-[10px] space-y-1 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-700 dark:text-slate-300">Trực tuyến (Online)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-700 dark:text-slate-300">Ngoại tuyến (Offline)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
              <span className="text-slate-700 dark:text-slate-300">Tồn kho (In Stock)</span>
            </div>
          </div>
        </div>

        {/* Selected Device / Location Detail Inspector (3.5 cols) */}
        <div className="lg:col-span-4 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between overflow-hidden">
          {/* Header of Inspector */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
            <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Chi Tiết Tọa Độ & Điểm Lắp Đặt
            </span>
            <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
              {filteredDevices.length} điểm khớp lọc
            </span>
          </div>

          {/* Scrollable details */}
          <div className="flex-1 min-h-0 p-2.5 overflow-y-auto space-y-2 text-xs">
            {selectedDevice ? (
              <>
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs leading-tight">
                        {selectedDevice.deviceName}
                      </div>
                      <div className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-semibold mt-0.5">
                        {selectedDevice.hardwareId} • {selectedDevice.modelName}
                      </div>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                      selectedDevice.status === "ONLINE"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : selectedDevice.status === "OFFLINE"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                    }`}>
                      {selectedDevice.status === "ONLINE" ? "Online" : selectedDevice.status === "OFFLINE" ? "Offline" : "Tồn Kho"}
                    </span>
                  </div>

                  {/* Clickable Address Link to Google Maps */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedDevice.lat},${selectedDevice.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Nhấp để mở vị trí chính xác trên Google Maps"
                    className="group/addr text-[11px] text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-start justify-between gap-1 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5 group-hover/addr:scale-125 transition-transform" />
                      <span className="group-hover/addr:underline underline-offset-2 leading-relaxed">{selectedDevice.formattedAddress}</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover/addr:text-emerald-600 dark:group-hover/addr:text-emerald-400 shrink-0 mt-0.5" />
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  {/* Clickable Coordinates Link to Google Maps */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${selectedDevice.lat},${selectedDevice.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Xem tọa độ trên Google Maps"
                    className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors group/coord cursor-pointer block"
                  >
                    <div className="text-slate-400 text-[9px] flex items-center justify-between">
                      <span>Tọa độ Vĩ/Kinh:</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400 group-hover/coord:text-emerald-500" />
                    </div>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold group-hover/coord:underline">
                      {selectedDevice.lat.toFixed(4)}, {selectedDevice.lng.toFixed(4)}
                    </span>
                  </a>

                  <div className="p-1.5 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Chủ sở hữu:</span>
                    <span className="text-slate-900 dark:text-white font-semibold truncate block">{selectedDevice.ownerName}</span>
                  </div>
                </div>

                {/* Google Maps Direct Navigation Button */}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedDevice.lat},${selectedDevice.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs hover:shadow-emerald-500/20 transition-all cursor-pointer group"
                >
                  <Navigation className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
                  <span>Chuyển Hướng Google Maps (Dẫn Đường) ↗</span>
                </a>

                <div className="flex items-center justify-between p-1.5 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[10px] font-mono">
                  <span className="text-slate-500">Viễn thám gần nhất:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{selectedDevice.lastTelemetryAt}</span>
                </div>

                {/* Other devices nearby */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                    Danh sách thiết bị trong khu vực ({filteredDevices.length})
                  </span>
                  <div className="space-y-1 max-h-24 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredDevices.map(d => (
                      <button
                        key={d.hardwareId}
                        type="button"
                        onClick={() => handleSelectDevice(d)}
                        className={`w-full text-left p-1 rounded flex items-center justify-between text-[10px] transition-colors cursor-pointer ${
                          selectedDevice.hardwareId === d.hardwareId
                            ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 font-bold"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <span className="font-mono">{d.hardwareId}</span>
                        <span className="truncate max-w-[110px] text-slate-400">{d.province}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 text-center text-slate-400 text-xs">
                Chọn một điểm đánh dấu trên bản đồ để xem chi tiết địa chỉ và thông số viễn thám.
              </div>
            )}
          </div>

          {/* Action Link Footer */}
          {selectedDevice && (
            <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-slate-400 font-mono">SLA &lt; 250ms</span>
              <Link
                href={`/devices?tab=list&search=${selectedDevice.hardwareId}`}
                className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500"
              >
                <span>Xem trong danh mục</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
