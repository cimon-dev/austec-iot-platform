export type CommandType =
  | "OPEN"
  | "CLOSE"
  | "STOP"
  | "TURN_ON"
  | "TURN_OFF"
  | "CHILD_LOCK"
  | "TOGGLE_CHILD_LOCK"
  | "RF_SETUP"
  | "RF_CLEAR"
  | "STREAM_START"
  | "STREAM_STOP"
  | string;

export interface BlackboxLogEntry {
  id: string | number;
  hardwareId: string;
  modelName: string;
  category?: "ROLLER_DOOR" | "SOCKET" | "CAMERA" | string;
  commandType: CommandType;
  actionType?: string;
  actionCode?: string;
  payload: Record<string, any>;
  payloadSent?: Record<string, any>;
  userId?: string;
  actorId?: string;
  userEmail?: string;
  actorEmail?: string;
  userRole?: "CUSTOMER" | "ADMIN" | "CSKH" | string;
  actorRole?: "CUSTOMER" | "ADMIN" | "CSKH" | string;
  clientIp: string;
  deviceFingerprint?: string;
  timestamp: string;
  createdAt?: string;
  ackTimestamp?: string;
  latencyMs: number;
  status: "ACKNOWLEDGED" | "TIMEOUT" | "REJECTED" | "EXECUTING" | string;
  ackStatus?: string;
  cryptoSignature: string;
}

export interface BlackboxFilterParams {
  hardwareId?: string;
  actionType?: string;
  ackStatus?: string;
  role?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Định dạng ngày giờ chuẩn hiển thị thông dụng tại Việt Nam (ví dụ: 10:15 14/11/2026)
 */
export function formatDateTimeVN(dateStr?: string | null): string {
  if (!dateStr) return "--:-- --/--/----";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${hours}:${minutes} ${day}/${month}/${year}`;
  } catch {
    return String(dateStr);
  }
}

/**
 * Ánh xạ tên lệnh & mã phần cứng hiển thị trực quan cho người dùng / quản trị viên
 */
export function getCommandDisplayInfo(log: BlackboxLogEntry): {
  label: string;
  code: string;
  codeText: string;
  badgeClass: string;
} {
  const cmd = String(log.payload?.command || log.commandType || log.actionType || "").toUpperCase();
  const rawCode = String(log.payload?.actionCode || log.actionCode || "");

  if (cmd === "OPEN" || cmd === "1" || cmd === "OPEN_DOOR") {
    return {
      label: "MỞ CỬA",
      code: "Mã 1",
      codeText: "Mã 1",
      badgeClass: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800",
    };
  }
  if (cmd === "CLOSE" || cmd === "2" || cmd === "CLOSE_DOOR") {
    return {
      label: "ĐÓNG CỬA",
      code: "Mã 2",
      codeText: "Mã 2",
      badgeClass: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-800",
    };
  }
  if (cmd === "STOP" || cmd === "3" || cmd === "STOP_DOOR") {
    return {
      label: "DỪNG LẠI",
      code: "Mã 3",
      codeText: "Mã 3",
      badgeClass: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800",
    };
  }
  if (cmd === "TURN_ON" || cmd === "ON" || cmd === "13" || cmd === "BAT") {
    return {
      label: "BẬT NGUỒN",
      code: "Mã 13",
      codeText: "Mã 13",
      badgeClass: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800",
    };
  }
  if (cmd === "TURN_OFF" || cmd === "OFF" || cmd === "14" || cmd === "TAT") {
    return {
      label: "NGẮT NGUỒN",
      code: "Mã 14",
      codeText: "Mã 14",
      badgeClass: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800",
    };
  }
  if (cmd === "TOGGLE_CHILD_LOCK" || cmd === "CHILD_LOCK") {
    return {
      label: "KHÓA TRẺ EM",
      code: "Khóa",
      codeText: "Khóa",
      badgeClass: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-800",
    };
  }
  if (cmd === "RF_SETUP" || cmd === "RF_PAIR_NEW" || cmd === "11") {
    return {
      label: "HỌC REMOTE",
      code: "Mã 11",
      codeText: "Mã 11",
      badgeClass: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800",
    };
  }
  if (cmd === "RF_CLEAR" || cmd === "RF_CLEAR_ALL" || cmd === "12") {
    return {
      label: "XÓA REMOTE",
      code: "Mã 12",
      codeText: "Mã 12",
      badgeClass: "bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-800",
    };
  }
  if (cmd === "STREAM_START" || cmd === "TAKE_SNAPSHOT") {
    return {
      label: "XEM CAMERA",
      code: "Mã 13",
      codeText: "Mã 13",
      badgeClass: "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-800",
    };
  }
  if (cmd === "STREAM_STOP") {
    return {
      label: "TẮT CAMERA",
      code: "Mã 14",
      codeText: "Mã 14",
      badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700",
    };
  }

  const fallbackCode = rawCode ? `Mã ${rawCode}` : "Mã --";
  return {
    label: cmd || "LỆNH",
    code: fallbackCode,
    codeText: fallbackCode,
    badgeClass: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700",
  };
}
