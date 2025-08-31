// functions/index.js

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const geofire = require('geofire-common');

admin.initializeApp();
const db = admin.firestore();

const app = express();
const reviewsRouter = require('./reviews'); // Make sure this line exists
//const allAcademiesRouter = require('./allAcademies'); // 이 라인은 이제 필요 없습니다.
//const filteredAcademiesRouter = require('./filteredAcademies'); // 이 라인은 이제 필요 없습니다.

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

app.use(cors({ origin: true }));

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

// 🚩 학원 정보 조회 API 엔드포인트 (지오해시 기반 로직 + 평판 데이터 병합)
app.get('/api/academies', async (req, res) => {
    try {
        const { keyword, course, neLat, neLng, swLat, swLng } = req.query;
        let academiesRef = db.collection('academies');
        
        const numNeLat = neLat ? parseFloat(neLat) : null;
        const numNeLng = neLng ? parseFloat(neLng) : null;
        const numSwLat = swLat ? parseFloat(swLat) : null;
        const numSwLng = swLng ? parseFloat(swLng) : null;
        
        let academies = [];

        // 🚩 지도 경계 좌표가 모두 유효할 경우에만 Geohash 기반 검색 사용
        if (numNeLat && numNeLng && numSwLat && numSwLng) {
            const centerLat = (numNeLat + numSwLat) / 2;
            const centerLng = (numNeLng + numSwLng) / 2;
            const distance = geofire.distanceBetween([numNeLat, numNeLng], [numSwLat, numSwLng]) / 2;
            const radiusInM = distance * 1000;
            const center = [centerLat, centerLng];
            
            const bounds = geofire.geohashQueryBounds(center, radiusInM);
            const promises = [];
            const limitPerBound = Math.ceil(1000 / bounds.length);

            for (const b of bounds) {
                const q = academiesRef.orderBy('geohash').startAt(b[0]).endAt(b[1]).limit(limitPerBound);
                promises.push(q.get());
            }

            const snapshots = await Promise.all(promises);
            const allAcademies = [];
            for (const snap of snapshots) {
                for (const doc of snap.docs) {
                    allAcademies.push({ id: doc.id, ...doc.data() });
                }
            }

            const filteredAcademies = allAcademies.filter(academy => {
                const lat = academy.lat;
                const lng = academy.lng;

                if (!lat || !lng) return false;

                const distanceInKm = geofire.distanceBetween([lat, lng], center);
                if (distanceInKm * 1000 > radiusInM) {
                    return false;
                }

                if (keyword) {
                    if (!academy.ACA_NM || !academy.ACA_NM.toLowerCase().includes(keyword.toLowerCase())) {
                        return false;
                    }
                }

                if (course && course !== '') {
                    if (academy.LE_CRSE_NM !== course) {
                        return false;
                    }
                }

                return true;
            });

            // 🚩 평판 데이터 병합 로직 추가
            const reputationsRef = db.collection('academy_reputations');
            const reputedAcademiesMap = {};
            const reputationPromises = [];
            
            // 필터링된 학원 이름 배열 생성 (중복 제거)
            const filteredAcademyNames = [...new Set(filteredAcademies.map(a => a.ACA_NM))].filter(Boolean);

            // Firestore 'in' 쿼리 제한(최대 10개)에 맞춰 배치 처리
            const batchSize = 10;
            for (let i = 0; i < filteredAcademyNames.length; i += batchSize) {
                const batchNames = filteredAcademyNames.slice(i, i + batchSize);
                const querySnapshot = reputationsRef.where('academy_name', 'in', batchNames).get();
                reputationPromises.push(querySnapshot);
            }

            const reputationSnapshots = await Promise.all(reputationPromises);

            reputationSnapshots.forEach(snap => {
                snap.forEach(doc => {
                    const academyName = doc.data().academy_name;
                    if (academyName && academyName.trim() !== '') {
                        const normalizedName = academyName.trim().toLowerCase();
                        reputedAcademiesMap[normalizedName] = doc.data();
                    }
                });
            });

            // 평판 데이터 병합
            academies = filteredAcademies.map(academy => {
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
                return academy;
            });
            
        } else {
            // 🚩 지도 경계가 유효하지 않을 경우, 빈 배열을 반환하여 메모리 초과 방지
            return res.status(200).json([]);
        }

        const limitedAcademies = academies.slice(0, 1000);
        res.status(200).json(limitedAcademies);
    } catch (error) {
        console.error("Error fetching academies:", error);
        res.status(500).send("Error fetching academies");
    }
});


    
    app.use('/api/reviews', reviewsRouter); // Make sure this line exists 

    exports.app = onRequest({ region: 'asia-northeast3' }, app);