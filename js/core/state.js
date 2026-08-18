// ================================================================
// CORE/STATE.JS — State toàn cục dùng chung giữa các feature
// (tab đang mở, phiên học đang chạy). Nạp sớm để mọi feature file
// tham chiếu được, bất kể thứ tự nạp giữa các feature.
// ================================================================

let currentTab = "home";
let studySession = null; // Active study session
