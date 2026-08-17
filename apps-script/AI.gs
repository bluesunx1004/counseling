// ============================================================
//  AI 처리: Whisper(STT) + GPT(요약·구조화)
//  OpenAI API를 사용합니다. 키는 스크립트 속성 OPENAI_API_KEY 에 저장.
// ============================================================

function getOpenAiKey() {
  const key = getProp("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY 스크립트 속성이 설정되지 않았습니다.");
  return key;
}

// ---- 음성 → 텍스트 (Whisper) ----
function transcribeAudio(base64, fileName, mimeType) {
  try {
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType || "audio/mpeg", fileName);

    const form = {
      file: blob,
      model: "whisper-1",
      language: "ko"
    };
    const res = UrlFetchApp.fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "post",
      headers: { Authorization: "Bearer " + getOpenAiKey() },
      payload: form,
      muteHttpExceptions: true
    });
    const code = res.getResponseCode();
    if (code !== 200) return "(음성 인식 실패: HTTP " + code + " " + res.getContentText() + ")";
    return JSON.parse(res.getContentText()).text || "(음성 인식 결과가 비어 있습니다.)";
  } catch (e) {
    return "(음성 인식 오류: " + e.message + ")";
  }
}

// ---- 텍스트 → 상담 4개 항목 구조화 (GPT) ----
function summarizeCounseling(rawText) {
  const empty = { topic: "", studentSummary: "", teacherAdvice: "", followUp: "" };
  if (!rawText || !rawText.trim()) return empty;

  try {
    const systemPrompt =
      "당신은 25년 경력의 학급 담임교사를 돕는 상담 기록 정리 전문가입니다. " +
      "주어진 상담 원문(음성 전사본, PDF 발췌, 또는 교사 메모)을 읽고 아래 4개 항목으로 요약·구조화하세요. " +
      "학생 개인정보 보호를 지키고, 근거 없는 추측은 넣지 마세요. 각 항목은 한국어 존댓말 개조식으로 간결하게 작성합니다. " +
      "반드시 JSON만 출력하세요.";

    const userPrompt =
      "다음 상담 원문을 정리해 주세요.\n\n---\n" + rawText + "\n---\n\n" +
      "출력 형식(JSON): {\"topic\":\"핵심 상담 주제\",\"studentSummary\":\"학생 발언 요약\"," +
      "\"teacherAdvice\":\"교사 지도 및 조언 내용\",\"followUp\":\"추후 지도 계획\"}";

    const payload = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    };

    const res = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + getOpenAiKey() },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (res.getResponseCode() !== 200) {
      return Object.assign({}, empty, { topic: "(AI 요약 실패: " + res.getContentText() + ")" });
    }
    const content = JSON.parse(res.getContentText()).choices[0].message.content;
    const parsed = JSON.parse(content);
    return {
      topic: parsed.topic || "",
      studentSummary: parsed.studentSummary || "",
      teacherAdvice: parsed.teacherAdvice || "",
      followUp: parsed.followUp || ""
    };
  } catch (e) {
    return Object.assign({}, empty, { topic: "(AI 요약 오류: " + e.message + ")" });
  }
}
