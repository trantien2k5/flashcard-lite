// ================================================================
// DEMO-DATA.JS — Sinh & bật/tắt dữ liệu mô phỏng để xem thử giao diện
// Gắn thêm method vào FlashcardDB.prototype (định nghĩa ở storage.js,
// nạp TRƯỚC file này) — không liên quan gì đến lưu trữ dữ liệu thật,
// chỉ tạm hoán đổi `this._data` sang dữ liệu giả lập rồi khôi phục lại.
// ================================================================

// ----------------------------------------------------------
// Demo data — dữ liệu mô phỏng để xem thử giao diện (bật/tắt trong Cài đặt)
// ----------------------------------------------------------

FlashcardDB.prototype.isDemoActive = function () {
  return !!(this._data.meta && this._data.meta.isDemo);
};

/**
 * Bật dữ liệu mô phỏng: sao lưu tạm dữ liệu THẬT hiện tại vào một key
 * localStorage riêng, rồi thay bằng dữ liệu giả lập một người dùng đã
 * học lâu ngày (streak, heatmap, từ yếu, thành tích, thẻ đến hạn...).
 * Không đụng tới dữ liệu thật cho tới khi disableDemoData() được gọi.
 */
FlashcardDB.prototype.enableDemoData = function () {
  if (this.isDemoActive()) return;
  localStorage.setItem(DEMO_BACKUP_KEY, JSON.stringify(this._data));
  this._data = this._generateMockData();
  this.save();
};

/** Tắt dữ liệu mô phỏng: khôi phục lại đúng dữ liệu thật đã sao lưu. */
FlashcardDB.prototype.disableDemoData = function () {
  let restored = null;
  const backup = localStorage.getItem(DEMO_BACKUP_KEY);
  if (backup) {
    try {
      restored = JSON.parse(backup);
    } catch (e) {
      console.warn("Demo backup parse error:", e);
    }
  }
  this._data = this._withDefaults(restored || this._defaultData());
  localStorage.removeItem(DEMO_BACKUP_KEY);
  this.save();
};

/**
 * Sinh dữ liệu giả lập một người dùng thực tế: có chuỗi ngày học (streak),
 * lịch sử hoạt động 35 ngày (cho heatmap/độ chính xác), và các thẻ ở đủ
 * 4 trạng thái (new/learning/review/relearning) với vài từ yếu (lapses cao)
 * và vài thẻ đã tới hạn ôn — để test mọi khối UI trên Home/Stats/Learn.
 * KHÔNG dùng cho dữ liệu thật; chỉ phục vụ xem trước giao diện.
 */
FlashcardDB.prototype._generateMockData = function () {
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
      ratingLog: [],
    },
    meta: { isDemo: true },
  };

  // ---- 1. Lịch sử 35 ngày gần nhất: dailyLog + ratingLog (streak/heatmap/độ chính xác) ----
  let totalMinutes = 0;
  for (let i = 0; i < DAYS_HISTORY; i++) {
    const dayTs = now - i * DAY;
    const dayKey = new Date(dayTs).toISOString().slice(0, 10);
    // 12 ngày gần nhất luôn có học (khớp streakDays=12), các ngày trước ~30% là ngày nghỉ
    const studied = i < 12 || Math.random() > 0.3;
    if (!studied) continue;

    const reviewed = 5 + Math.floor(Math.random() * 25);
    const correct = Math.round(reviewed * (0.75 + Math.random() * 0.2));
    const minutes = +(reviewed * (0.4 + Math.random() * 0.4)).toFixed(1);
    totalMinutes += minutes;
    data.stats.dailyLog[dayKey] = { reviewed, minutes, correct, total: reviewed };

    for (let r = 0; r < reviewed; r++) {
      const ts = dayTs - Math.floor(Math.random() * DAY * 0.8);
      const rating = r >= correct ? RATING.AGAIN : Math.random() < 0.3 ? RATING.HARD : Math.random() < 0.85 ? RATING.GOOD : RATING.EASY;
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
  TOPICS.forEach((topic) => topic.words.forEach((w) => allWords.push(w)));
  const shuffled = [...allWords].sort(() => Math.random() - 0.5);
  const studiedWords = shuffled.slice(0, Math.round(shuffled.length * 0.6));

  studiedWords.forEach((w) => {
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
      lapses = isWeak ? 2 + Math.floor(Math.random() * 4) : Math.random() < 0.15 ? 1 : 0;
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
      firstStudied,
    };
  });

  return data;
};

