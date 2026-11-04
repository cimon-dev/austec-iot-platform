const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. DATA CHO FILE TEMPLATE CHUẨN (Austec_Device_Import_Template.xlsx)
const templateHeaders = [
  'Hardware ID (*)',
  'Tên Thiết Bị (*)',
  'Mã Model (*)',
  'Nhóm Sản Phẩm (*)',
  'Loại Phần Cứng (*)',
  'Hạn Bảo Hành (*)',
  'Chủ Sở Hữu',
  'Số Điện Thoại',
  'Địa Chỉ Lắp Đặt',
  'Số Lô Sản Xuất',
  'Địa Chỉ MAC',
  'Ngày Sản Xuất',
  'Ghi Chú'
];

const templateRows = [
  {
    'Hardware ID (*)': 'AT-DOOR-88239A20',
    'Tên Thiết Bị (*)': 'Cửa Cuốn Austec A900 Super',
    'Mã Model (*)': 'AUSTEC-A900',
    'Nhóm Sản Phẩm (*)': 'Cửa cuốn nhôm Đức',
    'Loại Phần Cứng (*)': 'DOOR',
    'Hạn Bảo Hành (*)': '24 tháng',
    'Chủ Sở Hữu': '',
    'Số Điện Thoại': '',
    'Địa Chỉ Lắp Đặt': 'Kho tổng Austec',
    'Số Lô Sản Xuất': 'LOT-2026-Q1',
    'Địa Chỉ MAC': 'FC:B4:67:88:23:9A',
    'Ngày Sản Xuất': '2026-11-01',
    'Ghi Chú': 'Lô xuất xưởng A1 tiêu chuẩn'
  },
  {
    'Hardware ID (*)': 'AT-LOCK-77124B21',
    'Tên Thiết Bị (*)': 'Khóa Vân Tay Masaru X1 Pro',
    'Mã Model (*)': 'MASARU-X1',
    'Nhóm Sản Phẩm (*)': 'Khóa Masaru chuẩn Nhật',
    'Loại Phần Cứng (*)': 'SMART_LOCK',
    'Hạn Bảo Hành (*)': '36 tháng',
    'Chủ Sở Hữu': '',
    'Số Điện Thoại': '',
    'Địa Chỉ Lắp Đặt': 'Kho tổng Austec',
    'Số Lô Sản Xuất': 'LOT-2026-Q1',
    'Địa Chỉ MAC': 'FC:B4:67:77:12:4B',
    'Ngày Sản Xuất': '2026-11-02',
    'Ghi Chú': 'Kèm 2 thẻ từ RFID'
  },
  {
    'Hardware ID (*)': 'AT-CAM-88910AI',
    'Tên Thiết Bị (*)': 'Camera AI Austec Vision 360',
    'Mã Model (*)': 'AUSTEC-CAM-360',
    'Nhóm Sản Phẩm (*)': 'CAMERA AN NINH AI AUSTEC',
    'Loại Phần Cứng (*)': 'CAM',
    'Hạn Bảo Hành (*)': '24 tháng',
    'Chủ Sở Hữu': '',
    'Số Điện Thoại': '',
    'Địa Chỉ Lắp Đặt': 'Kho tổng Austec',
    'Số Lô Sản Xuất': 'LOT-2026-Q1',
    'Địa Chỉ MAC': 'FC:B4:67:88:91:0A',
    'Ngày Sản Xuất': '2026-11-03',
    'Ghi Chú': 'Camera ngoài trời IP67 chống nước'
  },
  {
    'Hardware ID (*)': 'AT-UPS-99011C22',
    'Tên Thiết Bị (*)': 'Bộ Lưu Điện Sin Chuẩn 220V',
    'Mã Model (*)': 'UPS-220-SINE',
    'Nhóm Sản Phẩm (*)': 'Lưu điện AC 220V',
    'Loại Phần Cứng (*)': 'UPS',
    'Hạn Bảo Hành (*)': '24 tháng',
    'Chủ Sở Hữu': '',
    'Số Điện Thoại': '',
    'Địa Chỉ Lắp Đặt': 'Kho tổng Austec',
    'Số Lô Sản Xuất': 'LOT-2026-Q1',
    'Địa Chỉ MAC': 'FC:B4:67:99:01:1C',
    'Ngày Sản Xuất': '2026-11-03',
    'Ghi Chú': 'Ắc quy 12V-14Ah'
  },
  {
    'Hardware ID (*)': 'AT-TH-99101ENV',
    'Tên Thiết Bị (*)': 'Cảm Biến Nhiệt Ẩm Zigbee Pro',
    'Mã Model (*)': 'SENSOR-TH-ZIGBEE',
    'Nhóm Sản Phẩm (*)': 'CẢM BIẾN MÔI TRƯỜNG & NHIỆT ẨM',
    'Loại Phần Cứng (*)': 'SENSOR',
    'Hạn Bảo Hành (*)': '12 tháng',
    'Chủ Sở Hữu': '',
    'Số Điện Thoại': '',
    'Địa Chỉ Lắp Đặt': 'Kho tổng Austec',
    'Số Lô Sản Xuất': 'LOT-2026-Q1',
    'Địa Chỉ MAC': 'FC:B4:67:99:10:1E',
    'Ngày Sản Xuất': '2026-11-04',
    'Ghi Chú': 'Cảm biến nhiệt ẩm phòng máy'
  }
];

