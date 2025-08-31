// functions/nodejs/reviews.js

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();

// 🚩 특정 학원의 리뷰를 가져와 필요한 필드만 반환하는 API
router.get('/', async (req, res) => {
    try {
        const { academy_name } = req.query;

        if (!academy_name) {
            return res.status(400).send("Academy name is required.");
        }

        const reviewsRef = db.collection('raw_reviews');
        const querySnapshot = await reviewsRef.where('academy_name', '==', academy_name).get();
        
        const reviews = [];
        querySnapshot.forEach(doc => {
            const reviewData = doc.data();
            
            // ⭐ 필요한 필드만 추출하여 새로운 객체로 만듭니다.
            const filteredReview = {
                title: reviewData.title || '제목 없음',
                text: reviewData.text || '내용 없음',
                rating: reviewData.rating || 0,
                date_created: reviewData.date_created || '날짜 정보 없음'
            };
            
            reviews.push(filteredReview);
        });

        res.status(200).json(reviews);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).send("Error fetching reviews.");
    }
});

module.exports = router;