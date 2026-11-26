"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  GridLayout,
  useContainerWidth,
  verticalCompactor,
  type Layout,
  type LayoutItem,
} from "react-grid-layout";
import { useCustomerAuth } from "@/customer/context/CustomerAuthContext";
import { useCustomerIoT } from "@/customer/context/CustomerIoTContext";
import { useLanguage } from "@/context/LanguageContext";
import { customerApi } from "@/customer/services/customer-api-client";
import { DeviceCategory, DeviceItem } from "@/customer/types/device";
import {
  CompactDeviceCard,
  renderCategoryGlyph,
  type DetailModalTab,
  type BmsModalTab,
} from "@/customer/components/CompactDeviceCard";
import { DeviceDetailModal } from "@/customer/components/DeviceDetailModal";
import {
  RefreshCw,
  PlusCircle,
  GripVertical,
  Lock,
  Unlock,
  RotateCcw,
  CloudCheck,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

// Exact Mobile App category order & names
const CATEGORY_DEFINITIONS: Array<{
  category: DeviceCategory;
  label: string;
  subtitleVi: string;
}> = [
  { category: "camera", label: "Camera", subtitleVi: "Giám sát trực tiếp" },
  { category: "rollerDoor", label: "Doors", subtitleVi: "Cửa cuốn Austec" },
  {
    category: "lightSwitch",
    label: "Light & Switch",
    subtitleVi: "Ổ cắm & công tắc",
  },
  {
    category: "energyManage",
    label: "Energy Manage",
    subtitleVi: "Công tơ & Pin BMS",
  },
  {
    category: "environment",
    label: "Environment",
    subtitleVi: "Cảm biến không khí",
  },
  {
    category: "dataAnalytics",
    label: "Data Analytics",
    subtitleVi: "Phân tích vận hành",
  },
  {
    category: "othersControl",
    label: "Others Control",
    subtitleVi: "Khóa & điều khiển khác",
  },
];

interface SavedLayoutPayload {
  items: Array<{ i: string; x: number; y: number; w: number; h: number }>;
  updatedAt: string;
}

function buildDefaultLayout(activeCategories: DeviceCategory[]): LayoutItem[] {
  const hasCamera = activeCategories.includes("camera");
  const others = activeCategories.filter((c) => c !== "camera");
  const items: LayoutItem[] = [];

  if (hasCamera) {
    items.push({
      i: "camera",
      x: 0,
      y: 0,
      w: 12,
      h: 7,
      minW: 4,
      minH: 5,
    });
  }

  const startY = hasCamera ? 7 : 0;
  const colSpan =
    others.length === 1 ? 12 : others.length === 2 ? 6 : 4;
  const rowCount = others.length <= 3 ? 1 : Math.ceil(others.length / 3);
  const blockH = hasCamera ? (rowCount === 1 ? 11 : 9) : 13;

  others.forEach((cat, idx) => {
    const perRow = Math.max(1, Math.floor(12 / colSpan));
    const col = idx % perRow;
    const row = Math.floor(idx / perRow);
    items.push({
      i: cat,
      x: col * colSpan,
      y: startY + row * blockH,
      w: colSpan,
      h: blockH,
      minW: 3,
      minH: 5,
    });
  });

  return items;
}

function mergeSavedWithActive(
  savedItems: SavedLayoutPayload["items"] | null,
  activeCategories: DeviceCategory[]
): LayoutItem[] {
  const defaults = buildDefaultLayout(activeCategories);
  if (!savedItems || savedItems.length === 0) return defaults;

  const savedMap = new Map(savedItems.map((it) => [it.i, it]));
  return defaults.map((def) => {
    const found = savedMap.get(def.i);
    if (!found) return def;
    const w = Math.max(def.minW ?? 3, Math.min(12, Number(found.w) || def.w));
    const h = Math.max(def.minH ?? 5, Number(found.h) || def.h);
    const x = Math.max(0, Math.min(12 - w, Number(found.x) || 0));
    const y = Math.max(0, Number(found.y) || 0);
    return {
      ...def,
      x,
      y,
      w,
      h,
    };
  });
}

export default function CustomerSmartHomeDashboardPage() {
  const { user, isAuthenticated } = useCustomerAuth();
  const {
    allDevicesWithEnergySamples,
    isLoadingDevices,
    refreshDevices,
    sendCommand,
  } = useCustomerIoT();
  const { language } = useLanguage();

  // Multi-select categories (empty array = "Tất cả")
  const [selectedCategories, setSelectedCategories] = useState<DeviceCategory[]>(
    []
  );
  const [selectedRoom, setSelectedRoom] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ONLINE" | "OFFLINE"
  >("ALL");

  // Layout editing & persistence state
  const [isLayoutUnlocked, setIsLayoutUnlocked] = useState<boolean>(true);
  const [savedItems, setSavedItems] = useState<
    SavedLayoutPayload["items"] | null
  >(null);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  // Modal state
  const [modalState, setModalState] = useState<{
    hardwareId: string;
    tab: DetailModalTab;
    bmsTab: BmsModalTab;
  } | null>(null);

  const [busyHwId, setBusyHwId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = `austec_home_layout_${user?.id || "guest"}`;

  const { width: gridWidth, containerRef: gridContainerRef, mounted: gridMounted } =
    useContainerWidth({ initialWidth: 1200 });

  // Load saved layout: instant from localStorage + reconcile from PostgreSQL
  useEffect(() => {
    let localPayload: SavedLayoutPayload | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.items)) {
          localPayload = parsed;
          setSavedItems(parsed.items);
        }
      }
    } catch {
      // ignore invalid cache
    }

    if (!isAuthenticated) return;

    let cancelled = false;
    customerApi
      .get("/api/auth/preferences")
      .then((res) => {
        if (cancelled || !res.success) return;
        const serverLayout = res.dashboardLayout;
        if (
          serverLayout &&
          Array.isArray(serverLayout.items) &&
          serverLayout.items.length > 0
        ) {
          const serverTime = Date.parse(
            serverLayout.updatedAt || res.updatedAt || ""
          );
          const localTime = Date.parse(localPayload?.updatedAt || "");
          if (!localPayload || isNaN(localTime) || serverTime > localTime) {
            const nextPayload: SavedLayoutPayload = {
              items: serverLayout.items,
              updatedAt:
                serverLayout.updatedAt ||
                res.updatedAt ||
                new Date().toISOString(),
            };
            setSavedItems(nextPayload.items);
            try {
              localStorage.setItem(storageKey, JSON.stringify(nextPayload));
            } catch {
              // ignore quota error
            }
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, storageKey]);

  const persistLayout = useCallback(
    (nextLayout: Layout) => {
      const incoming = nextLayout.map((item) => ({
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      }));

      // Merge with any previously saved categories not currently visible (e.g. due to room/status filter)
      setSavedItems((prev) => {
        const map = new Map<
          string,
          { i: string; x: number; y: number; w: number; h: number }
        >();
        (prev || []).forEach((it) => map.set(it.i, it));
        incoming.forEach((it) => map.set(it.i, it));
        const merged = Array.from(map.values());
        const payload: SavedLayoutPayload = {
          items: merged,
          updatedAt: new Date().toISOString(),
        };

        try {
          localStorage.setItem(storageKey, JSON.stringify(payload));
        } catch {
          // ignore
        }

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        setSyncState("saving");
        saveTimerRef.current = setTimeout(() => {
          if (!isAuthenticated) {
            setSyncState("saved");
            return;
          }
          customerApi
            .put("/api/auth/preferences", { dashboardLayout: payload })
            .then(() => setSyncState("saved"))
            .catch(() => setSyncState("idle"));
        }, 600);

        return merged;
      });
    },
    [isAuthenticated, storageKey]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleResetLayout = async () => {
    setSavedItems(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    if (isAuthenticated) {
      setSyncState("saving");
      await customerApi
        .put("/api/auth/preferences", { dashboardLayout: null })
        .catch(() => {});
      setSyncState("saved");
    }
    toast.success(
      language === "vi"
        ? "Đã khôi phục bố cục bảng điều khiển mặc định"
        : "Dashboard layout reset to default"
    );
  };

  const rooms = useMemo(() => {
    const set = new Set<string>();
    allDevicesWithEnergySamples.forEach((d) => {
      if (d.roomName && d.roomName.trim()) set.add(d.roomName.trim());
    });
    return Array.from(set);
  }, [allDevicesWithEnergySamples]);

  // Base room + status filter (used both for counts and rendering)
  const baseFilteredDevices = useMemo(() => {
    return allDevicesWithEnergySamples.filter((d) => {
      if (selectedRoom !== "ALL" && d.roomName.trim() !== selectedRoom)
        return false;
      if (statusFilter === "ONLINE" && !d.isOnline) return false;
      if (statusFilter === "OFFLINE" && d.isOnline) return false;
      return true;
    });
  }, [allDevicesWithEnergySamples, selectedRoom, statusFilter]);

  const devicesByCategory = useMemo(() => {
    const map: Record<DeviceCategory, DeviceItem[]> = {
      camera: [],
      rollerDoor: [],
      lightSwitch: [],
      energyManage: [],
      environment: [],
      dataAnalytics: [],
      othersControl: [],
    };
    baseFilteredDevices.forEach((d) => {
      map[d.category].push(d);
    });
    return map;
  }, [baseFilteredDevices]);

  // Active categories for Default "Tất cả" mode (only categories with devices)
  const activeAllCategories = useMemo(() => {
    return CATEGORY_DEFINITIONS.map((c) => c.category).filter(
      (cat) => devicesByCategory[cat].length > 0
    );
  }, [devicesByCategory]);

  // Effective layout for react-grid-layout
  const activeGridLayout = useMemo(() => {
    return mergeSavedWithActive(savedItems, activeAllCategories);
  }, [savedItems, activeAllCategories]);

  // Ordered list of selected categories in Filtered Mode
  const orderedSelectedCategories = useMemo(() => {
    if (selectedCategories.length === 0) return [];
    return CATEGORY_DEFINITIONS.map((c) => c.category).filter((cat) =>
      selectedCategories.includes(cat)
    );
  }, [selectedCategories]);

  const toggleCategory = (cat: DeviceCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat);
      }
      return [...prev, cat];
    });
  };

  const handleQuickAction = useCallback(
    async (
      e: React.MouseEvent,
      dev: DeviceItem,
      action: string,
      params?: Record<string, any>
    ) => {
      e.stopPropagation();
      setBusyHwId(dev.hardwareId);
      try {
        const res = await sendCommand(dev.hardwareId, action, params);
        if (res.success) {
          toast.success(`${dev.name}: ${res.message} (${res.latencyMs}ms)`);
        } else {
          toast.error(`${dev.name}: ${res.message}`);
        }
      } finally {
        setBusyHwId(null);
      }
    },
    [sendCommand]
  );

  const handleOpenDetail = useCallback(
    (
      hardwareId: string,
      tab: DetailModalTab = "control",
      bmsTab: BmsModalTab = "cells"
    ) => {
      setModalState({ hardwareId, tab, bmsTab });
    },
    []
  );

  const isDefaultAllMode = selectedCategories.length === 0;

  return (
    <div className="h-full min-h-0 flex flex-col gap-2.5 overflow-hidden">
      {/* 1. Compact Single-Row Filter & Layout Toolbar */}
      <div className="shrink-0 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] px-2.5 py-1.5 flex flex-nowrap items-center justify-between gap-2 overflow-hidden">
        {/* Multi-select Category Filter matching exact Mobile names (always single row) */}
        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategories([])}
            className={`h-7 px-2 rounded-lg text-[11.5px] font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
              isDefaultAllMode
                ? "bg-blue-600 text-white"
                : "bg-[#EEF1F5] dark:bg-[#1C232E] text-[#525D6F] dark:text-[#9BA4B2] hover:text-[#11161F] dark:hover:text-white"
            }`}
          >
            <span>{language === "vi" ? "Tất cả" : "All"}</span>
            <span className="font-mono text-[10px] opacity-80 tabular-nums">
              {baseFilteredDevices.length}
            </span>
          </button>

          {CATEGORY_DEFINITIONS.map((def) => {
            const count = devicesByCategory[def.category].length;
            const active = selectedCategories.includes(def.category);
            return (
              <button
                key={def.category}
                type="button"
                onClick={() => toggleCategory(def.category)}
                className={`h-7 px-2 rounded-lg text-[11.5px] font-medium transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-[#EEF1F5] dark:bg-[#1C232E] text-[#525D6F] dark:text-[#9BA4B2] hover:text-[#11161F] dark:hover:text-white"
                }`}
              >
                {renderCategoryGlyph(def.category, "w-3 h-3")}
                <span>{def.label}</span>
                <span className="font-mono text-[10px] opacity-75 tabular-nums">
                  {count}
                </span>
              </button>
            );
          })}

          {!isDefaultAllMode && (
            <button
              type="button"
              onClick={() => setSelectedCategories([])}
              title="Xóa bộ lọc loại"
              className="h-7 px-1.5 rounded-lg text-[11px] font-medium text-[#525D6F] dark:text-[#9BA4B2] hover:text-rose-500 flex items-center cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Controls: Status Filter, Room Filter, Layout Lock/Reset, Refresh (same row) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {rooms.length > 0 && (
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="h-7 max-w-[125px] px-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-[11.5px] font-medium focus:outline-none focus:border-blue-500 truncate"
            >
              <option value="ALL">
                {language === "vi" ? "Mọi khu vực" : "All rooms"}
              </option>
              {rooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-7 px-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-[11.5px] font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">
              {language === "vi" ? "Trạng thái" : "All status"}
            </option>
            <option value="ONLINE">
              {language === "vi" ? "Trực tuyến" : "Online"}
            </option>
            <option value="OFFLINE">
              {language === "vi" ? "Ngoại tuyến" : "Offline"}
            </option>
          </select>

          {isDefaultAllMode && (
            <>
              <div className="h-4 w-px bg-black/[0.08] dark:bg-white/[0.08] hidden sm:block" />

              <button
                type="button"
                onClick={() => setIsLayoutUnlocked((v) => !v)}
                title={
                  isLayoutUnlocked
                    ? "Đang mở khóa bố cục (kéo tiêu đề để sắp xếp, kéo góc để đổi cỡ)"
                    : "Bố cục đang khóa"
                }
                className={`h-7 px-2 rounded-lg border text-[11.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  isLayoutUnlocked
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400"
                    : "bg-[#F6F7F9] dark:bg-[#1C232E] border-black/[0.08] dark:border-white/[0.08] text-[#525D6F] dark:text-[#9BA4B2]"
                }`}
              >
                {isLayoutUnlocked ? (
                  <Unlock className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
                )}
                <span className="hidden 2xl:inline">
                  {isLayoutUnlocked
                    ? language === "vi"
                      ? "Tùy chỉnh"
                      : "Customize"
                    : language === "vi"
                      ? "Đã khóa"
                      : "Locked"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleResetLayout}
                title="Đặt lại bố cục mặc định"
                className="h-7 w-7 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] text-[#525D6F] dark:text-[#9BA4B2] hover:text-[#11161F] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {syncState !== "idle" && (
                <span
                  className="hidden xl:inline-flex items-center text-[#525D6F] dark:text-[#9BA4B2]"
                  title="Đã đồng bộ bố cục lên tài khoản"
                >
                  {syncState === "saving" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                  ) : (
                    <CloudCheck className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </span>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => {
              refreshDevices();
              toast.success(
                language === "vi"
                  ? "Đã làm mới trạng thái thiết bị"
                  : "Refreshed device states"
              );
            }}
            title="Làm mới danh sách thiết bị"
            className="h-7 w-7 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] hover:bg-blue-600 hover:text-white hover:border-blue-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoadingDevices ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* 2. Main Bounded Viewport Workspace (Strict 100vh: only inner panels scroll) */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {baseFilteredDevices.length === 0 ? (
          <div className="flex-1 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-11 h-11 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center mb-3">
              <PlusCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold">
              {language === "vi"
                ? "Không có thiết bị phù hợp bộ lọc"
                : "No devices match current filters"}
            </h3>
            <p className="text-xs text-[#525D6F] dark:text-[#9BA4B2] mt-1 max-w-md">
              {language === "vi"
                ? "Hãy thêm thiết bị mới qua Hardware ID / QR Code hoặc thay đổi bộ lọc khu vực và trạng thái."
                : "Pair a new device or clear your room and status filters."}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Link
                href="/pair"
                className="h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium inline-flex items-center"
              >
                {language === "vi" ? "+ Thêm thiết bị" : "+ Pair device"}
              </Link>
              {(selectedRoom !== "ALL" || statusFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoom("ALL");
                    setStatusFilter("ALL");
                  }}
                  className="h-8 px-3 rounded-lg border border-black/[0.1] dark:border-white/[0.1] text-xs font-medium cursor-pointer"
                >
                  {language === "vi" ? "Xóa bộ lọc" : "Clear filters"}
                </button>
              )}
            </div>
          </div>
        ) : isDefaultAllMode ? (
          /* MODE A: Default "Tất cả" — Draggable & Resizable React-Grid-Layout Category Zones */
          <div
            ref={gridContainerRef}
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0.5"
          >
            {gridMounted && activeAllCategories.length > 0 && (
              <GridLayout
                width={Math.max(320, gridWidth - 4)}
                layout={activeGridLayout}
                gridConfig={{
                  cols: 12,
                  rowHeight: 34,
                  margin: [10, 10],
                  containerPadding: [0, 0],
                }}
                dragConfig={{
                  enabled: isLayoutUnlocked,
                  handle: ".austec-grid-drag-handle",
                  cancel: "button, input, select, a, textarea, iframe",
                  bounded: false,
                  threshold: 4,
                }}
                resizeConfig={{
                  enabled: isLayoutUnlocked,
                  handles: ["se", "e", "s"],
                }}
                compactor={verticalCompactor}
                onDragStop={(layout) => persistLayout(layout)}
                onResizeStop={(layout) => persistLayout(layout)}
              >
                {activeAllCategories.map((cat) => {
                  const def = CATEGORY_DEFINITIONS.find(
                    (c) => c.category === cat
                  )!;
                  const list = devicesByCategory[cat];
                  const onlineInCat = list.filter((d) => d.isOnline).length;
                  const isCameraZone = cat === "camera";

                  return (
                    <div
                      key={cat}
                      className="rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-[#12161E] flex flex-col overflow-hidden"
                    >
                      {/* Panel Header (Drag Handle) */}
                      <div
                        className={`austec-grid-drag-handle shrink-0 px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2 select-none ${
                          isLayoutUnlocked ? "cursor-grab active:cursor-grabbing" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isLayoutUnlocked && (
                            <GripVertical className="w-3.5 h-3.5 text-[#7B8596] shrink-0" />
                          )}
                          <span className="text-blue-500 shrink-0">
                            {renderCategoryGlyph(cat, "w-3.5 h-3.5")}
                          </span>
                          <span className="text-[12px] font-semibold tracking-tight truncate">
                            {def.label}
                          </span>
                          <span className="text-[11px] font-mono tabular-nums text-[#7B8596]">
                            {onlineInCat}/{list.length}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCategories([cat]);
                          }}
                          className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
                        >
                          {language === "vi" ? "Mở rộng" : "Expand"}
                        </button>
                      </div>

                      {/* Panel Content: Camera flows horizontally; all other zones stack vertically with internal scroll */}
                      {isCameraZone ? (
                        <div className="flex-1 min-h-0 p-2 overflow-x-auto overflow-y-hidden flex items-stretch gap-2.5">
                          {list.map((dev) => (
                            <div
                              key={dev.hardwareId}
                              className="w-[270px] sm:w-[290px] shrink-0"
                            >
                              <CompactDeviceCard
                                device={dev}
                                language={language}
                                isBusy={busyHwId === dev.hardwareId}
                                onQuickAction={handleQuickAction}
                                onOpenDetail={handleOpenDetail}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex-1 min-h-0 p-2 overflow-y-auto space-y-2">
                          {list.map((dev) => (
                            <CompactDeviceCard
                              key={dev.hardwareId}
                              device={dev}
                              language={language}
                              isBusy={busyHwId === dev.hardwareId}
                              onQuickAction={handleQuickAction}
                              onOpenDetail={handleOpenDetail}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </GridLayout>
            )}
          </div>
        ) : (
          /* MODE B: Filtered Mode (1 or multiple categories) — Grouped by Category, Horizontal Grid inside each */
          <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-y-auto pr-0.5">
            {orderedSelectedCategories.map((cat) => {
              const def = CATEGORY_DEFINITIONS.find(
                (c) => c.category === cat
              )!;
              const list = devicesByCategory[cat];
              const onlineInCat = list.filter((d) => d.isOnline).length;
              const isSingleOrPair = orderedSelectedCategories.length <= 2;

              return (
                <section
                  key={cat}
                  className={`rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/80 dark:bg-[#12161E] flex flex-col overflow-hidden ${
                    isSingleOrPair ? "flex-1 min-h-0" : "shrink-0 max-h-[46%]"
                  }`}
                >
                  <div className="shrink-0 px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-500">
                        {renderCategoryGlyph(cat, "w-4 h-4")}
                      </span>
                      <h2 className="text-[13px] font-semibold">{def.label}</h2>
                      <span className="text-[11px] text-[#525D6F] dark:text-[#9BA4B2] hidden sm:inline">
                        • {def.subtitleVi}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-[#EEF1F5] dark:bg-[#1C232E] text-[#525D6F] dark:text-[#9BA4B2]">
                        {onlineInCat}/{list.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      title="Bỏ chọn loại này"
                      className="text-[11px] text-[#7B8596] hover:text-rose-500 flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-2.5">
                    {list.length === 0 ? (
                      <div className="h-full min-h-[100px] flex items-center justify-center text-xs text-[#7B8596]">
                        {language === "vi"
                          ? `Chưa có thiết bị nào trong mục ${def.label}`
                          : `No devices in ${def.label}`}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 items-start">
                        {list.map((dev) => (
                          <CompactDeviceCard
                            key={dev.hardwareId}
                            device={dev}
                            language={language}
                            isBusy={busyHwId === dev.hardwareId}
                            onQuickAction={handleQuickAction}
                            onOpenDetail={handleOpenDetail}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Large Non-Fullscreen Device Detail / History / Settings Modal */}
      <DeviceDetailModal
        hardwareId={modalState?.hardwareId ?? null}
        initialTab={modalState?.tab}
        initialBmsTab={modalState?.bmsTab}
        onSelectDevice={(nextHwId) =>
          setModalState((prev) =>
            prev ? { ...prev, hardwareId: nextHwId } : null
          )
        }
        onClose={() => setModalState(null)}
      />
    </div>
  );
}
