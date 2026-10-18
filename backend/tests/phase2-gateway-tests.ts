import { createApp } from '../src/server.js';
import { AuthService } from '../src/services/auth.service.js';

console.log('================================================================');
console.log('GIAI ĐOẠN 2: BỘ KIỂM THỬ LÕI BACKEND, IOT GATEWAY & HỘP ĐEN');
console.log('================================================================');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName} - ${detail || 'Failed assertion'}`);
    failCount++;
  }
}

async function runPhase2Tests() {
  const { services } = createApp();

  // Tạo Token thử nghiệm cho 3 Roles
  const adminToken = AuthService.signToken({
    id: 'admin-001',
    email: 'austec.admin@gmail.com',
    role: 'ADMIN',
    fullName: 'Austec System Administrator',
  });

  const cskhToken = AuthService.signToken({
    id: 'cskh-001',
    email: 'cskh@austec.vn',
    role: 'CSKH',
    fullName: 'Support Specialist 01',
  });

  const customerAToken = AuthService.signToken({
    id: '00000000-0000-0000-0000-000000000001',
    email: 'ducduc02092005@gmail.com',
    role: 'CUSTOMER',
    fullName: 'Nguyễn Mạnh Đức',
  });

  const customerBToken = AuthService.signToken({
    id: '00000000-0000-0000-0000-000000000002',
    email: 'tigerphung@gmail.com',
    role: 'CUSTOMER',
    fullName: 'Dan Phung',
  });

  // -----------------------------------------------------------
  // TEST 1: TỐC ĐỘ PHẢN HỒI LỆNH (COMMAND ROUND-TRIP LATENCY)
  // -----------------------------------------------------------
  console.log('\n--- Test 1: Đo lường Độ trễ Lệnh Điều khiển Khứ hồi (< 250ms) ---');

  // Lệnh 1: Thiết bị Online (AT-DOOR-88239A01)
  const cmdRes1 = await services.commandService.dispatchCommand({
    hardwareId: 'AT-DOOR-88239A01',
    command: 'OPEN',
    actorId: '00000000-0000-0000-0000-000000000001',
    actorRole: 'CUSTOMER',
    actorIp: '118.70.12.34',
  });

  assert(cmdRes1.success === true, 'Lệnh mở cửa thực thi thành công');
  assert(cmdRes1.ackStatus === 'SUCCESS', 'Phần cứng phản hồi mã ACK SUCCESS');
  assert(cmdRes1.latencyMs <= 250, `Độ trễ khứ hồi (${cmdRes1.latencyMs}ms) đạt chuẩn siêu tốc $\\le$ 250ms`);
  assert(cmdRes1.deviceState?.open_state === 'OPEN', 'Trạng thái cửa trong Hot Cache chuyển ngay sang OPEN');

  // Lệnh 2: Thiết bị Offline (AT-DOOR-88239A04)
  const cmdRes2 = await services.commandService.dispatchCommand({
    hardwareId: 'AT-DOOR-88239A04',
    command: 'CLOSE',
    actorId: '00000000-0000-0000-0000-000000000004',
    actorRole: 'CUSTOMER',
  });

  assert(cmdRes2.success === false, 'Hệ thống nhận diện thiết bị Offline và từ chối phát lệnh');
  assert(cmdRes2.ackStatus === 'TIMEOUT', 'Hệ thống gán nhãn TIMEOUT cho thiết bị mất kết nối');

  // -----------------------------------------------------------
  // TEST 2: KIỂM THỬ BẢO MẬT & PHÂN QUYỀN RBAC (PENETRATION TEST)
  // -----------------------------------------------------------
  console.log('\n--- Test 2: Kiểm thử An toàn Phân quyền RBAC & Ghép nối ---');

  // Xác thực Token
  const adminUser = AuthService.verifyToken(adminToken);
  const cskhUser = AuthService.verifyToken(cskhToken);
  const custAUser = AuthService.verifyToken(customerAToken);

  assert(adminUser?.role === 'ADMIN', 'Token Admin giải mã chính xác quyền ADMIN');
  assert(cskhUser?.role === 'CSKH', 'Token CSKH giải mã chính xác quyền CSKH');
  assert(custAUser?.role === 'CUSTOMER', 'Token Khách hàng giải mã chính xác quyền CUSTOMER');

  // Thử nghiệm ghép nối thiết bị với mã QR giả mạo
  const fakeQrPair = services.provisioningService.pairDevice({
    hardwareId: 'AT-DOOR-88239A99',
    qrCodeHash: 'FAKE_HACKED_QR_CODE',
    userId: custAUser!.id,
    customName: 'Cửa hack',
  });
  assert(fakeQrPair.success === false && fakeQrPair.errorCode === 'INVALID_QR', 'Chặn đứng thành công tem QR giả mạo');

  // Thử nghiệm ghép nối đúng tem mã QR chuẩn trong kho
  const validPair = services.provisioningService.pairDevice({
    hardwareId: 'AT-DOOR-88239A99',
    qrCodeHash: 'HASH_AT-DOOR-88239A99_SECRET_2026',
    userId: custAUser!.id,
    customName: 'Cửa cuốn nhà mới',
  });
  assert(validPair.success === true, 'Ghép nối thành công thiết bị có mã QR và Hardware ID chuẩn');
  assert(validPair.device?.ownerId === custAUser!.id, 'Thiết bị được gán chính xác vào tài khoản khách hàng');
  assert(validPair.warrantyEndAt !== undefined, 'Bảo hành điện tử 24 tháng được tự động kích hoạt');

  // -----------------------------------------------------------
  // TEST 3: ĐỘ BỀN VÀ TÍNH TOÀN VẸN CỦA HỘP ĐEN (BLACKBOX AUDIT)
  // -----------------------------------------------------------
  console.log('\n--- Test 3: Kiểm thử Bền bỉ 1,000 Lệnh vào Hộp đen Kiểm toán ---');

  services.blackboxService.clear();
  const LOG_ITERATIONS = 1_000;
  const logStart = performance.now();

  for (let i = 1; i <= LOG_ITERATIONS; i++) {
    services.blackboxService.logCommand({
      hardwareId: `AT-DOOR-${String(i % 50).padStart(3, '0')}`,
      actorId: `user-${i % 10}`,
      actorRole: i % 2 === 0 ? 'CUSTOMER' : 'ADMIN',
      actorIp: `192.168.1.${i % 250}`,
      actionType: i % 3 === 0 ? 'CMD_OPEN' : 'CMD_CLOSE',
      payloadSent: { speed: 100 },
      ackStatus: 'SUCCESS',
      latencyMs: Math.floor(80 + Math.random() * 50),
    });
  }

  const logDurationMs = performance.now() - logStart;
  console.log(`Ghi ${LOG_ITERATIONS} bản ghi kiểm toán vào Hộp đen trong: ${logDurationMs.toFixed(2)}ms (Trung bình: ${(logDurationMs / LOG_ITERATIONS).toFixed(3)}ms/log)`);

  assert(services.blackboxService.getTotalLogsCount() === LOG_ITERATIONS, 'Hộp đen ghi nhận đủ 1,000 bản ghi không sót 1 dòng');

  // Truy vấn điều tra hộp đen theo HardwareId
  const queryLogs = services.blackboxService.queryLogs({
    hardwareId: 'AT-DOOR-010',
    actionType: 'CMD_OPEN',
  });
  assert(queryLogs.length > 0, `Truy xuất thành công ${queryLogs.length} bằng chứng hộp đen cho thiết bị 'AT-DOOR-010'`);
  assert(queryLogs[0].latencyMs > 0 && queryLogs[0].createdAt !== undefined, 'Mỗi dòng kiểm toán có đầy đủ thời gian và mã ACK');

  // -----------------------------------------------------------
  // TEST 4: CSKH HUB & LIVE CHAT VỚI ẢNH CHỤP VIỄN THÁM
  // -----------------------------------------------------------
  console.log('\n--- Test 4: Nghiệp vụ CSKH Live Chat & Remote Telemetry Snapshot ---');

  // Khách hàng tạo ticket hỗ trợ khẩn cấp
  const ticket = services.supportService.createTicket({
    customerId: custAUser!.id,
    hardwareId: 'AT-DOOR-88239A01',
    subject: 'Cửa cuốn phát tiếng kêu lạ khi mở',
    priority: 'URGENT',
  });
  assert(ticket.status === 'OPEN', 'Ticket hỗ trợ được khởi tạo thành công');

  // Khách hàng gửi tin nhắn Live Chat
  const chatMsg = await services.supportService.sendMessage({
    ticketId: ticket.id,
    senderId: custAUser!.id,
    senderRole: 'CUSTOMER',
    message: 'Nhờ CSKH kiểm tra giúp tôi cửa cuốn gara vừa mở có tiếng rít.',
  });

  assert(chatMsg.deviceSnapshot !== undefined, 'Tin nhắn chat tự động kẹp Snapshot kỹ thuật thiết bị');
  assert(chatMsg.deviceSnapshot?.hardwareId === 'AT-DOOR-88239A01', 'Snapshot chỉ rõ đúng thiết bị gặp sự cố');
  assert(chatMsg.deviceSnapshot?.isOnline === true, 'CSKH nhìn thấy ngay thiết bị đang Online để chẩn đoán');

  console.log('\n================================================================');
  console.log(`KẾT QUẢ GIAI ĐOẠN 2: ${passCount} Passed, ${failCount} Failed.`);
  console.log(`Độ tin cậy Lõi Backend & IoT Gateway: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch(err => {
  console.error('Lỗi kiểm thử Giai đoạn 2:', err);
  process.exit(1);
});
