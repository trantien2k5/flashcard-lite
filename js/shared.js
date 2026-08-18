// ================================================================
// SHARED/TOAST.JS — Thông báo nổi (toast) dùng chung, gọi từ bất kỳ
// feature nào (hiện tại: Settings) khi cần báo kết quả 1 thao tác.
// ================================================================

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
