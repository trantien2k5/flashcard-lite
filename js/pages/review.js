// ================================================================
// PAGES/REVIEW.JS — Tab Ôn tập
// Dashboard hành động nhanh: Tổng quan số thẻ ôn tập, nút ôn tập FSRS
// toàn cục và lưới 3 chế độ luyện tập nâng cao.
// ================================================================

if (!window.TEMPLATES) window.TEMPLATES = {};

window.TEMPLATES.review = function (stats, totalDue, known, learning, totalWords, totalLearned) {
  const streakColor = stats.streakDays >= 7 ? "#f97316" : stats.streakDays >= 3 ? "#fbbf24" : "#6366f1";
  const pct = totalWords > 0 ? Math.round((totalLearned / totalWords) * 100) : 0;

  return `
    <div class="greeting-header">
      <h1 class="greeting-text">${getGreeting()}</h1>
      <p class="greeting-sub">Hôm nay bạn muốn ôn tập gì? 🎯</p>
    </div>

    <!-- KHỐI 1: TỔNG QUAN ÔN TẬP -->
    <div class="today-block">
      <div class="today-block-title">📊 Tiến trình học tập</div>
      <div class="today-stats-row">
        <div class="today-stat">
          <div class="today-stat-val" style="color: #fbbf24;">${totalDue}</div>
          <div class="today-stat-lbl">Cần ôn tới hạn</div>
        </div>
        <div class="today-divider"></div>
        <div class="today-stat">
          <div class="today-stat-val" style="color: ${streakColor}">🔥 ${stats.streakDays}</div>
          <div class="today-stat-lbl">Ngày streak</div>
        </div>
        <div class="today-divider"></div>
        <div class="today-stat">
          <div class="today-stat-val" style="color: #3b82f6;">${pct}%</div>
          <div class="today-stat-lbl">Tiến trình</div>
        </div>
      </div>
      
      <button class="btn-start-study" onclick="openGlobalStudySession()" style="margin-top: 20px; background: var(--gradient-primary); width: 100%;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Ôn tập thẻ tới hạn (FSRS)
      </button>
    </div>

    <!-- KHỐI 2: CÁC CHẾ ĐỘ LUYỆN TẬP KHÁC -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">🧠 Chế độ luyện tập khác</span>
      </div>
      
      <div class="practice-modes-list">
        <div class="practice-mode-card" onclick="openPracticeConfig('multiple-choice')">
          <div class="practice-mode-icon">🎯</div>
          <div class="practice-mode-info">
            <div class="practice-mode-name">Trắc nghiệm từ vựng</div>
            <div class="practice-mode-desc">Chọn nghĩa tiếng Việt đúng. Phù hợp để phản xạ nhanh nghĩa từ.</div>
          </div>
          <div class="practice-mode-arrow">➔</div>
        </div>

        <div class="practice-mode-card" onclick="openPracticeConfig('typing')">
          <div class="practice-mode-icon">⌨️</div>
          <div class="practice-mode-info">
            <div class="practice-mode-name">Gõ từ vựng</div>
            <div class="practice-mode-desc">Nhìn nghĩa tiếng Việt và ví dụ che để gõ lại từ tiếng Anh chính xác.</div>
          </div>
          <div class="practice-mode-arrow">➔</div>
        </div>

        <div class="practice-mode-card" onclick="openPracticeConfig('dictation')">
          <div class="practice-mode-icon">🎧</div>
          <div class="practice-mode-info">
            <div class="practice-mode-name">Nghe chép chính tả</div>
            <div class="practice-mode-desc">Nghe phát âm chuẩn giọng bản xứ của từ vựng và chép lại chính tả.</div>
          </div>
          <div class="practice-mode-arrow">➔</div>
        </div>
      </div>
    </div>
  `;
};

function renderReview() {
  const stats = db.stats;
  const { known, learning } = db.getTotalWordStats();
  const totalWords = TOPICS.reduce((s, t) => s + t.words.length, 0);
  const totalLearned = known + learning;
  const totalDue = TOPICS.reduce((sum, topic) => sum + db.getDueCards(topic.id, topic).length, 0);

  const container = document.getElementById("review-content");
  container.classList.add("review-dashboard");
  container.innerHTML = TEMPLATES.review(stats, totalDue, known, learning, totalWords, totalLearned);
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
