// exportAcademiesByDistrict.js

const admin = require('firebase-admin');
const fs = require('fs');

// Firebase Admin SDK를 초기화합니다.
admin.initializeApp();

const db = admin.firestore();

async function exportDataByDistrict() {
    console.log('Firestore 데이터를 행정구역별 JSON으로 내보내기 시작...');
    
    const academiesRef = db.collection('academies');

    // 1. 모든 고유한 행정구역 목록을 가져옵니다.
    const snapshot = await academiesRef.get();
    const districts = new Set();
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.district_area) {
            districts.add(data.district_area);
        }
    });

    if (districts.size === 0) {
        console.log('데이터에 유효한 행정구역 정보가 없습니다.');
        return;
    }

    // 2. 각 행정구역별로 데이터를 조회하고 JSON으로 저장합니다.
    for (const district of districts) {
        console.log(`- '${district}' 지역 데이터 수집 중...`);
        const districtSnapshot = await academiesRef.where('district_area', '==', district).get();
        
        const academies = [];
        districtSnapshot.forEach(doc => {
            const data = doc.data();
            academies.push({
                id: doc.id,
                ...data
            });
        });

        // 3. 파일명 생성 및 데이터 저장
        const fileName = `${district}_academies.json`;
        try {
            fs.writeFileSync(fileName, JSON.stringify(academies, null, 2), 'utf8');
            console.log(`✅ '${district}' 지역의 ${academies.length}개 데이터가 '${fileName}'에 저장되었습니다.`);
        } catch (error) {
            console.error(`JSON 파일 '${fileName}' 저장 중 오류 발생:`, error);
        }
    }
}

exportDataByDistrict().then(() => {
    console.log('\n데이터 내보내기 작업 완료.');
    process.exit(0);
}).catch(error => {
    console.error('오류 발생:', error);
    process.exit(1);
});