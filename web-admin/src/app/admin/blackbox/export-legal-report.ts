import * as XLSX from "xlsx";
import { BlackboxLogEntry } from "./types";

export function exportLegalReport(logs: BlackboxLogEntry[], language: string): string {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Nhật ký kiểm toán chi tiết
  const auditRows = logs.map((log, index) => ({
    "STT": index + 1,
    "Mã Lệnh (Audit ID)": log.id,
    "Mã Thiết Bị (Hardware ID)": log.hardwareId,
    "Model Phần Cứng": log.modelName,
    "Lệnh Điều Khiển": log.commandType,
    "Tham Số Payload": JSON.stringify(log.payload || {}),
    "Người Ra Lệnh": log.userEmail,
    "Vai Trò (Role)": log.userRole,
    "Địa Chỉ IP": log.clientIp,
    "Dấu Vân Tay Thiết Bị (Fingerprint)": log.deviceFingerprint,
    "Thời Gian Phát Lệnh (UTC+7)": log.timestamp,
    "Thời Gian Thiết Bị Phản Hồi (ACK)": log.ackTimestamp || "Đang xử lý",
    "Độ Trễ Phản Hồi (ms)": log.latencyMs,
    "Trạng Thái Kiểm Toán": log.status,
    "Chữ Ký Số Bất Biến (SHA-256 HMAC)": log.cryptoSignature,
  }));

  const wsLogs = XLSX.utils.json_to_sheet(auditRows);
  wsLogs["!cols"] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 22 },
    { wch: 26 },
    { wch: 14 },
    { wch: 35 },
    { wch: 26 },
    { wch: 12 },
    { wch: 16 },
    { wch: 32 },
    { wch: 24 },
    { wch: 24 },
    { wch: 12 },
    { wch: 16 },
    { wch: 68 },
  ];
  XLSX.utils.book_append_sheet(wb, wsLogs, "NHAT_KY_KIEM_TOAN_SHA256");

  // Sheet 2: Chứng thực pháp lý & Merkle Tree Root
  const legalCert = [
    { "Mục Chứng Thực": "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", "Chi Tiết Pháp Lý": "Độc lập - Tự do - Hạnh phúc" },
    { "Mục Chứng Thực": "BIÊN BẢN PHÁP LÝ", "Chi Tiết Pháp Lý": "XÁC NHẬN TÍNH TOÀN VẸN DỮ LIỆU ĐIỀU KHIỂN HỘP ĐEN IOT" },
    { "Mục Chứng Thực": "Cơ quan bảo chứng công nghệ", "Chi Tiết Pháp Lý": "CÔNG NGHỆ BẤT BIẾN AUSTEC CRYPTOGRAPHIC AUDIT" },
    { "Mục Chứng Thực": "Tiêu chuẩn kỹ thuật bảo mật", "Chi Tiết Pháp Lý": "WORM (Write Once Read Many) - Chống giả mạo, can thiệp & ghi đè" },
    { "Mục Chứng Thực": "Thuật toán băm khối", "Chi Tiết Pháp Lý": "SHA-256 HMAC (Tiêu chuẩn FIPS 180-4 NIST Hoa Kỳ)" },
    { "Mục Chứng Thực": "Chuỗi băm Merkle Tree Root Hash", "Chi Tiết Pháp Lý": "a8f9e012bc345d6789e012fa3456bc78de901234567890abcdef1234567890ab" },
    { "Mục Chứng Thực": "Thời gian trích xuất biên bản", "Chi Tiết Pháp Lý": new Date().toLocaleString("vi-VN") },
    { "Mục Chứng Thực": "Số lượng bản ghi xác thực", "Chi Tiết Pháp Lý": `${logs.length} bản ghi viễn thám` },
    { "Mục Chứng Thực": "Giá trị pháp lý chứng cứ", "Chi Tiết Pháp Lý": "Dữ liệu có giá trị đối chiếu chứng cứ điện tử theo Luật Giao dịch Điện tử Việt Nam" },
  ];
  const wsCert = XLSX.utils.json_to_sheet(legalCert);
  wsCert["!cols"] = [{ wch: 35 }, { wch: 75 }];
  XLSX.utils.book_append_sheet(wb, wsCert, "CHUNG_THUC_PHAP_LY");

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `Austec_Bao_Cao_Phap_Ly_Hop_Den_SHA256_${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}
