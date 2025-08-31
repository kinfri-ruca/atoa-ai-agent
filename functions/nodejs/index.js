// functions/index.js

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const geofire = require('geofire-common');

admin.initializeApp();
const db = admin.firestore();

const app = express();
const reviewsRouter = require('./reviews'); 

app.use(cors({ origin: true }));

app.use((req, res, next) => {
    res.set("Access-Control-Allow-Origin", "https://dikovina.online");
    res.set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
    } else {
        next();
    }
});

// 🚩 /api/courses 엔드포인트
app.get('/api/courses', async (req, res) => {
    try {
        const academiesRef = db.collection('academies');
        const querySnapshot = await academiesRef.select('LE_CRSE_NM').get();
        
        const courses = new Set();
        querySnapshot.forEach(doc => {
            const courseName = doc.data().LE_CRSE_NM;
            if (courseName && courseName.trim() !== '') {
                courses.add(courseName);
            }
        });

        res.status(200).json([...courses].sort());
    } catch (error) {
        console.error("Error fetching courses:", error);
        res.status(500).send("Error fetching courses");
    }
});

// 🚩 /api/academies 엔드포인트 (통합된 로직)
app.get('/api/academies', async (req, res) => {
    try {
        const { keyword, course, neLat, neLng, swLat, swLng } = req.query;

        // 경계 데이터 유효성 검사
        if (!neLat || !neLng || !swLat || !swLng) {
            return res.status(400).send("Invalid map bounds provided.");
        }

        const centerLat = (parseFloat(neLat) + parseFloat(swLat)) / 2;
        const centerLng = (parseFloat(neLng) + parseFloat(swLng)) / 2;
        const distance = geofire.distanceBetween([parseFloat(neLat), parseFloat(neLng)], [parseFloat(swLat), parseFloat(swLng)]) / 2;
        const radiusInM = distance * 1000;
        const center = [centerLat, centerLng];
        
        const academiesRef = db.collection('academies');
        const reputationsRef = db.collection('academy_reputations');
        
        // 1. 학원 및 평판 데이터 모두 가져오기
        const [academiesSnapshot, reputationsSnapshot] = await Promise.all([
            academiesRef.get(),
            reputationsRef.get()
        ]);
        
        const allAcademies = academiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const reputedAcademiesMap = {};
        reputationsSnapshot.forEach(doc => {
            const academyName = doc.data().academy_name;
            if (academyName && academyName.trim() !== '') {
                reputedAcademiesMap[academyName.trim().toLowerCase()] = doc.data();
            }
        });

        // 2. 평판 데이터 병합 및 검색 조건 필터링
        const filteredAcademies = allAcademies.filter(academy => {
            const lat = academy.lat;
            const lng = academy.lng;
            
            if (!lat || !lng) return false;

            const distanceInKm = geofire.distanceBetween([lat, lng], center);
            if (distanceInKm * 1000 > radiusInM) return false;

            if (keyword && (!academy.ACA_NM || !academy.ACA_NM.toLowerCase().includes(keyword.toLowerCase()))) {
                return false;
            }

            if (course && course !== '' && academy.LE_CRSE_NM !== course) {
                return false;
            }

            // 평판 데이터 병합
            const academyName = academy.ACA_NM;
            if (academyName) {
                const normalizedName = academyName.trim().toLowerCase();
                if (reputedAcademiesMap[normalizedName]) {
                    academy.reputationData = reputedAcademiesMap[normalizedName];
                }
            }

            return true;
        });

        // ⭐ 3. 동일한 위치의 학원들을 그룹화합니다.
        const groupedAcademiesMap = new Map();
        filteredAcademies.forEach(academy => {
            const key = `${academy.lat},${academy.lng}`;
            if (!groupedAcademiesMap.has(key)) {
                groupedAcademiesMap.set(key, []);
            }
            groupedAcademiesMap.get(key).push(academy);
        });

        const finalAcademies = [];
        for (const [key, group] of groupedAcademiesMap.entries()) {
            if (group.length > 1) {
                const representativeAcademy = group.find(a => a.reputationData) || group[0];
                finalAcademies.push({
                    ...representativeAcademy,
                    isGrouped: true,
                    groupCount: group.length,
                    groupedData: group
                });
            } else {
                finalAcademies.push(group[0]);
            }
        }
        
        res.status(200).json(finalAcademies.slice(0, 500));

    } catch (error) {
        console.error("Error fetching academies:", error);
        res.status(500).send("Error fetching academies");
    }
});
    
app.use('/api/reviews', reviewsRouter); 

exports.app = onRequest({ region: 'asia-northeast3' }, app);