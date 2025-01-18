const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
// AlwaysData'nın belirlediği portu kullan
const port = process.env.PORT || 3000;

// Loglama
const log = (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message}\n`;
    console.log(logMessage);
    // Log dosyasına da yaz
    fs.appendFileSync(path.join(__dirname, 'app.log'), logMessage);
};

// CORS ayarları
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Ana sayfa
app.get('/', (req, res) => {
    log('Ana sayfa isteği alındı');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Sağlık kontrolü
app.get('/health', (req, res) => {
    log('Sağlık kontrolü yapıldı');
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        port: port
    });
});

// Konum bilgisi al
app.post('/fetch-location', async (req, res) => {
    const { url } = req.body;
    log(`Konum isteği alındı: ${url}`);
    
    if (!url) {
        log('URL eksik');
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const puppeteer = require('puppeteer');
        log('Puppeteer yüklendi');

        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        log('Browser başlatıldı');

        const page = await browser.newPage();
        log('Yeni sayfa açıldı');

        await page.goto(url);
        log('Sayfaya gidildi');

        const coordinates = await page.evaluate(() => {
            const mapElement = document.querySelector('#gmap');
            return mapElement ? {
                lat: mapElement.getAttribute('data-lat'),
                lon: mapElement.getAttribute('data-lon')
            } : null;
        });
        log(`Koordinatlar alındı: ${JSON.stringify(coordinates)}`);

        await browser.close();
        log('Browser kapatıldı');

        if (!coordinates) {
            log('Koordinatlar bulunamadı');
            return res.status(404).json({ error: 'Coordinates not found' });
        }

        res.json({ coordinates });

    } catch (error) {
        log(`Hata oluştu: ${error.message}`);
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handler
app.use((err, req, res, next) => {
    log(`Hata yakalandı: ${err.message}`);
    res.status(500).json({ error: err.message });
});

// Server'ı başlat
const server = app.listen(port, '0.0.0.0', () => {
    log(`Server ${port} portunda çalışıyor`);
}).on('error', (err) => {
    log(`Server başlatma hatası: ${err.message}`);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    log('SIGTERM sinyali alındı, uygulama kapatılıyor...');
    server.close(() => {
        log('Server kapatıldı');
        process.exit(0);
    });
});