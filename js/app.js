// ============================================================
// APP.JS — Main application controller
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

  document.getElementById("home-content").innerHTML = `
    <div class="home-header">
      <h1 class="greeting-text">${getGreeting()}</h1>
      <p class="greeting-sub">Tiếp tục phát huy nhé! 🎯</p>
    </div>

    <!-- 1. HÔM NAY CẦN LÀM GÌ — khối lớn nhất, đầu tiên -->
    <div class="today-block">
      <div class="today-block-title">📋 Hôm nay cần làm gì?</div>
      <div class="today-stats-row">
        <div class="today-stat">
          <div class="today-stat-val" style="color:#6366f1">${todo.reviewCount}</div>
          <div class="today-stat-lbl">Từ cần ôn</div>
        </div>
        <div class="today-divider"></div>
        <div class="today-stat">
          <div class="today-stat-val" style="color:#10b981">${todo.newCount}</div>
          <div class="today-stat-lbl">Từ mới</div>
        </div>
        <div class="today-divider"></div>
        <div class="today-stat">
          <div class="today-stat-val" style="color:#f59e0b">~${todo.estimatedMinutes || 1}</div>
          <div class="today-stat-lbl">Phút</div>
        </div>
      </div>
      <button class="btn-start-study" onclick="switchTab('learn')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Bắt đầu học
      </button>
    </div>

    <!-- 2. STREAK + KỶ LỤC -->
    <div class="stats-grid-2">
      <div class="stat-card-v2" style="--accent: ${streakColor}">
        <div class="stat-card-top">
          <span class="stat-emoji">🔥</span>
          <span class="stat-card-v2-val">${stats.streakDays}</span>
        </div>
        <div class="stat-card-v2-lbl">Ngày liên tiếp</div>
        <div class="stat-card-v2-sub">Kỷ lục: ${streakRecord} ngày</div>
      </div>
      <div class="stat-card-v2" style="--accent: #a78bfa">
        <div class="stat-card-top">
          <span class="stat-emoji">🎯</span>
          <span class="stat-card-v2-val">${accuracy !== null ? accuracy + '%' : '—'}</span>
        </div>
        <div class="stat-card-v2-lbl">Độ chính xác</div>
        <div class="stat-card-v2-sub">7 ngày gần nhất</div>
      </div>
    </div>

    <!-- 3. TIẾN ĐỘ MỤC TIÊU NGÀY -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">📈 Tiến độ hôm nay</span>
        <span class="section-badge">${progress.reviewedToday}/${progress.reviewGoal}</span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar" style="width:${progress.overallPct}%"></div>
      </div>
      <div class="daily-progress-meta">
        <span>Ôn tập: <strong>${progress.reviewedToday}</strong>/${progress.reviewGoal}</span>
        <span>${progress.overallPct}% hoàn thành</span>
      </div>
    </div>

    <!-- 4. HEATMAP 30 NGÀY -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">📅 Lịch sử 30 ngày</span>
      </div>
      <div class="heatmap-grid">
        ${monthlyData.map(d => `
          <div class="heatmap-cell level-${d.level}" title="${d.date}: ${d.count} từ"></div>
        `).join("")}
      </div>
      <div class="heatmap-legend">
        <span>Ít</span>
        <div class="heatmap-cell level-0 legend-cell"></div>
        <div class="heatmap-cell level-1 legend-cell"></div>
        <div class="heatmap-cell level-2 legend-cell"></div>
        <div class="heatmap-cell level-3 legend-cell"></div>
        <div class="heatmap-cell level-4 legend-cell"></div>
        <span>Nhiều</span>
      </div>
    </div>

    <!-- 5 + 7. TỪ YẾU + TỔNG THỐNG KÊ (2 cột) -->
    <div class="stats-grid-2">
      <div class="stat-card-v2 clickable-card" onclick="switchTab('learn')" style="--accent:#f43f5e">
        <div class="stat-card-top">
          <span class="stat-emoji">⚠️</span>
          <span class="stat-card-v2-val">${weakData.count}</span>
        </div>
        <div class="stat-card-v2-lbl">Từ yếu</div>
        <div class="stat-card-v2-sub">Cần chú ý thêm</div>
      </div>
      <div class="stat-card-v2" style="--accent:#10b981">
        <div class="stat-card-top">
          <span class="stat-emoji">⏱️</span>
          <span class="stat-card-v2-val">${formatMinutes(stats.totalStudyMinutes)}</span>
        </div>
        <div class="stat-card-v2-lbl">Tổng thời gian</div>
        <div class="stat-card-v2-sub">Đã tích lũy</div>
      </div>
    </div>

    <!-- 7. TỔNG TỪ ĐÃ HỌC (3 cột) -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">📚 Tổng số từ</span>
        <span class="section-badge">${totalLearned}/${totalWords}</span>
      </div>
      <div class="word-stats-row">
        <div class="word-stat-item">
          <div class="word-stat-val" style="color:#10b981">${known}</div>
          <div class="word-stat-lbl">Thành thạo</div>
        </div>
        <div class="word-stat-item">
          <div class="word-stat-val" style="color:#f59e0b">${learning}</div>
          <div class="word-stat-lbl">Đang ôn</div>
        </div>
        <div class="word-stat-item">
          <div class="word-stat-val" style="color:#6366f1">${totalWords - totalLearned}</div>
          <div class="word-stat-lbl">Chưa học</div>
        </div>
      </div>
      <div class="progress-bar-wrap" style="margin-top:12px; margin-bottom:0">
        <div class="progress-bar" style="width:${Math.round(known/totalWords*100)}%"></div>
      </div>
    </div>

    <!-- Tổng quan chủ đề (giữ lại nhỏ gọn) -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">🗂️ Chủ đề</span>
        <button class="btn-text" onclick="switchTab('learn')">Học ngay →</button>
      </div>
      <div class="topic-overview-list">
        ${TOPICS.map(t => {
          const prog = db.getTopicProgress(t.id);
          const pct  = Math.round((prog.known + prog.learning) / prog.total * 100);
          return `
          <div class="topic-overview-item">
            <span class="topic-icon-sm">${t.icon}</span>
            <div class="topic-info">
              <span class="topic-name-sm">${t.name}</span>
              <div class="mini-progress">
                <div class="mini-bar" style="width:${pct}%; background:${t.color}"></div>
              </div>
            </div>
            <span class="topic-pct" style="color:${t.color}">${pct}%</span>
          </div>`;
        }).join("")}
      </div>
    </div>
  `;
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
  document.getElementById("learn-content").innerHTML = `
    <div class="learn-header">
      <h2 class="learn-title">Chủ đề từ vựng</h2>
      <p class="learn-subtitle">Chọn một chủ đề để bắt đầu học</p>
    </div>
    <div class="topic-grid">
      ${TOPICS.map(topic => {
        const prog = db.getTopicProgress(topic.id);
        const pct = Math.round((prog.known + prog.learning) / prog.total * 100);
        const due = db.getDueCards(topic.id, topic).length;
        return `
        <div class="topic-card" onclick="openTopicStudy('${topic.id}')" style="--topic-color: ${topic.color}">
          <div class="topic-card-header">
            <div class="topic-emoji">${topic.icon}</div>
            ${due > 0 ? `<span class="due-badge">${due} cần ôn</span>` : (pct === 100 ? '<span class="done-badge">✓ Hoàn thành</span>' : '')}
          </div>
          <h3 class="topic-card-name">${topic.name}</h3>
          <p class="topic-card-desc">${topic.description}</p>
          <div class="topic-card-footer">
            <div class="topic-progress-bar">
              <div class="topic-progress-fill" style="width:${pct}%; background:${topic.color}"></div>
            </div>
            <div class="topic-card-meta">
              <span>${prog.total} từ</span>
              <span style="color:${topic.color}">${pct}%</span>
            </div>
          </div>
        </div>`;
      }).join("")}
    </div>
  `;
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

  document.getElementById("learn-content").innerHTML = `
    <div class="study-session">
      <!-- Back + Topic name -->
      <div class="study-header">
        <button class="btn-back" onclick="endStudyEarly()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div class="study-topic-name">${topic.icon} ${topic.name}</div>
        <div class="study-counter">${current + 1} / ${totalDue}</div>
      </div>

      <!-- Progress -->
      <div class="study-progress-bar">
        <div class="study-progress-fill" style="width: ${progress}%; background: ${topic.color}"></div>
      </div>

      <!-- Card state badges -->
      <div class="card-state-row">
        <span class="state-pill state-${card.state}">${card.state.toUpperCase()}</span>
        ${card.interval > 0 ? `<span class="interval-pill">⏱ ôn lại sau ${card.interval} ngày</span>` : '<span class="interval-pill">⏱ lần đầu tiên</span>'}
      </div>

      <!-- FLASHCARD -->
      <div class="flashcard-container" id="flashcard-container">
        <div class="flashcard ${studySession.flipped ? 'flipped' : ''}" id="flashcard" onclick="flipCard()">
          <div class="card-front">
            <div class="card-inner-front">
              ${settings.showPhonetic ? `<div class="card-phonetic">${word.phonetic}</div>` : ''}
              <div class="card-word">${word.word}</div>
              <div class="card-pos">${word.pos}</div>
              <div class="card-tap-hint">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                Nhấn để lật thẻ
              </div>
            </div>
          </div>
          <div class="card-back">
            <div class="card-inner-back">
              <div class="card-word-small">${word.word}</div>
              <div class="card-meaning">${word.meaning}</div>
              ${settings.showExample ? `<div class="card-example">"${word.example}"</div>` : ''}
              <button class="btn-tts" onclick="speakWord(event, '${word.word}')">
                🔊 Phát âm
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Rating buttons (only shown after flip) -->
      <div class="rating-section ${studySession.flipped ? 'visible' : 'hidden'}" id="rating-section">
        <p class="rating-label">Bạn nhớ từ này tốt đến đâu?</p>
        <div class="rating-buttons">
          <button class="rating-btn again" onclick="rateCard(0)">
            <span class="rating-icon">😰</span>
            <span class="rating-name">Again</span>
            <span class="rating-time">&lt;1m</span>
          </button>
          <button class="rating-btn hard" onclick="rateCard(1)">
            <span class="rating-icon">😓</span>
            <span class="rating-name">Hard</span>
            <span class="rating-time">&lt;10m</span>
          </button>
          <button class="rating-btn good" onclick="rateCard(2)">
            <span class="rating-icon">🙂</span>
            <span class="rating-name">Good</span>
            <span class="rating-time">${card.interval > 0 ? card.interval + 'd' : '1d'}</span>
          </button>
          <button class="rating-btn easy" onclick="rateCard(3)">
            <span class="rating-icon">😄</span>
            <span class="rating-name">Easy</span>
            <span class="rating-time">${card.interval > 0 ? Math.round(card.interval * 1.3 * card.easeFactor) + 'd' : '4d'}</span>
          </button>
        </div>
      </div>
    </div>
  `;
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

  document.getElementById("learn-content").innerHTML = `
    <div class="finish-screen">
      <div class="finish-animation">🎉</div>
      <h2 class="finish-title">Hoàn thành buổi học!</h2>
      <p class="finish-sub">Tuyệt vời! Bạn đã hoàn thành buổi học hôm nay.</p>
      <div class="finish-stats">
        <div class="finish-stat">
          <div class="finish-stat-val">${reviewed}</div>
          <div class="finish-stat-lbl">Thẻ đã ôn</div>
        </div>
        <div class="finish-stat">
          <div class="finish-stat-val">${mins < 1 ? '<1' : Math.round(mins)}</div>
          <div class="finish-stat-lbl">Phút học</div>
        </div>
        <div class="finish-stat">
          <div class="finish-stat-val">${db.stats.streakDays}</div>
          <div class="finish-stat-lbl">Chuỗi ngày 🔥</div>
        </div>
      </div>
      <button class="btn-primary" onclick="renderLearnList()">Quay lại danh sách</button>
    </div>
  `;
  studySession = null;
}

