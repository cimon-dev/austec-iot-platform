"use client";

import React from "react";

interface MqttBrokerCardProps {
  mqttBrokerUrl: string;
  mqttPort: number;
  tlsEnabled: boolean;
  keepAliveSeconds: number;
  onChangeUrl: (val: string) => void;
  onChangePort: (val: number) => void;
  onChangeTls: (val: boolean) => void;
  onChangeKeepAlive: (val: number) => void;
}

export function MqttBrokerCard({
  mqttBrokerUrl,
  mqttPort,
  tlsEnabled,
  keepAliveSeconds,
  onChangeUrl,
  onChangePort,
  onChangeTls,
  onChangeKeepAlive,
}: MqttBrokerCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30">
        <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Hạ tầng kết nối MQTT
        </h2>
      </div>

      <div className="p-4 space-y-3.5 max-w-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Máy chủ MQTT (Host)
          </label>
          <div className="sm:col-span-2">
            <input
              type="text"
              value={mqttBrokerUrl}
              onChange={(e) => onChangeUrl(e.target.value)}
              placeholder="mqtt://broker.austec.vn"
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Cổng kết nối (Port)
          </label>
          <div className="sm:col-span-2 flex items-center gap-4">
            <input
              type="number"
              value={mqttPort}
              onChange={(e) => onChangePort(Number(e.target.value))}
              className="w-32 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
            />
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={tlsEnabled}
                onChange={(e) => onChangeTls(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Bật mã hóa TLS / SSL (Secure)</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Keepalive Timeout
          </label>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="number"
              min={10}
              max={300}
              value={keepAliveSeconds}
              onChange={(e) => onChangeKeepAlive(Number(e.target.value))}
              className="w-32 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500"
            />
            <span className="text-xs text-slate-500 font-medium">giây</span>
          </div>
        </div>
      </div>
    </div>
  );
}
