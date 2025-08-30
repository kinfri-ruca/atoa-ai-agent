// Firebase Admin SDK를 가져옵니다. Node.js 환경에서 서버 측 작업을 위해 사용합니다.
const admin = require('firebase-admin');

// 서비스 계정 키 파일을 가져옵니다.
// 이 파일은 Firebase 콘솔 > 프로젝트 설정 > 서비스 계정에서 생성할 수 있습니다.
//const serviceAccount = require('./atoa-ai-agent-firebase-adminsdk-fbsvc-9d912f96dd.json'); // 파일 경로를 실제 경로로 수정하세요.

// 수정된 코드 (환경 변수 사용)
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});


// Firebase Admin SDK를 초기화합니다.
// admin.initializeApp({
//  credential: admin.credential.cert(serviceAccount)
// });

// Firestore 인스턴스를 가져옵니다.
const db = admin.firestore();

// 업로드할 JSON 파일의 경로를 정의합니다.
const jsonFilePath = './academy_district_data/서울특별시 강남구_academies.json'; // 경로를 수정하세요.
const jsonData = require(jsonFilePath); // JSON 파일을 Node.js 모듈로 불러옵니다.

// Firestore의 배치 쓰기 제한(최대 500)을 정의합니다.
const BATCH_SIZE = 500;

async function uploadData() {
  console.log(`Uploading ${jsonData.length} documents from ${jsonFilePath} to Firestore...`);

  // 데이터를 BATCH_SIZE 단위로 묶어서 처리합니다.
  for (let i = 0; i < jsonData.length; i += BATCH_SIZE) {
    const batch = db.batch(); // 새로운 배치 객체 생성
    const chunk = jsonData.slice(i, i + BATCH_SIZE); // 500개씩 데이터를 자릅니다.

    chunk.forEach(item => {
      // 'academies' 컬렉션에 새 문서를 추가할 참조를 만듭니다.
      const docRef = db.collection('academies').doc();
      batch.set(docRef, item); // 배치에 쓰기 작업을 추가합니다.
    });

    try {
      // 배치 쓰기 작업을 한 번에 커밋합니다.
      await batch.commit();
      console.log(`Successfully uploaded batch ${Math.floor(i / BATCH_SIZE) + 1}.`);
    } catch (error) {
      console.error('Error uploading data: ', error);
      return; // 오류 발생 시 함수 종료
    }
  }

  console.log('All data successfully uploaded to Firestore!');
}

uploadData();