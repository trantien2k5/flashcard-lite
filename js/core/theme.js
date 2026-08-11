// ================================================================
// CORE/THEME.JS — Áp dụng giao diện sáng/tối cho toàn app (dùng lúc
// khởi động và khi người dùng đổi ở Settings).
// ================================================================

function applyTheme(theme) {
  const isLight = (theme === "light");
  document.documentElement.classList.toggle("light-theme", isLight);
  document.body.classList.toggle("light-theme", isLight);
}
