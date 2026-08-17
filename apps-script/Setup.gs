// ============================================================
//  초기 설정 도우미
//  스프레드시트를 열면 상단에 "상담 포트폴리오" 메뉴가 생깁니다.
//  거기서 [1. 시트 초기화]를 한 번만 눌러 필요한 시트/헤더를 자동 생성하세요.
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("상담 포트폴리오")
    .addItem("1. 시트 초기화 (최초 1회)", "setupSheets")
    .addItem("2. 예시 학생 데이터 넣기", "insertSampleStudents")
    .addToUi();
}

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  ensureSheet(ss, "Students",
    ["studentId", "number", "name", "birth", "contact", "notes"]);

  ensureSheet(ss, "Schedules",
    ["scheduleId", "studentId", "date", "startTime", "endTime", "purpose", "status", "createdAt"]);

  ensureSheet(ss, "Counseling_Logs",
    ["logId", "studentId", "scheduleId", "date", "type",
     "aiTopic", "aiStudentSummary", "aiTeacherAdvice", "aiFollowUp",
     "teacherMemo", "rawText", "fileUrl", "createdAt"]);

  SpreadsheetApp.getUi().alert("시트 초기화 완료! Students / Schedules / Counseling_Logs 시트가 준비되었습니다.");
}

function ensureSheet(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  // 헤더가 비어 있을 때만 기록 (기존 데이터 보호)
  const firstRow = sh.getRange(1, 1, 1, headers.length).getValues()[0];
  const isEmpty = firstRow.every((v) => v === "" || v === null);
  if (isEmpty) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f0f0f0");
    sh.setFrozenRows(1);
  }
}

function insertSampleStudents() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Students");
  if (!sh) { SpreadsheetApp.getUi().alert("먼저 [1. 시트 초기화]를 실행하세요."); return; }
  const samples = [
    ["STU_sample_1", 1, "김민준", "2009-03-14", "010-1111-2222", ""],
    ["STU_sample_2", 2, "이서연", "2009-07-02", "010-3333-4444", "천식 있음"],
    ["STU_sample_3", 3, "박도윤", "2009-11-20", "010-5555-6666", ""]
  ];
  sh.getRange(sh.getLastRow() + 1, 1, samples.length, samples[0].length).setValues(samples);
  SpreadsheetApp.getUi().alert("예시 학생 3명을 추가했습니다.");
}
