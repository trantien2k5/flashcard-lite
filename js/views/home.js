// ============================================================
// HOME.JS (VIEW LAYER)
// Vai trò: Định nghĩa template HTML giao diện cho Tab Trang chủ (Home)
// Chức năng:
//  - Hiển thị widget tiến độ học tập hàng ngày
//  - Vẽ biểu đồ lịch sử 30 ngày (Activity Heatmap)
//  - Thống kê tổng số từ, trạng thái học và danh sách rút gọn các chủ đề
// ============================================================
if (!window.TEMPLATES) window.TEMPLATES = {};

window.TEMPLATES.home = function(stats, todo, progress, known, learning, newCount, totalWords, totalLearned, monthlyData, weakData, accuracy, streakRecord, streakColor) {
  return `
    <div class="home-header">
      <h1 class="greeting-text">${getGreeting()}</h1>
      <p class="greeting-sub">Tiếp tục phát huy nhé! 🎯</p>
    </div>

    <!-- 1. HÔM NAY CẦN LÀM GÌ — khối lớn nhất, đầu tiên -->
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
          <div class="word-stat-val" style="color:#8b5cf6">${totalWords - totalLearned}</div>
          <div class="word-stat-lbl">Chưa học</div>
        </div>
      </div>
      <div class="progress-bar-wrap" style="margin-top:12px; margin-bottom:0">
        <div class="progress-bar" style="width:${Math.round(known/totalWords*100)}%"></div>
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
