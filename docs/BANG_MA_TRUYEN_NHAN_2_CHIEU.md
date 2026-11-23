# Bảng Tổng Hợp Truyền Nhận Mã 2 Chiều (BE ↔ Firmware)

> Phạm vi tài liệu: Chỉ liệt kê các **mã số** giao tiếp 2 chiều giữa Backend và Firmware (loại bỏ các lệnh dạng chữ/JSON). Giữ nguyên 100% chiều gửi xuống đã chạy ổn định, chỉ sửa và bổ sung cơ chế **xác thực đúng mã ở chiều trả về**.

---

## 1. Bảng Toàn Bộ Mã Số Truyền Nhận 2 Chiều (BE ↔ Firmware)

| Thiết bị | Chức năng | Mã BE gửi xuống | Topic gửi xuống (Giữ nguyên) | Mã Firmware trả về (Bản mới) | Topic trả về | Chế độ kiểm tra ở BE mới |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| **Cửa cuốn** | Mở cửa | `1` | `{user}/{hwId}/sub/action` | `1` | `{user}/{hwId}/pub/action` | Bắt buộc đúng `1` (3.5s) |
| **Cửa cuốn** | Đóng cửa | `2` | `{user}/{hwId}/sub/action` | `2` | `{user}/{hwId}/pub/action` | Bắt buộc đúng `2` (3.5s) |
| **Cửa cuốn** | Dừng cửa | `3` | `{user}/{hwId}/sub/action` | `3` | `{user}/{hwId}/pub/action` | Bắt buộc đúng `3` (3.5s) |
| **Cửa cuốn** | Học lệnh RF | `11` | `{user}/{hwId}/sub/action` | `11` | `{user}/{hwId}/pub/action` | Bắt buộc đúng `11` (10s) |
| **Cửa cuốn** | Xóa hết RF | `12` | `{user}/{hwId}/sub/action` | `12` | `{user}/{hwId}/pub/action` | Bắt buộc đúng `12` (10s) |
| **Cửa cuốn** | Kiểm tra Online/Offline | `295` | `{user}/{hwId}/sub/isonline` *(hoặc `sub/action`)* | `295` | `{user}/{hwId}/pub/isonline` | Bắt buộc đúng `295` (2.5s) |
| **Ổ cắm (`OCAM`)** | Bật nguồn | `13` | `{user}/{hwId}/sub/action` | `13` | `{user}/{hwId}/pub/action` | Bắt buộc đúng `13` (3.5s) |
| **Ổ cắm (`OCAM`)** | Tắt nguồn | `14` | `{user}/{hwId}/sub/action` | `14` | `{user}/{hwId}/pub/action` | Bắt buộc đúng `14` (3.5s) |
| **Ổ cắm (`OCAM`)** | Dừng rơ-le | `3` | `{user}/{hwId}/sub/action` | `3` | `{user}/{hwId}/pub/action` | Bắt buộc đúng `3` (3.5s) |
| **Ổ cắm (`OCAM`)** | Học lệnh RF | `11` | `{user}/{hwId}/sub/action` | `11` | `{user}/{hwId}/pub/action` | Bắt buộc đúng `11` (10s) |
| **Ổ cắm (`OCAM`)** | Xóa hết RF | `12` | `{user}/{hwId}/sub/action` | `12` | `{user}/{hwId}/pub/action` | Bắt buộc đúng `12` (10s) |
| **Ổ cắm (`OCAM`)** | Kiểm tra Online/Offline | `295` | `{user}/{hwId}/sub/isonline` *(hoặc `sub/action`)* | `295` | `{user}/{hwId}/pub/isonline` | Bắt buộc đúng `295` (2.5s) |
| **Công tơ điện tử** | Bật nguồn (Đóng rơ-le) | `13` | `austec/{hwId}/command` | `13` | `austec/{hwId}/ack` | Bắt buộc đúng `13` (3.5s) |
| **Công tơ điện tử** | Ngắt nguồn (Ngắt rơ-le) | `14` | `austec/{hwId}/command` | `14` | `austec/{hwId}/ack` | Bắt buộc đúng `14` (3.5s) |
| **Công tơ điện tử** | Reset lỗi & đóng lại nguồn | `0` | `austec/{hwId}/command` | `0` | `austec/{hwId}/ack` | Bắt buộc đúng `0` (3.5s) |
| **Công tơ điện tử** | Chốt số kWh cuối ngày | `20` | `austec/{hwId}/command` | `20` | `austec/{hwId}/ack` *(và `daily_report`)* | Bắt buộc đúng `20` (3.5s) |
| **Công tơ điện tử** | Kiểm tra Online/Offline | `295` | `austec/{hwId}/command` | `295` | `austec/{hwId}/ack` | Bắt buộc đúng `295` (2.5s) |
| **Pin BMS** | Kiểm tra Online/Offline | `295` | `austec/{hwId}/command` | `295` | `austec/{hwId}/ack` | Bắt buộc đúng `295` (2.5s) |
| **Camera AI** | Bật / Dừng luồng Video | `13` / `14` | `devices/{hwId}/camera/cmd` | `13` / `14` | `devices/{hwId}/camera/ack` | Không chặn cứng (xác thực qua WebRTC/MediaMTX) |
| **Camera AI** | Kiểm tra Online/Offline | `295` | `devices/{hwId}/camera/cmd` | `295` | `devices/{hwId}/status` | Bắt buộc đúng `295` (2.5s) |

