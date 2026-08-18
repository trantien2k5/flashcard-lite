// ================================================================
// STORAGE.JS — Lớp lưu trữ dữ liệu (persistence thuần)
// Class FlashcardDB — đọc/ghi localStorage, CRUD thẻ, settings, stats,
// export/import/reset. Không chứa query thống kê phái sinh (xem
// stats-queries.js) hay sinh dữ liệu demo (xem demo-data.js) — 2 file
// đó gắn thêm method vào FlashcardDB.prototype, nạp NGAY SAU file này.
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
      cards: {}, // wordId → CardState
      settings: {
        dailyNewCards: 20,
        dailyReviewLimit: 100,
        showPhonetic: true,
        showExample: true,
        studyOrder: "due", // "due" | "random" | "alphabetical"
        learnAhead: 20, // phút — lấy trước thẻ sắp đến hạn
        theme: "dark",
      },
      stats: {
        streakDays: 0,
        streakRecord: 0, // kỷ lục streak cao nhất
        lastStudyDate: null,
        totalStudyMinutes: 0,
        dailyLog: {}, // "YYYY-MM-DD" → { reviewed, minutes, correct, total }
        ratingLog: [], // 200 rating gần nhất: { ts, rating } — để tính accuracy
      },
      meta: {
        isDemo: false, // true khi đang xem dữ liệu mô phỏng (xem enableDemoData/disableDemoData)
      },
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
    const card = this.getCard(wordId);
    const isNew = card.state === "new";
    const updated = fsrs(card, rating); // ← gọi algorithm.js

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

  get settings() {
    return this._data.settings;
  }

  updateSettings(patch) {
    this._data.settings = { ...this._data.settings, ...patch };
    this.save();
  }

  // ----------------------------------------------------------
  // Stats & Streak
  // ----------------------------------------------------------

  get stats() {
    return this._data.stats;
  }

  /**
   * Ghi lại phiên học: cập nhật streak, daily log, tổng thời gian.
   * @param {number} wordsStudied
   * @param {number} minutes
   */
  recordStudySession(wordsStudied, minutes) {
    const today = this._todayStr();
    const yesterday = this._dateStr(-1);
    const stats = this._data.stats;
    const lastDate = stats.lastStudyDate;

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
    stats.dailyLog[today].reviewed += wordsStudied;
    stats.dailyLog[today].minutes += minutes;
    stats.totalStudyMinutes += minutes;

    this.save();
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
