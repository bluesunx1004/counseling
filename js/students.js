const msgEl = document.getElementById("msg");

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function loadStudents() {
  const tbody = document.getElementById("studentTbody");
  tbody.innerHTML = `<tr><td colspan="6" class="loading">불러오는 중...</td></tr>`;
  try {
    const students = await apiGet("getStudents");
    document.getElementById("countLabel").textContent = students.length;
    if (!students.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="loading">등록된 학생이 없습니다.</td></tr>`;
      return;
    }
    tbody.innerHTML = students
      .map(
        (s) => `<tr>
          <td>${escapeHtml(s.number)}</td>
          <td>${escapeHtml(s.name)}</td>
          <td>${escapeHtml(s.birth)}</td>
          <td>${escapeHtml(s.contact)}</td>
          <td>${escapeHtml(s.notes)}</td>
          <td style="white-space:nowrap;">
            <button class="btn secondary" style="padding:4px 10px;font-size:12px;"
              onclick='editStudent(${JSON.stringify(s).replace(/'/g, "&#39;")})'>수정</button>
            <button class="btn danger" style="padding:4px 10px;font-size:12px;"
              onclick="deleteStudent('${s.studentId}','${escapeHtml(s.name)}')">삭제</button>
          </td>
        </tr>`
      )
      .join("");
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="msg error">불러오지 못했습니다: ${e.message}</td></tr>`;
  }
}

function readForm() {
  return {
    studentId: document.getElementById("editingId").value || null,
    number: document.getElementById("numberInput").value.trim(),
    name: document.getElementById("nameInput").value.trim(),
    birth: document.getElementById("birthInput").value,
    contact: document.getElementById("contactInput").value.trim(),
    notes: document.getElementById("notesInput").value.trim()
  };
}

function resetForm() {
  document.getElementById("editingId").value = "";
  ["numberInput", "nameInput", "birthInput", "contactInput", "notesInput"].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("formTitle").textContent = "학생 추가";
  document.getElementById("cancelEditBtn").style.display = "none";
}

function editStudent(s) {
  document.getElementById("editingId").value = s.studentId;
  document.getElementById("numberInput").value = s.number || "";
  document.getElementById("nameInput").value = s.name || "";
  document.getElementById("birthInput").value = s.birth || "";
  document.getElementById("contactInput").value = s.contact || "";
  document.getElementById("notesInput").value = s.notes || "";
  document.getElementById("formTitle").textContent = `학생 수정: ${s.name}`;
  document.getElementById("cancelEditBtn").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function saveStudent() {
  hideMsg(msgEl);
  const data = readForm();
  if (!data.name) {
    showMsg(msgEl, "이름은 반드시 입력해야 합니다.", "error");
    return;
  }
  const btn = document.getElementById("saveBtn");
  btn.disabled = true;
  try {
    await apiPost(data.studentId ? "updateStudent" : "addStudent", data);
    showMsg(msgEl, "저장되었습니다.", "success");
    resetForm();
    loadStudents();
  } catch (e) {
    showMsg(msgEl, "저장에 실패했습니다: " + e.message, "error");
  } finally {
    btn.disabled = false;
  }
}

async function deleteStudent(studentId, name) {
  if (!confirm(`'${name}' 학생을 삭제하시겠습니까? 관련 상담 이력은 남아있습니다.`)) return;
  try {
    await apiPost("deleteStudent", { studentId });
    showMsg(msgEl, "삭제되었습니다.", "success");
    loadStudents();
  } catch (e) {
    showMsg(msgEl, "삭제에 실패했습니다: " + e.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadStudents();
  document.getElementById("saveBtn").addEventListener("click", saveStudent);
  document.getElementById("cancelEditBtn").addEventListener("click", resetForm);
});
