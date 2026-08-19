// ================================================================
// STATS-QUERIES.JS — Truy vấn thống kê phái sinh trên dữ liệu đã lưu
// Gắn thêm method vào FlashcardDB.prototype (định nghĩa ở storage.js,
// nạp NGAY TRƯỚC file này) — due-cards, tiến độ chủ đề, streak/accuracy,
// heatmap, từ yếu, dự báo FSRS, thống kê tuần. Chỉ đọc dữ liệu qua
// `this._data`/TOPICS, không tự đọc/ghi localStorage trực tiếp.
// ================================================================

// ----------------------------------------------------------
// Query helpers
// ----------------------------------------------------------

/**
 * Lấy danh sách thẻ đến hạn của một chủ đề (learning → review → new).
 * Không giới hạn số lượng — dailyNewCards chỉ còn là một setting cấu hình
 * trong Cài đặt, không dùng để chặn bớt thẻ ở đây nữa.
 * @param {string} topicId
 * @param {object} topic   - object từ data.js
 * @returns {CardState[]}
 */
FlashcardDB.prototype.getDueCards = function (topicId, topic) {
  const now = Date.now();
  const { learnAhead } = this._data.settings;

  const newCards = [];
  const reviewCards = [];
  const learningCards = [];

  topic.words.forEach((w) => {
    const card = this.getCard(w.id);
    if (card.state === "new") {
      newCards.push(card);
    } else if (card.state === "learning" || card.state === "relearning") {
      if (card.nextReview <= now + learnAhead * 60 * 1000) {
        learningCards.push(card);
      }
    } else if (card.state === "review") {
      if (card.nextReview <= now) {
        reviewCards.push(card);
      }
    }
  });

  // Ưu tiên: đang học → cần ôn → thẻ mới
  return [...learningCards, ...reviewCards, ...newCards];
};

/**
 * Tổng quan "cần làm hôm nay" cho dashboard tab Ôn tập — tách riêng thẻ thực sự
 * đến hạn (learning/relearning/review) khỏi thẻ mới, vì gộp chung sẽ luôn hiện
 * hàng nghìn thẻ new ngay từ lần đầu mở app, không phản ánh đúng việc cần làm.
 * `newGoal` chỉ dùng để HIỂN THỊ mục tiêu, không giới hạn số thẻ mới thực học
 * (getDueCards() vẫn trả về toàn bộ thẻ new — xem comment ở đó).
 */
FlashcardDB.prototype.getDueSummary = function () {
  const { dailyNewCards } = this._data.settings;
  let dueCount = 0;
  let newAvailable = 0;

  TOPICS.forEach((topic) => {
    this.getDueCards(topic.id, topic).forEach((card) => {
      if (card.state === "new") newAvailable++;
      else dueCount++;
    });
  });

  return {
    dueCount,
    newAvailable,
    dailyNewCards,
    newGoal: Math.min(newAvailable, dailyNewCards),
  };
};

/** Thống kê tổng số từ theo trạng thái (chỉ tính các từ thuộc chủ đề hiện có) */
FlashcardDB.prototype.getTotalWordStats = function () {
  let known = 0,
    learning = 0,
    newCount = 0;
  const activeWordIds = new Set();
  TOPICS.forEach((topic) => {
    topic.words.forEach((w) => activeWordIds.add(w.id));
  });

  activeWordIds.forEach((id) => {
    const card = this._data.cards[id];
    if (!card || card.state === "new") {
      newCount++;
    } else if (card.state === "review" && card.reps >= 2) {
      known++;
    } else {
      learning++;
    }
  });
  return { known, learning, newCount };
};

/** Tiến độ học của một chủ đề */
FlashcardDB.prototype.getTopicProgress = function (topicId) {
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic) return null;

  let known = 0,
    learning = 0,
    newW = 0;
  topic.words.forEach((w) => {
    const card = this._data.cards[w.id];
    if (!card || card.state === "new") newW++;
    else if (card.state === "learning" || card.state === "relearning" || (card.state === "review" && card.reps < 2)) learning++;
    else known++;
  });
  return { total: topic.words.length, known, learning, new: newW };
};

/**
 * Lấy danh sách từ yếu (lapses cao, cần chú ý).
 * @returns {{ count, words: Array<{word, lapses, topic}> }}
 */
