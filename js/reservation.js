let selectedSlot = null;
const msgEl = document.getElementById("msg");

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}
function isBlocked(startMin, endMin) {
  return CONFIG.BLOCKED_RANGES.some((r) => {
    const bs = toMinutes(r.start), be = toMinutes(r.end);
    return startMin < be && endMin > bs;
  });
}

function buildSlots() {
  const slots = [];
  let cur = toMinutes(CONFIG.SLOT_START);
  const end = toMinutes(CONFIG.SLOT_END);
  while (cur + CONFIG.SLOT_MINUTES <= end) {
    const s = cur, e = cur + CONFIG.SLOT_MINUTES;
    if (!isBlocked(s, e)) slots.push({ start: toHHMM(s), end: toHHMM(e) });
    cur += CONFIG.SLOT_MINUTES;
  }
  return slots;
}

async function loadStudents() {
  const sel = document.getElementById("studentSelect");
  sel.innerHTML = `<option value="">불러오는 중...</option>`;
  try {
    const students = await apiGet("getStudents");
    sel.innerHTML = students
      .map((s) => `<option value="${s.studentId}">${s.number ? s.number + "번 " : ""}${s.name}</option>`)
      .join("");
  } catch (e) {
    showMsg(msgEl, "학생 명단을 불러오지 못했습니다: " + e.message, "error");
  }
}

async function refreshSlots() {
  const date = document.getElementById("dateInput").value;
  const grid = document.getElementById("slotGrid");
  const status = document.getElementById("slotStatus");
  selectedSlot = null;
  document.getElementById("submitBtn").disabled = true;
  if (!date) {
    status.textContent = "날짜를 먼저 선택하세요.";
    grid.innerHTML = "";
    return;
  }
  status.textContent = "예약 현황을 확인하는 중...";
  grid.innerHTML = "";
  try {
    const schedules = await apiGet("getSchedules", { start: date, end: date });
    const taken = schedules
      .filter((s) => s.date === date && s.status !== "CANCELLED")
      .map((s) => [toMinutes(s.startTime), toMinutes(s.endTime)]);

    const slots = buildSlots();
    status.textContent = `${date} 예약 가능 시간대 (총 ${slots.length}개)`;
    grid.innerHTML = slots
      .map((sl) => {
        const s = toMinutes(sl.start), e = toMinutes(sl.end);
        const busy = taken.some(([ts, te]) => s < te && e > ts);
        return `<div class="slot ${busy ? "taken" : ""}" data-start="${sl.start}" data-end="${sl.end}">${sl.start}</div>`;
      })
      .join("");

    grid.querySelectorAll(".slot:not(.taken)").forEach((el) => {
      el.addEventListener("click", () => {
        grid.querySelectorAll(".slot").forEach((s2) => s2.classList.remove("selected"));
        el.classList.add("selected");
        selectedSlot = { start: el.dataset.start, end: el.dataset.end };
        document.getElementById("submitBtn").disabled = false;
      });
    });
  } catch (e) {
    showMsg(msgEl, "예약 현황을 불러오지 못했습니다: " + e.message, "error");
  }
}

async function submitReservation() {
  hideMsg(msgEl);
  const studentId = document.getElementById("studentSelect").value;
  const date = document.getElementById("dateInput").value;
  const purpose = document.getElementById("purposeInput").value.trim();
  if (!studentId || !date || !selectedSlot) {
    showMsg(msgEl, "학생, 날짜, 시간대를 모두 선택해 주세요.", "error");
    return;
  }
  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "신청 중...";
  try {
    await apiPost("addSchedule", {
      studentId,
      date,
      startTime: selectedSlot.start,
      endTime: selectedSlot.end,
      purpose
    });
    showMsg(msgEl, "예약이 신청되었습니다. 담임 선생님의 확정을 기다려 주세요.", "success");
    document.getElementById("purposeInput").value = "";
    await refreshSlots();
  } catch (e) {
    showMsg(msgEl, "예약에 실패했습니다: " + e.message, "error");
  } finally {
    btn.textContent = "예약 신청하기";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadStudents();
  document.getElementById("dateInput").addEventListener("change", refreshSlots);
  document.getElementById("submitBtn").addEventListener("click", submitReservation);
});
