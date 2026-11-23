# Tài Liệu Đối Chiếu Thay Đổi Firmware (Bản Gốc vs Bản Cập Nhật 2-Way ACK & Mã 295)

- **Nhánh Git triển khai**: `feat/strict-2way-ack-295`
- **Thư mục Firmware gốc (giữ nguyên 100%)**: `austec-iot-platform/firmware-original/`
- **Thư mục Firmware đã cập nhật**: `austec-iot-platform/firmware-updated/`

---

## 1. Mục Tiêu Nâng Cấp

Chuẩn hóa toàn bộ cơ chế **truyền nhận xác thực 2 chiều (Strict 2-Way ACK)** giữa Backend và 5 dòng thiết bị phần cứng Austec:
1. **Mã `295` (Kiểm tra Online / Offline chuẩn toàn hệ thống)**: Khi Backend gửi mã `295`, thiết bị bắt buộc trả về đúng mã `295`. Nếu không trả đúng `295` trong thời gian chờ, Backend đánh dấu thiết bị `OFFLINE`.
2. **Xác nhận đúng mã lệnh điều khiển**: Khi Backend gửi lệnh xuống thiết bị (trừ lệnh stream `13`/`14` của Camera được giữ cơ chế không chặn cứng để tránh trễ), thiết bị phải thực thi và phản hồi **đúng mã lệnh tương ứng**. Nếu không có phản hồi hoặc sai mã:
   - Backend **không** cập nhật trạng thái trong PostgreSQL / HotCache, **không** phát WebSocket giả, ghi `TIMEOUT` vào `blackbox_logs` và trả lỗi HTTP `504`.
   - Mobile App **không** đổi trạng thái giao diện ảo và hiển thị thông báo lỗi rõ ràng.

---

## 2. Bảng Tổng Hợp Thay Đổi Giữa `firmware-original` và `firmware-updated`

| Thiết bị | File đã sửa trong `firmware-updated/` | Trước khi sửa (`firmware-original/`) | Sau khi sửa (`firmware-updated/`) | Topic phản hồi về Backend |
| :--- | :--- | :--- | :--- | :--- |
| **1. Cửa cuốn** | `CuaCuon/mqtt.h` | • `sub/action`: chỉ có `case 1, 2, 3, 11, 12`, nhận `295` bị bỏ qua.<br>• `sub/isonline`: nhận bất kỳ gì cũng chỉ trả `"1"`. | • Thêm `case 295` trong `sub/action` → publish `"295"` lên `pub/isonline`.<br>• Trong `sub/isonline`: nếu payload là `"295"` → trả `"295"`, ngược lại giữ `"1"` (tương thích ngược). | `{user}/{hwId}/pub/action` (`1,2,3,11,12`)<br>`{user}/{hwId}/pub/isonline` (`295`) |
| **2. Ổ cắm (`OCAM`)** | `OCAM/mqtt.h` | • `sub/action`: chỉ có `case 13, 14, 3, 11, 12`, nhận `295` bị bỏ qua.<br>• `sub/isonline`: chỉ trả `"1"`. | • Thêm `case 295` trong `sub/action` → publish `"295"` lên `pub/isonline`.<br>• Trong `sub/isonline`: nếu payload là `"295"` → trả `"295"`, ngược lại giữ `"1"`. | `{user}/{hwId}/pub/action` (`13,14,3,11,12`)<br>`{user}/{hwId}/pub/isonline` (`295`) |
| **3. Công tơ điện tử** | `SmartMetter/smartmetter_copy.ino` | • Không có topic ACK riêng.<br>• `mqttCallback()` **không gửi bất kỳ mã phản hồi nào** khi nhận `13`, `14`, `0`, `20`, `{"power_limit":...}`.<br>• Không xử lý mã `295`. | • Thêm biến `topic_ack = "austec/" + deviceName + "/ack"`.<br>• Nhận `"295"` → publish `"295"` lên `topic_ack`.<br>• Nhận `"13"` (đóng rơ-le) → publish `"13"` (hoặc `"ERR_LEAKAGE"` nếu đang khóa rò điện).<br>• Nhận `"14"` (ngắt rơ-le) → publish `"14"`.<br>• Nhận `"0"` (RESET) → publish `"0"`.<br>• Nhận `"20"` (Chốt ngày) → publish `"20"`.<br>• Nhận JSON `{"power_limit": W}` → publish `"CONFIG_POWER_LIMIT"`.<br>• Nhận JSON `{"relay": true/false}` → publish `"13"` / `"14"`. | `austec/{hwId}/ack` (`295`, `13`, `14`, `0`, `20`, `CONFIG_POWER_LIMIT`, `ERR_LEAKAGE`) |
| **4. Pin lưu trữ BMS** | `BMS/BMSV01.ino` | • Không có topic ACK riêng.<br>• `applyRemoteSettingsCommand()` **không gửi mã phản hồi nào** khi nhận `SET_LFP`, `SET_LIION`, `SET_LTO`, `CFG:...`, `CLEAR_LOG`.<br>• Không xử lý mã `295`. | • Thêm biến `mqttTopicAck = "austec/" + deviceMacId + "/ack"`.<br>• Nhận `"295"` → publish `"295"` lên `mqttTopicAck`.<br>• Nhận `"CLEAR_LOG"` → xóa log và publish `"CLEAR_LOG"`.<br>• Nhận `"SET_LFP"` / `"SET_LIION"` / `"SET_LTO"` / `"CFG:..."` → lưu Flash, nạp BQ76952 và echo lại chính xác chuỗi `cmdStr` lên `mqttTopicAck`. | `austec/{hwId}/ack` (`295`, `SET_LFP`, `SET_LIION`, `SET_LTO`, `CLEAR_LOG`, `CFG:...`) |
| **5. Camera AI (ESP32-CAM RTSP)** | `Camera_ESP32CAM_RTSP/CodeCamera_ESP32CAM_RTSP.ino` | • Không xử lý mã `295` (in cảnh báo không hỗ trợ).<br>• Không gửi MQTT ACK cho lệnh `13` / `14`. | • Thêm `mqtt_topic_status = "devices/" + device_name + "/status"` và `mqtt_topic_ack = "devices/" + device_name + "/camera/ack"`.<br>• Nhận `"295"` → publish `"295"` lên `devices/{hwId}/status`.<br>• Nhận `"13"` / `"14"` → publish `"13"` / `"14"` lên `devices/{hwId}/camera/ack` (tối ưu sẵn cho đồng bộ toàn hệ thống). | `devices/{hwId}/status` (`295`)<br>`devices/{hwId}/camera/ack` (`13`, `14`) |

