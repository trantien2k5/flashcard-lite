// ================================================================
// PAGES/TOPICS.JS — Tab Chủ đề
// Danh sách chủ đề từ vựng + khởi tạo phiên học khi bấm vào 1 chủ đề
// (openTopicStudy điều phối sang pages/study.js qua `studySession`
// trong core.js). Chỉ chứa logic của tab này — không chứa thuật toán
// hay lưu trữ dữ liệu.
// ================================================================

if (!window.TEMPLATES) window.TEMPLATES = {};

window.TEMPLATES.topics = function () {
  return `
    <div class="topics-header">
      <h2 class="topics-title">Chủ đề từ vựng</h2>
      <p class="topics-subtitle">Chọn một chủ đề để bắt đầu học</p>
    </div>
    <div class="topic-grid">
      ${TOPICS.map((topic) => {
        const prog = db.getTopicProgress(topic.id);
        const pct = Math.round(((prog.known + prog.learning) / prog.total) * 100);
        const due = db.getDueCards(topic.id, topic).length;
        return `
        <div class="topic-card" onclick="openTopicStudy('${topic.id}')" style="--topic-color: ${topic.color}">
          <div class="topic-icon-area">
            <span class="topic-emoji">${topic.icon}</span>
          </div>
          <div class="topic-info-area">
            <div class="topic-title-row">
              <h3 class="topic-card-name">${topic.name}</h3>
              ${due > 0 ? `<span class="due-badge">${due} cần ôn</span>` : pct === 100 ? '<span class="done-badge">✓ Xong</span>' : ""}
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
function renderTopics() {
  document.getElementById("topics-content").innerHTML = TEMPLATES.topics();
}
function openTopicStudy(topicId) {
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic) return;

  const dueCards = db.getDueCards(topicId, topic);

  if (dueCards.length === 0) {
    showNoCardsModal(topic);
    return;
  }

  // Map word data
  const queue = dueCards
    .map((card) => ({
      card,
      word: topic.words.find((w) => w.id === card.wordId),
    }))
    .filter((item) => item.word);

  applyStudyOrder(queue, db.settings.studyOrder);

  studySession = {
    topicId,
    topic,
    queue,
    totalDue: queue.length,
    current: 0,
    reviewed: 0,
    startTime: Date.now(),
    flipped: false,
    history: [],
  };

  setStudyFocusMode(true);
  renderStudySession();
}