---

## 2. Hệ Thống Trước Đây Hoạt Động Như Thế Nào & Vì Sao Chưa Xác Thực Chiều Về?

| Thành phần | Cách hệ thống cũ hoạt động (vì sao vẫn điều khiển được khi thiết bị Online) | Lỗ hổng khiến chiều trả về (ACK) chưa được xác thực |
| :--- | :--- | :--- |
| **Chiều gửi xuống (BE → Mạch)** | Khi thiết bị đang Online, BE publish đúng mã (`1/2/3`, `13/14`, `0`, `20`) xuống topic MQTT, mạch nhận được và kích rơ-le/thực thi bình thường. | Hoạt động 1 chiều: nếu thiết bị mất mạng, rớt điện hoặc sai mã, BE không phân biệt được thật/giả. |
| **BE — `mqtt.gateway.ts`** | Có hàm `waitForActionAck(hwId, [mã])` nhưng `resolvePendingAck()` không kiểm tra `expectedActions`. | Bất kỳ gói tin nào từ `hwId` bay lên (như telemetry 1s/lần của Công tơ/BMS hoặc `"1"` của `pub/isonline`) đều giải phóng ACK thành `success: true`, đồng thời làm hỏng luôn vòng check `295`. |
| **BE — `device-operations.controller.ts`** | Gọi `dispatchCommand()` xong chạy thẳng xuống cập nhật DB, ghi log và trả API. | **Không kiểm tra `if (!result.success)`**: kể cả khi thiết bị Timeout, BE vẫn `UPDATE` trạng thái DB, ghi `ACK_OK`, bắn WebSocket và trả HTTP `200 { success: true }`. |
| **Firmware — Cửa cuốn & Ổ cắm** | Đã có sẵn echo đúng mã `1/2/3/11/12` và `13/14/3/11/12` lên `pub/action`. | Chưa nhận mã `295` (`sub/isonline` chỉ trả `"1"`, `sub/action` bỏ qua `295`). Lệnh `11`/`12` delay ~7s vượt timeout `3.5s` của BE. |
| **Firmware — Công tơ, BMS, Camera** | Thực thi lệnh xuống bình thường (đóng/ngắt rơ-le, bật/tắt RTSP). | **Chưa gửi bất kỳ mã ACK nào trả về** sau khi thực thi lệnh và chưa xử lý mã `295`. |

---

## 3. Chính Xác Những Điểm Đã Sửa (Chỉ Sửa Chiều Xác Thực — Không Đụng Phần Đang Chạy Ổn Định)

