// ============================================================
// ALGORITHM.JS — SM-2 Spaced Repetition (Pure Functions)
// Không phụ thuộc vào bất kỳ module nào khác.
// Muốn đổi thuật toán (FSRS, Leitner...) chỉ cần sửa file này.
// ============================================================

// --- Rating constants ---
const RATING = {
  AGAIN: 0,  // Không nhớ, học lại
  HARD:  1,  // Nhớ nhưng khó
  GOOD:  2,  // Nhớ bình thường
  EASY:  3   // Nhớ rất dễ
};

/**
 * Tạo trạng thái mặc định cho một thẻ mới.
 * @param {string} wordId
 * @returns {CardState}
 */
function createCardState(wordId) {
  return {
    wordId,
    interval:    0,      // số ngày đến lần ôn tập tiếp theo
    repetitions: 0,      // số lần ôn thành công liên tiếp
    easeFactor:  2.5,    // hệ số dễ SM-2 (min 1.3, max 3.5)
    nextReview:  0,      // timestamp (ms), 0 = thẻ mới chưa học
    lastReview:  null,   // timestamp lần ôn gần nhất
    lapses:      0,      // số lần quên sau khi đã vào review
    state:       "new"   // "new" | "learning" | "review"
  };
}

/**
 * Thuật toán SM-2: tính toán lịch ôn tập tiếp theo.
 * Là pure function — không có side effect, không đụng storage.
 *
 * @param {CardState} card - trạng thái thẻ hiện tại
 * @param {number}    rating - RATING.AGAIN | HARD | GOOD | EASY
 * @returns {CardState} trạng thái thẻ mới (immutable)
 */
function sm2(card, rating) {
  const now    = Date.now();
  const MINUTE = 60 * 1000;
  const DAY    = 24 * 60 * MINUTE;

  // Sao chép để không mutate trực tiếp
  let { interval, repetitions, easeFactor, lapses, state } = card;
  let nextReview = card.nextReview;

  if (rating === RATING.AGAIN) {
    // Quên hoàn toàn → reset, ôn lại sau 1 phút
    lapses++;
    repetitions = 0;
    interval    = 0;
    state       = "learning";
    nextReview  = now + 1 * MINUTE;

  } else if (rating === RATING.HARD) {
    // Nhớ khó → giảm ease factor, tăng interval nhẹ
    easeFactor = Math.max(1.3, easeFactor - 0.15);
    if (state === "new" || state === "learning") {
      interval   = 0;
      nextReview = now + 10 * MINUTE;
      state      = "learning";
    } else {
      interval   = Math.round(interval * 1.2);
      nextReview = now + interval * DAY;
      state      = "review";
    }

  } else if (rating === RATING.GOOD) {
    // Nhớ tốt → tăng interval theo ease factor
    if (state === "new" || repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 4;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
    state      = "review";
    nextReview = now + interval * DAY;

  } else if (rating === RATING.EASY) {
    // Nhớ rất dễ → tăng mạnh interval và ease factor
    easeFactor = Math.min(3.5, easeFactor + 0.15);
    if (state === "new" || repetitions === 0) {
      interval = 4;
    } else if (repetitions === 1) {
      interval = 7;
    } else {
      interval = Math.round(interval * easeFactor * 1.3);
    }
    repetitions++;
    state      = "review";
    nextReview = now + interval * DAY;
  }

  return {
    ...card,
    interval,
    repetitions,
    easeFactor,
    lapses,
    state,
    nextReview,
    lastReview: now
  };
}
