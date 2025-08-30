// fetchAcademies.js

const axios = require('axios');
const fs = require('fs');

// 🚩 나이스 교육 정보 Open API 키를 여기에 입력하세요.
const API_KEY = '947583ae1eef4e14a94bfe94b2179727';
const BASE_URL = 'https://open.neis.go.kr/hub/acaInsTiInfo';

// 🚩 전국 시도교육청 코드 목록입니다. 이 코드를 순회하며 데이터를 가져옵니다.
// 필요에 따라 특정 지역 코드만 남기고 나머지는 삭제할 수 있습니다.
const REGION_CODES = [
    'B10', // 서울특별시교육청
    'C10', // 부산광역시교육청
    'D10', // 대구광역시교육청
    'E10', // 인천광역시교육청
    'F10', // 광주광역시교육청
    'G10', // 대전광역시교육청
    'H10', // 울산광역시교육청
    'I10', // 세종특별자치시교육청
    'J10', // 경기도교육청
    'K10', // 강원특별자치도교육청
    'M10', // 충청북도교육청
    'N10', // 충청남도교육청
    'P10', // 전라북도교육청
    'Q10', // 전라남도교육청
    'R10', // 경상북도교육청
    'S10', // 경상남도교육청
    'T10', // 제주특별자치도교육청
];

const allAcademies = [];

/**
 * API를 호출하여 학원 데이터를 페이지 단위로 가져오는 함수
 * @param {string} regionCode 시도교육청 코드
 * @param {number} pIndex 페이지 번호
 * @param {number} pSize 한 페이지에 가져올 데이터 수 (최대 1000)
 */
async function fetchAcademies(regionCode, pIndex, pSize) {
    try {
        const response = await axios.get(BASE_URL, {
            params: {
                KEY: API_KEY,
                Type: 'json',
                pIndex: pIndex,
                pSize: pSize,
                ATPT_OFCDC_SC_CODE: regionCode,
            }
        });
        
        const data = response.data.acaInsTiInfo;
        
        if (data && data.length > 1) {
            // 첫 번째 객체는 메타 정보, 두 번째 객체부터 실제 데이터
            const academyList = data[1].row;
            if (academyList) {
                console.log(`[${regionCode}] ${pIndex}페이지에서 ${academyList.length}개 데이터 수집`);
                allAcademies.push(...academyList);
                
                // 다음 페이지 호출
                return fetchAcademies(regionCode, pIndex + 1, pSize);
            }
        }
    } catch (error) {
        console.error(`[${regionCode}] 데이터 수집 실패:`, error.message);
    }
}

/**
 * 모든 시도교육청 코드에 대해 데이터를 수집하는 메인 함수
 */
async function collectAllData() {
    for (const regionCode of REGION_CODES) {
        console.log(`[${regionCode}] 지역의 학원 정보 수집 시작...`);
        await fetchAcademies(regionCode, 1, 1000);
    }

    // JSON 파일로 저장
    try {
        fs.writeFileSync('academies.json', JSON.stringify(allAcademies, null, 2), 'utf8');
        console.log(`\n총 ${allAcademies.length}개의 학원 정보가 academies.json에 저장되었습니다.`);
    } catch (err) {
        console.error('파일 저장 중 오류 발생:', err);
    }
}

collectAllData();
