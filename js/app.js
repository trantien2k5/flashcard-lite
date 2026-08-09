// ============================================================
// APP.JS (CONTROLLER LAYER)
// Vai trò: Bộ điều khiển trung tâm (Main Controller) của ứng dụng
// Chức năng:
//  - Lắng nghe các sự kiện bấm nút của người dùng (chuyển tab, lật thẻ, chọn chủ đề, lưu cài đặt...)
//  - Tải động (Dynamic loading) dữ liệu từ vựng chủ đề khi khởi chạy
//  - Điều phối dữ liệu từ Service (`db.js`) và thuật toán (`algorithm.js`) để cập nhật trạng thái
//  - Chọn và kích hoạt các cấu trúc HTML động từ thư mục `js/views/` để cập nhật hiển thị (DOM)
// ============================================================

// ---- State ----
let currentTab = "home";
let studySession = null;  // Active study session
let sessionStartTime = null;

// ---- Navigation ----
function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-pane").forEach(pane => {
    pane.classList.toggle("active", pane.id === `tab-${tabName}`);
  });
  if (tabName === "home") renderHome();
  if (tabName === "learn") renderLearnList();
  if (tabName === "settings") renderSettings();
}

// ============================================================
// HOME TAB
// ============================================================
function renderHome() {
  const stats       = db.stats;
  const todo        = db.getDailyTodo();
  const progress    = db.getDailyProgress();
  const { known, learning, newCount } = db.getTotalWordStats();
  const totalWords  = TOPICS.reduce((s, t) => s + t.words.length, 0);
  const totalLearned = known + learning;
  const monthlyData = db.getMonthlyActivity();
  const weakData    = db.getWeakWords();
  const accuracy    = db.getAccuracyRate(7);
  const streakRecord = stats.streakRecord || stats.streakDays || 0;
  const streakColor = stats.streakDays >= 7 ? "#f97316" : stats.streakDays >= 3 ? "#fbbf24" : "#6366f1";
  document.getElementById("home-content").innerHTML = TEMPLATES.home(
    stats, todo, progress, known, learning, newCount, totalWords, totalLearned, monthlyData, weakData, accuracy, streakRecord, streakColor
  );
}


function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Chào buổi sáng! ☀️";
  if (h < 18) return "Chào buổi chiều! 🌤️";
  return "Chào buổi tối! 🌙";
}

function formatMinutes(mins) {
  if (!mins) return "0m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}


// ============================================================
// LEARN TAB — Topic list
// ============================================================
function renderLearnList() {
  document.getElementById("learn-content").innerHTML = TEMPLATES.learnList();
}

// ============================================================
// STUDY SESSION — Flashcard mode
// ============================================================
function openTopicStudy(topicId) {
  const topic = TOPICS.find(t => t.id === topicId);
  if (!topic) return;

  const dueCards = db.getDueCards(topicId, topic);

  if (dueCards.length === 0) {
    showNoCardsModal(topic);
    return;
  }

  // Map word data
  const queue = dueCards.map(card => ({
    card,
    word: topic.words.find(w => w.id === card.wordId)
  })).filter(item => item.word);

  studySession = {
    topicId,
    topic,
    queue,
    totalDue: queue.length,
    current: 0,
    reviewed: 0,
    startTime: Date.now(),
    flipped: false
  };
  sessionStartTime = Date.now();

  renderStudySession();
}

function renderStudySession() {
  const { queue, current, totalDue, reviewed, topic } = studySession;

  if (current >= queue.length) {
    finishStudySession();
    return;
  }

  const { word, card } = queue[current];
  const progress = Math.round((current / totalDue) * 100);
  const settings = db.settings;

  document.getElementById("learn-content").innerHTML = TEMPLATES.studySession(
    studySession, settings, progress, card
  );
}

function flipCard() {
  if (studySession.flipped) return;
  studySession.flipped = true;
  document.getElementById("flashcard")?.classList.add("flipped");
  document.getElementById("rating-section")?.classList.remove("hidden");
  document.getElementById("rating-section")?.classList.add("visible");
}

function rateCard(rating) {
  if (!studySession) return;
  const { queue, current } = studySession;
  const { word, card } = queue[current];

  // Update card via SM-2
  db.updateCard(word.id, rating);

  // If Again/Hard (learning), optionally re-queue
  if (rating === RATING.AGAIN) {
    // Re-add to end of queue for this session
    studySession.queue.push({ card: db.getCard(word.id), word });
  }

  studySession.current++;
  studySession.reviewed++;
  studySession.flipped = false;

  renderStudySession();
}

function speakWord(event, text) {
  event.stopPropagation();
  if ("speechSynthesis" in window) {
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "en-US";
    utt.rate = 0.85;
    speechSynthesis.cancel();
    speechSynthesis.speak(utt);
  }
}

function endStudyEarly() {
  if (studySession) {
    const mins = (Date.now() - studySession.startTime) / 60000;
    db.recordStudySession(studySession.reviewed, Math.round(mins * 10) / 10);
  }
  studySession = null;
  renderLearnList();
}

function finishStudySession() {
  const mins = Math.round((Date.now() - studySession.startTime) / 60000 * 10) / 10;
  const reviewed = studySession.reviewed;
  db.recordStudySession(reviewed, mins);

  document.getElementById("learn-content").innerHTML = TEMPLATES.finishScreen(
    reviewed, mins, db.stats.streakDays
  );
  studySession = null;
}

function showNoCardsModal(topic) {
  const prog = db.getTopicProgress(topic.id);
  document.getElementById("learn-content").innerHTML = TEMPLATES.noCardsScreen(
    topic, prog
  );
}

// ============================================================
// SETTINGS TAB
// ============================================================
function renderSettings() {
  const s = db.settings;

  document.getElementById("settings-content").innerHTML = TEMPLATES.settings(s);
}

function saveSetting(key, value) {
  db.updateSettings({ [key]: value });
  showToast("Đã lưu cài đặt");
}

function exportData() {
  const json = db.exportData();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flashcard_lite_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Xuất dữ liệu thành công!");
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const success = db.importData(e.target.result);
    showToast(success ? "Nhập dữ liệu thành công!" : "Nhập thất bại — file không hợp lệ");
    if (success) renderSettings();
  };
  reader.readAsText(file);
}

function confirmReset() {
  document.getElementById("reset-modal").style.display = "flex";
}

function closeResetModal(e) {
  if (e.target.id === "reset-modal") {
    document.getElementById("reset-modal").style.display = "none";
  }
}

function doReset() {
  db.resetAllProgress();
  document.getElementById("reset-modal").style.display = "none";
  showToast("Đã xóa toàn bộ tiến độ.");
  renderSettings();
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
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

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener("keydown", (e) => {
  if (!studySession) return;
  if (!studySession.flipped) {
    if (e.code === "Space" || e.key === "Enter") {
      e.preventDefault();
      flipCard();
    }
  } else {
    if (e.key === "1") rateCard(0);
    if (e.key === "2") rateCard(1);
    if (e.key === "3") rateCard(2);
    if (e.key === "4") rateCard(3);
  }
});

// ---- Dynamic Loading ----
async function loadTopicsDynamic() {
  window.TOPICS = [];
  const topicFiles = [
    "js/data/finance.js"
  ];
  
  await Promise.all(topicFiles.map(src => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => {
        console.error("Failed to load topic: " + src);
        resolve(); // resolve anyway to not block
      };
      document.head.appendChild(script);
    });
  }));
}

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Tab buttons
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Load dynamic data first
  await loadTopicsDynamic();

  // Initial render
  renderHome();
});

