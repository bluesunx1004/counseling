// ============================================================
//  Google Drive 파일 업로드 & PDF 텍스트 추출
// ============================================================

// base64 문자열을 Drive의 지정 폴더에 저장하고 공유 링크를 돌려줌
function uploadToDrive(base64, fileName, mimeType) {
  const folderId = getProp("DRIVE_FOLDER_ID");
  if (!folderId) throw new Error("DRIVE_FOLDER_ID 스크립트 속성이 설정되지 않았습니다.");

  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType || "application/octet-stream", fileName);

  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);

  // 링크가 있는 사람은 볼 수 있도록 설정 (교사 개인 열람용이면 이 줄을 지워도 됩니다)
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    // 조직 정책상 외부공유가 막혀 있으면 무시하고 내부 링크만 사용
  }

  return { fileId: file.getId(), url: file.getUrl() };
}

// 업로드된 PDF에서 텍스트 추출.
// Drive API로 PDF를 임시 Google 문서로 변환(OCR 포함) 후 텍스트를 읽고 임시파일 삭제.
function extractPdfText(pdfFileId) {
  try {
    const pdfFile = DriveApp.getFileById(pdfFileId);
    const resource = {
      title: "temp_ocr_" + new Date().getTime(),
      mimeType: MimeType.GOOGLE_DOCS
    };
    // 고급 Drive 서비스(Drive)가 활성화되어 있어야 함. ocr:true 로 스캔본도 처리.
    const inserted = Drive.Files.insert(resource, pdfFile.getBlob(), {
      ocr: true,
      ocrLanguage: "ko"
    });
    const doc = DocumentApp.openById(inserted.id);
    const text = doc.getBody().getText();
    DriveApp.getFileById(inserted.id).setTrashed(true); // 임시 문서 정리
    return text || "(PDF에서 텍스트를 추출하지 못했습니다.)";
  } catch (e) {
    return "(PDF 텍스트 추출 실패: " + e.message + ")";
  }
}
