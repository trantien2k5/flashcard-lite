// ============================================================
// HOME.JS (VIEW LAYER)
// Vai trò: Định nghĩa template HTML cho trang chủ Dashboard
// Chức năng:
//  - Vẽ bảng trạng thái học tập hôm nay (Hôm nay cần làm gì)
//  - Vẽ lưới thông số phụ (Streak, Độ chính xác)
//  - Vẽ dự báo FSRS (Khả năng nhớ hiện tại & tương lai)
//  - Vẽ biểu đồ đóng góp (Heatmap) 30 ngày gần nhất
//  - Vẽ danh sách các từ vựng yếu cần chú ý
//  - Vẽ tổng quan các chủ đề và tỷ lệ hoàn thành
//  - Vẽ danh sách thành tích (Achievements) mở khóa
//  - Vẽ thống kê học tập theo tuần
// ============================================================
if (!window.TEMPLATES) window.TEMPLATES = {};

window.TEMPLATES.home = function(stats, todo, progress, known, learning, newCount, totalWords, totalLearned, monthlyData, weakData, accuracy, streakRecord, streakColor, fsrs, weeklySummary) {
  // Lấy tiến trình Finance & Banking
  const financeProg = db.getTopicProgress('topic_finance') || { known: 0, learning: 0, total: 20 };
  const financePct = Math.round((financeProg.known + financeProg.learning) / financeProg.total * 100);

  return `
    <div class="home-header">
      <h1 class="greeting-text">${getGreeting()}</h1>
      <p class="greeting-sub">Tiếp tục phát huy nhé! 🎯</p>
    </div>

    <!-- KHỐI 1: HÔM NAY CẦN LÀM GÌ -->
    <div class="today-block">
      <div class="today-block-title">📋 Hôm nay cần làm gì?</div>
      <div class="today-stats-row">
        <div class="today-stat">
          <div class="today-stat-val" style="color:#8b5cf6">${todo.reviewCount}</div>
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
          <div class="today-stat-lbl">Phút ước tính</div>
        </div>
      </div>
      <button class="btn-start-study" onclick="switchTab('learn')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Bắt đầu học
      </button>
    </div>

    <!-- KHỐI 2: STREAK & ĐỘ CHÍNH XÁC -->
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
          <span class="stat-card-v2-val">${accuracy !== null ? accuracy + '%' : '—'}</span>
        </div>
        <div class="stat-card-v2-lbl">Độ chính xác</div>
        <div class="stat-card-v2-sub">7 ngày gần nhất</div>
      </div>
    </div>

    <!-- KHỐI 3: TỔNG TIẾN ĐỘ -->
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
        <div class="progress-bar" style="width:${totalWords > 0 ? Math.round(totalLearned/totalWords*100) : 0}%"></div>
      </div>
    </div>

    <!-- KHỐI 4: DỰ BÁO FSRS -->
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
        <span class="fsrs-card-val">${fsrs.current !== null ? fsrs.current + '%' : '—'}</span>
      </div>
      <div class="fsrs-forecast-lines">
        <div class="forecast-row">
          <span>📅 Dự kiến 7 ngày tới:</span>
          <span class="forecast-val day7">${fsrs.day7 !== null ? fsrs.day7 + '%' : '—'}</span>
        </div>
        <div class="forecast-row">
          <span>📅 Dự kiến 30 ngày tới:</span>
          <span class="forecast-val day30">${fsrs.day30 !== null ? fsrs.day30 + '%' : '—'}</span>
        </div>
        <div class="forecast-row">
          <span>📅 Dự kiến 90 ngày tới:</span>
          <span class="forecast-val day90">${fsrs.day90 !== null ? fsrs.day90 + '%' : '—'}</span>
        </div>
      </div>
    </div>

    <!-- KHỐI 5: TỪ YẾU -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">⚠️ Từ cần lưu ý</span>
        <span class="section-badge badge-weak">${weakData.count} từ yếu nhất</span>
      </div>
      <div class="weak-words-list">
        ${weakData.count > 0 ? weakData.words.slice(0, 3).map(w => `
          <div class="weak-word-item">
            <span class="weak-word-text">${w.word}</span>
            <span class="weak-word-lapses">Lapses: ${w.lapses}</span>
          </div>
        `).join("") : ""}
        ${weakData.count === 0 ? `<div class="weak-empty">Tuyệt vời! Bạn không có từ nào bị yếu.</div>` : ''}
      </div>
    </div>

    <!-- KHỐI 6: THÀNH TÍCH -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">🏆 Thành tích</span>
      </div>
      <div class="achievements-list">
        <div class="achievement-item ${totalLearned >= 100 ? 'unlocked' : 'locked'}">
          <span class="achievement-icon">${totalLearned >= 100 ? '🏅' : '🔒'}</span>
          <div class="achievement-info">
            <span class="achievement-name">100 từ đầu tiên</span>
            <span class="achievement-sub">${totalLearned >= 100 ? 'Đã đạt được!' : `Tiến trình: ${totalLearned}/100 từ`}</span>
          </div>
        </div>
        <div class="achievement-item ${streakRecord >= 7 ? 'unlocked' : 'locked'}">
          <span class="achievement-icon">${streakRecord >= 7 ? '🏅' : '🔒'}</span>
          <div class="achievement-info">
            <span class="achievement-name">Streak 7 ngày</span>
            <span class="achievement-sub">${streakRecord >= 7 ? 'Đã đạt được!' : `Kỷ lục hiện tại: ${streakRecord}/7 ngày`}</span>
          </div>
        </div>
        <div class="achievement-item ${financePct === 100 ? 'unlocked' : 'locked'}">
          <span class="achievement-icon">${financePct === 100 ? '🏅' : '🔒'}</span>
          <div class="achievement-info">
            <span class="achievement-name">Hoàn thành chủ đề Finance</span>
            <span class="achievement-sub">${financePct === 100 ? 'Đã đạt được!' : `Đã hoàn thành: ${financePct}%`}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- KHỐI 7: THỐNG KÊ TUẦN -->
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

    <!-- KHỐI 8: LỊCH HỌC (HEATMAP) -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">📅 Lịch học</span>
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

    <!-- Tổng quan chủ đề -->
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
};
