// ================================================================
// APP.JS — TOÀN BỘ LOGIC JAVASCRIPT CỦA FLASHCARD LITE
// ----------------------------------------------------------------
// File này gộp chung TẤT CẢ JS của app thành 1 file duy nhất để dễ
// tìm kiếm và chỉnh sửa khi phát triển. Cấu trúc chia theo PHẦN
// (đánh số 1 → 8). KHÔNG dùng module (import/export) — mọi biến/hàm
// đều là global (window), nên THỨ TỰ các phần bên dưới BẮT BUỘC giữ
// nguyên: phần sau luôn phụ thuộc vào phần trước.
//
// MẸO TÌM NHANH: Ctrl+F gõ "PHẦN <số>" hoặc tên khu vực (VD: "HOME",
// "STATS", "STUDY", "DATABASE"...) để nhảy thẳng tới đoạn code cần sửa.
//
// Luồng phụ thuộc: Thuật toán FSRS-6 → Lưu trữ (DB) → Các màn hình
// (Home/Stats/Learn/Study/Settings) → Bộ điều khiển trung tâm (main).
// ================================================================

// ================================================================
// PHẦN 1: THUẬT TOÁN GHI NHỚ NGẮT QUÃNG (FSRS-6)
// (Gốc: algorithm.js)
// Logic thuần túy (pure function), KHÔNG đụng DOM/localStorage. Tính Độ khó,
// Độ ổn định, Khả năng nhớ và khoảng cách ngày ôn tập tiếp theo cho mỗi thẻ.
// Các phần bên dưới (DB, các màn hình) đều dùng hàm/hằng số từ đây.
// ================================================================

// --- Rating constants ---
const RATING = {
  AGAIN: 0,  // Không nhớ, học lại
  HARD:  1,  // Nhớ nhưng khó
  GOOD:  2,  // Nhớ bình thường
  EASY:  3   // Nhớ rất dễ
};

// --- Hằng số thời gian ---
const MINUTE = 60 * 1000;
const DAY    = 24 * 60 * MINUTE;

// --- Tham số FSRS-6 (bộ trọng số mặc định do open-spaced-repetition huấn luyện, 21 giá trị w0..w20) ---
const FSRS_WEIGHTS = [
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722,
  0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425,
  0.0912, 0.0658, 0.1542
];

const REQUEST_RETENTION  = 0.9;    // xác suất nhớ mục tiêu khi lên lịch ôn tiếp theo
const MAX_INTERVAL_DAYS  = 36500;  // chặn trên ~100 năm, tránh số phi thực tế
const DECAY  = -FSRS_WEIGHTS[20];
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // đảm bảo R(t=S) luôn = 90%

function clampD(d) { return Math.min(10, Math.max(1, d)); }
function clampS(s) { return Math.max(0.01, s); }

/**
 * Tạo trạng thái mặc định cho một thẻ mới.
 * @param {string} wordId
 * @returns {CardState}
 */
function createCardState(wordId) {
  return {
    wordId,
    difficulty:  null,   // D ∈ [1,10] — độ khó ghi nhớ của từ này với người học, null = chưa ôn lần nào
    stability:   null,   // S (đơn vị: ngày) — độ ổn định trí nhớ, null = chưa ôn lần nào
    interval:    0,      // khoảng ôn kế tiếp được lên lịch (đơn vị ngày, có thể lẻ khi đang ở bước học ngắn)
    reps:        0,      // số lần ôn thành công liên tiếp kể từ lần quên gần nhất
    nextReview:  0,      // timestamp (ms), 0 = thẻ mới chưa học
    lastReview:  null,   // timestamp lần ôn gần nhất
    lapses:      0,      // số lần quên sau khi đã vào trạng thái review
    state:       "new"   // "new" | "learning" | "review" | "relearning"
  };
}

/** R(t, S) — xác suất nhớ được sau t ngày kể từ lần ôn có độ ổn định S (ngày). */
function retrievability(elapsedDays, stability) {
  if (!stability || stability <= 0) return 0;
  return Math.pow(1 + FACTOR * elapsedDays / stability, DECAY);
}

/** Số ngày cần để khả năng nhớ giảm xuống còn `requestRetention` — dùng để lên lịch ôn tiếp theo. */
function intervalForStability(stability, requestRetention = REQUEST_RETENTION) {
  const days = (stability / FACTOR) * (Math.pow(requestRetention, 1 / DECAY) - 1);
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(days)));
}

function initStability(rating) {
  return clampS(FSRS_WEIGHTS[rating]); // S0(G) = w[G-1], rating 0..3 tương ứng G 1..4
}

function initDifficulty(rating) {
  const w = FSRS_WEIGHTS;
  return clampD(w[4] - Math.exp(w[5] * rating) + 1);
}

