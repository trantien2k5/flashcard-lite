// ============================================================
// LEARN.JS (VIEW LAYER)
// Vai trò: Định nghĩa template HTML cho danh sách chủ đề học tập
// Chức năng:
//  - Vẽ danh sách các chủ đề từ vựng dạng hàng ngang (List-based layout)
//  - Hiển thị tiến trình học tập cụ thể của từng chủ đề dưới dạng phần trăm (%)
//  - Hiển thị badge chỉ số các từ cần ôn tập (due cards)
// ============================================================
if (!window.TEMPLATES) window.TEMPLATES = {};

window.TEMPLATES.learnList = function() {
  return `
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
          <div class="topic-icon-area">
            <span class="topic-emoji">${topic.icon}</span>
          </div>
          <div class="topic-info-area">
            <div class="topic-title-row">
              <h3 class="topic-card-name">${topic.name}</h3>
              ${due > 0 ? `<span class="due-badge">${due} cần ôn</span>` : (pct === 100 ? '<span class="done-badge">✓ Xong</span>' : '')}
            </div>
            <p class="topic-card-desc">${topic.description}</p>
            
            <div class="topic-progress-row">
              <div class="topic-progress-bar">
                <div class="topic-progress-fill" style="width:${pct}%; background:${topic.color}"></div>
              </div>
              <span class="topic-progress-pct" style="color:${topic.color}">${pct}%</span>
            </div>
            
            <div class="topic-card-meta">
              <span>${prog.total} từ vựng</span>
            </div>
          </div>
        </div>`;
      }).join("")}
    </div>
  `;
};
