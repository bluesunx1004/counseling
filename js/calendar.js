const STATUS_COLOR = {
  PENDING: "var(--status-pending)",
  CONFIRMED: "var(--status-confirmed)",
  DONE: "var(--status-done)",
  CANCELLED: "var(--status-cancelled)"
};
const STATUS_LABEL = {
  PENDING: "신청 대기",
  CONFIRMED: "확정",
  DONE: "상담 완료",
  CANCELLED: "취소/미진행"
};

document.addEventListener("DOMContentLoaded", async () => {
  const calendarEl = document.getElementById("calendar");
  const calendar = new FullCalendar.Calendar(calendarEl, {
    locale: "ko",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay"
    },
    initialView: "dayGridMonth",
    height: "auto",
    slotMinTime: "08:00:00",
    slotMaxTime: "19:00:00",
    events: async (info, success, failure) => {
      try {
        const schedules = await apiGet("getSchedules");
        const events = schedules.map((s) => ({
          id: s.scheduleId,
          title: `${s.studentName} (${STATUS_LABEL[s.status] || s.status})`,
          start: `${s.date}T${s.startTime}`,
          end: `${s.date}T${s.endTime}`,
          backgroundColor: STATUS_COLOR[s.status] || "#999",
          borderColor: STATUS_COLOR[s.status] || "#999",
          extendedProps: s
        }));
        success(events);
      } catch (e) {
        failure(e);
      }
    },
    eventClick: (info) => openEventModal(info.event.extendedProps)
  });
  calendar.render();
});

function openEventModal(s) {
  document.getElementById("em-title").textContent = `${s.studentName} 상담 일정`;
  document.getElementById("em-body").innerHTML = `
    <p><strong>날짜/시간</strong> : ${s.date} ${s.startTime} ~ ${s.endTime}</p>
    <p><strong>상담 목적</strong> : ${s.purpose || "-"}</p>
    <p><strong>상태</strong> : <span class="badge ${s.status}">${STATUS_LABEL[s.status] || s.status}</span></p>
  `;
  document.getElementById("em-goto").onclick = () => {
    location.href = `portfolio.html?studentId=${encodeURIComponent(s.studentId)}`;
  };
  document.getElementById("em-close").onclick = closeEventModal;
  document.getElementById("eventModalBg").style.display = "block";
}
function closeEventModal() {
  document.getElementById("eventModalBg").style.display = "none";
}