| Vị trí sửa | Thay đổi chính xác đã thực hiện | Kết quả giải quyết |
| :--- | :--- | :--- |
| **BE: `mqtt.gateway.ts`** | • Sửa `resolvePendingAck()` chỉ giải phóng khi payload trả về **khớp chính xác** mã trong `expectedActions`.<br>• Đăng ký `waitForActionAck` **trước** khi publish `295`.<br>• Thêm lắng nghe topic `austec/{hwId}/ack` và `devices/{hwId}/camera/ack`.<br>• Ngắt gọi `resolvePendingAck` trong luồng `telemetry` định kỳ. | Không còn nhận nhầm gói `telemetry` hay `"1"` làm ACK. Mã `295` và từng mã lệnh chỉ pass khi mạch trả về đúng mã đó. |
| **BE: `command.service.ts`** | • Đăng ký chờ ACK trước khi publish lệnh.<br>• Nâng timeout riêng cho mã `11`/`12` lên `10s`.<br>• Giữ Strict `295` cho Camera, không chặn cứng `13`/`14` của Camera. | Không bị race condition, không timeout oan lệnh học/xóa RF `11`/`12`, không làm lag 3.5s khi mở Camera. |
| **BE: `device-operations.controller.ts`** | • Thêm chặn `if (!result.success)` → không sửa DB, không bắn WebSocket, ghi `TIMEOUT`, trả HTTP `504 { success: false }`.<br>• Sửa `onCameraUnpublish` chỉ đặt `is_streaming = false` (không set `is_online = false`). | Khi mạch không trả đúng mã: trạng thái DB/App giữ nguyên và báo lỗi không điều khiển được thiết bị. Camera dừng stream không bị báo Offline nhầm. |
| **FW: `CuaCuon/mqtt.h` & `OCAM/mqtt.h`** | • Thêm `case 295` ở `sub/action` và nhánh `if (messageTemp == "295")` ở `sub/isonline` → trả `"295"` lên `pub/isonline`. | Giữ nguyên 100% logic điều khiển `1/2/3/11/12`, `13/14/3/11/12` và tương thích ngược `"1"`, bổ sung chuẩn `295`. |
| **FW: `SmartMetter/smartmetter_copy.ino`** | • Thêm `topic_ack = "austec/" + deviceName + "/ack"`.<br>• Trả đúng `"295"`, `"13"`, `"14"`, `"0"`, `"20"` lên `topic_ack` ngay sau khi thực thi trong `mqttCallback()`. | BE xác nhận được chính xác rơ-le công tơ đã thực sự đóng/ngắt/reset/chốt ngày và đang Online. |
| **FW: `BMS/BMSV01.ino`** | • Thêm `mqttTopicAck = "austec/" + deviceMacId + "/ack"`.<br>• Thêm nhánh `if (cmdStr == "295")` → trả `"295"` lên `mqttTopicAck`. | BE xác nhận được chuẩn trạng thái Online/Offline của BMS qua mã `295`. |
| **FW: `Camera_ESP32CAM_RTSP.ino`** | • Thêm nhánh `if (message == "295")` → trả `"295"` lên `devices/{hwId}/status`.<br>• Echo `"13"`/`"14"` lên `devices/{hwId}/camera/ack`. | BE phân biệt chính xác Camera đang Online (Idle) với Camera mất nguồn/mất mạng. |

---

## 4. Những Thành Phần Giữ Nguyên (Không Thay Đổi Vì Đã Chạy Ổn Định)

| Thành phần giữ nguyên | Chi tiết |
| :--- | :--- |
| **Chiều gửi lệnh 1 chiều (Downlink)** | Giữ nguyên toàn bộ topic gửi xuống (`sub/action`, `austec/{hwId}/command`, `devices/{hwId}/camera/cmd`) và bảng mã điều khiển cũ (`1/2/3/11/12`, `13/14/0/20`). |
| **Logic điều khiển phần cứng trong Firmware** | Giữ nguyên hoàn toàn chân GPIO, rơ-le (`moCua`, `dongCua`, `dung`, `BAT`, `TAT`, `esp_CloseRelay`, `esp_OpenRelay`), đo BL0942, đọc BQ76952, màn hình OLED/Winstar. |
| **Luồng dữ liệu ổn định khác** | Giữ nguyên luồng ghép nối BLE/SoftAP, đẩy telemetry 1s/lần của Công tơ & BMS, đẩy video RTSP/WebRTC qua MediaMTX của Camera. |
| **Thư mục Firmware gốc** | Toàn bộ mã gốc được lưu nguyên vẹn tại `austec-iot-platform/firmware-original/` để đối chiếu hoặc khôi phục bất cứ lúc nào. |