const guideRows = [
  { 'Tên Cột': 'Hardware ID (*)', 'Bắt Buộc?': 'BẮT BUỘC', 'Mô Tả & Quy Tắc': 'Mã định danh duy nhất của phần cứng (vd: AT-DOOR-88239A20). Không được để trống, không được trùng với thiết bị đã có.' },
  { 'Tên Cột': 'Tên Thiết Bị (*)', 'Bắt Buộc?': 'BẮT BUỘC', 'Mô Tả & Quy Tắc': 'Tên gọi hiển thị của thiết bị (vd: Cửa Cuốn Austec A900 Super). Không được để trống.' },
  { 'Tên Cột': 'Mã Model (*)', 'Bắt Buộc?': 'BẮT BUỘC', 'Mô Tả & Quy Tắc': 'Mã dòng sản phẩm (vd: AUSTEC-A900, MASARU-X1, DOOR2026). Không được để trống.' },
  { 'Tên Cột': 'Nhóm Sản Phẩm (*)', 'Bắt Buộc?': 'BẮT BUỘC', 'Mô Tả & Quy Tắc': 'Nhóm danh mục thiết bị (vd: Cửa cuốn nhôm Đức, Khóa Masaru, Camera AI). Không được để trống.' },
  { 'Tên Cột': 'Loại Phần Cứng (*)', 'Bắt Buộc?': 'BẮT BUỘC', 'Mô Tả & Quy Tắc': 'Mã loại phần cứng: DOOR, SMART_LOCK, CAM, UPS, SENSOR, SOCKET. Không được để trống.' },
  { 'Tên Cột': 'Hạn Bảo Hành (*)', 'Bắt Buộc?': 'BẮT BUỘC', 'Mô Tả & Quy Tắc': 'Hạn bảo hành hoặc số tháng bảo hành (vd: 24 tháng, 12/2028, 2028-12-31). Không được để trống.' },
  { 'Tên Cột': 'Chủ Sở Hữu', 'Bắt Buộc?': 'Tùy chọn', 'Mô Tả & Quy Tắc': 'Tên khách hàng/đại lý (nếu thiết bị mới trong kho xuất xưởng hãy để trống, hệ thống sẽ hiển thị "Chưa gán").' },
  { 'Tên Cột': 'Số Điện Thoại', 'Bắt Buộc?': 'Tùy chọn', 'Mô Tả & Quy Tắc': 'Số điện thoại liên hệ của khách hàng (để trống nếu chưa bàn giao).' },
  { 'Tên Cột': 'Địa Chỉ Lắp Đặt', 'Bắt Buộc?': 'Tùy chọn', 'Mô Tả & Quy Tắc': 'Địa chỉ lắp đặt thực tế (mặc định để trống hoặc ghi "Kho tổng Austec").' },
  { 'Tên Cột': 'Số Lô Sản Xuất', 'Bắt Buộc?': 'Tùy chọn', 'Mô Tả & Quy Tắc': 'Mã lô sản xuất KCS từ nhà máy (vd: LOT-2026-Q1) dùng để in tem QR Decal và truy vết.' },
  { 'Tên Cột': 'Địa Chỉ MAC', 'Bắt Buộc?': 'Tùy chọn', 'Mô Tả & Quy Tắc': 'Địa chỉ MAC vật lý của chip Wi-Fi/BLE ESP32 (vd: FC:B4:67:88:23:9A).' },
  { 'Tên Cột': 'Ngày Sản Xuất', 'Bắt Buộc?': 'Tùy chọn', 'Mô Tả & Quy Tắc': 'Ngày xuất xưởng (định dạng YYYY-MM-DD).' },
  { 'Tên Cột': 'Ghi Chú', 'Bắt Buộc?': 'Tùy chọn', 'Mô Tả & Quy Tắc': 'Ghi chú kỹ thuật hoặc phụ kiện đi kèm.' }
];

// Tạo Workbook Template
const wbTemplate = XLSX.utils.book_new();
const wsTemplate = XLSX.utils.json_to_sheet(templateRows, { header: templateHeaders });
wsTemplate['!cols'] = [
  { wch: 22 }, // Hardware ID
  { wch: 30 }, // Tên Thiết Bị
  { wch: 20 }, // Mã Model
  { wch: 28 }, // Nhóm Sản Phẩm
  { wch: 18 }, // Loại Phần Cứng
  { wch: 18 }, // Hạn Bảo Hành
  { wch: 20 }, // Chủ Sở Hữu
  { wch: 16 }, // Số Điện Thoại
  { wch: 25 }, // Địa Chỉ Lắp Đặt
  { wch: 16 }, // Số Lô Sản Xuất
  { wch: 20 }, // Địa Chỉ MAC
  { wch: 15 }, // Ngày Sản Xuất
  { wch: 32 }  // Ghi Chú
];
XLSX.utils.book_append_sheet(wbTemplate, wsTemplate, 'Danh_Sach_Thiet_Bi');

