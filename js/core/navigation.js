// ================================================================
// CORE/NAVIGATION.JS — Chuyển tab (switchTab), gọi hàm render tương
// ứng của từng feature khi tab được kích hoạt.
// ================================================================

function switchTab(tabName) {
  currentTab = tabName;
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-pane").forEach((pane) => {
    pane.classList.toggle("active", pane.id === `tab-${tabName}`);
  });
  if (tabName === "home") renderHome();
  if (tabName === "learn") renderLearnList();
  if (tabName === "stats") renderStats();
  if (tabName === "settings") renderSettings();
}
