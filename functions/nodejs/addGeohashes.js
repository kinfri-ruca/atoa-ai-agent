// functions/addGeohashes.js
const admin = require('firebase-admin');
const geofire = require('geofire-common');

admin.initializeApp();

const db = admin.firestore();

async function addGeohashesToCollection() {
    console.log('Adding geohash to academies collection...');
    
    // 🚩 모든 문서를 가져와서 geohash 필드가 없는 문서를 찾습니다.
    const academiesRef = db.collection('academies');
    const snapshot = await academiesRef.get();
    
    if (snapshot.empty) {
        console.log('No documents found in the collection.');
        return;
    }
    
    let batch = db.batch();
    let batchCount = 0;
    let totalProcessed = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // 🚩 geohash 필드가 없는 문서만 처리합니다.
        if (!data.geohash) {
            const lat = parseFloat(data.lat);
            const lng = parseFloat(data.lng);
            
            if (!isNaN(lat) && !isNaN(lng)) {
                const geohash = geofire.geohashForLocation([lat, lng]);
                batch.update(doc.ref, { geohash: geohash });
                batchCount++;
                totalProcessed++;
            }
        }

        if (batchCount >= 500) {
            await batch.commit();
            console.log(`✅ ${totalProcessed} documents have been updated so far.`);
            batch = db.batch();
            batchCount = 0;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
        console.log(`✅ ${totalProcessed} documents have been updated so far.`);
    }

    if (totalProcessed > 0) {
        console.log(`Total of ${totalProcessed} documents updated with geohash.`);
    } else {
        console.log('No documents to update.');
    }
}

addGeohashesToCollection().then(() => {
    console.log('Geohash update complete.');
    process.exit(0);
}).catch(error => {
    console.error('Error adding geohashes:', error);
    process.exit(1);
});