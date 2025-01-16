const express = require('express');
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
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
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
});