function showNoCardsModal(topic) {
  // Find next due time
  const prog = db.getTopicProgress(topic.id);
  document.getElementById("learn-content").innerHTML = `
    <div class="finish-screen">
      <div class="finish-animation">✅</div>
      <h2 class="finish-title">Đã ôn xong hôm nay!</h2>
      <p class="finish-sub">Không có thẻ nào cần ôn tập cho <strong>${topic.name}</strong> lúc này.</p>
      <div class="finish-stats">
        <div class="finish-stat">
          <div class="finish-stat-val">${prog.known}</div>
          <div class="finish-stat-lbl">Đã thuộc</div>
        </div>
        <div class="finish-stat">
          <div class="finish-stat-val">${prog.learning}</div>
          <div class="finish-stat-lbl">Đang học</div>
        </div>
        <div class="finish-stat">
          <div class="finish-stat-val">${prog.new}</div>
          <div class="finish-stat-lbl">Từ mới</div>
        </div>
      </div>
      <button class="btn-primary" onclick="renderLearnList()">Quay lại danh sách</button>
    </div>
  `;
}

// ============================================================
// SETTINGS TAB
// ============================================================
function renderSettings() {
  const s = db.settings;

  document.getElementById("settings-content").innerHTML = `
    <div class="settings-header">
      <h2 class="settings-title">⚙️ Cài đặt</h2>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">Học tập</div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">Thẻ mới mỗi ngày</span>
          <span class="setting-desc">Số thẻ từ mới tối đa được giới thiệu mỗi ngày</span>
        </div>
        <div class="setting-control">
          <input type="number" class="setting-input" id="set-daily-new"
            value="${s.dailyNewCards}" min="1" max="100"
            onchange="saveSetting('dailyNewCards', +this.value)">
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">Giới hạn ôn tập mỗi ngày</span>
          <span class="setting-desc">Số lần ôn tập tối đa trong một ngày</span>
        </div>
        <div class="setting-control">
          <input type="number" class="setting-input" id="set-daily-review"
            value="${s.dailyReviewLimit}" min="10" max="500"
            onchange="saveSetting('dailyReviewLimit', +this.value)">
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">Thứ tự học</span>
          <span class="setting-desc">Thứ tự hiển thị các thẻ cần ôn</span>
        </div>
        <div class="setting-control">
          <select class="setting-select" id="set-order"
            onchange="saveSetting('studyOrder', this.value)">
            <option value="due" ${s.studyOrder==="due"?"selected":""}>Theo ngày cần ôn</option>
            <option value="random" ${s.studyOrder==="random"?"selected":""}>Ngẫu nhiên</option>
            <option value="alphabetical" ${s.studyOrder==="alphabetical"?"selected":""}>Theo bảng chữ cái</option>
          </select>
        </div>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">Hiển thị</div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">Hiện phiên âm</span>
          <span class="setting-desc">Hiển thị phiên âm ở mặt trước của thẻ</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="set-phonetic"
            ${s.showPhonetic ? "checked" : ""}
            onchange="saveSetting('showPhonetic', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">Hiện câu ví dụ</span>
          <span class="setting-desc">Hiển thị câu ví dụ ở mặt sau của thẻ</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="set-example"
            ${s.showExample ? "checked" : ""}
            onchange="saveSetting('showExample', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">Dữ liệu</div>

      <div class="setting-item clickable" onclick="exportData()">
        <div class="setting-info">
          <span class="setting-name">📤 Xuất dữ liệu</span>
          <span class="setting-desc">Tải tiến độ học tập của bạn dưới dạng JSON</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>

      <div class="setting-item clickable" onclick="document.getElementById('import-file').click()">
        <div class="setting-info">
          <span class="setting-name">📥 Nhập dữ liệu</span>
          <span class="setting-desc">Khôi phục tiến độ từ file JSON</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        <input type="file" id="import-file" accept=".json" style="display:none" onchange="importData(event)">
      </div>

      <div class="setting-item clickable danger" onclick="confirmReset()">
        <div class="setting-info">
          <span class="setting-name">🗑️ Xóa toàn bộ tiến độ</span>
          <span class="setting-desc">Xóa vĩnh viễn tất cả dữ liệu học tập</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">Thông tin ứng dụng</div>
      <div class="about-card">
        <div class="about-logo">⚡</div>
        <div class="about-info">
          <div class="about-name">FlashCard Lite</div>
          <div class="about-ver">v1.0.0 • Powered by SM-2 Algorithm</div>
          <div class="about-desc">Học từ vựng nhanh hơn với phương pháp lặp lại ngắt quãng có cơ sở khoa học — thuật toán tương tự Anki.</div>
        </div>
      </div>
    </div>

    <!-- Reset confirmation modal -->
    <div id="reset-modal" class="modal-overlay" style="display:none" onclick="closeResetModal(event)">
      <div class="modal-box">
        <div class="modal-icon">⚠️</div>
        <h3 class="modal-title">Xóa toàn bộ tiến độ?</h3>
        <p class="modal-text">Thao tác này sẽ xóa tất cả trạng thái thẻ, chuỗi ngày học và lịch sử học tập. Không thể hoàn tác.</p>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="document.getElementById('reset-modal').style.display='none'">Hủy</button>
          <button class="btn-danger" onclick="doReset()">Xóa tất cả</button>
        </div>
      </div>
    </div>
  `;
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

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  // Tab buttons
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Initial render
  renderHome();
});
