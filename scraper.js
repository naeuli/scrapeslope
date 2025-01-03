// scraper.js
import axios from 'axios';
import cheerio from 'cheerio';
import admin from 'firebase-admin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function scrapeSlopes() {
  try {
    const response = await axios.get('https://phoenixhnr.co.kr/static/pyeongchang/snowpark/slope-lift');
    const $ = cheerio.load(response.data);
    const slopes = [];
    let currentDifficulty = '';

    $('table.table tr').slice(2).each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length === 7) {
        const difficulty = $(cells[0]).text().trim() || currentDifficulty;
        currentDifficulty = difficulty;

        slopes.push({
          difficulty,
          name: $(cells[1]).text().trim(),
          length: $(cells[2]).text().trim(),
          elevation: $(cells[3]).text().trim(),
          gradient: $(cells[4]).text().trim(),
          dayTime: $(cells[5]).text().trim(),
          nightTime: $(cells[6]).text().trim(),
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const batch = db.batch();

    slopes.forEach((slope) => {
      const ref = db
        .collection('slopes')
        .doc(dateStr)
        .collection('status')
        .doc(slope.name);
      batch.set(ref, slope);
    });

    await batch.commit();
    console.log('Data saved successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

scrapeSlopes();
