// fetchReviews.js

const axios = require('axios');
const fs = require('fs');

// 🚩 동료 Gem이 제공한 API Base URL
const API_BASE_URL = 'https://api.atoa-ai.com/v1';

// 🚩 수집할 행정구역 목록
const DISTRICTS_TO_FETCH = [
    "서울특별시 강남구",
    "서울특별시 서초구",
    "서울특별시 송파구",
    "서울특별시 양천구",
    "서울특별시 노원구",
    "경기도 성남시 분당구",
    "경기도 용인시 수지구",
    "경기도 고양시 일산동구",
    "부산광역시 해운대구",
    "대구광역시 수성구",
    "인천광역시 연수구" // 예시 지역, 필요에 따라 추가/변경 가능
];

/**
 * 특정 행정구역의 학원 목록을 API에서 가져오는 함수
 * @param {string} districtName 행정구역명
 * @returns {Array} 학원 목록 배열
 */
async function fetchAcademiesByDistrict(districtName) {
    try {
        const response = await axios.get(`${API_BASE_URL}/academies`, {
            params: {
                region: districtName,
            }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching academies for ${districtName}:`, error.message);
        return [];
    }
}

/**
 * 특정 학원의 상세 리뷰 데이터를 API에서 가져오는 함수
 * @param {string} academyId 학원 ID
 * @returns {object|null} 상세 정보 객체 또는 null
 */
async function fetchAcademyDetails(academyId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/academies/${academyId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching details for academy ID ${academyId}:`, error.message);
        return null;
    }
}

/**
 * 모든 지역의 학원 데이터와 상세 리뷰를 수집하는 메인 함수
 */
async function collectAllReviewData() {
    console.log('API 데이터 수집 시작...');

    for (const district of DISTRICTS_TO_FETCH) {
        console.log(`- ${district} 지역 학원 목록 수집 중...`);
        const academies = await fetchAcademiesByDistrict(district);

        let districtData = []; // 🚩 지역별 데이터를 저장할 새로운 배열
        
        for (const academy of academies) {
            console.log(`  - ${academy.name} 리뷰 데이터 수집 중...`);
            const details = await fetchAcademyDetails(academy.id);
            if (details) {
                // 기존 데이터와 상세 리뷰 데이터를 병합
                const mergedData = { ...academy, ...details };
                districtData.push(mergedData);
            }
        }
        
        // 🚩 지역별로 JSON 파일 저장
        if (districtData.length > 0) {
            const fileName = `${district}_collected_reviews.json`;
            fs.writeFileSync(fileName, JSON.stringify(districtData, null, 2), 'utf8');
            console.log(`✅ 총 ${districtData.length}개의 학원 리뷰 데이터가 '${fileName}'에 저장되었습니다.`);
        } else {
            console.log(`- ${district} 지역에 수집된 데이터가 없습니다.`);
        }
    }
    
    console.log('\n모든 데이터 수집 및 파일 저장이 완료되었습니다.');
}

collectAllReviewData().catch(console.error);