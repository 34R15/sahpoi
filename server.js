const express = require('express');
<<<<<<< HEAD
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
=======
const puppeteer = require('puppeteer');
const cors = require('cors');
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Chrome yolunu ve profil dizinini tanımla
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CHROME_PROFILE_PATH = `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\User Data`;

// Chrome'a bağlanmayı dene
const connectToChrome = async (retries = 5) => {
    for (let i = 0; i < retries; i++) {
        try {
            const browser = await puppeteer.connect({
                browserURL: 'http://localhost:9222',
                defaultViewport: null,
                // Yeni sekme açılmasını engellemek için headless modu etkinleştir
                args: ['--headless=new']
            });
            console.log('Successfully connected to Chrome');
            return browser;
        } catch (error) {
            if (i === 0) {
                console.log('Starting Chrome in debug mode...');
                const chromeCommand = `"${CHROME_PATH}" --remote-debugging-port=9222 --headless=new`;
                exec(chromeCommand);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                console.log(`Connection attempt ${i + 1} failed, retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    throw new Error('Failed to connect to Chrome after multiple attempts');
};

app.post('/fetch-location', async (req, res) => {
    let { url } = req.body;
    let browser = null;
    let page = null;

    if (!url) {
>>>>>>> 63479042b6fd410706eed33d5eb9a1ee8422a10c
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
<<<<<<< HEAD
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
=======
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        new URL(url);
    } catch (error) {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    try {
        console.log('Connecting to existing Chrome instance...');
        browser = await connectToChrome();
        
        // Yeni sekme aç (artık görünmez olacak)
        page = await browser.newPage();
        console.log('New headless page created');
        
        await page.setDefaultNavigationTimeout(30000);
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        console.log('Navigating to URL:', url);

        const response = await page.goto(url, { 
            waitUntil: 'networkidle0',
            timeout: 30000 
        });

        // Sayfanın yüklenmesini bekle
        await page.waitForSelector('#gmap', { timeout: 10000 });

        // Konum bilgisini al
        const pageContent = await page.evaluate(() => {
            const mapElement = document.querySelector('#gmap');
            
            if (!mapElement) {
                return { lat: null, lon: null, address: null };
            }

            const lat = mapElement.getAttribute('data-lat');
            const lon = mapElement.getAttribute('data-lon');
            
            // Adres bilgisini almaya çalış
            let address = '';
            try {
                // Sadece breadcrumb'dan il, ilçe ve mahalle bilgisini al
                const locationElements = document.querySelectorAll('.searchResultsLocationBtn');
                if (locationElements.length > 0) {
                    const addressParts = Array.from(locationElements)
                        .map(el => el.textContent.trim())
                        .filter(text => text && !text.includes('/'));
                    
                    address = addressParts.join(' - ');
                }

                // Eğer breadcrumb'dan alınamazsa alternatif yöntem
                if (!address) {
                    const cityElement = document.querySelector('tr.searchAddress td');
                    const districtElement = document.querySelector('tr.searchMapAddress td');
                    
                    if (cityElement && districtElement) {
                        const city = cityElement.textContent.trim();
                        const district = districtElement.textContent.trim();
                        address = `${city} - ${district}`;
                    }
                }
            } catch (e) {
                console.log('Address extraction failed:', e);
            }

            return { 
                lat, 
                lon
            };
        });

        // Debug için sadece gerekli bilgileri logla
        console.log('Extracted location data:', {
            lat: pageContent.lat,
            lon: pageContent.lon
        });

        if (!pageContent.lat || !pageContent.lon) {
            throw new Error('Location coordinates not found in the page');
        }

        const result = {
            coordinates: {
                lat: pageContent.lat,
                lon: pageContent.lon
            }
        };

        console.log('Successfully extracted data:', result);

        // Sadece sekmeyi kapat
        await page.close();
        
        // Browser bağlantısını kes ama tarayıcıyı kapatma
        browser.disconnect();
        
        res.json(result);

    } catch (error) {
        console.error('Error:', error);
        if (page) {
            await page.screenshot({ path: 'error-screenshot.png' });
            await page.close();
        }
        if (browser) {
            browser.disconnect();
        }
        res.status(500).json({ 
            error: 'Failed to retrieve location information', 
            details: error.message 
        });
    }
});

// Sunucuyu başlat
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Using Chrome at: ${CHROME_PATH}`);
>>>>>>> 63479042b6fd410706eed33d5eb9a1ee8422a10c
});