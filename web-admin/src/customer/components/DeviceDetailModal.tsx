"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useCustomerIoT } from "../context/CustomerIoTContext";
import { useLanguage } from "@/context/LanguageContext";
import { getCategoryDisplayName } from "../types/device";
import { DeviceDetailWorkbench } from "./DeviceDetailWorkbench";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DeviceDetailModalProps {
  hardwareId: string | null;
  initialTab?: "control" | "history" | "settings";
  initialBmsTab?: "cells" | "chart" | "faults" | "config";
  onSelectDevice?: (nextHardwareId: string) => void;
  onClose: () => void;
}

export function DeviceDetailModal({
  hardwareId,
  initialTab = "control",
  initialBmsTab = "cells",
  onSelectDevice,
  onClose,
}: DeviceDetailModalProps) {
  const { allDevicesWithEnergySamples, findByHardwareId } = useCustomerIoT();
  const { language } = useLanguage();
  const [activeHwId, setActiveHwId] = useState<string | null>(hardwareId);

  useEffect(() => {
    setActiveHwId(hardwareId);
  }, [hardwareId]);

  const currentDevice = useMemo(
    () => (activeHwId ? findByHardwareId(activeHwId) : undefined),
    [activeHwId, findByHardwareId, allDevicesWithEnergySamples]
  );

  const siblingDevices = useMemo(() => {
    if (!currentDevice) return [];
    return allDevicesWithEnergySamples.filter(
      (d) => d.category === currentDevice.category
    );
  }, [allDevicesWithEnergySamples, currentDevice]);

  if (!hardwareId || !activeHwId) return null;

  const currentIndex = siblingDevices.findIndex(
    (d) => d.hardwareId.toLowerCase() === activeHwId.toLowerCase()
  );
  const hasSiblings = siblingDevices.length > 1 && currentIndex >= 0;
  const prevDevice = hasSiblings
    ? siblingDevices[
        (currentIndex - 1 + siblingDevices.length) % siblingDevices.length
      ]
    : null;
  const nextDevice = hasSiblings
    ? siblingDevices[(currentIndex + 1) % siblingDevices.length]
    : null;

  const switchToDevice = (nextHw: string) => {
    setActiveHwId(nextHw);
    if (onSelectDevice) onSelectDevice(nextHw);
  };

  return (
    /* Backdrop does NOT close on outside click — closes ONLY via the X button */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-[2px] p-3 sm:p-6">
      <div className="relative w-full max-w-6xl flex items-center justify-center gap-3">
        {/* Left Flanking Sibling Button */}
        {hasSiblings && prevDevice && (
          <button
            type="button"
            onClick={() => switchToDevice(prevDevice.hardwareId)}
            title={`Thiết bị trước: ${prevDevice.name}`}
            className="hidden sm:flex w-11 h-11 rounded-full shrink-0 items-center justify-center border border-white/15 bg-[#151A22]/90 hover:bg-blue-600 text-white shadow-xl transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2} />
          </button>
        )}

        {/* Main Dialog Card (adaptive height up to 88vh, zero wasted empty void) */}
        <div className="w-full max-w-5xl max-h-[88vh] rounded-2xl border border-black/[0.12] dark:border-white/[0.12] bg-[#F6F7F9] dark:bg-[#0D1015] shadow-2xl overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <DeviceDetailWorkbench
              hardwareId={activeHwId}
              initialTab={initialTab}
              initialBmsTab={initialBmsTab}
              isModal
              onClose={onClose}
            />
          </div>

          {/* Bottom Same-Category Switcher Strip */}
          {hasSiblings && prevDevice && nextDevice && currentDevice && (
            <div className="shrink-0 px-4 py-2 border-t border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#151A22] flex items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => switchToDevice(prevDevice.hardwareId)}
                className="h-7 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] hover:border-blue-500 hover:text-blue-500 flex items-center gap-1 font-medium max-w-[36%] cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{prevDevice.name}</span>
              </button>

              <div className="flex items-center gap-2 text-[11px] text-[#525D6F] dark:text-[#9BA4B2] shrink-0">
                <span className="font-mono font-semibold tabular-nums text-[#11161F] dark:text-[#F3F5F8]">
                  {currentIndex + 1} / {siblingDevices.length}
                </span>
                <span className="hidden md:inline">·</span>
                <span className="hidden md:inline">
                  {getCategoryDisplayName(currentDevice.category, language)}
                </span>
                <div className="hidden sm:flex items-center gap-1 ml-1">
                  {siblingDevices.map((sib, idx) => (
                    <button
                      key={sib.hardwareId}
                      type="button"
                      onClick={() => switchToDevice(sib.hardwareId)}
                      title={sib.name}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        idx === currentIndex
                          ? "w-4 bg-blue-600"
                          : "w-1.5 bg-black/20 dark:bg-white/25 hover:bg-blue-400"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => switchToDevice(nextDevice.hardwareId)}
                className="h-7 px-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-[#F6F7F9] dark:bg-[#1C232E] hover:border-blue-500 hover:text-blue-500 flex items-center gap-1 font-medium max-w-[36%] cursor-pointer transition-colors"
              >
                <span className="truncate">{nextDevice.name}</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          )}
        </div>

        {/* Right Flanking Sibling Button */}
        {hasSiblings && nextDevice && (
          <button
            type="button"
            onClick={() => switchToDevice(nextDevice.hardwareId)}
            title={`Thiết bị tiếp theo: ${nextDevice.name}`}
            className="hidden sm:flex w-11 h-11 rounded-full shrink-0 items-center justify-center border border-white/15 bg-[#151A22]/90 hover:bg-blue-600 text-white shadow-xl transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
