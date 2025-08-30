// functions/nodejs/filteredAcademies.js

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();

// 🚩 평판 데이터가 있는 학원만 필터링하여 반환하는 API
router.get('/', async (req, res) => {
    try {
        const academiesRef = db.collection('academies');
        const reputationsRef = db.collection('academy_reputations');
        
        // 1. academy_reputations 데이터를 먼저 모두 가져옵니다.
        const reputationsSnapshot = await reputationsRef.get();
        const reputedAcademiesMap = {};
        reputationsSnapshot.forEach(doc => {
            // ⭐ 이 부분을 academy_name 필드로 수정
            const academyName = doc.data().academy_name;
            if (academyName && academyName.trim() !== '') {
                const normalizedName = academyName.trim().toLowerCase();
                reputedAcademiesMap[normalizedName] = doc.data();
            }
        });

        if (Object.keys(reputedAcademiesMap).length === 0) {
            return res.status(200).json([]);
        }

        // 2. academies 컬렉션에서 모든 문서를 가져옵니다.
        const academiesSnapshot = await academiesRef.get();
        const matchedAcademies = [];

        // 3. academies의 데이터를 reputations 데이터와 비교하여 병합합니다.
        academiesSnapshot.forEach(doc => {
            const academyData = doc.data();
            // ⭐ 이 부분은 ACA_NM 필드로 유지
            const academyName = academyData.ACA_NM;

            if (academyName && academyName.trim() !== '') {
                const normalizedName = academyName.trim().toLowerCase();
                if (reputedAcademiesMap[normalizedName]) {
                    // 평판 데이터가 있는 경우, 두 데이터를 병합
                    matchedAcademies.push({
                        id: doc.id,
                        ...academyData,
                        reputationData: reputedAcademiesMap[normalizedName]
                    });
                }
            }
        });

        const limitedAcademies = matchedAcademies.slice(0, 1000);
        res.status(200).json(limitedAcademies);

    } catch (error) {
        console.error("Error fetching filtered academies:", error);
        res.status(500).send("Error fetching filtered academies.");
    }
});

module.exports = router;