// ============================================================
//  학급 상담 포트폴리오 - 백엔드 (Google Apps Script)
//  이 스크립트는 구글 스프레드시트에 부착되어 API 역할을 합니다.
//  프론트엔드(GitHub Pages)의 fetch 요청을 받아 시트를 읽고 씁니다.
// ============================================================

// ---- 설정: 스크립트 속성(Script Properties)에서 값 읽기 ----
// OPENAI_API_KEY, DRIVE_FOLDER_ID 는 코드에 직접 쓰지 말고
// 프로젝트 설정 > 스크립트 속성에 저장하세요. (README 참고)
function getProp(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

const SHEET_STUDENTS = "Students";
const SHEET_SCHEDULES = "Schedules";
const SHEET_LOGS = "Counseling_Logs";

// ---- 공통 응답 헬퍼 ----
function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function ok(data) { return jsonOutput({ ok: true, data: data }); }
function fail(msg) { return jsonOutput({ ok: false, error: String(msg) }); }

// ============================================================
//  라우팅: GET (조회) / POST (생성·수정·삭제)
// ============================================================
function doGet(e) {
  try {
    const action = e.parameter.action;
    switch (action) {
      case "getStudents":  return ok(getStudents());
      case "getSchedules": return ok(getSchedules(e.parameter));
      case "getPortfolio": return ok(getPortfolio(e.parameter.studentId));
      case "ping":         return ok("pong");
      default: return fail("알 수 없는 action: " + action);
    }
  } catch (err) {
    return fail(err.message || err);
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    switch (action) {
      case "addStudent":    return ok(addStudent(body));
      case "updateStudent": return ok(updateStudent(body));
      case "deleteStudent": return ok(deleteStudent(body.studentId));
      case "addSchedule":   return ok(addSchedule(body));
      case "updateSchedule":return ok(updateSchedule(body));
      case "addLog":        return ok(addLog(body));
      default: return fail("알 수 없는 action: " + action);
    }
  } catch (err) {
    return fail(err.message || err);
  }
}

// ============================================================
//  시트 유틸리티
// ============================================================
function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) throw new Error("시트를 찾을 수 없습니다: " + name + " (초기설정 메뉴를 먼저 실행하세요)");
  return sh;
}

// 시트를 [{header: value}, ...] 객체 배열로 읽기
function readAll(name) {
  const sh = getSheet(name);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = row[i]));
    return obj;
  });
}

function appendRow(name, obj) {
  const sh = getSheet(name);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const row = headers.map((h) => (obj[h] !== undefined ? obj[h] : ""));
  sh.appendRow(row);
}

// idColumn 값이 idValue인 행을 찾아 patch 객체의 필드를 갱신
function updateRow(name, idColumn, idValue, patch) {
  const sh = getSheet(name);
  const values = sh.getDataRange().getValues();
  const headers = values[0];
  const idIdx = headers.indexOf(idColumn);
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idIdx]) === String(idValue)) {
      headers.forEach((h, c) => {
        if (patch[h] !== undefined) sh.getRange(r + 1, c + 1).setValue(patch[h]);
      });
      return true;
    }
  }
  return false;
}

function deleteRow(name, idColumn, idValue) {
  const sh = getSheet(name);
  const values = sh.getDataRange().getValues();
  const idIdx = values[0].indexOf(idColumn);
  for (let r = 1; r < values.length; r++) {
    if (String(values[r][idIdx]) === String(idValue)) {
      sh.deleteRow(r + 1);
      return true;
    }
  }
  return false;
}

function newId(prefix) {
  return prefix + "_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
}

// 날짜/시간 값을 문자열로 정규화 (시트가 Date 객체로 저장하는 경우 대비)
function asDateStr(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd");
  return String(v || "");
}
function asTimeStr(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), "HH:mm");
  return String(v || "");
}

// ============================================================
//  학생 (Students)
// ============================================================
function getStudents() {
  return readAll(SHEET_STUDENTS)
    .map((s) => ({
      studentId: s.studentId,
      number: s.number,
      name: s.name,
      birth: asDateStr(s.birth),
      contact: s.contact,
      notes: s.notes
    }))
    .filter((s) => s.studentId);
}

function addStudent(b) {
  const studentId = newId("STU");
  appendRow(SHEET_STUDENTS, {
    studentId, number: b.number, name: b.name,
    birth: b.birth, contact: b.contact, notes: b.notes
  });
  return { studentId };
}

function updateStudent(b) {
  const okUpd = updateRow(SHEET_STUDENTS, "studentId", b.studentId, {
    number: b.number, name: b.name, birth: b.birth, contact: b.contact, notes: b.notes
  });
  if (!okUpd) throw new Error("해당 학생을 찾을 수 없습니다.");
  return { studentId: b.studentId };
}

function deleteStudent(studentId) {
  const okDel = deleteRow(SHEET_STUDENTS, "studentId", studentId);
  if (!okDel) throw new Error("해당 학생을 찾을 수 없습니다.");
  return { studentId };
}

