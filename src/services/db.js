// ============================================================
// DB.JS (SERVICES/STORAGE LAYER)
// Vai trò: Cơ sở dữ liệu cục bộ và quản lý lưu trữ (Local Spaced Repetition DB)
// Chức năng:
//  - Quản lý đọc/ghi tiến trình học vào LocalStorage để tránh mất dữ liệu khi tắt trang
//  - Gọi thuật toán FSRS-6 (algorithm.js) mỗi khi có lượt đánh giá thẻ mới
//  - Thực hiện các truy vấn thống kê dữ liệu: lấy số từ cần học hôm nay, đếm từ yếu, heatmap hoạt động
//  - Thực hiện nạp dữ liệu mặc định của chủ đề khi người dùng truy cập lần đầu
//  - Quản lý chức năng sao lưu: Xuất (Export) và Nhập (Import) file JSON tiến độ học tập
// ============================================================

const DB_KEY = "flashcard_lite_db";

class FlashcardDB {
  constructor() {
    this._data = this._load();
  }

  // ----------------------------------------------------------
  // Private: Load / Save / Default
  // ----------------------------------------------------------

  _load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("DB load error:", e);
    }
    return this._defaultData();
  }

  _defaultData() {
    return {
      cards: {},           // wordId → CardState
      settings: {
        dailyNewCards:    20,
        dailyReviewLimit: 100,
        showPhonetic:     true,
        showExample:      true,
        studyOrder:       "due",   // "due" | "random" | "alphabetical"
        learnAhead:       20,      // phút — lấy trước thẻ sắp đến hạn
        theme:            "dark"
      },
      stats: {
        streakDays:        0,
        streakRecord:      0,    // kỷ lục streak cao nhất
        lastStudyDate:     null,
        totalStudyMinutes: 0,
        dailyLog:          {},   // "YYYY-MM-DD" → { reviewed, minutes, correct, total }
        ratingLog:         []    // 200 rating gần nhất: { ts, rating } — để tính accuracy
      }
    };
  }

  save() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(this._data));
    } catch (e) {
      console.error("DB save error:", e);
    }
  }

  // ----------------------------------------------------------
  // Card CRUD
  // ----------------------------------------------------------

  /** Lấy trạng thái thẻ, tự tạo nếu chưa có */
  getCard(wordId) {
    if (!this._data.cards[wordId]) {
      this._data.cards[wordId] = createCardState(wordId);
    }
    return this._data.cards[wordId];
  }

  /** Cập nhật thẻ qua thuật toán FSRS-6, lưu storage, ghi lại rating để tính accuracy */
  updateCard(wordId, rating) {
    const card    = this.getCard(wordId);
    const isNew   = card.state === "new";
    const updated = fsrs(card, rating);          // ← gọi algorithm.js
    
    if (isNew) {
      updated.firstStudied = this._todayStr();
    }
    this._data.cards[wordId] = updated;

    // Ghi rating log (giữ tối đa 500 entry)
    const log = this._data.stats.ratingLog || [];
    log.push({ ts: Date.now(), rating });
    if (log.length > 500) log.splice(0, log.length - 500);
    this._data.stats.ratingLog = log;

    // Cập nhật daily log cho accuracy
    const today = this._todayStr();
    if (!this._data.stats.dailyLog[today]) {
      this._data.stats.dailyLog[today] = { reviewed: 0, minutes: 0, correct: 0, total: 0 };
    }
    this._data.stats.dailyLog[today].total++;
    if (rating !== RATING.AGAIN) this._data.stats.dailyLog[today].correct++;

    this.save();
    return updated;
  }

  // ----------------------------------------------------------
  // Settings
  // ----------------------------------------------------------

  get settings() { return this._data.settings; }

  updateSettings(patch) {
    this._data.settings = { ...this._data.settings, ...patch };
    this.save();
  }

  // ----------------------------------------------------------
  // Stats & Streak
  // ----------------------------------------------------------

  get stats() { return this._data.stats; }

  /**
   * Ghi lại phiên học: cập nhật streak, daily log, tổng thời gian.
   * @param {number} wordsStudied
   * @param {number} minutes
   */
  recordStudySession(wordsStudied, minutes) {
    const today     = this._todayStr();
    const yesterday = this._dateStr(-1);
    const stats     = this._data.stats;
    const lastDate  = stats.lastStudyDate;

    // Streak
    if (lastDate === yesterday) {
      stats.streakDays++;
    } else if (lastDate !== today) {
      stats.streakDays = 1;
    }
    // Cập nhật kỷ lục streak
    if (stats.streakDays > (stats.streakRecord || 0)) {
      stats.streakRecord = stats.streakDays;
    }
    stats.lastStudyDate = today;

    // Daily log
    if (!stats.dailyLog[today]) {
      stats.dailyLog[today] = { reviewed: 0, minutes: 0 };
    }
    stats.dailyLog[today].reviewed     += wordsStudied;
    stats.dailyLog[today].minutes      += minutes;
    stats.totalStudyMinutes            += minutes;

    this.save();
  }

  // ----------------------------------------------------------
  // Query helpers
  // ----------------------------------------------------------

  /**
   * Lấy danh sách thẻ đến hạn của một chủ đề (learning → review → new).
   * @param {string} topicId
   * @param {object} topic   - object từ data.js
   * @returns {CardState[]}
   */
  getDueCards(topicId, topic) {
    const now      = Date.now();
    const { dailyNewCards, learnAhead, dailyReviewLimit } = this._data.settings;

    const newCards      = [];
    const reviewCards   = [];
    const learningCards = [];

    topic.words.forEach(w => {
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

    // Giới hạn thẻ mới theo cài đặt dailyNewCards (đã trừ đi số thẻ mới đã học hôm nay)
    const alreadyNewToday = this.getAlreadyNewToday();
    const remainingNewLimit = Math.max(0, dailyNewCards - alreadyNewToday);
    const limitedNew = newCards.slice(0, remainingNewLimit);

    // Giới hạn thẻ đang học/cần ôn theo cài đặt dailyReviewLimit (đã trừ đi số đã ôn hôm nay)
    const alreadyReviewedToday = this.getAlreadyReviewedToday();
    const remainingReviewLimit = Math.max(0, dailyReviewLimit - alreadyReviewedToday);
    const limitedReview = [...learningCards, ...reviewCards].slice(0, remainingReviewLimit);

    // Ưu tiên: đang học → cần ôn → thẻ mới
    return [...limitedReview, ...limitedNew];
  }

  /** Thống kê tổng số từ theo trạng thái (chỉ tính các từ thuộc chủ đề hiện có) */
  getTotalWordStats() {
    let known = 0, learning = 0, newCount = 0;
    const activeWordIds = new Set();
    TOPICS.forEach(topic => {
      topic.words.forEach(w => activeWordIds.add(w.id));
    });

    activeWordIds.forEach(id => {
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
  }

  /** Tiến độ học của một chủ đề */
  getTopicProgress(topicId) {
    const topic = TOPICS.find(t => t.id === topicId);
    if (!topic) return null;

    let known = 0, learning = 0, newW = 0;
    topic.words.forEach(w => {
      const card = this._data.cards[w.id];
      if (!card || card.state === "new")                                          newW++;
      else if (card.state === "learning" || card.state === "relearning" || (card.state === "review" && card.reps < 2)) learning++;
      else                                                                         known++;
    });
    return { total: topic.words.length, known, learning, new: newW };
  }

  /** Dữ liệu hoạt động 7 ngày gần nhất (cho biểu đồ) */
  getWeeklyActivity() {
    const DAYS_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const result  = [];
    for (let i = 6; i >= 0; i--) {
      const d   = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({
        date:  key,
        day:   DAYS_VI[d.getDay()],
        count: (this._data.stats.dailyLog[key] || {}).reviewed || 0
      });
    }
    return result;
  }

  /** Lấy số từ mới đã bắt đầu học hôm nay */
  getAlreadyNewToday() {
    const today = this._todayStr();
    return Object.values(this._data.cards).filter(c => c.firstStudied === today).length;
  }

  /** Lấy số lượt ôn tập (không tính thẻ mới) đã thực hiện hôm nay */
  getAlreadyReviewedToday() {
    const today = this._todayStr();
    const total = (this._data.stats.dailyLog[today] || {}).total || 0;
    return Math.max(0, total - this.getAlreadyNewToday());
  }

  // ----------------------------------------------------------
  // Home tab — advanced stats
  // ----------------------------------------------------------

  /**
   * Tính số thẻ cần làm hôm nay trên toàn bộ chủ đề.
   * @returns {{ reviewCount, newCount, estimatedMinutes }}
   */
  getDailyTodo() {
    const now = Date.now();
    const { dailyNewCards, learnAhead, dailyReviewLimit } = this._data.settings;
    const today = this._todayStr();
    const todayLog = this._data.stats.dailyLog[today] || { reviewed: 0 };

    let reviewCount = 0;
    let newCount    = 0;
    let newSeen     = 0; // thẻ mới đã học hôm nay

    // Đếm newSeen từ dailyLog (thẻ mới đã được thêm hôm nay)
    // Ước tính: mỗi thẻ review ~1.2 phút, thẻ mới ~2 phút
    const allCards = Object.values(this._data.cards);
    const newCardsAvailable = [];

    TOPICS.forEach(topic => {
      topic.words.forEach(w => {
        const card = this._data.cards[w.id];
        if (!card || card.state === 'new') {
          newCardsAvailable.push(w.id);
        } else if (card.state === 'learning' || card.state === 'relearning') {
          if (card.nextReview <= now + learnAhead * 60 * 1000) reviewCount++;
        } else if (card.state === 'review') {
          if (card.nextReview <= now) reviewCount++;
        }
      });
    });

    // Giới hạn thẻ mới theo cài đặt
    const alreadyNewToday = this.getAlreadyNewToday();
    const remainingNewLimit = Math.max(0, dailyNewCards - alreadyNewToday);
    newCount = Math.max(0, Math.min(remainingNewLimit, newCardsAvailable.length));

    // Giới hạn thẻ cần ôn theo cài đặt dailyReviewLimit (khớp với giới hạn thật trong getDueCards)
    const remainingReviewLimit = Math.max(0, dailyReviewLimit - this.getAlreadyReviewedToday());
    reviewCount = Math.min(reviewCount, remainingReviewLimit);

    const estimatedMinutes = Math.round(reviewCount * 1.2 + newCount * 2);
    return { reviewCount, newCount, estimatedMinutes };
  }

  /**
   * Lấy danh sách từ yếu (lapses cao, cần chú ý).
   * @returns {{ count, words: Array<{word, lapses, topic}> }}
   */
  getWeakWords() {
    const weakList = [];
    TOPICS.forEach(topic => {
      topic.words.forEach(w => {
        const card = this._data.cards[w.id];
        if (card && card.lapses >= 2) {
          weakList.push({
            word:   w.word,
            meaning: w.meaning,
            lapses: card.lapses,
            topic:  topic.name,
            topicIcon: topic.icon
          });
        }
      });
    });
    // Sắp xếp theo lapses giảm dần
    weakList.sort((a, b) => b.lapses - a.lapses);
    return { count: weakList.length, words: weakList.slice(0, 10) };
  }

  /**
   * Tỷ lệ trả lời đúng trong N ngày gần nhất.
   * @param {number} days
   * @returns {number} 0–100
   */
  getAccuracyRate(days = 7) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const log    = this._data.stats.ratingLog || [];
    const recent = log.filter(r => r.ts >= cutoff);
    if (recent.length === 0) return null;
    const correct = recent.filter(r => r.rating !== RATING.AGAIN).length;
    return Math.round((correct / recent.length) * 100);
  }

  /**
   * Dữ liệu hoạt động 30 ngày gần nhất (cho heatmap).
   * @returns {Array<{ date, count, level: 0-4 }>}
   */
  getMonthlyActivity() {
    const result = [];
    // Tìm max count để chuẩn hóa level
    let maxCount = 1;
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key   = d.toISOString().slice(0, 10);
      const count = (this._data.stats.dailyLog[key] || {}).reviewed || 0;
      if (count > maxCount) maxCount = count;
    }
    for (let i = 29; i >= 0; i--) {
      const d    = new Date();
      d.setDate(d.getDate() - i);
      const key   = d.toISOString().slice(0, 10);
      const count = (this._data.stats.dailyLog[key] || {}).reviewed || 0;
      const ratio = count / maxCount;
      const level = count === 0 ? 0
                  : ratio < 0.25 ? 1
                  : ratio < 0.5  ? 2
                  : ratio < 0.75 ? 3 : 4;
      result.push({ date: key, count, level });
    }
    return result;
  }

  /**
   * Tiến độ mục tiêu ngày hôm nay.
   * @returns {{ reviewedToday, reviewGoal, newToday, newGoal, overallPct }}
   */
  getDailyProgress() {
    const today    = this._todayStr();
    const log      = this._data.stats.dailyLog[today] || { reviewed: 0, minutes: 0 };
    const { dailyNewCards, dailyReviewLimit } = this._data.settings;

    const reviewedToday = log.reviewed || 0;
    const minutesToday  = log.minutes || 0;
    
    // Đếm số lượng thẻ thực tế cần ôn và học hôm nay để đặt mục tiêu động
    const todo = this.getDailyTodo();
    const totalCardsToday = reviewedToday + todo.reviewCount + todo.newCount;
    
    const reviewGoal = totalCardsToday || dailyReviewLimit;
    const overallPct = totalCardsToday > 0 
      ? Math.min(100, Math.round((reviewedToday / totalCardsToday) * 100)) 
      : 100;

    return { 
      reviewedToday, 
      reviewGoal, 
      newToday: this.getAlreadyNewToday(), 
      newGoal: dailyNewCards, 
      overallPct,
      minutesToday
    };
  }

  /**
   * Dự báo khả năng nhớ (Retrievability R = 0.9^(t/S)) theo FSRS
   */
  getFSRSPredictions() {
    const now = Date.now();

    // Lọc các thẻ đã có mô hình trí nhớ FSRS-6 (đã ôn ít nhất 1 lần)
    const studiedCards = [];
    TOPICS.forEach(topic => {
      topic.words.forEach(w => {
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
      studiedCards.forEach(card => {
        const daysElapsed = Math.max(0, (now - card.lastReview) / DAY) + daysAhead;
        sumR += retrievability(daysElapsed, card.stability);
      });
      return Math.round((sumR / studiedCards.length) * 100);
    };

    return {
      current: calculateAvgR(0),
      day7: calculateAvgR(7),
      day30: calculateAvgR(30),
      day90: calculateAvgR(90)
    };
  }

  /**
   * Tính toán thống kê học tập trong tuần này (7 ngày qua)
   */
  getWeeklySummary() {
    const today = new Date();
    const todayStr = this._todayStr();
    const todayMs = new Date(todayStr).getTime();

    let studiedCount = 0;
    let reviewedCount = 0;
    let correctCount = 0;
    let totalRateCount = 0;

    // 1. Số từ mới bắt đầu học trong 7 ngày qua
    const cards = Object.values(this._data.cards);
    cards.forEach(card => {
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
      accuracy: accuracy
    };
  }

  // ----------------------------------------------------------
  // Import / Export / Reset
  // ----------------------------------------------------------

  exportData() {
    return JSON.stringify(this._data, null, 2);
  }

  importData(json) {
    try {
      const parsed = JSON.parse(json);
      this._data = parsed;
      this.save();
      return true;
    } catch (e) {
      return false;
    }
  }

  resetAllProgress() {
    this._data.cards = {};
    this._data.stats = this._defaultData().stats;
    this.save();
  }

  // ----------------------------------------------------------
  // Private date helpers
  // ----------------------------------------------------------

  _todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  _dateStr(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }
}

// Singleton — dùng chung toàn app
const db = new FlashcardDB();
