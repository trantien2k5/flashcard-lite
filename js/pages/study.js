// ================================================================
// PAGES/STUDY.JS — Phiên học thẻ ghi nhớ
// Thẻ flashcard lật, các nút đánh giá Again/Hard/Good/Easy, màn hình
// hoàn thành/hết thẻ, phím tắt bàn phím, phát âm (Text-to-Speech).
// Chỉ chứa logic của màn hình này — gọi vào fsrs.js (previewNextInterval)
// và storage.js (db.updateCard) chứ không tự làm thay hai lớp đó.
// ================================================================

/** Định dạng khoảng ôn (đơn vị ngày, có thể lẻ) thành nhãn dễ đọc — "X phút" hoặc "X ngày". */
function formatIntervalLabel(days) {
  if (days < 1) return `${Math.round(days * 1440)} phút`;
  return `${Math.round(days)} ngày`;
}
if (!window.TEMPLATES) window.TEMPLATES = {};

window.TEMPLATES.studySession = function (studySession, settings, progress, card) {
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
        ${card.interval > 0 ? `<span class="interval-pill">⏱ ôn lại sau ${formatIntervalLabel(card.interval)}</span>` : '<span class="interval-pill">⏱ lần đầu tiên</span>'}
      </div>

      <!-- FLASHCARD -->
      <div class="flashcard-container" id="flashcard-container">
        <div class="flashcard ${flipped ? "flipped" : ""}" id="flashcard" onclick="flipCard()">
          <div class="card-front">
            <div class="card-inner-front">
              ${settings.showPhonetic ? `<div class="card-phonetic">${word.phonetic}</div>` : ""}
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
              ${settings.showExample ? `<div class="card-example">"${word.example}"</div>` : ""}
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
      <div class="rating-section ${flipped ? "visible" : "hidden"}" id="rating-section">
        <p class="rating-label">Bạn nhớ từ này tốt đến đâu?</p>
        <div class="rating-buttons">
          <button class="rating-btn again" onclick="rateCard(0)">
            <span class="rating-icon">😰</span>
            <span class="rating-name">Again</span>
            <span class="rating-time">${previewNextInterval(card, RATING.AGAIN)}</span>
          </button>
          <button class="rating-btn hard" onclick="rateCard(1)">
            <span class="rating-icon">😓</span>
            <span class="rating-name">Hard</span>
            <span class="rating-time">${previewNextInterval(card, RATING.HARD)}</span>
          </button>
          <button class="rating-btn good" onclick="rateCard(2)">
            <span class="rating-icon">🙂</span>
            <span class="rating-name">Good</span>
            <span class="rating-time">${previewNextInterval(card, RATING.GOOD)}</span>
          </button>
          <button class="rating-btn easy" onclick="rateCard(3)">
            <span class="rating-icon">😄</span>
            <span class="rating-name">Easy</span>
            <span class="rating-time">${previewNextInterval(card, RATING.EASY)}</span>
          </button>
        </div>
      </div>
    </div>
  `;
};

window.TEMPLATES.finishScreen = function (reviewed, mins, streakDays, history = [], isEarly = false) {
  // Lọc lấy trạng thái cuối cùng của mỗi từ trong phiên học
  const uniqueHistory = [];
  const seenWords = new Set();
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    if (!seenWords.has(item.word)) {
      seenWords.add(item.word);
      uniqueHistory.unshift(item);
    }
  }

  const title = isEarly ? "Tạm dừng buổi học" : "Hoàn thành buổi học!";
  const subtitle = isEarly ? "Tiến độ học tập của bạn đã được lưu lại thành công." : "Tuyệt vời! Bạn đã hoàn thành toàn bộ mục tiêu hôm nay.";
  const animation = isEarly ? "⏱️" : "🎉";

  return `
    <div class="finish-screen">
      <div class="finish-animation">${animation}</div>
      <h2 class="finish-title">${title}</h2>
      <p class="finish-sub">${subtitle}</p>
      
      <div class="finish-stats">
        <div class="finish-stat">
          <div class="finish-stat-val">${reviewed}</div>
          <div class="finish-stat-lbl">Thẻ đã ôn</div>
        </div>
        <div class="finish-stat">
          <div class="finish-stat-val">${mins < 0.1 ? "1m" : Math.round(mins) + "m"}</div>
          <div class="finish-stat-lbl">Phút học</div>
        </div>
        <div class="finish-stat">
          <div class="finish-stat-val">${streakDays}</div>
          <div class="finish-stat-lbl">Chuỗi ngày 🔥</div>
        </div>
      </div>

      ${
        uniqueHistory.length > 0
          ? `
        <div class="session-history-section">
          <div class="session-history-title">📊 Chi tiết trạng thái thẻ từ:</div>
          <div class="session-history-list">
            ${uniqueHistory
              .map((item) => {
                let statusText = "";
                let statusClass = "";
                if (item.state === "learning" || item.state === "relearning") {
                  statusText = item.rating === 0 ? "Chưa thuộc (ôn lại sau 1 phút)" : "Hơi nhớ (ôn lại sau 10 phút)";
                  statusClass = "history-learning";
                } else if (item.state === "review") {
                  statusText = `Đã thuộc (ôn lại sau ${item.interval} ngày)`;
                  statusClass = "history-review";
                }
                return `
                <div class="history-item">
                  <span class="history-word">${item.word}</span>
                  <span class="history-status ${statusClass}">${statusText}</span>
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      `
          : ""
      }

        <button class="btn-primary" onclick="exitStudy()" style="margin-top: 24px;">Quay lại danh sách</button>
    </div>
  `;
};

window.TEMPLATES.noCardsScreen = function (topic, prog) {
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
      <button class="btn-primary" onclick="exitStudy()">Quay lại danh sách</button>
    </div>
  `;
};
/** Bật/tắt chế độ học tập trung: ẩn thanh nav dưới trong lúc đang lật thẻ để đỡ phân tâm. */
function setStudyFocusMode(active) {
  document.body.classList.toggle("study-focus", active);
}
/** Sắp xếp hàng đợi học theo cài đặt studyOrder ("due" giữ nguyên thứ tự learning→review→new). */
function applyStudyOrder(queue, studyOrder) {
  if (studyOrder === "random") {
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
  } else if (studyOrder === "alphabetical") {
    queue.sort((a, b) => a.word.word.localeCompare(b.word.word));
  }
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

  const containerId = studySession.topicId === "global" ? "review-content" : "topics-content";
  document.getElementById(containerId).innerHTML = TEMPLATES.studySession(studySession, settings, progress, card);
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

  // Update card via FSRS-6
  const updated = db.updateCard(word.id, rating);
  studySession.history.push({
    word: word.word,
    rating: rating,
    state: updated.state,
    interval: updated.interval,
  });

  // If Again/Hard (learning), optionally re-queue
  if (rating === RATING.AGAIN) {
    // Re-add to end of queue for this session
    studySession.queue.push({ card: db.getCard(word.id), word });
    studySession.totalDue++; // đếm thêm lượt ôn lại để thanh tiến độ không vượt quá 100%
  }

  studySession.current++;
  studySession.reviewed++;
  studySession.flipped = false;

  renderStudySession();
}
// ---- Phát âm (Text-to-Speech) ----
// Giọng đọc được chọn và cache SẴN (không dò lại mỗi lần bấm) để phát âm ngay lập tức.
let _ttsVoice = null;

/** Chấm điểm 1 giọng đọc, ưu tiên giọng tiếng Anh tự nhiên/chất lượng cao gần với người bản xứ nhất. */
function _scoreVoice(v) {
  if (!/^en/i.test(v.lang)) return -1; // không phải tiếng Anh -> loại
  const name = v.name.toLowerCase();
  let score = 0;
  if (name.includes("natural")) score += 100; // Microsoft "Online (Natural)" — tự nhiên nhất trên Windows/Edge
  if (name.includes("online")) score += 50; // giọng chạy trên mạng thường chất lượng cao hơn giọng cài sẵn máy
  if (name.includes("google")) score += 40; // Google US English (Chrome) — ổn định, khá tự nhiên
  if (v.lang.toLowerCase() === "en-us") score += 20; // ưu tiên giọng Mỹ
  if (!v.localService) score += 10;
  return score;
}

/** Quét danh sách giọng của trình duyệt và cache lại giọng tiếng Anh tốt nhất tìm được. */
function _loadBestVoice() {
  if (!("speechSynthesis" in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;
  _ttsVoice =
    voices
      .map((v) => ({ v, score: _scoreVoice(v) }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score)[0]?.v || null;
}

if ("speechSynthesis" in window) {
  _loadBestVoice();
  // Danh sách giọng thường nạp bất đồng bộ (nhất là lần đầu mở trang) -> cập nhật lại khi có sự kiện này
  window.speechSynthesis.onvoiceschanged = _loadBestVoice;
}

/**
 * Phát âm 1 từ tiếng Anh, tối ưu để bấm là đọc ngay, kể cả bấm liên tục (spam click)
 * cũng KHÔNG bị dồn hàng đợi hay trễ:
 *  - cancel() huỷ ngay câu đang đọc dở trước khi đọc từ mới (không xếp hàng chờ)
 *  - resume() ép engine phát ngay, né lỗi Chrome hay bị "kẹt" khi speak() gọi liền sau cancel()
 */
function speakWord(event, text) {
  event.stopPropagation();
  if (!("speechSynthesis" in window)) return;

  const synth = window.speechSynthesis;
  synth.cancel();

  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "en-US";
  utt.rate = 0.92;
  utt.pitch = 1;
  if (_ttsVoice) utt.voice = _ttsVoice;

  synth.speak(utt);
  synth.resume();
}
function endStudyEarly() {
  setStudyFocusMode(false);
  const containerId = (studySession && studySession.topicId === "global") ? "review-content" : "topics-content";

  if (!studySession || studySession.reviewed === 0) {
    const isGlobal = studySession && studySession.topicId === "global";
    studySession = null;
    if (isGlobal) renderReview();
    else renderTopics();
    return;
  }

  const mins = (Date.now() - studySession.startTime) / 60000;
  const reviewed = studySession.reviewed;
  db.recordStudySession(reviewed, Math.round(mins * 10) / 10);

  document.getElementById(containerId).innerHTML = TEMPLATES.finishScreen(reviewed, mins, db.stats.streakDays, studySession.history, true);
  studySession = null;
}
function finishStudySession() {
  setStudyFocusMode(false);
  const containerId = (studySession && studySession.topicId === "global") ? "review-content" : "topics-content";

  const mins = Math.round(((Date.now() - studySession.startTime) / 60000) * 10) / 10;
  const reviewed = studySession.reviewed;
  db.recordStudySession(reviewed, mins);

  document.getElementById(containerId).innerHTML = TEMPLATES.finishScreen(reviewed, mins, db.stats.streakDays, studySession.history, false);
  studySession = null;
}
function showNoCardsModal(topic) {
  const prog = db.getTopicProgress(topic.id);
  document.getElementById("topics-content").innerHTML = TEMPLATES.noCardsScreen(topic, prog);
}
function exitStudy() {
  setStudyFocusMode(false);
  const isGlobal = studySession && studySession.topicId === "global";
  studySession = null;
  if (isGlobal) {
    renderReview();
  } else {
    renderTopics();
  }
}
function openGlobalStudySession() {
  const queue = [];
  TOPICS.forEach((topic) => {
    const dueCards = db.getDueCards(topic.id, topic);
    dueCards.forEach((card) => {
      if (!queue.some((q) => q.card.wordId === card.wordId)) {
        queue.push({
          card,
          word: topic.words.find((w) => w.id === card.wordId),
          topic,
        });
      }
    });
  });

  if (queue.length === 0) {
    showToast("Chúc mừng! Bạn đã hoàn thành tất cả thẻ cần ôn hôm nay. 🎉");
    return;
  }

  applyStudyOrder(queue, db.settings.studyOrder);

  studySession = {
    topicId: "global",
    topic: { name: "Tất cả chủ đề", icon: "🔄", color: "#8b5cf6" },
    queue,
    totalDue: queue.length,
    current: 0,
    reviewed: 0,
    startTime: Date.now(),
    flipped: false,
    history: [],
  };

  const container = document.getElementById("review-content");
  if (container) container.classList.remove("review-dashboard");

  setStudyFocusMode(true);
  renderStudySession();
}
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
