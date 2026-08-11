// ================================================================
// FEATURES/SETTINGS/SETTINGS.JS — Tab Cài đặt
// Tùy chọn cấu hình, bật/tắt dữ liệu mô phỏng, xuất/nhập dữ liệu,
// đặt lại toàn bộ tiến độ.
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
