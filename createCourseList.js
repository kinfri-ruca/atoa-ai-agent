// createCourseList.js

const admin = require('firebase-admin');
const fs = require('fs');

// Firebase Admin SDK를 초기화할 때 프로젝트 ID를 명시적으로 지정합니다.
admin.initializeApp({
  projectId: 'atoa-review-maching'
});

const db = admin.firestore();

/**
 * Firestore에서 교습과정 목록을 가져와 JSON 파일로 저장하는 함수
 */
async function createCourseListJson() {
    console.log('Firestore에서 교습과정 목록을 가져오는 중...');

    const academiesRef = db.collection('academies');
    const querySnapshot = await academiesRef.get();
    
    const courses = new Set();
    querySnapshot.forEach(doc => {
        const courseName = doc.data().LE_CRSE_NM;
        if (courseName && courseName.trim() !== '') {
            courses.add(courseName);
        }
    });

    const sortedCourses = [...courses].sort();
    
    try {
        fs.writeFileSync('courses.json', JSON.stringify(sortedCourses, null, 2), 'utf8');
        console.log(`총 ${sortedCourses.length}개의 교습과정이 courses.json에 저장되었습니다.`);
    } catch (err) {
        console.error('파일 저장 중 오류 발생:', err);
    }
}

createCourseListJson().catch(console.error);
