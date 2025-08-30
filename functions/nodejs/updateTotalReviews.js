// functions/nodejs/updateTotalReviews.js

const admin = require('firebase-admin');

// Firebase Admin SDK 초기화 (Firebase CLI가 자동으로 인증)
admin.initializeApp();

const db = admin.firestore();

async function updateTotalReviews() {
    console.log("🔥 모든 학원의 리뷰 개수를 업데이트합니다...");

    try {
        const academiesRef = db.collection('academy_reputations');
        const academiesSnapshot = await academiesRef.get();

        if (academiesSnapshot.empty) {
            console.log("⚠️ academy_reputations 컬렉션에 학원 데이터가 없습니다.");
            return;
        }

        const batch = db.batch();
        let updateCount = 0;

        for (const doc of academiesSnapshot.docs) {
            const academyName = doc.id; // 문서 ID가 학원 이름이라고 가정

            const reviewsRef = db.collection('raw_reviews');
            const reviewsQuery = reviewsRef.where('academy_name', '==', academyName);
            const reviewsSnapshot = await reviewsQuery.get();

            const totalReviews = reviewsSnapshot.size;

            console.log(`✅ ${academyName}: ${totalReviews}개의 리뷰를 찾았습니다.`);

            // 업데이트 배치에 추가
            batch.update(doc.ref, { total_reviews: totalReviews });
            updateCount++;
        }

        // 배치 업데이트 실행
        if (updateCount > 0) {
            await batch.commit();
            console.log(`🎉 ${updateCount}개의 학원 문서가 성공적으로 업데이트되었습니다.`);
        } else {
            console.log("🤔 업데이트할 학원 문서가 없습니다.");
        }

    } catch (error) {
        console.error("❌ 오류가 발생했습니다:", error);
    }
}

updateTotalReviews();