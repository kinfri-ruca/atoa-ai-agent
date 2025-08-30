// functions/nodejs/allAcademies.js

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();

// 🚩 모든 학원 데이터를 가져와 평판 데이터를 병합하는 API
router.get('/', async (req, res) => {
    try {
        const academiesRef = db.collection('academies');
        const reputationsRef = db.collection('academy_reputations');
        
        // 1. academies 컬렉션에서 모든 학원 데이터를 가져옵니다.
        const academiesSnapshot = await academiesRef.get();
        const allAcademies = [];
        academiesSnapshot.forEach(doc => {
            allAcademies.push({ id: doc.id, ...doc.data() });
        });
        
        // 2. academy_reputations 데이터를 모두 가져와 빠르게 찾을 수 있는 Map을 만듭니다.
        const reputationsSnapshot = await reputationsRef.get();
        const reputedAcademiesMap = {};
        reputationsSnapshot.forEach(doc => {
            const academyName = doc.data().academy_name;
            if (academyName && academyName.trim() !== '') {
                const normalizedName = academyName.trim().toLowerCase();
                reputedAcademiesMap[normalizedName] = doc.data();
            }
        });

        // 3. 모든 학원 데이터에 평판 데이터를 병합합니다.
        const mergedAcademies = allAcademies.map(academy => {
            const academyName = academy.ACA_NM;
            if (academyName) {
                const normalizedName = academyName.trim().toLowerCase();
                if (reputedAcademiesMap[normalizedName]) {
                    return {
                        ...academy,
                        reputationData: reputedAcademiesMap[normalizedName]
                    };
                }
            }
            return academy; // 평판 데이터가 없으면 기존 데이터 그대로 반환
        });

        res.status(200).json(mergedAcademies);

    } catch (error) {
        console.error("Error fetching all academies with reputation:", error);
        res.status(500).send("Error fetching all academies with reputation.");
    }
});

module.exports = router;