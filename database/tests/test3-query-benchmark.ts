import { HotCacheClient } from '../src/redis/hot-cache.js';

console.log('================================================================');
console.log('TEST 3: ĐO LƯỜNG HIỆU NĂNG TRUY VẤN VÀ REDIS CACHE (BENCHMARK)');
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

async function runBenchmark() {
  const TOTAL_DEVICES = 50_000;
  console.log(`\n--- Bước 1: Khởi tạo 50,000 Thiết bị với Chỉ mục Đa tầng (Indexed Map) ---`);

  interface IndexedRecord {
    hardwareId: string;
    modelCode: string;
    groupId: number;
    isOnline: boolean;
    customerPhone: string;
    registeredAt: number;
  }

  const modelCodes = ['AUSTEC-A900', 'MASARU-X1', 'UPS-220-SINE', 'AUSTEC-ALU-500'];
  const groupIds = [9, 10, 11, 12];

  // Chỉ mục đa tầng (Composite Inverted Indexes)
  const primaryStore: Map<string, IndexedRecord> = new Map();
  const groupIndex: Map<number, Set<string>> = new Map();
  const modelIndex: Map<string, Set<string>> = new Map();
  const onlineIndex: Set<string> = new Set();

  const seedStartTime = performance.now();

  for (let i = 1; i <= TOTAL_DEVICES; i++) {
    const hwId = `AT-DEV-${String(i).padStart(6, '0')}`;
    const model = modelCodes[i % modelCodes.length];
    const group = groupIds[i % groupIds.length];
    const isOnline = i % 5 !== 0; // 80% online, 20% offline (chu kỳ khác 4 để không trùng)
    const phone = `09${String(10000000 + (i % 89999999))}`;

    const record: IndexedRecord = {
      hardwareId: hwId,
      modelCode: model,
      groupId: group,
      isOnline,
      customerPhone: phone,
      registeredAt: Date.now() - (i * 1000),
    };

    primaryStore.set(hwId, record);

    // Cập nhật chỉ mục
    if (!groupIndex.has(group)) groupIndex.set(group, new Set());
    groupIndex.get(group)!.add(hwId);

    if (!modelIndex.has(model)) modelIndex.set(model, new Set());
    modelIndex.get(model)!.add(hwId);

    if (isOnline) {
      onlineIndex.add(hwId);
    }
  }

  const seedTimeMs = performance.now() - seedStartTime;
  console.log(`Nạp xong 50,000 thiết bị vào bộ nhớ trong: ${seedTimeMs.toFixed(2)} ms`);
  assert(primaryStore.size === TOTAL_DEVICES, 'Lưu trữ đủ 50,000 bản ghi thiết bị');

  // 2. Kiểm thử tốc độ truy vấn lọc đa tầng (Composite Filter Query)
  console.log('\n--- Bước 2: Đo lường Tốc độ Truy vấn Lọc Đa tầng (Filter Benchmark) ---');

  const queryStart = performance.now();

  // Truy vấn: Tìm tất cả thiết bị thuộc Group 9 AND Model 'AUSTEC-A900' AND Status = Online
  const targetGroupIds = groupIndex.get(9) || new Set();
  const targetModelIds = modelIndex.get('AUSTEC-A900') || new Set();

  const matchedHardwareIds: string[] = [];
  for (const id of targetGroupIds) {
    if (targetModelIds.has(id) && onlineIndex.has(id)) {
      matchedHardwareIds.push(id);
    }
  }

  const queryDurationMs = performance.now() - queryStart;
  console.log(`Tìm thấy ${matchedHardwareIds.length} thiết bị thỏa mãn điều kiện lọc.`);
  console.log(`Thời gian thực thi truy vấn trên 50,000 bản ghi: ${queryDurationMs.toFixed(3)} ms`);

  assert(queryDurationMs < 25, `Thời gian truy vấn lọc đa tầng (${queryDurationMs.toFixed(3)} ms) < ngưỡng tiêu chuẩn 25 ms`);
  assert(matchedHardwareIds.length > 0, 'Truy vấn trả về kết quả chính xác không rỗng');

  // 3. Kiểm thử hiệu năng Redis Hot Cache
  console.log('\n--- Bước 3: Đo lường Hiệu năng Đọc/Ghi Redis Hot Cache (< 1ms) ---');
  const cache = new HotCacheClient();
  const CACHE_OPS = 10_000;

  const writeStart = performance.now();
  for (let i = 1; i <= CACHE_OPS; i++) {
    const hwId = `AT-CACHE-${i}`;
    await cache.setDeviceState(hwId, {
      isOnline: true,
      currentProperties: {
        open_state: i % 2 === 0 ? 'OPEN' : 'CLOSED',
        battery_level: 80 + (i % 20),
      },
    });
  }
  const writeDurationMs = performance.now() - writeStart;
  const avgWriteMs = writeDurationMs / CACHE_OPS;
  console.log(`Ghi ${CACHE_OPS} bản ghi trạng thái vào Hot Cache trong: ${writeDurationMs.toFixed(2)} ms (Trung bình: ${avgWriteMs.toFixed(4)} ms/op)`);

  const readStart = performance.now();
  for (let i = 1; i <= CACHE_OPS; i++) {
    const hwId = `AT-CACHE-${i}`;
    await cache.getDeviceState(hwId);
  }
  const readDurationMs = performance.now() - readStart;
  const avgReadMs = readDurationMs / CACHE_OPS;
  console.log(`Đọc ${CACHE_OPS} bản ghi từ Hot Cache trong: ${readDurationMs.toFixed(2)} ms (Trung bình: ${avgReadMs.toFixed(4)} ms/op)`);

  assert(avgWriteMs < 1.0, `Thời gian ghi Hot Cache (${avgWriteMs.toFixed(4)} ms) đạt chuẩn < 1.0 ms`);
  assert(avgReadMs < 0.1, `Thời gian đọc Hot Cache (${avgReadMs.toFixed(4)} ms) đạt tốc độ siêu việt < 0.1 ms`);

  // 4. Kiểm tra thống kê Realtime
  const stats = await cache.getRealtimeStats();
  assert(stats.totalTracked === CACHE_OPS, `Hot cache thống kê chính xác tổng số ${stats.totalTracked} thiết bị`);
  assert(stats.online === CACHE_OPS, `Hot cache bắt chuẩn 100% nhịp tim sống còn`);

  console.log('\n================================================================');
  console.log(`KẾT QUẢ TEST 3: ${passCount} Passed, ${failCount} Failed.`);
  console.log('================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runBenchmark().catch(err => {
  console.error('Lỗi khi chạy benchmark:', err);
  process.exit(1);
});