function nextDifficulty(D, rating) {
  const w = FSRS_WEIGHTS;
  const deltaD  = -w[6] * (rating - 2); // rating-2 ≡ (G-3) khi G ở thang 1..4, GOOD là mốc trung tâm
  const dPrime  = D + deltaD * (10 - D) / 9;
  const easyD0  = clampD(w[4] - Math.exp(w[5] * 3) + 1); // D0 ứng với rating Easy — mốc hồi quy trung bình
  return clampD(w[7] * easyD0 + (1 - w[7]) * dPrime);
}

/** Cập nhật S khi trả lời đúng (Hard/Good/Easy) và đã cách lần ôn trước ít nhất 1 ngày. */
function nextRecallStability(D, S, R, rating) {
  const w = FSRS_WEIGHTS;
  const hardPenalty = rating === RATING.HARD ? w[15] : 1;
  const easyBonus   = rating === RATING.EASY ? w[16] : 1;
  const factor = (11 - D) * Math.pow(S, -w[9]) * (Math.exp((1 - R) * w[10]) - 1);
  return clampS(S * (1 + Math.exp(w[8]) * factor * hardPenalty * easyBonus));
}

/** Cập nhật S khi quên (Again) và đã cách lần ôn trước ít nhất 1 ngày. */
function nextForgetStability(D, S, R) {
  const w = FSRS_WEIGHTS;
  const sf = w[11] * Math.pow(D, -w[12]) * (Math.pow(S + 1, w[13]) - 1) * Math.exp((1 - R) * w[14]);
  return clampS(Math.min(sf, S));
}

/** Cập nhật S khi ôn lại trong cùng ngày (bước học/relearning ngắn, elapsed < 1 ngày). */
function shortTermStability(S, rating) {
  const w = FSRS_WEIGHTS;
  return clampS(S * Math.exp(w[17] * (rating - 2 + w[18])) * Math.pow(S, -w[19]));
}

/**
 * Tính D, S và trạng thái/khoảng ôn kế tiếp cho một lượt đánh giá — dùng chung bởi
 * fsrs() (áp dụng thật) và previewNextInterval() (chỉ xem trước, không mutate).
 * @param {CardState} card
 * @param {number}    rating
 * @param {number}    now
 * @param {number}    requestRetention
 */
function _computeFSRS(card, rating, now, requestRetention) {
  const state = card.state;
  const D0 = card.difficulty;
  const S0 = card.stability;
  // Thẻ cũ từ trước khi nâng cấp lên FSRS-6 (chưa có difficulty/stability) được coi như
  // ôn lần đầu để khởi tạo lại mô hình trí nhớ một cách an toàn, không làm hỏng dữ liệu cũ.
  const isFirstReview = S0 == null;

  const elapsedDays = card.lastReview ? Math.max(0, (now - card.lastReview) / DAY) : 0;
  const R = (!isFirstReview) ? retrievability(elapsedDays, S0) : 1;

  let D, S;
  if (isFirstReview) {
    D = initDifficulty(rating);
    S = initStability(rating);
  } else {
    D = nextDifficulty(D0, rating);
    if (elapsedDays < 1) {
      S = shortTermStability(S0, rating);
    } else if (rating === RATING.AGAIN) {
      S = nextForgetStability(D0, S0, R);
    } else {
      S = nextRecallStability(D0, S0, R, rating);
    }
  }

  let nextState, interval;
  const inLearningPhase = state === "new" || state === "learning" || state === "relearning" || isFirstReview;

  if (rating === RATING.AGAIN) {
    // Quên hoàn toàn → bước học ngắn, ôn lại sau 1 phút
    nextState = (state === "review" || state === "relearning") ? "relearning" : "learning";
    interval  = 1 / 1440;
  } else if (inLearningPhase && rating === RATING.HARD) {
    // Nhớ khó khi còn đang học/học lại → thêm một bước học ngắn trước khi tốt nghiệp
    nextState = (state === "new" || isFirstReview) ? "learning" : state;
    interval  = 10 / 1440;
  } else {
    // Good/Easy, hoặc Hard khi đã ở review → tốt nghiệp / tiếp tục ở review
    nextState = "review";
    interval  = intervalForStability(S, requestRetention);
  }

  return { D, S, nextState, interval };
}

/**
 * FSRS-6: tính trạng thái thẻ mới sau khi đánh giá.
 * Là pure function — không có side effect, không đụng storage.
 *
 * @param {CardState} card - trạng thái thẻ hiện tại
 * @param {number}    rating - RATING.AGAIN | HARD | GOOD | EASY
 * @param {number}    [requestRetention] - xác suất nhớ mục tiêu (mặc định 0.9)
 * @returns {CardState} trạng thái thẻ mới (immutable)
 */
