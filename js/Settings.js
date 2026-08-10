// ============================================================
// SETTINGS.JS (VIEW LAYER)
// Vai trò: Định nghĩa template HTML cho cấu hình và tùy chọn hệ thống
// Chức năng:
//  - Hiển thị các ô cấu hình số lượng thẻ học mới/ôn tập giới hạn hàng ngày
//  - Các lựa chọn thứ tự hiển thị thẻ học (Ngẫu nhiên, Bảng chữ cái, Đến hạn)
//  - Các công tắc bật tắt hiển thị phiên âm/câu ví dụ
//  - Cung cấp các nút tương tác dữ liệu (Xuất/Nhập file JSON và Xóa dữ liệu reset app)
// ============================================================
if (!window.TEMPLATES) window.TEMPLATES = {};

window.TEMPLATES.settings = function(s) {
  return `
    <div class="settings-header">
      <h2 class="settings-title">⚙️ Cài đặt</h2>
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
