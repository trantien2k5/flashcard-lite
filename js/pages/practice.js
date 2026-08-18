// ================================================================
// PAGES/PRACTICE.JS — Tab Luyện tập nâng cao
// Công cụ luyện tập tương tác ngoài lật thẻ 3D:
// Trắc nghiệm, Gõ từ, Nghe chép chính tả.
// Tự chứa trạng thái làm bài, kiểm tra đáp án, hiển thị feedback panel
// dưới đáy màn hình và tổng kết điểm.
// ================================================================

if (!window.TEMPLATES) window.TEMPLATES = {};

let practiceSession = null;

// ================================================================
// TTS SPEECH UTTERANCE
// ================================================================
function playPracticeSpeech(text) {
  if (!("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "en-US";
  utt.rate = 0.85; // slightly slower for dictation
  const voices = synth.getVoices();
  const enVoice = voices.find((v) => v.lang.startsWith("en"));
  if (enVoice) utt.voice = enVoice;
  synth.speak(utt);
}

// ================================================================
// TEMPLATES
// ================================================================

// 1. Màn hình cấu hình (Practice Config UI)
window.TEMPLATES.practiceConfig = function (mode) {
  let modeName = "Trắc nghiệm";
  let modeDesc = "Chọn nghĩa tiếng Việt chính xác của từ tiếng Anh.";
  let modeEmoji = "🎯";

  if (mode === "typing") {
    modeName = "Gõ từ vựng";
    modeDesc = "Nhìn nghĩa tiếng Việt và gợi ý để gõ lại từ tiếng Anh.";
    modeEmoji = "⌨️";
  } else if (mode === "dictation") {
    modeName = "Nghe chép chính tả";
    modeDesc = "Nghe phát âm tiếng Anh và gõ lại chính xác từ vựng.";
    modeEmoji = "🎧";
  }

  return `
    <div class="practice-container">
      <div class="practice-top-bar">
        <div class="practice-info">
          <span class="practice-mode-title">${modeEmoji} Chế độ: ${modeName}</span>
          <span class="practice-topic-name">Cấu hình buổi luyện tập nâng cao</span>
        </div>
        <button class="btn-close-practice" onclick="exitPractice()" aria-label="Quay lại" title="Quay lại">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="practice-config-card">
        <div class="config-title-row">
          <span>⚙️</span> Thiết lập buổi học
        </div>
        
        <div class="config-row">
          <label class="config-label" for="practice-topic">Chủ đề từ vựng</label>
          <select id="practice-topic" class="config-select">
            <option value="all">📚 Tất cả các chủ đề</option>
            ${TOPICS.map((t) => `<option value="${t.id}">${t.icon} ${t.name}</option>`).join("")}
          </select>
        </div>

        <div class="config-row">
          <label class="config-label" for="practice-count">Số lượng câu hỏi</label>
          <select id="practice-count" class="config-select">
            <option value="10" selected>10 từ vựng</option>
            <option value="20">20 từ vựng</option>
            <option value="50">50 từ vựng</option>
          </select>
        </div>

        <button class="btn-start-practice" onclick="startPracticeSession('${mode}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Bắt đầu luyện tập
        </button>
      </div>
    </div>
  `;
};

// Helper: Trích xuất câu ví dụ che đi từ mục tiêu
function formatExampleBlank(example, word) {
  if (!example) return "";
  const regex = new RegExp(`\\b${word}\\b`, "gi");
  return example.replace(regex, "_______");
}

// 2. Màn hình Trắc nghiệm (Multiple Choice UI)
window.TEMPLATES.practiceMultipleChoice = function (item, options, progress, currentIdx, total) {
  return `
    <div class="practice-container">
      <div class="practice-top-bar">
        <div class="practice-info">
          <span class="practice-mode-title">🎯 Trắc nghiệm từ vựng</span>
          <span class="practice-topic-name">${item.topic.icon} ${item.topic.name}</span>
        </div>
        <button class="btn-close-practice" onclick="exitPractice()" aria-label="Thoát" title="Thoát">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="practice-progress-wrapper">
        <div class="practice-progress-fill" style="width: ${progress}%"></div>
      </div>

      <div class="practice-question-area">
        <div class="question-card">
          <div class="question-prompt">Chọn nghĩa phù hợp nhất:</div>
          <div class="question-main">${item.word.word}</div>
          <div class="question-sub-prompt">${item.word.phonetic || ""}</div>
        </div>

        <div class="options-grid">
          ${options
            .map((opt, idx) => {
              const letter = ["A", "B", "C", "D"][idx];
              return `
              <button class="option-btn" id="opt-${idx}" onclick="selectChoice(${idx})">
                <span class="option-marker">${letter}</span>
                <span>${opt}</span>
              </button>
            `;
            })
            .join("")}
        </div>
      </div>

      <div id="practice-feedback-root"></div>
    </div>
  `;
};

// 3. Màn hình Gõ từ (Typing UI)
window.TEMPLATES.practiceTyping = function (item, progress) {
  const blankedExample = formatExampleBlank(item.word.example, item.word.word);
  return `
    <div class="practice-container">
      <div class="practice-top-bar">
        <div class="practice-info">
          <span class="practice-mode-title">⌨️ Gõ từ vựng</span>
          <span class="practice-topic-name">${item.topic.icon} ${item.topic.name}</span>
        </div>
        <button class="btn-close-practice" onclick="exitPractice()" aria-label="Thoát" title="Thoát">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="practice-progress-wrapper">
        <div class="practice-progress-fill" style="width: ${progress}%"></div>
      </div>

      <div class="practice-question-area">
        <div class="question-card">
          <div class="question-prompt">Nhìn nghĩa và hoàn thành từ tiếng Anh:</div>
          <div class="question-main" style="font-size: 26px; color: var(--accent-blue);">${item.word.meaning}</div>
          ${blankedExample ? `<div class="question-sub-prompt" style="margin-top: 12px; font-size: 15px;">"${blankedExample}"</div>` : ""}
        </div>

        <div class="typing-input-wrapper">
          <input type="text" id="typing-input" class="typing-input" placeholder="Gõ từ tiếng Anh vào đây..." autocomplete="off" spellcheck="false" oninput="onTypingInput(this.value)">
          <button class="btn-check-answer" id="btn-check-typing" onclick="checkTypingAnswer()" disabled>Kiểm tra đáp án</button>
        </div>
      </div>

      <div id="practice-feedback-root"></div>
    </div>
  `;
};

// 4. Màn hình Nghe chép chính tả (Dictation UI)
window.TEMPLATES.practiceDictation = function (item, progress) {
  return `
    <div class="practice-container">
      <div class="practice-top-bar">
        <div class="practice-info">
          <span class="practice-mode-title">🎧 Nghe chép chính tả</span>
          <span class="practice-topic-name">${item.topic.icon} ${item.topic.name}</span>
        </div>
        <button class="btn-close-practice" onclick="exitPractice()" aria-label="Thoát" title="Thoát">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="practice-progress-wrapper">
        <div class="practice-progress-fill" style="width: ${progress}%"></div>
      </div>

      <div class="practice-question-area">
        <div class="question-card" style="padding: 24px;">
          <div class="question-prompt">Bấm loa phát âm và chép lại từ tiếng Anh:</div>
          <div class="audio-play-wrapper">
            <button class="audio-play-btn" onclick="playPracticeSpeech('${item.word.word}')" aria-label="Phát âm" title="Phát âm">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            </button>
          </div>
          <div class="question-sub-prompt" style="font-size: 14px; font-weight: 600; color: var(--text-muted);">Gợi ý nghĩa: ${item.word.meaning}</div>
        </div>

        <div class="typing-input-wrapper">
          <input type="text" id="typing-input" class="typing-input" placeholder="Gõ từ bạn nghe được..." autocomplete="off" spellcheck="false" oninput="onTypingInput(this.value)">
          <button class="btn-check-answer" id="btn-check-typing" onclick="checkTypingAnswer()" disabled>Kiểm tra đáp án</button>
        </div>
      </div>

      <div id="practice-feedback-root"></div>
    </div>
  `;
};

// 5. Màn hình Kết quả (Finish UI)
window.TEMPLATES.practiceFinish = function (correct, incorrect, accuracy, mode) {
  let badgeIcon = "🏆";
  let congrText = "Tuyệt vời!";
  let subText = "Bạn đã hoàn thành phiên luyện tập xuất sắc.";

  if (accuracy < 50) {
    badgeIcon = "💪";
    congrText = "Cố gắng lên!";
    subText = "Luyện tập thường xuyên để cải thiện trí nhớ nhé.";
  } else if (accuracy >= 90) {
    badgeIcon = "👑";
    congrText = "Hoàn hảo!";
    subText = "Trí nhớ của bạn về các từ vựng này cực kỳ sắc bén.";
  }

  return `
    <div class="practice-container">
      <div class="practice-finish-card">
        <div class="finish-badge-icon">${badgeIcon}</div>
        <h2 class="finish-title">${congrText}</h2>
        <p class="finish-sub" style="margin-bottom: 24px;">${subText}</p>

        <div class="finish-accuracy-ring" style="--pct: ${accuracy}%">
          ${accuracy}%
        </div>

        <div class="finish-stat-grid">
          <div class="finish-stat-box" style="--accent: #10b981">
            <span class="finish-stat-box-val" style="color: #10b981">${correct}</span>
            <span class="finish-stat-box-lbl">Đúng</span>
          </div>
          <div class="finish-stat-box" style="--accent: #f43f5e">
            <span class="finish-stat-box-val" style="color: #f43f5e">${incorrect}</span>
            <span class="finish-stat-box-lbl">Sai</span>
          </div>
          <div class="finish-stat-box" style="--accent: #8b5cf6">
            <span class="finish-stat-box-val" style="color: #a78bfa">${correct + incorrect}</span>
            <span class="finish-stat-box-lbl">Tổng số</span>
          </div>
        </div>

        <button class="btn-finish-practice" onclick="exitPractice()">
          Xong
        </button>
      </div>
    </div>
  `;
};

// Helper: Tạo panel kết quả Bottom
function renderFeedbackPanel(isCorrect, explanation, nextBtnText = "Tiếp tục") {
  const panelClass = isCorrect ? "panel-correct" : "panel-incorrect";
  const icon = isCorrect ? "🎉" : "😅";
  const statusText = isCorrect ? "Đúng rồi!" : "Chưa chính xác!";
  const statusClass = isCorrect ? "feedback-text-correct" : "feedback-text-incorrect";

  return `
    <div class="feedback-panel ${panelClass}">
      <div class="feedback-status-row">
        <span class="feedback-icon">${icon}</span>
        <span class="${statusClass}">${statusText}</span>
      </div>
      <div class="feedback-explanation">${explanation}</div>
      <button class="btn-next-question" onclick="nextPracticeQuestion()">${nextBtnText}</button>
    </div>
  `;
}

// ================================================================
// CONTROLLER LOGIC
// ================================================================

function openPracticeConfig(mode) {
  const container = document.getElementById("review-content");
  container.classList.remove("review-dashboard");
  container.innerHTML = TEMPLATES.practiceConfig(mode);
}

function startPracticeSession(mode) {
  const topicId = document.getElementById("practice-topic").value;
  const count = parseInt(document.getElementById("practice-count").value, 10);

  // Thu thập các từ vựng
  let words = [];
  if (topicId === "all") {
    TOPICS.forEach((t) => words.push(...t.words));
  } else {
    const t = TOPICS.find((x) => x.id === topicId);
    if (t) words.push(...t.words);
  }

  if (words.length === 0) {
    showToast("Không tìm thấy từ vựng nào trong chủ đề này!");
    return;
  }

  // Trộn ngẫu nhiên
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  // Build queue
  const queue = selected.map((w) => {
    const topic = TOPICS.find((t) => t.words.some((word) => word.id === w.id));
    const card = db.getCard(w.id);
    return { word: w, card, topic };
  });

  practiceSession = {
    mode,
    topicId,
    count: queue.length,
    queue,
    current: 0,
    correctCount: 0,
    incorrectCount: 0,
    checked: false,
    selectedAnswer: null,
    typedAnswer: "",
    options: [], // dùng riêng cho trắc nghiệm
  };

  setStudyFocusMode(true);
  renderPracticeQuestion();
}

function renderPracticeQuestion() {
  if (!practiceSession) return;

  const { mode, queue, current, count } = practiceSession;

  if (current >= queue.length) {
    finishPracticeSession();
    return;
  }

  practiceSession.checked = false;
  practiceSession.selectedAnswer = null;
  practiceSession.typedAnswer = "";

  const item = queue[current];
  const progress = Math.round((current / count) * 100);

  if (mode === "multiple-choice") {
    // Tạo 4 phương án (1 đúng, 3 gây nhiễu)
    const options = [item.word.meaning];

    // Lấy nghĩa của các từ vựng khác trong cùng một chủ đề (hoặc từ vựng khác toàn cục nếu không đủ)
    let candidates = [];
    TOPICS.forEach((t) => {
      t.words.forEach((w) => {
        if (w.meaning !== item.word.meaning && !candidates.includes(w.meaning)) {
          candidates.push(w.meaning);
        }
      });
    });

    const shuffledCandidates = candidates.sort(() => Math.random() - 0.5);
    const distractors = shuffledCandidates.slice(0, 3);
    options.push(...distractors);

    // Trộn lại vị trí phương án
    practiceSession.options = options.sort(() => Math.random() - 0.5);

    document.getElementById("review-content").innerHTML = TEMPLATES.practiceMultipleChoice(
      item,
      practiceSession.options,
      progress,
      current,
      count
    );
  } else if (mode === "typing") {
    document.getElementById("review-content").innerHTML = TEMPLATES.practiceTyping(item, progress);
    document.getElementById("typing-input").focus();
  } else if (mode === "dictation") {
    document.getElementById("review-content").innerHTML = TEMPLATES.practiceDictation(item, progress);
    document.getElementById("typing-input").focus();
    // Phát âm ngay lập tức
    setTimeout(() => playPracticeSpeech(item.word.word), 350);
  }
}

// Theo dõi người dùng nhập liệu ở dạng gõ/nghe
function onTypingInput(val) {
  if (!practiceSession) return;
  practiceSession.typedAnswer = val.trim();
  const btn = document.getElementById("btn-check-typing");
  if (btn) {
    btn.disabled = val.trim().length === 0;
  }
}

// Bấm phím Enter để kiểm tra nhanh trong ô gõ
document.addEventListener("keydown", (e) => {
  if (!practiceSession || practiceSession.checked) return;
  if (e.key === "Enter") {
    const typingInput = document.getElementById("typing-input");
    if (typingInput && typingInput === document.activeElement && practiceSession.typedAnswer.length > 0) {
      e.preventDefault();
      if (practiceSession.mode === "typing" || practiceSession.mode === "dictation") {
        checkTypingAnswer();
      }
    }
  }
});

// KIỂM TRA ĐÁP ÁN
function selectChoice(idx) {
  if (!practiceSession || practiceSession.checked) return;

  practiceSession.checked = true;
  practiceSession.selectedAnswer = idx;

  const item = practiceSession.queue[practiceSession.current];
  const selectedText = practiceSession.options[idx];
  const isCorrect = selectedText === item.word.meaning;

  // Cập nhật điểm
  if (isCorrect) {
    practiceSession.correctCount++;
  } else {
    practiceSession.incorrectCount++;
  }

  // Khóa tất cả các nút phương án và tô màu
  const buttons = document.querySelectorAll(".option-btn");
  buttons.forEach((btn, bIdx) => {
    btn.disabled = true;
    const btnText = practiceSession.options[bIdx];

    if (btnText === item.word.meaning) {
      btn.classList.add("revealed-correct");
    }

    if (bIdx === idx) {
      if (isCorrect) {
        btn.classList.remove("revealed-correct");
        btn.classList.add("selected-correct");
      } else {
        btn.classList.add("selected-incorrect");
      }
    }
  });

  // Phát phát âm từ tiếng Anh làm phần thưởng/củng cố
  playPracticeSpeech(item.word.word);

  // Hiển thị feedback
  let explanation = `Từ vựng <strong>${item.word.word}</strong> (${item.word.pos}) dịch nghĩa là: <em>${item.word.meaning}</em>.`;
  if (item.word.example) {
    explanation += `<br><span style="display:block; margin-top:8px; font-style:italic;">Ví dụ: "${item.word.example}"</span>`;
  }

  document.getElementById("practice-feedback-root").innerHTML = renderFeedbackPanel(
    isCorrect,
    explanation,
    practiceSession.current === practiceSession.count - 1 ? "Hoàn thành" : "Tiếp tục"
  );
}

function checkTypingAnswer() {
  if (!practiceSession || practiceSession.checked) return;

  const inputEl = document.getElementById("typing-input");
  const checkBtn = document.getElementById("btn-check-typing");
  if (inputEl) inputEl.disabled = true;
  if (checkBtn) checkBtn.disabled = true;

  practiceSession.checked = true;

  const item = practiceSession.queue[practiceSession.current];
  const typed = practiceSession.typedAnswer.toLowerCase().replace(/[^a-z0-9]/g, "");
  const target = item.word.word.toLowerCase().replace(/[^a-z0-9]/g, "");

  const isCorrect = typed === target;

  if (isCorrect) {
    practiceSession.correctCount++;
    if (inputEl) {
      inputEl.style.borderColor = "#10b981";
      inputEl.style.boxShadow = "0 0 15px rgba(16, 185, 129, 0.2)";
    }
  } else {
    practiceSession.incorrectCount++;
    if (inputEl) {
      inputEl.style.borderColor = "#f43f5e";
      inputEl.style.boxShadow = "0 0 15px rgba(244, 63, 94, 0.2)";
    }
  }

  playPracticeSpeech(item.word.word);

  let explanation = `Đáp án chính xác: <strong style="font-size: 16px; color: var(--accent-blue);">${item.word.word}</strong>`;
  explanation += `<br>Nghĩa: <em>${item.word.meaning}</em>.`;
  if (item.word.example) {
    explanation += `<br><span style="display:block; margin-top:6px; font-style:italic;">Ví dụ: "${item.word.example}"</span>`;
  }

  document.getElementById("practice-feedback-root").innerHTML = renderFeedbackPanel(
    isCorrect,
    explanation,
    practiceSession.current === practiceSession.count - 1 ? "Hoàn thành" : "Tiếp tục"
  );
}

function nextPracticeQuestion() {
  if (!practiceSession) return;
  practiceSession.current++;
  renderPracticeQuestion();
}

function finishPracticeSession() {
  if (!practiceSession) return;

  const { correctCount, incorrectCount } = practiceSession;
  const total = correctCount + incorrectCount;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 100;

  // Ghi nhận lịch sử học tập vào DB (cộng số từ đã luyện tập vào heatmap)
  if (correctCount > 0) {
    db.recordStudySession(correctCount, 0.5); // ghi nhận số từ đúng và tính 0.5 phút
  }

  document.getElementById("review-content").innerHTML = TEMPLATES.practiceFinish(
    correctCount,
    incorrectCount,
    accuracy,
    practiceSession.mode
  );
}

function exitPractice() {
  practiceSession = null;
  setStudyFocusMode(false);
  renderReview();
}
