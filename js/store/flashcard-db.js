// ================================================================
// STORE/FLASHCARD-DB.JS — Lớp lưu trữ & truy vấn dữ liệu
// Class FlashcardDB — đọc/ghi localStorage, gọi thuật toán FSRS-6 (core/fsrs.js)
// khi chấm điểm thẻ, và cung cấp mọi truy vấn thống kê cho các feature.
// ================================================================

const DB_KEY = "flashcard_lite_db";
const DEMO_BACKUP_KEY = "flashcard_lite_db_demo_backup"; // nơi cất tạm dữ liệu THẬT trong lúc bật demo

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
      if (raw) {
        const parsed = JSON.parse(raw);
        // Dữ liệu lưu từ trước khi có tính năng demo sẽ thiếu "meta" — bổ sung an toàn
        if (!parsed.meta) parsed.meta = { isDemo: false };
        return parsed;
      }
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
      },
      meta: {
        isDemo: false   // true khi đang xem dữ liệu mô phỏng (xem enableDemoData/disableDemoData)
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
   * Không giới hạn số lượng — dailyNewCards giờ chỉ là mục tiêu hiển thị
   * (xem getDailyTodo), không dùng để chặn bớt thẻ ở đây nữa.
   * @param {string} topicId
   * @param {object} topic   - object từ data.js
   * @returns {CardState[]}
   */
  getDueCards(topicId, topic) {
    const now      = Date.now();
    const { learnAhead } = this._data.settings;

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

    // Ưu tiên: đang học → cần ôn → thẻ mới
    return [...learningCards, ...reviewCards, ...newCards];
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

  // ----------------------------------------------------------
  // Home tab — advanced stats
  // ----------------------------------------------------------

  /**
   * Tính số thẻ cần ôn hôm nay (không giới hạn) và tiến độ so với mục tiêu
   * từ mới mỗi ngày (dailyNewCards — giờ chỉ là mục tiêu hiển thị, xem
   * getDueCards để biết lý do bỏ giới hạn cứng).
   * @returns {{ reviewCount, newStartedToday, newGoal }}
   */
  getDailyTodo() {
    const now = Date.now();
    const { learnAhead } = this._data.settings;

    let reviewCount = 0;
    TOPICS.forEach(topic => {
      topic.words.forEach(w => {
        const card = this._data.cards[w.id];
        if (!card || card.state === 'new') return;
        if (card.state === 'learning' || card.state === 'relearning') {
          if (card.nextReview <= now + learnAhead * 60 * 1000) reviewCount++;
        } else if (card.state === 'review') {
          if (card.nextReview <= now) reviewCount++;
        }
      });
    });

    return {
      reviewCount,
      newStartedToday: this.getAlreadyNewToday(),
      newGoal: this._data.settings.dailyNewCards
    };
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
  // Demo data — dữ liệu mô phỏng để xem thử giao diện (bật/tắt trong Cài đặt)
  // ----------------------------------------------------------

  isDemoActive() {
    return !!(this._data.meta && this._data.meta.isDemo);
  }

  /**
   * Bật dữ liệu mô phỏng: sao lưu tạm dữ liệu THẬT hiện tại vào một key
   * localStorage riêng, rồi thay bằng dữ liệu giả lập một người dùng đã
   * học lâu ngày (streak, heatmap, từ yếu, thành tích, thẻ đến hạn...).
   * Không đụng tới dữ liệu thật cho tới khi disableDemoData() được gọi.
   */
  enableDemoData() {
    if (this.isDemoActive()) return;
    localStorage.setItem(DEMO_BACKUP_KEY, JSON.stringify(this._data));
    this._data = this._generateMockData();
    this.save();
  }

  /** Tắt dữ liệu mô phỏng: khôi phục lại đúng dữ liệu thật đã sao lưu. */
  disableDemoData() {
    const backup = localStorage.getItem(DEMO_BACKUP_KEY);
    this._data = backup ? JSON.parse(backup) : this._defaultData();
    localStorage.removeItem(DEMO_BACKUP_KEY);
    this.save();
  }

  /**
   * Sinh dữ liệu giả lập một người dùng thực tế: có chuỗi ngày học (streak),
   * lịch sử hoạt động 35 ngày (cho heatmap/độ chính xác), và các thẻ ở đủ
   * 4 trạng thái (new/learning/review/relearning) với vài từ yếu (lapses cao)
   * và vài thẻ đã tới hạn ôn — để test mọi khối UI trên Home/Stats/Learn.
   * KHÔNG dùng cho dữ liệu thật; chỉ phục vụ xem trước giao diện.
   */
  _generateMockData() {
    const now = Date.now();
    const DAYS_HISTORY = 35;

    const data = {
      cards: {},
      settings: { ...this.settings },
      stats: {
        streakDays: 12,
        streakRecord: 23,
        lastStudyDate: this._todayStr(),
        totalStudyMinutes: 0,
        dailyLog: {},
        ratingLog: []
      },
      meta: { isDemo: true }
    };

    // ---- 1. Lịch sử 35 ngày gần nhất: dailyLog + ratingLog (streak/heatmap/độ chính xác) ----
    let totalMinutes = 0;
    for (let i = 0; i < DAYS_HISTORY; i++) {
      const dayTs  = now - i * DAY;
      const dayKey = new Date(dayTs).toISOString().slice(0, 10);
      // 12 ngày gần nhất luôn có học (khớp streakDays=12), các ngày trước ~30% là ngày nghỉ
      const studied = i < 12 || Math.random() > 0.3;
      if (!studied) continue;

      const reviewed = 5 + Math.floor(Math.random() * 25);
      const correct  = Math.round(reviewed * (0.75 + Math.random() * 0.2));
      const minutes  = +(reviewed * (0.4 + Math.random() * 0.4)).toFixed(1);
      totalMinutes += minutes;
      data.stats.dailyLog[dayKey] = { reviewed, minutes, correct, total: reviewed };

      for (let r = 0; r < reviewed; r++) {
        const ts = dayTs - Math.floor(Math.random() * DAY * 0.8);
        const rating = r >= correct ? RATING.AGAIN
          : Math.random() < 0.3 ? RATING.HARD
          : Math.random() < 0.85 ? RATING.GOOD : RATING.EASY;
        data.stats.ratingLog.push({ ts, rating });
      }
    }
    data.stats.totalStudyMinutes = Math.round(totalMinutes);
    data.stats.ratingLog.sort((a, b) => a.ts - b.ts);
    if (data.stats.ratingLog.length > 500) {
      data.stats.ratingLog = data.stats.ratingLog.slice(-500);
    }

    // ---- 2. Trạng thái từng thẻ: ~60% số từ đã từng động vào, đủ 4 trạng thái ----
    const allWords = [];
    TOPICS.forEach(topic => topic.words.forEach(w => allWords.push(w)));
    const shuffled = [...allWords].sort(() => Math.random() - 0.5);
    const studiedWords = shuffled.slice(0, Math.round(shuffled.length * 0.6));

    studiedWords.forEach(w => {
      const roll = Math.random();
      let state, reps, lapses, stability, interval, dueOffsetDays;

      if (roll < 0.12) {
        // Vừa quên một thẻ đã thuộc → đang học lại (relearning), vài từ này sẽ lên danh sách "từ yếu"
        state = "relearning";
        reps = 0;
        lapses = 2 + Math.floor(Math.random() * 3);
        stability = 0.5 + Math.random() * 2;
        interval = 10 / 1440;
        dueOffsetDays = -0.2 + Math.random() * 0.5;
      } else if (roll < 0.25) {
        // Từ mới đang trong bước học ngắn, chưa tốt nghiệp ra review
        state = "learning";
        reps = 0;
        lapses = Math.random() < 0.3 ? 1 : 0;
        stability = 0.3 + Math.random() * 1.5;
        interval = 10 / 1440;
        dueOffsetDays = -0.1 + Math.random() * 0.3;
      } else {
        // Đã tốt nghiệp ra review — phần lớn ổn định, ~12% là "từ yếu" (lapses cao)
        state = "review";
        const isWeak = Math.random() < 0.12;
        lapses = isWeak ? 2 + Math.floor(Math.random() * 4) : (Math.random() < 0.15 ? 1 : 0);
        reps = isWeak ? 1 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 8);
        stability = 3 + Math.random() * 55;
        interval = Math.max(1, Math.round(stability));
        // ~30% số thẻ review đã quá hạn ôn, để test khối "Hôm nay cần làm gì"
        dueOffsetDays = Math.random() < 0.3 ? -Math.random() * 3 : Math.random() * interval;
      }

      const difficulty = clampD(2 + Math.random() * 7);
      const daysAgoStudied = 1 + Math.floor(Math.random() * (DAYS_HISTORY - 1));
      const lastReview = now - daysAgoStudied * DAY;
      const firstStudiedDayIdx = Math.min(DAYS_HISTORY - 1, daysAgoStudied + Math.floor(Math.random() * 10));
      const firstStudied = new Date(now - firstStudiedDayIdx * DAY).toISOString().slice(0, 10);

      data.cards[w.id] = {
        wordId: w.id,
        difficulty,
        stability: clampS(stability),
        interval,
        reps,
        nextReview: now + dueOffsetDays * DAY,
        lastReview,
        lapses,
        state,
        firstStudied
      };
    });

    return data;
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
