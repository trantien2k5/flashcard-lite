// ================================================================
// FEATURES/HOME/HOME.JS — Tab Trang chủ
// Dashboard hành động nhanh: hôm nay cần học gì, tổng tiến độ, tổng
// quan chủ đề để bấm học ngay.
// ================================================================

if (!window.TEMPLATES) window.TEMPLATES = {};

window.TEMPLATES.home = function (stats, todo, known, learning, totalWords, totalLearned) {
  // Vòng tròn mục tiêu từ mới hôm nay — dailyNewCards giờ chỉ là mục tiêu hiển thị,
  // không giới hạn cứng số từ thật sự học được (xem db.getDueCards).
  const goalPct = todo.newGoal > 0 ? Math.min(100, Math.round((todo.newStartedToday / todo.newGoal) * 100)) : 100;
  const goalDone = todo.newGoal > 0 && todo.newStartedToday >= todo.newGoal;
  const RING_R = 26;
  const RING_CIRC = 2 * Math.PI * RING_R;
  const ringOffset = RING_CIRC * (1 - goalPct / 100);

  const streakColor = stats.streakDays >= 7 ? "#f97316" : stats.streakDays >= 3 ? "#fbbf24" : "#6366f1";

  return `
    <div class="home-header">
      <h1 class="greeting-text">${getGreeting()}</h1>
      <p class="greeting-sub">Tiếp tục phát huy nhé! 🎯</p>
    </div>

    <!-- KHỐI 1: HÔM NAY CẦN LÀM GÌ -->
    <div class="today-block">
      <div class="today-block-title">📋 Hôm nay cần làm gì?</div>
      <div class="today-stats-row">
        <div class="today-stat today-stat-ring">
          <div class="goal-ring-wrap">
            <svg class="goal-ring" width="64" height="64" viewBox="0 0 64 64">
              <circle class="goal-ring-track" cx="32" cy="32" r="${RING_R}"></circle>
              <circle class="goal-ring-fill ${goalDone ? "is-done" : ""}" cx="32" cy="32" r="${RING_R}"
                style="--circumference:${RING_CIRC}; --offset:${ringOffset}"></circle>
            </svg>
            <div class="goal-ring-center">${goalDone ? "✓" : todo.newStartedToday}</div>
          </div>
          <div class="today-stat-lbl">${goalDone ? "Từ mới: Xong! 🎉" : `Từ mới ${todo.newStartedToday}/${todo.newGoal}`}</div>
        </div>
        <div class="today-divider"></div>
        <div class="today-stat">
          <div class="today-stat-val" style="color:#8b5cf6">${todo.reviewCount}</div>
          <div class="today-stat-lbl">Cần ôn đến hạn</div>
        </div>
        <div class="today-divider"></div>
        <div class="today-stat">
          <div class="today-stat-val" style="color:${streakColor}">🔥 ${stats.streakDays}</div>
          <div class="today-stat-lbl">Ngày streak</div>
        </div>
      </div>
      <button class="btn-start-study" onclick="switchTab('learn')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Bắt đầu học
      </button>
    </div>

    <!-- KHỐI 2: TỔNG TIẾN ĐỘ -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">📈 Tổng tiến độ</span>
        <span class="section-badge">${totalLearned}/${totalWords} từ</span>
      </div>
      <div class="total-progress-details">
        <div class="progress-detail-row">
          <span>📚 Đã học</span>
          <span class="val-primary">${totalLearned.toLocaleString()} từ</span>
        </div>
        <div class="progress-detail-row line-learning">
          <span>📖 Đang học</span>
          <span class="val-learning">${learning.toLocaleString()} từ</span>
        </div>
        <div class="progress-detail-row line-mastered">
          <span>🏆 Đã thành thạo</span>
          <span class="val-mastered">${known.toLocaleString()} từ</span>
        </div>
        <div class="progress-detail-row line-time">
          <span>⏱️ Tổng thời gian tích lũy</span>
          <span class="val-time">${formatMinutes(stats.totalStudyMinutes)}</span>
        </div>
      </div>
      <div class="progress-bar-wrap" style="margin-top:14px; margin-bottom:0">
        <div class="progress-bar" style="width:${totalWords > 0 ? Math.round((totalLearned / totalWords) * 100) : 0}%"></div>
      </div>
    </div>

    <!-- Tổng quan chủ đề — chỉ 3 chủ đề đại diện (cần ôn nhiều nhất, rồi tới ít
         tiến độ nhất), xem đủ 30 chủ đề thì bấm "Học ngay" sang tab Learn. -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">🗂️ Chủ đề</span>
        <button class="btn-text" onclick="switchTab('learn')">Học ngay →</button>
      </div>
      <div class="topic-overview-list">
        ${TOPICS.map((t) => {
          const prog = db.getTopicProgress(t.id);
          const pct = Math.round(((prog.known + prog.learning) / prog.total) * 100);
          const due = db.getDueCards(t.id, t).length;
          return { t, pct, due };
        })
          .sort((a, b) => b.due - a.due || a.pct - b.pct)
          .slice(0, 3)
          .map(
            ({ t, pct, due }) => `
          <div class="topic-overview-item">
            <span class="topic-icon-sm">${t.icon}</span>
            <div class="topic-info">
              <span class="topic-name-sm">${t.name}</span>
              <div class="mini-progress">
                <div class="mini-bar" style="width:${pct}%; background:${t.color}"></div>
              </div>
            </div>
            ${due > 0 ? `<span class="due-badge">${due} cần ôn</span>` : ""}
            <span class="topic-pct" style="color:${t.color}">${pct}%</span>
          </div>`,
          )
          .join("")}
      </div>
    </div>
  `;
};
function renderHome() {
  const stats = db.stats;
  const todo = db.getDailyTodo();
  const { known, learning } = db.getTotalWordStats();
  const totalWords = TOPICS.reduce((s, t) => s + t.words.length, 0);
  const totalLearned = known + learning;

  document.getElementById("home-content").innerHTML = TEMPLATES.home(stats, todo, known, learning, totalWords, totalLearned);
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
