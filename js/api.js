// Google Apps Script 백엔드와 통신하는 공용 함수.
// GAS 웹앱은 브라우저의 사전 확인 요청(OPTIONS)을 처리하지 못하므로,
// POST는 항상 text/plain으로 보내 프리플라이트를 피하는 방식을 사용합니다.

async function apiGet(action, params = {}) {
  const url = new URL(CONFIG.API_URL);
  url.searchParams.set("action", action);
  Object.keys(params).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null) {
      url.searchParams.set(k, params[k]);
    }
  });
  const res = await fetch(url.toString(), { method: "GET" });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "요청 처리 중 오류가 발생했습니다.");
  return json.data;
}

async function apiPost(action, payload = {}) {
  const res = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload })
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "요청 처리 중 오류가 발생했습니다.");
  return json.data;
}

// 업로드한 File 객체를 base64 문자열로 변환
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result; // "data:<mime>;base64,<data>"
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showMsg(el, text, type = "info") {
  el.className = "msg " + type;
  el.textContent = text;
  el.style.display = "block";
}

function hideMsg(el) {
  el.style.display = "none";
}
