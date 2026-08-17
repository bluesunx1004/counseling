// ============================================================
// 이 파일 하나만 고치면 전체 앱이 내 구글시트/앱스스크립트에 연결됩니다.
// README.md의 "5단계: 배포 URL 연결" 을 먼저 진행한 뒤 아래 값을 바꾸세요.
// ============================================================
const CONFIG = {
  // Google Apps Script를 웹앱으로 배포하면 나오는 URL을 그대로 붙여넣으세요.
  // 예: "https://script.google.com/macros/s/AKfycb.../exec"
  API_URL: "https://script.google.com/macros/s/AKfycbznUJ6vpzc054PEunst2ciAgAapUSP2LiBIvedAEkucytc5KHQs45hxLXzHQnJu6HBR/exec",

  // 상담 예약 가능 시간대 설정 (24시간제, 분 단위)
  SLOT_START: "09:00",
  SLOT_END: "17:00",
  SLOT_MINUTES: 20,

  // 점심시간 등 예약 제외 시간대 (없으면 빈 배열로 두세요)
  BLOCKED_RANGES: [
    { start: "12:50", end: "13:20" }
  ]
};