const wsGuide = XLSX.utils.json_to_sheet(guideRows);
wsGuide['!cols'] = [
  { wch: 24 },
  { wch: 14 },
  { wch: 80 }
];
XLSX.utils.book_append_sheet(wbTemplate, wsGuide, 'Huong_Dan');

const templatePath = path.join(publicDir, 'Austec_Device_Import_Template.xlsx');
XLSX.writeFile(wbTemplate, templatePath);
console.log('✅ Generated:', templatePath);

// 2. DATA CHO FILE TEST MẪU (Austec_Sample_Import_Test.xlsx)
const sampleTestRows = [
  {
    'Hardware ID (*)': 'AT-DOOR-TEST-001',
    'Tên Thiết Bị (*)': 'Cửa Cuốn Austec Master Pro 01',
    'Mã Model (*)': 'DOOR2026',
    'Nhóm Sản Phẩm (*)': 'Cửa cuốn tự động - Dữ liệu test',
    'Loại Phần Cứng (*)': 'DOOR_AUTOMATIC',
    'Hạn Bảo Hành (*)': '24 tháng',
    'Chủ Sở Hữu': '',
    'Số Điện Thoại': '',
    'Địa Chỉ Lắp Đặt': 'Kho tổng Austec',
    'Số Lô Sản Xuất': 'LOT-TEST-2026',
    'Địa Chỉ MAC': 'FC:B4:67:AA:01:01',
    'Ngày Sản Xuất': '2026-11-04',
    'Ghi Chú': 'Thiết bị test xuất xưởng 01'
  },
  {
    'Hardware ID (*)': 'AT-DOOR-TEST-002',
    'Tên Thiết Bị (*)': 'Cửa Cuốn Austec Master Pro 02',
    'Mã Model (*)': 'DOOR2026',
    'Nhóm Sản Phẩm (*)': 'Cửa cuốn tự động - Dữ liệu test',
    'Loại Phần Cứng (*)': 'DOOR_AUTOMATIC',
    'Hạn Bảo Hành (*)': '24 tháng',
    'Chủ Sở Hữu': '',
    'Số Điện Thoại': '',
    'Địa Chỉ Lắp Đặt': 'Kho tổng Austec',
    'Số Lô Sản Xuất': 'LOT-TEST-2026',
    'Địa Chỉ MAC': 'FC:B4:67:AA:01:02',
    'Ngày Sản Xuất': '2026-11-04',
    'Ghi Chú': 'Thiết bị test xuất xưởng 02'
  },
  {
    'Hardware ID (*)': 'AT-LOCK-TEST-003',
    'Tên Thiết Bị (*)': 'Khóa Masaru Smart Lock 03',
    'Mã Model (*)': 'MASARU-X1',
    'Nhóm Sản Phẩm (*)': 'Khóa Masaru chuẩn Nhật',
    'Loại Phần Cứng (*)': 'SMART_LOCK',
    'Hạn Bảo Hành (*)': '36 tháng',
    'Chủ Sở Hữu': 'Nguyễn Văn Minh',
    'Số Điện Thoại': '0912345678',
    'Địa Chỉ Lắp Đặt': 'Số 15 Lê Văn Lương, Cầu Giấy, Hà Nội',
    'Số Lô Sản Xuất': 'LOT-TEST-2026',
    'Địa Chỉ MAC': 'FC:B4:67:AA:01:03',
    'Ngày Sản Xuất': '2026-11-04',
    'Ghi Chú': 'Đã gán cho khách hàng Minh'
  },
  {
    'Hardware ID (*)': 'AT-CAM-TEST-004',
    'Tên Thiết Bị (*)': 'Camera AI Austec Vision 04',
    'Mã Model (*)': 'AUSTEC-CAM-360',
    'Nhóm Sản Phẩm (*)': 'CAMERA AN NINH AI AUSTEC',
    'Loại Phần Cứng (*)': 'CAM',
    'Hạn Bảo Hành (*)': '24 tháng',
    'Chủ Sở Hữu': '',
    'Số Điện Thoại': '',
    'Địa Chỉ Lắp Đặt': 'Kho tổng Austec',
    'Số Lô Sản Xuất': 'LOT-TEST-2026',
    'Địa Chỉ MAC': 'FC:B4:67:AA:01:04',
    'Ngày Sản Xuất': '2026-11-04',
    'Ghi Chú': 'Thiết bị test xuất xưởng 04'
  }
];

const wbSample = XLSX.utils.book_new();
const wsSample = XLSX.utils.json_to_sheet(sampleTestRows, { header: templateHeaders });
wsSample['!cols'] = wsTemplate['!cols'];
XLSX.utils.book_append_sheet(wbSample, wsSample, 'Import_Test_Data');

const samplePath = path.join(publicDir, 'Austec_Sample_Import_Test.xlsx');
XLSX.writeFile(wbSample, samplePath);
console.log('✅ Generated:', samplePath);
