// ================================================================
// PAGES/STATS.JS — Tab Thống kê
// Streak, độ chính xác, dự báo FSRS, từ cần lưu ý, thành tích, thống
// kê tuần, heatmap hoạt động 30 ngày. Chỉ chứa logic của tab này
// (template HTML + render) — mọi số liệu lấy qua các query của `db`
// (storage.js), không tự tính toán FSRS ở đây.
// ================================================================

if (!window.TEMPLATES) window.TEMPLATES = {};

window.TEMPLATES.stats = function (stats, totalLearned, monthlyData, weakData, accuracy, streakRecord, streakColor, fsrs, weeklySummary) {
  // Lấy tiến trình Tài chính & Ngân hàng (dùng cho thành tích "hoàn thành chủ đề")
  const financeProg = db.getTopicProgress("topic_finance_banking") || { known: 0, learning: 0, total: 100 };
  const financePct = Math.round(((financeProg.known + financeProg.learning) / financeProg.total) * 100);

  return `
    <div class="greeting-header">
      <h1 class="greeting-text">📊 Thống kê</h1>
      <p class="greeting-sub">Theo dõi tiến trình và hiệu quả học tập của bạn</p>
    </div>

    <!-- KHỐI 1: STREAK & ĐỘ CHÍNH XÁC -->
    <div class="stats-grid-2">
      <div class="stat-card-v2" style="--accent: ${streakColor}">
        <div class="stat-card-v2-lbl" style="margin-bottom: 12px; font-size: 14px; font-weight: 800; color: var(--accent);">Streak</div>
        <div class="streak-line-primary">
          <span>🔥</span> Chuỗi học: ${stats.streakDays} ngày
        </div>
        <div class="streak-line-secondary">
          <span>🏆</span> Kỷ lục: ${streakRecord} ngày
        </div>
      </div>
      <div class="stat-card-v2" style="--accent: #a78bfa">
        <div class="stat-card-top">
          <span class="stat-emoji">🎯</span>
          <span class="stat-card-v2-val">${accuracy !== null ? accuracy + "%" : "—"}</span>
        </div>
        <div class="stat-card-v2-lbl">Độ chính xác</div>
        <div class="stat-card-v2-sub">7 ngày gần nhất</div>
      </div>
    </div>

    <!-- KHỐI 2: DỰ BÁO FSRS -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">🔮 Dự báo trí nhớ FSRS</span>
        <span class="section-badge badge-fsrs">FSRS v6</span>
      </div>
      <div class="fsrs-desc">
        Phân tích độ ổn định ký ức dựa trên lịch sử để dự báo khả năng ghi nhớ thực tế của bạn theo thời gian.
      </div>
      <div class="fsrs-card">
        <span class="fsrs-card-lbl">Khả năng nhớ hiện tại:</span>
        <span class="fsrs-card-val">${fsrs.current !== null ? fsrs.current + "%" : "—"}</span>
      </div>
      <div class="fsrs-forecast-lines">
        <div class="forecast-row">
          <span>📅 Dự kiến 7 ngày tới:</span>
          <span class="forecast-val day7">${fsrs.day7 !== null ? fsrs.day7 + "%" : "—"}</span>
        </div>
        <div class="forecast-row">
          <span>📅 Dự kiến 30 ngày tới:</span>
          <span class="forecast-val day30">${fsrs.day30 !== null ? fsrs.day30 + "%" : "—"}</span>
        </div>
        <div class="forecast-row">
          <span>📅 Dự kiến 90 ngày tới:</span>
          <span class="forecast-val day90">${fsrs.day90 !== null ? fsrs.day90 + "%" : "—"}</span>
        </div>
      </div>
    </div>

    <!-- KHỐI 3: TỪ YẾU -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">⚠️ Từ cần lưu ý</span>
        <span class="section-badge badge-weak">${weakData.count} từ yếu nhất</span>
      </div>
      <div class="weak-words-list">
        ${
          weakData.count > 0
            ? weakData.words
                .slice(0, 3)
                .map(
                  (w) => `
          <div class="weak-word-item">
            <span class="weak-word-text">${w.word}</span>
            <span class="weak-word-lapses">Quên: ${w.lapses} lần</span>
          </div>
        `,
                )
                .join("")
            : ""
        }
        ${weakData.count === 0 ? `<div class="weak-empty">Tuyệt vời! Bạn không có từ nào bị yếu.</div>` : ""}
      </div>
    </div>

    <!-- KHỐI 4: THÀNH TÍCH -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">🏆 Thành tích</span>
      </div>
      <div class="achievements-list">
        <div class="achievement-item ${totalLearned >= 100 ? "unlocked" : "locked"}">
          <span class="achievement-icon">${totalLearned >= 100 ? "🏅" : "🔒"}</span>
          <div class="achievement-info">
            <span class="achievement-name">100 từ đầu tiên</span>
            <span class="achievement-sub">${totalLearned >= 100 ? "Đã đạt được!" : `Tiến trình: ${totalLearned}/100 từ`}</span>
          </div>
        </div>
        <div class="achievement-item ${streakRecord >= 7 ? "unlocked" : "locked"}">
          <span class="achievement-icon">${streakRecord >= 7 ? "🏅" : "🔒"}</span>
          <div class="achievement-info">
            <span class="achievement-name">Streak 7 ngày</span>
            <span class="achievement-sub">${streakRecord >= 7 ? "Đã đạt được!" : `Kỷ lục hiện tại: ${streakRecord}/7 ngày`}</span>
          </div>
        </div>
        <div class="achievement-item ${financePct === 100 ? "unlocked" : "locked"}">
          <span class="achievement-icon">${financePct === 100 ? "🏅" : "🔒"}</span>
          <div class="achievement-info">
            <span class="achievement-name">Hoàn thành chủ đề Tài chính & Ngân hàng</span>
            <span class="achievement-sub">${financePct === 100 ? "Đã đạt được!" : `Đã hoàn thành: ${financePct}%`}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- KHỐI 5: THỐNG KÊ TUẦN -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">📊 Thống kê tuần</span>
        <span class="section-badge badge-weekly">7 ngày qua</span>
      </div>
      <div class="weekly-desc">
        Hiệu suất và số lượng từ vựng học tập tích lũy trong 7 ngày gần nhất.
      </div>
      <div class="weekly-stats-list">
        <div class="weekly-stat-row">
          <span>✓ Học từ mới</span>
          <span class="weekly-val">${weeklySummary.studied} từ</span>
        </div>
        <div class="weekly-stat-row">
          <span>✓ Ôn tập</span>
          <span class="weekly-val">${weeklySummary.reviewed} lượt</span>
        </div>
        <div class="weekly-stat-row">
          <span>✓ Độ chính xác</span>
          <span class="weekly-val">${weeklySummary.accuracy}%</span>
        </div>
      </div>
    </div>

    <!-- KHỐI 6: LỊCH HỌC (HEATMAP) -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">📅 Lịch học</span>
      </div>
      <div class="heatmap-grid">
        ${monthlyData
          .map(
            (d) => `
          <div class="heatmap-cell level-${d.level}" title="${d.date}: ${d.count} từ"></div>
        `,
          )
          .join("")}
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
  `;
};
function renderStats() {
  const stats = db.stats;
  const { known, learning } = db.getTotalWordStats();
  const totalLearned = known + learning;
  const monthlyData = db.getMonthlyActivity();
  const weakData = db.getWeakWords();
  const accuracy = db.getAccuracyRate(7);
  const streakRecord = stats.streakRecord || stats.streakDays || 0;
  const streakColor = stats.streakDays >= 7 ? "#f97316" : stats.streakDays >= 3 ? "#fbbf24" : "#6366f1";
  const fsrs = db.getFSRSPredictions();
  const weeklySummary = db.getWeeklySummary();

  document.getElementById("stats-content").innerHTML = TEMPLATES.stats(stats, totalLearned, monthlyData, weakData, accuracy, streakRecord, streakColor, fsrs, weeklySummary);
}
