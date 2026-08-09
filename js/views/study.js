// ============================================================
// STUDY.JS (VIEW LAYER)
// Vai trò: Định nghĩa các template HTML phục vụ phiên học thẻ chi tiết
// Chức năng:
//  - Vẽ thẻ từ vựng lật 3D (mặt trước: từ mới, phiên âm; mặt sau: giải nghĩa, ví dụ, nút phát âm)
//  - Hiển thị 4 nút đánh giá khả năng nhớ (Again, Hard, Good, Easy) dựa trên cấu hình SM-2
//  - Hiển thị màn hình báo cáo kết quả sau khi hoàn thành buổi học (Finish Screen)
//  - Hiển thị màn hình thông báo khi đã hoàn thành ôn tập hết thẻ trong ngày (No Cards Screen)
// ============================================================
if (!window.TEMPLATES) window.TEMPLATES = {};

window.TEMPLATES.studySession = function(studySession, settings, progress, card) {
  const { queue, current, topic, flipped } = studySession;
  const { word } = queue[current];
  return `
    <div class="study-session">
      <!-- Back + Topic name -->
      <div class="study-header">
        <button class="btn-back" onclick="endStudyEarly()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div class="study-topic-name">${topic.icon} ${topic.name}</div>
        <div class="study-counter">${current + 1} / ${studySession.totalDue}</div>
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
        <div class="flashcard ${flipped ? 'flipped' : ''}" id="flashcard" onclick="flipCard()">
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline-block; vertical-align:middle; margin-right:4px;">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
                Phát âm
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Rating buttons (only shown after flip) -->
      <div class="rating-section ${flipped ? 'visible' : 'hidden'}" id="rating-section">
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
};

window.TEMPLATES.finishScreen = function(reviewed, mins, streakDays) {
  return `
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
          <div class="finish-stat-val">${streakDays}</div>
          <div class="finish-stat-lbl">Chuỗi ngày 🔥</div>
        </div>
      </div>
      <button class="btn-primary" onclick="renderLearnList()">Quay lại danh sách</button>
    </div>
  `;
};

window.TEMPLATES.noCardsScreen = function(topic, prog) {
  return `
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
};
