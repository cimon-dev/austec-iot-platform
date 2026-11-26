"use client";

import React, { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { DeviceDetailWorkbench } from "@/customer/components/DeviceDetailWorkbench";

function DeviceDetailRouteInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const hwId = decodeURIComponent(String(params?.hardwareId || ""));
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam === "history" || tabParam === "settings" ? tabParam : "control";
  const bmsParam = searchParams.get("bmsTab");
  const initialBmsTab =
    bmsParam === "chart" || bmsParam === "faults" || bmsParam === "config"
      ? bmsParam
      : "cells";

  return (
    <div className="h-full min-h-0 rounded-xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
      <DeviceDetailWorkbench
        hardwareId={hwId}
        initialTab={initialTab}
        initialBmsTab={initialBmsTab}
      />
    </div>
  );
}

export default function CustomerDeviceDetailPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-[#7B8596]">Đang tải thiết bị...</div>}>
      <DeviceDetailRouteInner />
    </Suspense>
  );
}
