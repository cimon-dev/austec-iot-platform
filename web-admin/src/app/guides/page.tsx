"use client";

import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  Video, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  Clock, 
  ExternalLink, 
  Edit3, 
  Layers, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Zap,
  Play
} from "lucide-react";
import { getApiBaseUrl } from "@/context/apiConfig";

interface GuideStep {
  step: number;
  title: string;
  desc: string;
  warning?: string | null;
}

interface GuideFaq {
  q: string;
  a: string;
}

interface InstallationGuide {
  id: number;
  modelCode: string;
  productName: string;
  title: string;
  videoUrl: string;
  videoDuration: string;
  resetPinDesc: string;
  resetHoldSeconds: number;
  wiringDiagramUrl: string;
  steps: GuideStep[];
  faqs: GuideFaq[];
  updatedAt: string;
}

const DEFAULT_GUIDES: InstallationGuide[] = [
  {
    id: 1,
    modelCode: "DOOR_GERMAN_ALU",
    productName: "CỬA CUỐN NHÔM CÔNG NGHỆ ĐỨC (TITADOOR)",
    title: "Hướng dẫn Đấu nối Rơ-le, Cảm biến Hành trình & Reset Mạch ESP32-C3 Cửa cuốn Titadoor",
    videoUrl: "https://www.youtube.com/embed/ScMzIvxBSi4",
    videoDuration: "04:25",
    resetPinDesc: "Nhấn giữ nút bấm cơ BOOT (GPIO 0) trên bo mạch chủ trong 10 giây",
    resetHoldSeconds: 10,
    wiringDiagramUrl: "http://localhost:4000/images/wiring-german-door.png",
    steps: [
      {
        step: 1,
        title: "Kiểm tra nguồn điện & vị trí nút BOOT",
        desc: "Đảm bảo cấp nguồn 5V/12V ổn định cho bo mạch ESP32. Tìm nút bấm nhỏ có ký hiệu BOOT (nằm cạnh chip ESP32-C3 hoặc chân GPIO 0).",
        warning: "Tắt nguồn trước khi đấu nối dây rơ-le để chống chập cháy."
      },
      {
        step: 2,
        title: "Thao tác Reset bộ nhớ để vào chế độ Ghép nối",
        desc: "Bật nguồn điện. Dùng ngón tay hoặc que tăm nhấn giữ chặt nút BOOT liên tục trong đúng 10 giây.",
        warning: "Quan sát đèn LED xanh (GPIO 10): Đèn sẽ nhấp nháy 3 lần liên tiếp báo hiệu đã xóa sạch EEPROM và khởi động lại vào chế độ Ghép nối."
      },
      {
        step: 3,
        title: "Đấu nối dây điều khiển động cơ rơ-le",
        desc: "Dây Rơ-le Mở (RL_UP - GPIO 5) nối vào chân UP của hộp nhận. Dây Rơ-le Đóng (RL_DOWN - GPIO 4) nối vào chân DOWN. Dây Rơ-le Dừng (RL_STOP - GPIO 3) nối vào chân STOP.",
        warning: "Xung kích rơ-le là 500ms, hoạt động tương đương như nút bấm cơ trên tường."
      },
      {
        step: 4,
        title: "Mở App Mobile hoặc Web để quét thiết bị",
        desc: "Bật Bluetooth trên điện thoại, chọn mục \"Thêm thiết bị\", chọn \"Austec Door\" vừa xuất hiện và nhập mật khẩu WiFi 2.4GHz gia đình.",
        warning: "Thiết bị chỉ hỗ trợ WiFi băng tần 2.4GHz, không hỗ trợ 5GHz."
      }
    ],
    faqs: [
      { q: "Tại sao vòng tròn ghép nối chạy đến 100% mà báo thất bại?", a: "Nguyên nhân 90% là do nhập sai mật khẩu WiFi gia đình hoặc điện thoại đang kết nối sóng 5GHz. Hãy nhấn giữ nút BOOT 10 giây để reset và thử lại với WiFi 2.4GHz." },
      { q: "Làm sao để học thêm Remote RF 433MHz mới?", a: "Trên trang điều khiển thiết bị, bấm nút \"Cài đặt Remote RF\" hoặc gửi lệnh 11, bo mạch sẽ vào chế độ học mã trong 7 giây, bạn chỉ cần bấm nút trên tay cầm mới là nhận ngay." },
      { q: "Cửa cuốn có tự dừng khi mất mạng Internet không?", a: "Không. Các rơ-le và công tắc an toàn hoạt động độc lập bằng vi điều khiển cục bộ. Mất mạng bạn vẫn điều khiển được bình thường qua Remote RF hoặc nút bấm tường." }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    modelCode: "DOOR_AU_STEEL",
    productName: "CỬA CUỐN TẤM LIỀN THÉP HỢP KIM ÚC",
    title: "Quy trình Cài đặt & Hướng dẫn Reset Hộp điều khiển Cửa cuốn Tấm liền",
    videoUrl: "https://www.youtube.com/embed/ScMzIvxBSi4",
    videoDuration: "03:50",
    resetPinDesc: "Nhấn giữ nút Reset cạnh cổng anten RF trong 10 giây",
    resetHoldSeconds: 10,
    wiringDiagramUrl: "http://localhost:4000/images/wiring-au-door.png",
    steps: [
      {
        step: 1,
        title: "Xác định hộp điều khiển trung tâm",
        desc: "Mở nắp hộp động cơ tấm liền Austdoor/Austec, xác định cổng cấp nguồn 24V DC và giắc cắm tín hiệu.",
        warning: "Động cơ tấm liền có tốc độ mở rất nhanh, hãy đảm bảo không có chướng ngại vật."
      },
      {
        step: 2,
        title: "Nhấn giữ nút Reset 10 giây",
        desc: "Bấm và giữ nút SET/RESET trên hộp nhận đến khi còi bíp 3 tiếng dài để đưa mạch về trạng thái xuất xưởng.",
        warning: "Sau khi reset, tất cả remote cũ cần được học lại mã."
      }
    ],
    faqs: [
      { q: "Cửa tấm liền kéo tay chuyển sang tự động như thế nào?", a: "Kéo chốt ly hợp màu đỏ sang vị trí Auto, kiểm tra dây xích kéo khẩn cấp." }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    modelCode: "CAMERA_AI_OUTDOOR",
    productName: "CAMERA AN NINH AI THÔNG MINH NGOÀI TRỜI",
    title: "Hướng dẫn Cài đặt Cảm biến AI & Reset Camera Austec Vision",
    videoUrl: "https://www.youtube.com/embed/ScMzIvxBSi4",
    videoDuration: "05:15",
    resetPinDesc: "Dùng que chọc nút Reset ở đáy camera cạnh khe thẻ nhớ microSD trong 8 giây",
    resetHoldSeconds: 8,
    wiringDiagramUrl: "http://localhost:4000/images/wiring-camera.png",
    steps: [
      {
        step: 1,
        title: "Cấp nguồn và chọc nút Reset",
        desc: "Cắm nguồn adapter 12V/2A. Đợi camera quay quét 1 vòng, dùng que chọc giữ nút Reset đến khi loa phát giọng nói \"Reset successfully\".",
        warning: "Không rút điện trong lúc camera đang khởi động lại."
      },
      {
        step: 2,
        title: "Quét mã QR trên màn hình điện thoại",
        desc: "Đưa mã QR trên ứng dụng Austec App lại gần ống kính camera khoảng cách 15-20cm cho đến khi nghe tiếng \"Ding\".",
        warning: "Giữ màn hình điện thoại sáng rõ và không bị lóa ánh nắng."
      }
    ],
    faqs: [
      { q: "Camera có ghi hình được khi mất mạng Internet không?", a: "Có. Thẻ nhớ microSD tích hợp vẫn tiếp tục ghi hình 24/7 theo vòng lặp." }
    ],
    updatedAt: new Date().toISOString()
  }
];

export default function InstallationGuidesPage() {
  const [guides, setGuides] = useState<InstallationGuide[]>(DEFAULT_GUIDES);
  const [selectedModel, setSelectedModel] = useState<string>("DOOR_GERMAN_ALU");
  const [loading, setLoading] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState<string>("");
  const [editVideoUrl, setEditVideoUrl] = useState<string>("");
  const [editResetDesc, setEditResetDesc] = useState<string>("");
  const [editResetSeconds, setEditResetSeconds] = useState<number>(10);

  const fetchGuides = async () => {
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/guides`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.guides && data.guides.length > 0) {
        setGuides(data.guides);
      }
    } catch (e) {
      console.warn("Lỗi nạp hướng dẫn lắp đặt:", e);
    }
  };

  useEffect(() => {
    fetchGuides();
  }, []);

  const activeGuide = guides.find(g => g.modelCode === selectedModel) || guides[0] || DEFAULT_GUIDES[0];

  const handleOpenEdit = () => {
    if (!activeGuide) return;
    setEditTitle(activeGuide.title);
    setEditVideoUrl(activeGuide.videoUrl);
    setEditResetDesc(activeGuide.resetPinDesc);
    setEditResetSeconds(activeGuide.resetHoldSeconds);
    setShowEditModal(true);
  };

  const handleSaveGuide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGuide) return;

    try {
      const res = await fetch(`${getApiBaseUrl()}/api/admin/guides`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...activeGuide,
          title: editTitle,
          videoUrl: editVideoUrl,
          resetPinDesc: editResetDesc,
          resetHoldSeconds: editResetSeconds,
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowEditModal(false);
        fetchGuides();
      }
    } catch (err) {
      console.error("Lỗi lưu hướng dẫn:", err);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Hướng dẫn lắp đặt & Reset
          </h1>
        </div>

        <button
          type="button"
          onClick={handleOpenEdit}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-all cursor-pointer self-start md:self-auto shadow-xs"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Chỉnh sửa hướng dẫn</span>
        </button>
      </div>

      {/* 2. Bộ chọn Dòng Sản Phẩm (Product Model Tabs) */}
      <div className="flex flex-wrap gap-2">
        {guides.map((g) => {
          const isSelected = g.modelCode === selectedModel;
          return (
            <button
              key={g.modelCode}
              onClick={() => setSelectedModel(g.modelCode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-xs ${
                isSelected
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <Cpu className={`w-3.5 h-3.5 ${isSelected ? "text-white dark:text-slate-900" : "text-slate-400 dark:text-slate-500"}`} />
              <span>{g.productName}</span>
            </button>
          );
        })}
      </div>

      {activeGuide && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CỘT TRÁI: Video Player & Chỉ Dẫn Nút Reset Vật Lý 10s */}
          <div className="lg:col-span-1 space-y-6">
            {/* Khung Video Hướng Dẫn */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Video Hướng Dẫn Chi Tiết
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono font-bold border border-slate-200 dark:border-slate-700">
                  {activeGuide.videoDuration}
                </span>
              </div>
              <div className="relative aspect-video bg-black">
                <iframe
                  src={activeGuide.videoUrl}
                  title={activeGuide.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60">
                Thợ kỹ thuật hoặc khách hàng có thể quét mã QR trên vỏ hộp để mở xem trực tiếp video này trên điện thoại
              </div>
            </div>

            {/* CHỈ DẪN RESET PHẦN CỨNG CỐT LÕI (NÚT BẤM 10S) */}
            <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-950 border-2 border-amber-500/40 shadow-xs relative overflow-hidden">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
                <RotateCcw className="w-4 h-4 animate-spin" />
                Quy Trình Reset Cứng Khẩn Cấp
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                {activeGuide.resetPinDesc}
              </h3>
              
              <div className="p-3 rounded-lg bg-white/80 dark:bg-black/50 border border-amber-500/30 space-y-2 mt-3 shadow-xs">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400">Thời gian nhấn giữ:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold text-sm">{activeGuide.resetHoldSeconds} GIÂY LIÊN TỤC</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500 dark:text-slate-400">Tín hiệu LED nhận diện:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Nhấp nháy 3 lần</span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-800">
                  Sau khi nháy 3 lần, bo mạch ESP32 tự động xóa sạch EEPROM/Flash, đưa thiết bị về trạng thái chờ ghép nối ban đầu.
                </div>
              </div>

              <div className="mt-4 p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200/90 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400 mt-0.5" />
                <span>
                  <b>Khi nào cần bấm Reset:</b> Khi điện thoại ghép nối chạy đến 100% khoảng 1 phút mà vẫn báo lỗi thất bại (do đổi mật khẩu WiFi hoặc sóng yếu).
                </span>
              </div>
            </div>

            {/* SƠ ĐỒ ĐẤU DÂY RƠ-LE & CẢM BIẾN (WIRING DIAGRAM) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Zap className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                Sơ Đồ Đấu Nối Rơ-le & Cảm Biến (ESP32-C3)
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">RL_UP (GPIO 5)</span>
                  <span className="text-slate-700 dark:text-slate-300">Rơ-le Kích MỞ Cửa (500ms)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">RL_DOWN (GPIO 4)</span>
                  <span className="text-slate-700 dark:text-slate-300">Rơ-le Kích ĐÓNG Cửa (500ms)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold">RL_STOP (GPIO 3)</span>
                  <span className="text-slate-700 dark:text-slate-300">Rơ-le DỪNG Khẩn Cấp (500ms)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">CB_UP (GPIO 7)</span>
                  <span className="text-slate-700 dark:text-slate-300">Công tắc hành trình Mở Hết (Action 4)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">CB_DOWN (GPIO 6)</span>
                  <span className="text-slate-700 dark:text-slate-300">Công tắc hành trình Đóng Hết (Action 5)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80">
                  <span className="text-purple-600 dark:text-purple-400 font-bold">RF PIN (GPIO 1)</span>
                  <span className="text-slate-700 dark:text-slate-300">Học mã (Action 11) / Xóa RF (Action 12)</span>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Checklist Quy Trình Từng Bước & Câu Hỏi Thường Gặp */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tiêu đề bài hướng dẫn */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">{activeGuide.title}</h2>
              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span>Dòng sản phẩm: <b className="text-emerald-600 dark:text-emerald-400 font-mono">{activeGuide.modelCode}</b></span>
                <span>Cập nhật lần cuối: <span className="font-mono">{activeGuide.updatedAt.slice(0, 10)}</span></span>
              </div>
            </div>

            {/* Checklist Quy Trình Từng Bước (Steps Checklist) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                Quy Trình Thao Tác Chi Tiết (Từng Bước)
              </h3>

              <div className="space-y-3">
                {activeGuide.steps.map((step) => (
                  <div 
                    key={step.step}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 font-mono">
                        {step.step}
                      </div>
                      <div className="space-y-1 flex-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{step.title}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{step.desc}</p>
                        {step.warning && (
                          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2 mt-2">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
                            <span>{step.warning}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Xử Lý Sự Cố Thường Gặp (FAQs & Troubleshooting) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                Xử Lý Sự Cố Ghép Nối & Vận Hành Thường Gặp (FAQs)
              </h3>

              <div className="space-y-2">
                {activeGuide.faqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  return (
                    <div 
                      key={index} 
                      className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="w-full p-3 text-left text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-cyan-600 dark:text-cyan-400 font-mono">Q:</span>
                          <span>{faq.q}</span>
                        </span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </button>
                      {isOpen && (
                        <div className="p-3 pt-0 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950">
                          <p className="pt-2 text-slate-600 dark:text-slate-300">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Chỉnh Sửa Hướng Dẫn (Admin Edit Modal) */}
      {showEditModal && activeGuide && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Chỉnh Sửa Hướng Dẫn: {activeGuide.productName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Nội dung chỉnh sửa tại đây sẽ cập nhật đồng thời lên ứng dụng Mobile và tài liệu hướng dẫn kỹ thuật
            </p>

            <form onSubmit={handleSaveGuide} className="space-y-4 mt-5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tiêu Đề Hướng Dẫn
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Link Video Nhúng (YouTube Embed URL)
                </label>
                <input
                  type="url"
                  required
                  value={editVideoUrl}
                  onChange={(e) => setEditVideoUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-cyan-600 dark:text-cyan-400 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Vị Trí Nút Cơ Reset
                  </label>
                  <input
                    type="text"
                    required
                    value={editResetDesc}
                    onChange={(e) => setEditResetDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Giữ (Giây)
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={editResetSeconds}
                    onChange={(e) => setEditResetSeconds(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-xs text-amber-600 dark:text-amber-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