function fsrs(card, rating, requestRetention = REQUEST_RETENTION) {
  const now = Date.now();
  const { D, S, nextState, interval } = _computeFSRS(card, rating, now, requestRetention);

  let lapses = card.lapses || 0;
  let reps   = card.reps || 0;
  if (rating === RATING.AGAIN) {
    lapses = card.state === "review" ? lapses + 1 : lapses;
    reps = 0;
  } else if (nextState === "review") {
    reps = reps + 1;
  }

  return {
    ...card,
    difficulty: D,
    stability:  S,
    interval,
    reps,
    lapses,
    state:      nextState,
    nextReview: now + interval * DAY,
    lastReview: now
  };
}

/**
 * Xem trước nhãn thời gian ôn tập tiếp theo nếu chọn rating này — dùng để hiển thị
 * trên các nút đánh giá. Pure function, không mutate card, phản ánh đúng logic của fsrs().
 * @param {CardState} card
 * @param {number}    rating
 * @returns {string} vd "1p", "10p", "4d"
 */
function previewNextInterval(card, rating) {
  const { nextState, interval } = _computeFSRS(card, rating, Date.now(), REQUEST_RETENTION);
  if (nextState !== "review") {
    return `${Math.round(interval * 1440)}p`;
  }
  return `${interval}d`;
}

/** Định dạng khoảng ôn (đơn vị ngày, có thể lẻ) thành nhãn dễ đọc — "X phút" hoặc "X ngày". */
function formatIntervalLabel(days) {
  if (days < 1) return `${Math.round(days * 1440)} phút`;
  return `${Math.round(days)} ngày`;
}

// ================================================================
// PHẦN 2: LỚP LƯU TRỮ & TRUY VẤN DỮ LIỆU (DATABASE)
// (Gốc: db.js)
// Class FlashcardDB — đọc/ghi localStorage, gọi thuật toán FSRS-6 (Phần 1) khi
// chấm điểm thẻ, và cung cấp mọi truy vấn thống kê cho các màn hình (Phần 3-6).
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

// ================================================================
// PHẦN 3: GIAO DIỆN TAB TRANG CHỦ (HOME)
// (Gốc: Home.js)
// Template HTML cho Dashboard hành động nhanh: hôm nay cần học gì, tổng tiến
// độ, và tổng quan chủ đề để bấm học ngay. Các khối PHÂN TÍCH/THỐNG KÊ chi
// tiết hơn (streak, độ chính xác, dự báo FSRS, từ yếu, thành tích, thống kê
// tuần, lịch học heatmap) đã được DỜI SANG tab Thống kê riêng — xem PHẦN 4b.
// ================================================================

if (!window.TEMPLATES) window.TEMPLATES = {};

