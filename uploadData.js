// uploadData.js

const admin = require('firebase-admin');
const academies = require('./academies.json');

// 🚩 Firebase Admin SDK를 초기화할 때 프로젝트 ID를 명시적으로 지정합니다.
admin.initializeApp({
  projectId: 'atoa-ai-agent'
});

const db = admin.firestore();

/**
 * academies.json 파일을 읽어 Firestore에 업로드하는 함수
 */
async function uploadAcademies() {
  console.log('Firestore에 학원 데이터 업로드 시작...');

  let batch = db.batch();
  let count = 0;
  let batchCounter = 0;

  for (const academy of academies) {
    const academyRef = db.collection('academies').doc(); // 자동 생성된 ID 사용
    batch.set(academyRef, {
      ...academy, // JSON 파일의 모든 데이터를 그대로 사용
    });
    count++;

    // Firestore의 쓰기 작업은 500개로 제한되므로,
    // 500개 단위로 커밋하고 새로운 배치 시작
    if (count % 499 === 0) {
      try {
        await batch.commit();
        console.log(`[Batch ${++batchCounter}] ${count}개의 학원 데이터 업로드 완료.`);
        batch = db.batch(); // 새로운 배치 시작
      } catch (error) {
        console.error(`[Batch ${batchCounter}] 배치 커밋 중 오류 발생:`, error);
        return; // 오류 발생 시 함수 종료
      }
    }
  }

  // 남은 데이터 커밋
  if (count % 499 !== 0) {
    try {
      await batch.commit();
      console.log(`[Batch ${++batchCounter}] ${count}개의 학원 데이터 업로드 완료.`);
    } catch (error) {
      console.error(`[Batch ${batchCounter}] 남은 배치 커밋 중 오류 발생:`, error);
      return;
    }
  }

  console.log(`\n총 ${count}개의 학원 데이터 업로드 완료.`);
  console.log('모든 작업이 완료되었습니다.');
}

uploadAcademies().catch(console.error);
