const STATUS_LABEL = { PENDING: "신청 대기", CONFIRMED: "확정", DONE: "상담 완료", CANCELLED: "취소/미진행" };
const TYPE_LABEL = { AUDIO: "음성 파일", PDF: "PDF 파일", TEXT: "직접 입력" };

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

async function loadStudentOptions(selected) {
  const sel = document.getElementById("studentSelect");
  const students = await apiGet("getStudents");
  sel.innerHTML = students
    .map((s) => `<option value="${s.studentId}">${s.number ? s.number + "번 " : ""}${s.name}</option>`)
    .join("");
  if (selected) sel.value = selected;
  return students;
}

function renderContent(data) {
  const { student, schedules, logs } = data;
  const content = document.getElementById("content");

  if (!student) {
    content.innerHTML = `<div class="msg info">학생을 선택하면 상담 이력이 표시됩니다.</div>`;
    return;
  }

  const items = [
    ...schedules.map((s) => ({ date: s.date, kind: "schedule", data: s })),
    ...logs.map((l) => ({ date: l.date, kind: "log", data: l }))
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  const timelineHtml = items.length
    ? items
        .map((it) => {
          if (it.kind === "schedule") {
            const s = it.data;
            return `
            <div class="timeline-item">
              <div class="timeline-date">${s.date} · 상담 일정</div>
              <div class="detail-box">
                <p>${s.startTime} ~ ${s.endTime} · 목적: ${s.purpose || "-"}
                  &nbsp; <span class="badge ${s.status}">${STATUS_LABEL[s.status] || s.status}</span></p>
              </div>
            </div>`;
          }
          const l = it.data;
          return `
          <div class="timeline-item">
            <div class="timeline-date">${l.date} · 상담 기록 (${TYPE_LABEL[l.type] || l.type})</div>
            <div class="detail-box">
              <h4>핵심 상담 주제</h4><p>${escapeHtml(l.aiTopic) || "-"}</p>
              <h4>학생 발언 요약</h4><p>${escapeHtml(l.aiStudentSummary) || "-"}</p>
              <h4>교사 지도 및 조언 내용</h4><p>${escapeHtml(l.aiTeacherAdvice) || "-"}</p>
              <h4>추후 지도 계획</h4><p>${escapeHtml(l.aiFollowUp) || "-"}</p>
              ${l.teacherMemo ? `<h4>교사 메모(원문)</h4><p>${escapeHtml(l.teacherMemo)}</p>` : ""}
              ${l.rawText ? `<h4>전문(STT/PDF 추출)</h4><p>${escapeHtml(l.rawText)}</p>` : ""}
              ${l.fileUrl ? `<h4>첨부 파일</h4><p><a href="${l.fileUrl}" target="_blank" rel="noopener">파일 열기</a></p>` : ""}
            </div>
          </div>`;
        })
        .join("")
    : `<div class="msg info">아직 등록된 상담 이력이 없습니다.</div>`;

  content.innerHTML = `
    <div class="card">
      <h1>${student.name} 학생 포트폴리오</h1>
      <p class="page-desc">
        ${student.number ? student.number + "번 · " : ""}생년월일 ${student.birth || "-"} · 비상연락처 ${student.contact || "-"}
        ${student.notes ? "<br>특이사항: " + escapeHtml(student.notes) : ""}
      </p>
      <button class="btn secondary no-print" onclick="window.print()">리포트 출력 (인쇄/PDF 저장)</button>
    </div>
    <div class="card">
      <h2>상담 이력 타임라인</h2>
      <div class="timeline">${timelineHtml}</div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function loadPortfolio(studentId) {
  const content = document.getElementById("content");
  content.innerHTML = `<div class="loading">불러오는 중...</div>`;
  try {
    const data = await apiGet("getPortfolio", { studentId });
    renderContent(data);
  } catch (e) {
    content.innerHTML = `<div class="msg error">불러오지 못했습니다: ${e.message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const initial = qs("studentId");
  const students = await loadStudentOptions(initial);
  const first = initial || (students[0] && students[0].studentId);
  if (first) {
    document.getElementById("studentSelect").value = first;
    loadPortfolio(first);
  }
  document.getElementById("studentSelect").addEventListener("change", (e) => {
    history.replaceState(null, "", `portfolio.html?studentId=${encodeURIComponent(e.target.value)}`);
    loadPortfolio(e.target.value);
  });
});