window.TEMPLATES.home = function(stats, todo, known, learning, totalWords, totalLearned) {
  return `
    <div class="home-header">
      <h1 class="greeting-text">${getGreeting()}</h1>
      <p class="greeting-sub">Tiếp tục phát huy nhé! 🎯</p>
    </div>

    <!-- KHỐI 1: HÔM NAY CẦN LÀM GÌ -->
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
          <div class="today-stat-lbl">Phút ước tính</div>
        </div>
      </div>
      <button class="btn-start-study" onclick="switchTab('learn')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
        Bắt đầu học
      </button>
    </div>

    <!-- KHỐI 2: TỔNG TIẾN ĐỘ -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">📈 Tổng tiến độ</span>
        <span class="section-badge">${totalLearned}/${totalWords} từ</span>
      </div>
      <div class="total-progress-details">
        <div class="progress-detail-row">
          <span>📚 Đã học</span>
          <span class="val-primary">${totalLearned.toLocaleString()} từ</span>
        </div>
        <div class="progress-detail-row line-learning">
          <span>📖 Đang học</span>
          <span class="val-learning">${learning.toLocaleString()} từ</span>
        </div>
        <div class="progress-detail-row line-mastered">
          <span>🏆 Đã thành thạo</span>
          <span class="val-mastered">${known.toLocaleString()} từ</span>
        </div>
        <div class="progress-detail-row line-time">
          <span>⏱️ Tổng thời gian tích lũy</span>
          <span class="val-time">${formatMinutes(stats.totalStudyMinutes)}</span>
        </div>
      </div>
      <div class="progress-bar-wrap" style="margin-top:14px; margin-bottom:0">
        <div class="progress-bar" style="width:${totalWords > 0 ? Math.round(totalLearned/totalWords*100) : 0}%"></div>
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

// ================================================================
// PHẦN 4: GIAO DIỆN TAB THỐNG KÊ (STATS)
// Template HTML cho các khối PHÂN TÍCH chi tiết được dời ra từ Home:
// streak & độ chính xác, dự báo trí nhớ FSRS, từ cần lưu ý (từ yếu),
// thành tích mở khóa, thống kê 7 ngày qua, và lịch học (heatmap 30 ngày).
// ================================================================

window.TEMPLATES.stats = function(stats, totalLearned, monthlyData, weakData, accuracy, streakRecord, streakColor, fsrs, weeklySummary) {
  // Lấy tiến trình Tài chính & Ngân hàng (dùng cho thành tích "hoàn thành chủ đề")
  const financeProg = db.getTopicProgress('topic_finance_banking') || { known: 0, learning: 0, total: 100 };
  const financePct = Math.round((financeProg.known + financeProg.learning) / financeProg.total * 100);

  return `
    <div class="home-header">
      <h1 class="greeting-text">📊 Thống kê</h1>
      <p class="greeting-sub">Theo dõi tiến trình và hiệu quả học tập của bạn</p>
    </div>

    <!-- KHỐI 1: STREAK & ĐỘ CHÍNH XÁC -->
    <div class="stats-grid-2">
      <div class="stat-card-v2" style="--accent: ${streakColor}">
        <div class="stat-card-v2-lbl" style="margin-bottom: 12px; font-size: 14px; font-weight: 800; color: var(--accent);">Streak</div>
        <div class="streak-line-primary">
          <span>🔥</span> Chuỗi học: ${stats.streakDays} ngày
        </div>
        <div class="streak-line-secondary">
          <span>🏆</span> Kỷ lục: ${streakRecord} ngày
        </div>
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

    <!-- KHỐI 2: DỰ BÁO FSRS -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">🔮 Dự báo trí nhớ FSRS</span>
        <span class="section-badge badge-fsrs">FSRS v6</span>
      </div>
      <div class="fsrs-desc">
        Phân tích độ ổn định ký ức dựa trên lịch sử để dự báo khả năng ghi nhớ thực tế của bạn theo thời gian.
      </div>
      <div class="fsrs-card">
        <span class="fsrs-card-lbl">Khả năng nhớ hiện tại:</span>
        <span class="fsrs-card-val">${fsrs.current !== null ? fsrs.current + '%' : '—'}</span>
      </div>
      <div class="fsrs-forecast-lines">
        <div class="forecast-row">
          <span>📅 Dự kiến 7 ngày tới:</span>
          <span class="forecast-val day7">${fsrs.day7 !== null ? fsrs.day7 + '%' : '—'}</span>
        </div>
        <div class="forecast-row">
          <span>📅 Dự kiến 30 ngày tới:</span>
          <span class="forecast-val day30">${fsrs.day30 !== null ? fsrs.day30 + '%' : '—'}</span>
        </div>
        <div class="forecast-row">
          <span>📅 Dự kiến 90 ngày tới:</span>
          <span class="forecast-val day90">${fsrs.day90 !== null ? fsrs.day90 + '%' : '—'}</span>
        </div>
      </div>
    </div>

    <!-- KHỐI 3: TỪ YẾU -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">⚠️ Từ cần lưu ý</span>
        <span class="section-badge badge-weak">${weakData.count} từ yếu nhất</span>
      </div>
      <div class="weak-words-list">
        ${weakData.count > 0 ? weakData.words.slice(0, 3).map(w => `
          <div class="weak-word-item">
            <span class="weak-word-text">${w.word}</span>
            <span class="weak-word-lapses">Lapses: ${w.lapses}</span>
          </div>
        `).join("") : ""}
        ${weakData.count === 0 ? `<div class="weak-empty">Tuyệt vời! Bạn không có từ nào bị yếu.</div>` : ''}
      </div>
    </div>

    <!-- KHỐI 4: THÀNH TÍCH -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">🏆 Thành tích</span>
      </div>
      <div class="achievements-list">
        <div class="achievement-item ${totalLearned >= 100 ? 'unlocked' : 'locked'}">
          <span class="achievement-icon">${totalLearned >= 100 ? '🏅' : '🔒'}</span>
          <div class="achievement-info">
            <span class="achievement-name">100 từ đầu tiên</span>
            <span class="achievement-sub">${totalLearned >= 100 ? 'Đã đạt được!' : `Tiến trình: ${totalLearned}/100 từ`}</span>
          </div>
        </div>
        <div class="achievement-item ${streakRecord >= 7 ? 'unlocked' : 'locked'}">
          <span class="achievement-icon">${streakRecord >= 7 ? '🏅' : '🔒'}</span>
          <div class="achievement-info">
            <span class="achievement-name">Streak 7 ngày</span>
            <span class="achievement-sub">${streakRecord >= 7 ? 'Đã đạt được!' : `Kỷ lục hiện tại: ${streakRecord}/7 ngày`}</span>
          </div>
        </div>
        <div class="achievement-item ${financePct === 100 ? 'unlocked' : 'locked'}">
          <span class="achievement-icon">${financePct === 100 ? '🏅' : '🔒'}</span>
          <div class="achievement-info">
            <span class="achievement-name">Hoàn thành chủ đề Tài chính & Ngân hàng</span>
            <span class="achievement-sub">${financePct === 100 ? 'Đã đạt được!' : `Đã hoàn thành: ${financePct}%`}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- KHỐI 5: THỐNG KÊ TUẦN -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">📊 Thống kê tuần</span>
        <span class="section-badge badge-weekly">7 ngày qua</span>
      </div>
      <div class="weekly-desc">
        Hiệu suất và số lượng từ vựng học tập tích lũy trong 7 ngày gần nhất.
      </div>
      <div class="weekly-stats-list">
        <div class="weekly-stat-row">
          <span>✓ Học từ mới</span>
          <span class="weekly-val">${weeklySummary.studied} từ</span>
        </div>
        <div class="weekly-stat-row">
          <span>✓ Ôn tập</span>
          <span class="weekly-val">${weeklySummary.reviewed} lượt</span>
        </div>
        <div class="weekly-stat-row">
          <span>✓ Độ chính xác</span>
          <span class="weekly-val">${weeklySummary.accuracy}%</span>
        </div>
      </div>
    </div>

    <!-- KHỐI 6: LỊCH HỌC (HEATMAP) -->
    <div class="section-card">
      <div class="section-header">
        <span class="section-title">📅 Lịch học</span>
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
  `;
};

// ================================================================
// PHẦN 5: GIAO DIỆN TAB DANH SÁCH CHỦ ĐỀ (LEARN)
// (Gốc: Learn.js)
// Template HTML cho danh sách các chủ đề từ vựng và tiến trình học từng chủ đề.
// ================================================================

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

// ================================================================
// PHẦN 6: GIAO DIỆN PHIÊN HỌC THẺ (STUDY SESSION)
// (Gốc: Study.js)
// Template HTML cho thẻ lật, các nút đánh giá Again/Hard/Good/Easy,
// màn hình hoàn thành phiên học và màn hình "đã học hết thẻ hôm nay".
// ================================================================

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
        ${card.interval > 0 ? `<span class="interval-pill">⏱ ôn lại sau ${formatIntervalLabel(card.interval)}</span>` : '<span class="interval-pill">⏱ lần đầu tiên</span>'}
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

window.TEMPLATES.finishScreen = function(reviewed, mins, streakDays, history = [], isEarly = false) {
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
          <div class="finish-stat-val">${mins < 0.1 ? '1m' : Math.round(mins) + 'm'}</div>
          <div class="finish-stat-lbl">Phút học</div>
        </div>
        <div class="finish-stat">
          <div class="finish-stat-val">${streakDays}</div>
          <div class="finish-stat-lbl">Chuỗi ngày 🔥</div>
        </div>
      </div>

      ${uniqueHistory.length > 0 ? `
        <div class="session-history-section">
          <div class="session-history-title">📊 Chi tiết trạng thái thẻ từ:</div>
          <div class="session-history-list">
            ${uniqueHistory.map(item => {
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
            }).join("")}
          </div>
        </div>
      ` : ''}

      <button class="btn-primary" onclick="renderLearnList()" style="margin-top: 24px;">Quay lại danh sách</button>
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

// ================================================================
// PHẦN 7: GIAO DIỆN TAB CÀI ĐẶT (SETTINGS)
// (Gốc: Settings.js)
// Template HTML cho các tùy chọn cấu hình, xuất/nhập dữ liệu, đặt lại app.
// ================================================================

if (!window.TEMPLATES) window.TEMPLATES = {};

window.TEMPLATES.settings = function(s, isDemoActive) {
  return `
    <div class="settings-header">
      <h2 class="settings-title">⚙️ Cài đặt</h2>
    </div>

    <div class="settings-group ${isDemoActive ? 'settings-group-demo-active' : ''}">
      <div class="settings-group-title">🧪 Dữ liệu thử nghiệm</div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">Dữ liệu mô phỏng (Demo)</span>
          <span class="setting-desc">${isDemoActive
            ? 'Đang xem dữ liệu GIẢ LẬP để test giao diện. Dữ liệu thật của bạn đã được lưu tạm — tắt công tắc để khôi phục.'
            : 'Nạp thử dữ liệu của một người đã học lâu ngày (streak, thẻ đến hạn, từ yếu, thành tích...) để xem giao diện. Dữ liệu thật sẽ được lưu tạm, không mất gì.'}</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="set-demo"
            ${isDemoActive ? "checked" : ""}
            onchange="toggleDemoData(this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">Học tập</div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">Thẻ mới mỗi ngày</span>
          <span class="setting-desc">Số thẻ từ mới tối đa được giới thiệu mỗi ngày</span>
        </div>
        <div class="setting-control">
          <input type="number" class="setting-input" id="set-daily-new"
            value="${s.dailyNewCards}" min="1" max="100"
            onchange="saveSetting('dailyNewCards', +this.value)">
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">Giới hạn ôn tập mỗi ngày</span>
          <span class="setting-desc">Số lần ôn tập tối đa trong một ngày</span>
        </div>
        <div class="setting-control">
          <input type="number" class="setting-input" id="set-daily-review"
            value="${s.dailyReviewLimit}" min="10" max="500"
            onchange="saveSetting('dailyReviewLimit', +this.value)">
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">Thứ tự học</span>
          <span class="setting-desc">Thứ tự hiển thị các thẻ cần ôn</span>
        </div>
        <div class="setting-control">
          <select class="setting-select" id="set-order"
            onchange="saveSetting('studyOrder', this.value)">
            <option value="due" ${s.studyOrder==="due"?"selected":""}>Theo ngày cần ôn</option>
            <option value="random" ${s.studyOrder==="random"?"selected":""}>Ngẫu nhiên</option>
            <option value="alphabetical" ${s.studyOrder==="alphabetical"?"selected":""}>Theo bảng chữ cái</option>
          </select>
        </div>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">Hiển thị</div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">Hiện phiên âm</span>
          <span class="setting-desc">Hiển thị phiên âm ở mặt trước của thẻ</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="set-phonetic"
            ${s.showPhonetic ? "checked" : ""}
            onchange="saveSetting('showPhonetic', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">Hiện câu ví dụ</span>
          <span class="setting-desc">Hiển thị câu ví dụ ở mặt sau của thẻ</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="set-example"
            ${s.showExample ? "checked" : ""}
            onchange="saveSetting('showExample', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-name">Giao diện sáng</span>
          <span class="setting-desc">Bật tông nền sáng, chữ tối dễ học ban ngày</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="set-theme"
            ${s.theme === "light" ? "checked" : ""}
            onchange="saveSetting('theme', this.checked ? 'light' : 'dark')">
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">Dữ liệu</div>

      <div class="setting-item clickable" onclick="exportData()">
        <div class="setting-info">
          <span class="setting-name">📤 Xuất dữ liệu</span>
          <span class="setting-desc">Tải tiến độ học tập của bạn dưới dạng JSON</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>

      <div class="setting-item clickable" onclick="document.getElementById('import-file').click()">
        <div class="setting-info">
          <span class="setting-name">📥 Nhập dữ liệu</span>
          <span class="setting-desc">Khôi phục tiến độ từ file JSON</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        <input type="file" id="import-file" accept=".json" style="display:none" onchange="importData(event)">
      </div>

      <div class="setting-item clickable danger" onclick="confirmReset()">
        <div class="setting-info">
          <span class="setting-name">🗑️ Xóa toàn bộ tiến độ</span>
          <span class="setting-desc">Xóa vĩnh viễn tất cả dữ liệu học tập</span>
        </div>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>

    <div class="settings-group">
      <div class="settings-group-title">Thông tin ứng dụng</div>
      <div class="about-card">
        <div class="about-logo">⚡</div>
        <div class="about-info">
          <div class="about-name">FlashCard Lite</div>
          <div class="about-ver">v1.1.0 • Powered by FSRS-6 Algorithm</div>
          <div class="about-desc">Học từ vựng nhanh hơn với phương pháp lặp lại ngắt quãng có cơ sở khoa học — mô hình hóa trí nhớ bằng thuật toán FSRS-6 hiện đại, chính xác hơn Anki truyền thống (SM-2).</div>
        </div>
      </div>
    </div>

    <!-- Reset confirmation modal -->
    <div id="reset-modal" class="modal-overlay" style="display:none" onclick="closeResetModal(event)">
      <div class="modal-box">
        <div class="modal-icon">⚠️</div>
        <h3 class="modal-title">Xóa toàn bộ tiến độ?</h3>
        <p class="modal-text">Thao tác này sẽ xóa tất cả trạng thái thẻ, chuỗi ngày học và lịch sử học tập. Không thể hoàn tác.</p>
        <div class="modal-actions">
          <button class="btn-secondary" onclick="document.getElementById('reset-modal').style.display='none'">Hủy</button>
          <button class="btn-danger" onclick="doReset()">Xóa tất cả</button>
        </div>
      </div>
    </div>
  `;
};

// ================================================================
// PHẦN 8: BỘ ĐIỀU KHIỂN TRUNG TÂM (MAIN CONTROLLER)
// (Gốc: main.js)
// Nạp dữ liệu chủ đề động, lắng nghe sự kiện người dùng, điều phối DB (Phần 2)
// và TEMPLATES (Phần 3-6) để vẽ giao diện. Chạy đầu tiên khi trang tải xong,
// nhưng ĐẶT CUỐI file vì cần mọi hàm/biến ở các phần trên đã tồn tại trước.
// ================================================================

// ---- State ----
let currentTab = "home";
let studySession = null;  // Active study session
let sessionStartTime = null;

// ---- Navigation ----
function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-pane").forEach(pane => {
    pane.classList.toggle("active", pane.id === `tab-${tabName}`);
  });
  if (tabName === "home") renderHome();
  if (tabName === "learn") renderLearnList();
  if (tabName === "stats") renderStats();
  if (tabName === "settings") renderSettings();
}

// ============================================================
// HOME TAB — Dashboard hành động nhanh (hôm nay cần học gì, tổng tiến độ, chủ đề)
// ============================================================
function renderHome() {
  const stats       = db.stats;
  const todo        = db.getDailyTodo();
  const { known, learning } = db.getTotalWordStats();
  const totalWords  = TOPICS.reduce((s, t) => s + t.words.length, 0);
  const totalLearned = known + learning;

  document.getElementById("home-content").innerHTML = TEMPLATES.home(
    stats, todo, known, learning, totalWords, totalLearned
  );
}

// ============================================================
// STATS TAB — Phân tích chi tiết (streak, độ chính xác, dự báo FSRS,
// từ yếu, thành tích, thống kê tuần, lịch học heatmap)
// ============================================================
function renderStats() {
  const stats       = db.stats;
  const { known, learning } = db.getTotalWordStats();
  const totalLearned = known + learning;
  const monthlyData = db.getMonthlyActivity();
  const weakData    = db.getWeakWords();
  const accuracy    = db.getAccuracyRate(7);
  const streakRecord = stats.streakRecord || stats.streakDays || 0;
  const streakColor = stats.streakDays >= 7 ? "#f97316" : stats.streakDays >= 3 ? "#fbbf24" : "#6366f1";
  const fsrs        = db.getFSRSPredictions();
  const weeklySummary = db.getWeeklySummary();

  document.getElementById("stats-content").innerHTML = TEMPLATES.stats(
    stats, totalLearned, monthlyData, weakData, accuracy, streakRecord, streakColor, fsrs, weeklySummary
  );
}


function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Chào buổi sáng! ☀️";
  if (h < 18) return "Chào buổi chiều! 🌤️";
  return "Chào buổi tối! 🌙";
}

function formatMinutes(mins) {
  if (!mins) return "0m";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}


// ============================================================
// LEARN TAB — Topic list
// ============================================================
function renderLearnList() {
  document.getElementById("learn-content").innerHTML = TEMPLATES.learnList();
}

// ============================================================
// STUDY SESSION — Flashcard mode
// ============================================================
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

function openTopicStudy(topicId) {
  const topic = TOPICS.find(t => t.id === topicId);
  if (!topic) return;

  const dueCards = db.getDueCards(topicId, topic);

  if (dueCards.length === 0) {
    showNoCardsModal(topic);
    return;
  }

  // Map word data
  const queue = dueCards.map(card => ({
    card,
    word: topic.words.find(w => w.id === card.wordId)
  })).filter(item => item.word);

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
    history: []
  };
  sessionStartTime = Date.now();

  setStudyFocusMode(true);
  renderStudySession();
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

  document.getElementById("learn-content").innerHTML = TEMPLATES.studySession(
    studySession, settings, progress, card
  );
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
    interval: updated.interval
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
  if (name.includes("natural")) score += 100;  // Microsoft "Online (Natural)" — tự nhiên nhất trên Windows/Edge
  if (name.includes("online")) score += 50;    // giọng chạy trên mạng thường chất lượng cao hơn giọng cài sẵn máy
  if (name.includes("google")) score += 40;    // Google US English (Chrome) — ổn định, khá tự nhiên
  if (v.lang.toLowerCase() === "en-us") score += 20; // ưu tiên giọng Mỹ
  if (!v.localService) score += 10;
  return score;
}

/** Quét danh sách giọng của trình duyệt và cache lại giọng tiếng Anh tốt nhất tìm được. */
function _loadBestVoice() {
  if (!("speechSynthesis" in window)) return;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return;
  _ttsVoice = voices
    .map(v => ({ v, score: _scoreVoice(v) }))
    .filter(x => x.score >= 0)
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

  if (!studySession || studySession.reviewed === 0) {
    studySession = null;
    renderLearnList();
    return;
  }

  const mins = (Date.now() - studySession.startTime) / 60000;
  const reviewed = studySession.reviewed;
  db.recordStudySession(reviewed, Math.round(mins * 10) / 10);

  document.getElementById("learn-content").innerHTML = TEMPLATES.finishScreen(
    reviewed, mins, db.stats.streakDays, studySession.history, true
  );
  studySession = null;
}

function finishStudySession() {
  setStudyFocusMode(false);

  const mins = Math.round((Date.now() - studySession.startTime) / 60000 * 10) / 10;
  const reviewed = studySession.reviewed;
  db.recordStudySession(reviewed, mins);

  document.getElementById("learn-content").innerHTML = TEMPLATES.finishScreen(
    reviewed, mins, db.stats.streakDays, studySession.history, false
  );
  studySession = null;
}

function showNoCardsModal(topic) {
  const prog = db.getTopicProgress(topic.id);
  document.getElementById("learn-content").innerHTML = TEMPLATES.noCardsScreen(
    topic, prog
  );
}

// ============================================================
// SETTINGS TAB
// ============================================================
function renderSettings() {
  const s = db.settings;

  document.getElementById("settings-content").innerHTML = TEMPLATES.settings(s, db.isDemoActive());
}

/** Bật/tắt dữ liệu mô phỏng (demo) để xem thử giao diện — xem FlashcardDB.enableDemoData/disableDemoData. */
function toggleDemoData(enable) {
  if (enable) {
    db.enableDemoData();
    showToast("Đã bật dữ liệu mô phỏng — dữ liệu thật đã được lưu tạm");
  } else {
    db.disableDemoData();
    showToast("Đã tắt demo — khôi phục dữ liệu thật của bạn");
  }
  renderSettings();
}

function applyTheme(theme) {
  const isLight = (theme === "light");
  document.documentElement.classList.toggle("light-theme", isLight);
  document.body.classList.toggle("light-theme", isLight);
}

function saveSetting(key, value) {
  db.updateSettings({ [key]: value });
  if (key === "theme") {
    applyTheme(value);
  }
  showToast("Đã lưu cài đặt");
}

function exportData() {
  const json = db.exportData();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flashcard_lite_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Xuất dữ liệu thành công!");
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const success = db.importData(e.target.result);
    showToast(success ? "Nhập dữ liệu thành công!" : "Nhập thất bại — file không hợp lệ");
    if (success) renderSettings();
  };
  reader.readAsText(file);
}

function confirmReset() {
  document.getElementById("reset-modal").style.display = "flex";
}

function closeResetModal(e) {
  if (e.target.id === "reset-modal") {
    document.getElementById("reset-modal").style.display = "none";
  }
}

function doReset() {
  db.resetAllProgress();
  document.getElementById("reset-modal").style.display = "none";
  showToast("Đã xóa toàn bộ tiến độ.");
  renderSettings();
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(message, type = "success") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("toast-visible");
    setTimeout(() => {
      toast.classList.remove("toast-visible");
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  });
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
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

// ---- Dynamic Loading ----
async function loadTopicsDynamic() {
  window.TOPICS = [];
  const topicFiles = [
    // 30 chủ đề x 100 từ (60 cốt lõi / 25 trung bình / 15 nâng cao mỗi chủ đề)
    "data/daily_life.js",
    "data/family.js",
    "data/food_drinks.js",
    "data/shopping.js",
    "data/health.js",
    "data/education.js",
    "data/travel.js",
    "data/transportation.js",
    "data/hotels.js",
    "data/restaurants.js",
    "data/entertainment.js",
    "data/technology.js",
    "data/internet_communication.js",
    "data/environment.js",
    "data/work_careers.js",
    "data/office.js",
    "data/employment_recruitment.js",
    "data/meetings_presentations.js",
    "data/business_operations.js",
    "data/marketing_advertising.js",
    "data/customer_service.js",
    "data/sales.js",
    "data/finance_banking.js",
    "data/accounting.js",
    "data/real_estate.js",
    "data/manufacturing.js",
    "data/shipping_logistics.js",
    "data/contracts_legal.js",
    "data/company_management.js",
    "data/economics_trade.js"
    // data/finance.js và data/toeic.js (bộ TOEIC cũ) tạm không nạp — vẫn còn trong
    // thư mục data/ nếu muốn dùng lại, chỉ cần thêm 2 dòng path vào mảng này.
  ];
  
  await Promise.all(topicFiles.map(src => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false; // giữ đúng thứ tự thực thi theo topicFiles dù tải song song
      script.onload = () => resolve();
      script.onerror = () => {
        console.error("Failed to load topic: " + src);
        resolve(); // resolve anyway to not block
      };
      document.head.appendChild(script);
    });
  }));
}

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
  // Nạp giao diện đã lưu
  applyTheme(db.settings.theme || "dark");

  // Tab buttons
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Load dynamic data first
  await loadTopicsDynamic();

  // Initial render
  renderHome();
});
