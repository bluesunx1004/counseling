const msgEl = document.getElementById("msg");

async function loadStudents() {
  const sel = document.getElementById("studentSelect");
  sel.innerHTML = `<option value="">불러오는 중...</option>`;
  try {
    const students = await apiGet("getStudents");
    sel.innerHTML = students
      .map((s) => `<option value="${s.studentId}">${s.number ? s.number + "번 " : ""}${s.name}</option>`)
      .join("");
    if (students.length) loadSchedulesForStudent(students[0].studentId);
  } catch (e) {
    showMsg(msgEl, "학생 명단을 불러오지 못했습니다: " + e.message, "error");
  }
}

async function loadSchedulesForStudent(studentId) {
  const sel = document.getElementById("scheduleSelect");
  sel.innerHTML = `<option value="">- 연결 안 함 -</option>`;
  if (!studentId) return;
  try {
    const schedules = await apiGet("getSchedules", { studentId });
    sel.innerHTML +=
      schedules
        .map((s) => `<option value="${s.scheduleId}">${s.date} ${s.startTime} - ${s.purpose || "상담"}</option>`)
        .join("");
  } catch (e) {
    // 조용히 무시 (필수 기능 아님)
  }
}

function updateFileArea() {
  const type = document.getElementById("typeSelect").value;
  const fileInput = document.getElementById("fileInput");
  const fileArea = document.getElementById("fileArea");
  if (type === "TEXT") {
    fileArea.style.display = "none";
    fileInput.value = "";
  } else {
    fileArea.style.display = "block";
    fileInput.accept = type === "AUDIO" ? "audio/*,.mp3,.m4a,.wav" : ".pdf";
  }
}

async function submitLog() {
  hideMsg(msgEl);
  const studentId = document.getElementById("studentSelect").value;
  const scheduleId = document.getElementById("scheduleSelect").value;
  const date = document.getElementById("dateInput").value;
  const type = document.getElementById("typeSelect").value;
  const memo = document.getElementById("memoInput").value.trim();
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!studentId || !date) {
    showMsg(msgEl, "학생과 상담 일자를 선택해 주세요.", "error");
    return;
  }
  if (type !== "TEXT" && !file) {
    showMsg(msgEl, "선택한 자료 유형에 맞는 파일을 첨부해 주세요.", "error");
    return;
  }
  if (type === "TEXT" && !memo) {
    showMsg(msgEl, "직접 입력 메모를 작성해 주세요.", "error");
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = file
    ? "파일 업로드 및 AI 분석 중... (파일 크기에 따라 최대 1~2분 소요)"
    : "AI 분석 중...";

  try {
    const payload = { studentId, scheduleId: scheduleId || null, date, type, memo };
    if (file) {
      payload.fileBase64 = await fileToBase64(file);
      payload.fileName = file.name;
      payload.mimeType = file.type || "application/octet-stream";
    }
    const result = await apiPost("addLog", payload);

    document.getElementById("resultCard").style.display = "block";
    document.getElementById("r-topic").textContent = result.aiTopic || "-";
    document.getElementById("r-student").textContent = result.aiStudentSummary || "-";
    document.getElementById("r-teacher").textContent = result.aiTeacherAdvice || "-";
    document.getElementById("r-followup").textContent = result.aiFollowUp || "-";

    showMsg(msgEl, "저장되었습니다. 학생별 포트폴리오에서 확인할 수 있습니다.", "success");
    document.getElementById("memoInput").value = "";
    fileInput.value = "";
  } catch (e) {
    showMsg(msgEl, "저장에 실패했습니다: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "저장 및 AI 요약 실행";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadStudents();
  updateFileArea();
  document.getElementById("studentSelect").addEventListener("change", (e) => loadSchedulesForStudent(e.target.value));
  document.getElementById("typeSelect").addEventListener("change", updateFileArea);
  document.getElementById("submitBtn").addEventListener("click", submitLog);
  document.getElementById("dateInput").valueAsDate = new Date();
});