---

## 3. Chi Tiết Những Gì Đã Sửa Trên Backend & Mobile App (Trong Nhánh `feat/strict-2way-ack-295`)

### Backend
1. **`backend/src/services/mqtt.gateway.ts`**:
   - Sửa `resolvePendingAck()` thành **so khớp tuyệt đối** với `expectedActions` (chỉ giải phóng hàng đợi chờ khi payload khớp đúng mã kỳ vọng hoặc khớp trường JSON `ack`/`code`/`action`/`probe`; không còn bị gói `telemetry` hay `"1"` giải phóng nhầm).
   - Bổ sung lắng nghe topic ACK chuẩn: `austec/{hwId}/ack`, `austec/{hwId}/status`, `devices/{hwId}/camera/ack`, và xử lý `austec/{hwId}/daily_report` (mã `20`).
   - Bỏ gọi `resolvePendingAck` từ các gói `telemetry` định kỳ của Công tơ & BMS.
   - Đăng ký `waitForActionAck(hwId, ['295'], ...)` **trước** khi publish gói thăm dò `295` trong `runHeartbeatScan()` và `isHardwareOnline()` để tránh race condition.
   - Bỏ gửi lặp 3 payload liên tiếp cho Công tơ trong `publishAction()` (chỉ gửi đúng 1 mã chuẩn `13` / `14` / `0`).

2. **`backend/src/services/command.service.ts`**:
   - Tách rõ nhánh `isBms`, bổ sung ánh xạ `RF_PAIR_NEW -> 11` và `RF_CLEAR_ALL -> 12` cho Cửa cuốn.
   - Đăng ký `waitForActionAck` trước khi `publishAction`.
   - Nâng timeout riêng cho lệnh học/xóa tay cầm RF (`11`, `12`) lên `10000ms` (khớp `delay(7000)` của mạch).
   - Giữ Strict ACK `295` cho cả Camera, nhưng không chặn cứng MQTT ACK cho lệnh stream `13`/`14` của Camera để mở/tắt luồng tức thì.

3. **`backend/src/modules/devices/device-operations.controller.ts`**:
   - Trong `controlDevice()`: kiểm tra `if (!result || !result.success)` → ghi `blackbox_logs` với trạng thái `TIMEOUT`, **không** cập nhật `device_instances`, **không** bắn WebSocket `DEVICE_STATE_CHANGE`, trả HTTP `504` kèm thông báo lỗi rõ ràng.
   - Trong `onCameraUnpublish()`: chỉ cập nhật `is_streaming = false`, không đánh dấu `is_online = false` (để mã `295` quyết định Online/Offline chuẩn).

### Mobile App
1. **`mobile-app/lib/core/services/iot_gateway_client.dart`**:
   - Kiểm tra đồng thời cả `data['success'] == true` và `data['result']['success'] != false`.
   - Tăng HTTP timeout lên `12s` cho lệnh học/xóa tay cầm RF (`11`, `12`).
2. **`mobile-app/lib/features/devices/screens/device_detail_screen.dart`**:
   - Bỏ đổi trạng thái UI trước (Optimistic UI) cho Ổ cắm & Khóa trẻ em; chỉ cập nhật UI khi `res.success == true`, nếu lỗi hiện SnackBar đỏ báo không điều khiển được.
3. **`mobile-app/lib/features/devices/screens/smartmetter_detail_screen.dart`**:
   - Đổi `_handleReset()`, `_turnOnMeter()`, `_turnOffMeter()`, `_handleTogglePowerSetting()` sang `async/await`; chỉ đổi trạng thái màn hình LCD khi nhận được ACK thành công từ BE, nếu lỗi giữ nguyên trạng thái và hiện `AppToast.showError(...)`.
4. **`mobile-app/lib/features/devices/screens/bms_landscape_screen.dart`**:
   - Sửa nhánh thất bại của nút "Lưu Cài Đặt BMS" hiển thị `AppToast.showError(...)` thay vì báo *"thành công!"*.

---

## 4. Hướng Dẫn Sử Dụng Khi Kiểm Thử & Nạp Firmware

- **Trước khi nạp firmware mới**: Backend ở nhánh `feat/strict-2way-ack-295` sẽ hoạt động ngay với lệnh `1/2/3/11/12` (Cửa cuốn), `13/14/3/11/12` (Ổ cắm), `13/14` (Camera). Các lệnh Công tơ/BMS và ping `295` sẽ báo lỗi/Offline đúng như cơ chế Strict ACK cho đến khi bạn nạp file từ `firmware-updated/`.
- **So sánh nhanh diff giữa bản gốc và bản mới** bằng lệnh:
  ```powershell
  git diff --no-index firmware-original firmware-updated
  ```

