// ================================================================
// FSRS.JS — Thuật toán ghi nhớ ngắt quãng (FSRS-6)
// Thuật toán THUẦN TÚY: không DOM, không localStorage, không đụng `db`,
// không render. Chỉ tính Độ khó, Độ ổn định, Khả năng nhớ và khoảng
// cách ngày ôn tập tiếp theo cho mỗi thẻ — nhận input, trả output, hết.
// Không phụ thuộc file nào khác. Nạp ĐẦU TIÊN — storage.js và app.js
// đều dùng hàm/hằng số từ đây (RATING, fsrs(), createCardState()...).
// ================================================================

// --- Rating constants ---
const RATING = {
  AGAIN: 0, // Không nhớ, học lại
  HARD: 1, // Nhớ nhưng khó
  GOOD: 2, // Nhớ bình thường
  EASY: 3, // Nhớ rất dễ
};

// --- Hằng số thời gian ---
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

// --- Tham số FSRS-6 (bộ trọng số mặc định do open-spaced-repetition huấn luyện, 21 giá trị w0..w20) ---
const FSRS_WEIGHTS = [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542];

const REQUEST_RETENTION = 0.9; // xác suất nhớ mục tiêu khi lên lịch ôn tiếp theo
const MAX_INTERVAL_DAYS = 36500; // chặn trên ~100 năm, tránh số phi thực tế
const DECAY = -FSRS_WEIGHTS[20];
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // đảm bảo R(t=S) luôn = 90%

function clampD(d) {
  return Math.min(10, Math.max(1, d));
}
function clampS(s) {
  return Math.max(0.01, s);
}

/**
 * Tạo trạng thái mặc định cho một thẻ mới.
 * @param {string} wordId
 * @returns {CardState}
 */
function createCardState(wordId) {
  return {
    wordId,
    difficulty: null, // D ∈ [1,10] — độ khó ghi nhớ của từ này với người học, null = chưa ôn lần nào
    stability: null, // S (đơn vị: ngày) — độ ổn định trí nhớ, null = chưa ôn lần nào
    interval: 0, // khoảng ôn kế tiếp được lên lịch (đơn vị ngày, có thể lẻ khi đang ở bước học ngắn)
    reps: 0, // số lần ôn thành công liên tiếp kể từ lần quên gần nhất
    nextReview: 0, // timestamp (ms), 0 = thẻ mới chưa học
    lastReview: null, // timestamp lần ôn gần nhất
    lapses: 0, // số lần quên sau khi đã vào trạng thái review
    state: "new", // "new" | "learning" | "review" | "relearning"
  };
}

/** R(t, S) — xác suất nhớ được sau t ngày kể từ lần ôn có độ ổn định S (ngày). */
function retrievability(elapsedDays, stability) {
  if (!stability || stability <= 0) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
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
  const deltaD = -w[6] * (rating - 2); // rating-2 ≡ (G-3) khi G ở thang 1..4, GOOD là mốc trung tâm
  const dPrime = D + (deltaD * (10 - D)) / 9;
  const easyD0 = clampD(w[4] - Math.exp(w[5] * 3) + 1); // D0 ứng với rating Easy — mốc hồi quy trung bình
  return clampD(w[7] * easyD0 + (1 - w[7]) * dPrime);
}

/** Cập nhật S khi trả lời đúng (Hard/Good/Easy) và đã cách lần ôn trước ít nhất 1 ngày. */
function nextRecallStability(D, S, R, rating) {
  const w = FSRS_WEIGHTS;
  const hardPenalty = rating === RATING.HARD ? w[15] : 1;
  const easyBonus = rating === RATING.EASY ? w[16] : 1;
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
  const R = !isFirstReview ? retrievability(elapsedDays, S0) : 1;

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
    nextState = state === "review" || state === "relearning" ? "relearning" : "learning";
    interval = 1 / 1440;
  } else if (inLearningPhase && rating === RATING.HARD) {
    // Nhớ khó khi còn đang học/học lại → thêm một bước học ngắn trước khi tốt nghiệp
    nextState = state === "new" || isFirstReview ? "learning" : state;
    interval = 10 / 1440;
  } else {
    // Good/Easy, hoặc Hard khi đã ở review → tốt nghiệp / tiếp tục ở review
    nextState = "review";
    interval = intervalForStability(S, requestRetention);
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
  let reps = card.reps || 0;
  if (rating === RATING.AGAIN) {
    lapses = card.state === "review" ? lapses + 1 : lapses;
    reps = 0;
  } else if (nextState === "review") {
    reps = reps + 1;
  }

  return {
    ...card,
    difficulty: D,
    stability: S,
    interval,
    reps,
    lapses,
    state: nextState,
    nextReview: now + interval * DAY,
    lastReview: now,
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