FlashcardDB.prototype.getWeakWords = function () {
  const weakList = [];
  TOPICS.forEach((topic) => {
    topic.words.forEach((w) => {
      const card = this._data.cards[w.id];
      if (card && card.lapses >= 2) {
        weakList.push({
          word: w.word,
          meaning: w.meaning,
          lapses: card.lapses,
          topic: topic.name,
          topicIcon: topic.icon,
        });
      }
    });
  });
  // Sắp xếp theo lapses giảm dần
  weakList.sort((a, b) => b.lapses - a.lapses);
  return { count: weakList.length, words: weakList.slice(0, 10) };
};

/**
 * Tỷ lệ trả lời đúng trong N ngày gần nhất.
 * @param {number} days
 * @returns {number} 0–100
 */
FlashcardDB.prototype.getAccuracyRate = function (days = 7) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const log = this._data.stats.ratingLog || [];
  const recent = log.filter((r) => r.ts >= cutoff);
  if (recent.length === 0) return null;
  const correct = recent.filter((r) => r.rating !== RATING.AGAIN).length;
  return Math.round((correct / recent.length) * 100);
};

/**
 * Dữ liệu hoạt động 30 ngày gần nhất (cho heatmap).
 * @returns {Array<{ date, count, level: 0-4 }>}
 */
FlashcardDB.prototype.getMonthlyActivity = function () {
  const result = [];
  // Tìm max count để chuẩn hóa level
  let maxCount = 1;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = (this._data.stats.dailyLog[key] || {}).reviewed || 0;
    if (count > maxCount) maxCount = count;
  }
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = (this._data.stats.dailyLog[key] || {}).reviewed || 0;
    const ratio = count / maxCount;
    const level = count === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4;
    result.push({ date: key, count, level });
  }
  return result;
};

/**
 * Dự báo khả năng nhớ (Retrievability R = 0.9^(t/S)) theo FSRS
 */
FlashcardDB.prototype.getFSRSPredictions = function () {
  const now = Date.now();

  // Lọc các thẻ đã có mô hình trí nhớ FSRS-6 (đã ôn ít nhất 1 lần)
  const studiedCards = [];
  TOPICS.forEach((topic) => {
    topic.words.forEach((w) => {
      const card = this._data.cards[w.id];
      if (card && card.lastReview && card.stability != null) {
        studiedCards.push(card);
      }
    });
  });

  if (studiedCards.length === 0) {
    return { current: null, day7: null, day30: null, day90: null };
  }

  // R(t,S) — công thức khả năng nhớ thật của FSRS-6, xem algorithm.js
  const calculateAvgR = (daysAhead) => {
    let sumR = 0;
    studiedCards.forEach((card) => {
      const daysElapsed = Math.max(0, (now - card.lastReview) / DAY) + daysAhead;
      sumR += retrievability(daysElapsed, card.stability);
    });
    return Math.round((sumR / studiedCards.length) * 100);
  };

  return {
    current: calculateAvgR(0),
    day7: calculateAvgR(7),
    day30: calculateAvgR(30),
    day90: calculateAvgR(90),
  };
};

/**
 * Tính toán thống kê học tập trong tuần này (7 ngày qua)
 */
FlashcardDB.prototype.getWeeklySummary = function () {
  const today = new Date();
  const todayStr = this._todayStr();
  const todayMs = new Date(todayStr).getTime();

  let studiedCount = 0;
  let reviewedCount = 0;
  let correctCount = 0;
  let totalRateCount = 0;

  // 1. Số từ mới bắt đầu học trong 7 ngày qua
  const cards = Object.values(this._data.cards);
  cards.forEach((card) => {
    if (card.firstStudied) {
      const firstStudiedMs = new Date(card.firstStudied).getTime();
      const diffDays = (todayMs - firstStudiedMs) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0 && diffDays < 7) {
        studiedCount++;
      }
    }
  });

  // 2. Số lượt ôn tập & độ chính xác trong 7 ngày qua
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const log = this._data.stats.dailyLog[key] || { reviewed: 0, correct: 0, total: 0 };

    reviewedCount += log.reviewed || 0;
    correctCount += log.correct || 0;
    totalRateCount += log.total || 0;
  }

  const accuracy = totalRateCount > 0 ? Math.round((correctCount / totalRateCount) * 100) : 100;

  return {
    studied: studiedCount,
    reviewed: reviewedCount,
    accuracy: accuracy,
  };
};