// ============================================================
//  상담 일정 (Schedules)
// ============================================================
function getSchedules(params) {
  params = params || {};
  const students = getStudents();
  const nameById = {};
  students.forEach((s) => (nameById[s.studentId] = s.name));

  let rows = readAll(SHEET_SCHEDULES)
    .filter((r) => r.scheduleId)
    .map((r) => ({
      scheduleId: r.scheduleId,
      studentId: r.studentId,
      studentName: nameById[r.studentId] || "(삭제된 학생)",
      date: asDateStr(r.date),
      startTime: asTimeStr(r.startTime),
      endTime: asTimeStr(r.endTime),
      purpose: r.purpose,
      status: r.status || "PENDING"
    }));

  if (params.studentId) rows = rows.filter((r) => r.studentId === params.studentId);
  if (params.start) rows = rows.filter((r) => r.date >= params.start);
  if (params.end) rows = rows.filter((r) => r.date <= params.end);
  return rows;
}

// 중복 예약 방지: 같은 날짜에 시간이 겹치는 활성 일정이 있으면 거부
function hasConflict(date, startTime, endTime) {
  const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const ns = toMin(startTime), ne = toMin(endTime);
  return readAll(SHEET_SCHEDULES).some((r) => {
    if (asDateStr(r.date) !== date) return false;
    if ((r.status || "PENDING") === "CANCELLED") return false;
    const es = toMin(asTimeStr(r.startTime)), ee = toMin(asTimeStr(r.endTime));
    return ns < ee && ne > es;
  });
}

function addSchedule(b) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000); // 동시 예약으로 인한 중복 방지
  try {
    if (hasConflict(b.date, b.startTime, b.endTime)) {
      throw new Error("이미 예약된 시간대입니다. 다른 시간을 선택해 주세요.");
    }
    const scheduleId = newId("SCH");
    appendRow(SHEET_SCHEDULES, {
      scheduleId, studentId: b.studentId, date: b.date,
      startTime: b.startTime, endTime: b.endTime,
      purpose: b.purpose, status: "PENDING", createdAt: new Date()
    });
    return { scheduleId };
  } finally {
    lock.releaseLock();
  }
}

function updateSchedule(b) {
  const okUpd = updateRow(SHEET_SCHEDULES, "scheduleId", b.scheduleId, { status: b.status });
  if (!okUpd) throw new Error("해당 일정을 찾을 수 없습니다.");
  return { scheduleId: b.scheduleId };
}

// ============================================================
//  상담 기록 (Counseling_Logs) + AI 처리
// ============================================================
function getPortfolio(studentId) {
  const student = getStudents().find((s) => s.studentId === studentId) || null;
  const schedules = getSchedules({ studentId });
  const logs = readAll(SHEET_LOGS)
    .filter((r) => r.logId && r.studentId === studentId)
    .map((r) => ({
      logId: r.logId,
      studentId: r.studentId,
      date: asDateStr(r.date),
      type: r.type,
      aiTopic: r.aiTopic,
      aiStudentSummary: r.aiStudentSummary,
      aiTeacherAdvice: r.aiTeacherAdvice,
      aiFollowUp: r.aiFollowUp,
      teacherMemo: r.teacherMemo,
      rawText: r.rawText,
      fileUrl: r.fileUrl
    }));
  return { student, schedules, logs };
}

function addLog(b) {
  let fileUrl = "";
  let rawText = b.memo || "";

  // 1) 파일이 있으면 Drive에 업로드
  if (b.fileBase64 && b.fileName) {
    const uploaded = uploadToDrive(b.fileBase64, b.fileName, b.mimeType);
    fileUrl = uploaded.url;

    // 2) 자료 유형에 따라 텍스트 추출
    if (b.type === "AUDIO") {
      rawText = transcribeAudio(b.fileBase64, b.fileName, b.mimeType) + (b.memo ? "\n\n[교사 메모] " + b.memo : "");
    } else if (b.type === "PDF") {
      rawText = extractPdfText(uploaded.fileId) + (b.memo ? "\n\n[교사 메모] " + b.memo : "");
    }
  }

  // 3) 추출/입력 텍스트를 AI로 4개 항목 구조화
  const structured = summarizeCounseling(rawText);

  // 4) 시트에 저장
  const logId = newId("LOG");
  appendRow(SHEET_LOGS, {
    logId,
    studentId: b.studentId,
    scheduleId: b.scheduleId || "",
    date: b.date,
    type: b.type,
    aiTopic: structured.topic,
    aiStudentSummary: structured.studentSummary,
    aiTeacherAdvice: structured.teacherAdvice,
    aiFollowUp: structured.followUp,
    teacherMemo: b.memo || "",
    rawText: rawText,
    fileUrl: fileUrl,
    createdAt: new Date()
  });

  // 연결된 일정이 있으면 '상담 완료'로 표시
  if (b.scheduleId) {
    updateRow(SHEET_SCHEDULES, "scheduleId", b.scheduleId, { status: "DONE" });
  }

  return {
    logId,
    aiTopic: structured.topic,
    aiStudentSummary: structured.studentSummary,
    aiTeacherAdvice: structured.teacherAdvice,
    aiFollowUp: structured.followUp
  };
}
