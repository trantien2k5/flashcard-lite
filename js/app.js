// ================================================================
// CORE.JS — State, điều hướng, theme, toast dùng chung toàn app
// (state đang mở, phiên học đang chạy). Nạp sớm để mọi trang trong
// js/pages/ tham chiếu được, bất kể thứ tự nạp giữa các trang. Không
// chứa thuật toán (xem fsrs.js) hay lưu trữ dữ liệu (xem storage.js).
// ================================================================

let currentTab = "home";
let studySession = null; // Active study session
// ================================================================
// CORE/NAVIGATION.JS — Chuyển tab (switchTab), gọi hàm render tương
// ứng của từng feature khi tab được kích hoạt.
// ================================================================

function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-pane").forEach((pane) => {
    pane.classList.toggle("active", pane.id === `tab-${tabName}`);
  });
  if (tabName === "home") renderHome();
  if (tabName === "learn") renderLearnList();
  if (tabName === "stats") renderStats();
  if (tabName === "settings") renderSettings();
}
// ================================================================
// CORE/THEME.JS — Áp dụng giao diện sáng/tối cho toàn app (dùng lúc
// khởi động và khi người dùng đổi ở Settings).
// ================================================================

function applyTheme(theme) {
  const isLight = theme === "light";
  document.documentElement.classList.toggle("light-theme", isLight);
  document.body.classList.toggle("light-theme", isLight);
}
// ================================================================
// SHARED/TOAST.JS — Thông báo nổi (toast) dùng chung, gọi từ bất kỳ
// feature nào (hiện tại: Settings) khi cần báo kết quả 1 thao tác.
// ================================================================

function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("toast-visible");
    setTimeout(() => {
      toast.classList.remove("toast-visible");
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  });
}
// ================================================================
// BOOTSTRAP.JS — Điểm khởi động app
// Nạp CUỐI CÙNG — cần mọi hàm render (js/pages/*.js) đã tồn tại.
// Nạp dữ liệu chủ đề động (data/*.js), lắng nghe sự kiện DOMContentLoaded,
// vẽ giao diện lần đầu. ĐẶT CUỐI cùng khi nạp script vì cần mọi hàm/biến
// ở các file core/store/shared/features đã tồn tại trước.
// ================================================================

// ---- Dynamic Loading ----
async function loadTopicsDynamic() {
  window.TOPICS = [];
  const topicFiles = [
    // 30 chủ đề x 100 từ (60 cốt lõi / 25 trung bình / 15 nâng cao mỗi chủ đề)
    "data/daily_life.js",
    "data/family.js",
    "data/food_drinks.js",
    "data/shopping.js",
    "data/health.js",
    "data/education.js",
    "data/travel.js",
    "data/transportation.js",
    "data/hotels.js",
    "data/restaurants.js",
    "data/entertainment.js",
    "data/technology.js",
    "data/internet_communication.js",
    "data/environment.js",
    "data/work_careers.js",
    "data/office.js",
    "data/employment_recruitment.js",
    "data/meetings_presentations.js",
    "data/business_operations.js",
    "data/marketing_advertising.js",
    "data/customer_service.js",
    "data/sales.js",
    "data/finance_banking.js",
    "data/accounting.js",
    "data/real_estate.js",
    "data/manufacturing.js",
    "data/shipping_logistics.js",
    "data/contracts_legal.js",
    "data/company_management.js",
    "data/economics_trade.js",
    // data/finance.js và data/toeic.js (bộ TOEIC cũ) tạm không nạp — vẫn còn trong
    // thư mục data/ nếu muốn dùng lại, chỉ cần thêm 2 dòng path vào mảng này.
  ];

  await Promise.all(
    topicFiles.map((src) => {
      return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = false; // giữ đúng thứ tự thực thi theo topicFiles dù tải song song
        script.onload = () => resolve();
        script.onerror = () => {
          console.error("Failed to load topic: " + src);
          resolve(); // resolve anyway to not block
        };
        document.head.appendChild(script);
      });
    }),
  );
}
// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Nạp giao diện đã lưu
  applyTheme(db.settings.theme || "dark");

  // Tab buttons
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Load dynamic data first
  await loadTopicsDynamic();

  // Initial render
  renderHome();
});
