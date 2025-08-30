// geoConverter.js

const admin = require('firebase-admin');
const axios = require('axios');

// 🚩 Firebase Admin SDK를 초기화할 때 프로젝트 ID를 명시적으로 지정합니다.
admin.initializeApp({
  projectId: 'atoa-review-maching'
});

const db = admin.firestore();

// 🚩 카카오맵 REST API 키를 여기에 입력하세요.
const KAKAO_API_KEY = 'a7bf88cb101a3ddf5c473dc1bae98e0a';
const GEOCODE_URL = 'https://dapi.kakao.com/v2/local/search/address.json';

// 🚩 하루에 처리할 최대 데이터 수 설정 (카카오 API 제한에 맞춰 100,000으로 설정)
const MAX_API_CALLS_PER_DAY = 100000;
let apiCallCount = 0;

// 🚩 처리할 특정 지역 목록을 여기에 입력하세요.
// 이 목록에 없는 지역은 처리되지 않습니다.
const REGION_NAMES = [
  //'서울특별시교육청',
  //'경기도교육청',
  '강원도교육청',
  '충청북도교육청',
  '충청남도교육청',
  '세종특별자치시교육청',
  '대전광역시교육청',
  '경상북도교육청',
  '경상남도교육청',
  '대구광역시교육청',
  '부산광역시교육청',
  '울산광역시교육청',
  '전라북도교육청',
  '전라남도교육청',
  '광주광역시교육청',
  '제주특별자치도교육청',
  // 원하는 지역의 시도교육청명을 추가하세요. 예: '부산광역시교육청'
];

/**
 * 주소를 위도와 경도로 변환하는 함수
 * @param {string} address 변환할 주소
 * @returns {object|null} {lat, lng} 또는 null
 */
async function getCoordsFromAddress(address) {
  if (apiCallCount >= MAX_API_CALLS_PER_DAY) {
      console.log('일일 API 호출 제한에 도달했습니다. 내일 다시 시도하세요.');
      return null;
  }
  
  try {
    const response = await axios.get(GEOCODE_URL, {
      params: {
        query: address,
      },
      headers: {
        Authorization: `KakaoAK ${KAKAO_API_KEY}`,
      },
    });

    apiCallCount++;

    const documents = response.data.documents;
    if (documents.length > 0) {
      const firstResult = documents[0];
      return {
        lat: parseFloat(firstResult.y),
        lng: parseFloat(firstResult.x),
      };
    }
  } catch (error) {
    console.error(`주소-좌표 변환 실패 (${address}):`, error.message);
  }
  return null;
}

/**
 * Firestore의 모든 학원 데이터에 위도/경도 정보를 추가하는 함수
 */
async function addCoordinatesToAcademies() {
  console.log('Firestore 학원 데이터에 좌표 추가 시작...');

  const academiesRef = db.collection('academies');
  
  // 🚩 좌표가 아직 없고, REGION_NAMES 목록에 포함된 학원만 가져오도록 쿼리 수정
  const snapshot = await academiesRef
      .where('ATPT_OFCDC_SC_NM', 'in', REGION_NAMES)
      .get();
  
  let batch = db.batch(); // const -> let으로 변경
  let updatedCount = 0;
  let deletedCount = 0;
  let processedCount = 0;

  for (const doc of snapshot.docs) {
    const academy = doc.data();
    
    // 🚩 이미 좌표가 있는 문서는 건너뛰거나, 주소 변환에 실패한 문서는 이미 삭제되었으므로 건너뜁니다.
    if ('lat' in academy && 'lng' in academy) {
        continue;
    }
    
    const address = academy.FA_RDNMA; // 도로명 주소를 사용

    if (address) {
      const coords = await getCoordsFromAddress(address);
      if (coords) {
        batch.update(doc.ref, { lat: coords.lat, lng: coords.lng });
        updatedCount++;
      } else {
          // 🚩 주소 변환에 실패하면 해당 문서를 삭제합니다.
          console.log(`주소 변환 실패, 학원 삭제: ${academy.ACA_NM} - ${address}`);
          batch.delete(doc.ref);
          deletedCount++;
      }
      
      processedCount++;
      if (processedCount % 499 === 0) {
        try {
          await batch.commit();
          console.log(`${processedCount}개 데이터 처리 완료. (${updatedCount}개 업데이트, ${deletedCount}개 삭제)`);
          batch = db.batch();
        } catch (commitError) {
          console.error(`배치 커밋 중 오류 발생:`, commitError);
          return;
        }
      }
    }
  }
  
  // 남은 배치 커밋
  if (processedCount % 499 !== 0) {
    try {
      await batch.commit();
    } catch (commitError) {
      console.error(`남은 배치 커밋 중 오류 발생:`, commitError);
      return;
    }
  }

  console.log(`\n총 ${updatedCount}개의 학원 데이터에 좌표 업데이트 완료.`);
  console.log(`총 ${deletedCount}개의 학원 데이터 삭제 완료.`);
  console.log('모든 작업이 완료되었습니다.');
}

addCoordinatesToAcademies().catch(console.error);
