const express = require('express');
const cors = require('cors');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Enable stealth to trick Spotify into thinking we are a real Chrome browser
puppeteer.use(StealthPlugin());

const app = express();
// IMPORTANT for Render/Docker: Use process.env.PORT
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- SERVE STATIC FRONTEND ---
// The Dockerfile copies the React build to 'public' inside the container
app.use(express.static(path.join(__dirname, 'public')));

// --- UTILS ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- API ROUTES ---

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', mode: 'puppeteer-docker', version: '5.2.0' });
});

app.post('/api/create', async (req, res) => {
  const { email, password, birthYear, birthMonth, birthDay, gender, proxy } = req.body;
  const log = [];

  const addLog = (msg, type = 'info') => {
    console.log(`[${type.toUpperCase()}] ${msg}`);
    log.push({ message: msg, type, timestamp: new Date().toLocaleTimeString() });
  };

  let browser = null;

  try {
    addLog(`Initiating Browser for: ${email}`, 'info');

    const launchArgs = [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Critical for Docker memory
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', 
      '--disable-gpu'
    ];

    if (proxy) {
        const parts = proxy.split(':');
        if (parts.length >= 2) {
            launchArgs.push(`--proxy-server=${parts[0]}:${parts[1]}`);
        }
    }

    browser = await puppeteer.launch({
      headless: "new",
      // On Render with our Dockerfile, we use the installed Chrome Stable
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: launchArgs
    });

    const page = await browser.newPage();
    
    // Proxy Auth
    if (proxy) {
        const parts = proxy.split(':');
        if (parts.length === 4) {
            await page.authenticate({ username: parts[2], password: parts[3] });
        }
    }

    addLog("Navigating to Spotify Signup...", "network");
    await page.goto('https://www.spotify.com/signup', { waitUntil: 'networkidle2', timeout: 60000 });

    addLog("Waiting for form...", "info");
    
    // Selectors match Attempt 
    await page.waitForSelector('input#email, input[name="email"]', { timeout: 15000 });
    await page.type('input#email, input[name="email"]', email, { delay: 100 });
    addLog("Entered Email", "info");
    await sleep(500);

    const nextBtn = await page.$('button[data-testid="submit"]');
    if (nextBtn) {
        await nextBtn.click();
        await sleep(1000);
    }

    await page.waitForSelector('input#password, input[type="password"]');
    await page.type('input#password, input[type="password"]', password, { delay: 100 });
    addLog("Entered Password", "info");

    addLog("Filling Profile details...", "info");
    try {
        await page.type('input#year', birthYear);
        await page.select('select#month', birthMonth);
        await page.type('input#day', birthDay);
    } catch (e) {
        addLog("Profile inputs varying, attempting fallbacks...", "warning");
    }

    addLog("Clicking Submit...", "network");
    await page.click('button[type="submit"]');
    
    addLog("Verifying submission...", "info");
    await sleep(5000); // Longer wait for redirect

    const currentUrl = page.url();
    if (currentUrl.includes('download') || currentUrl.includes('overview') || currentUrl.includes('account')) {
        addLog("Account Successfully Created!", "success");
        res.json({ success: true, logs: log });
    } else {
        const frames = page.frames();
        const arkoseFrame = frames.find(f => f.url().includes('arkoselabs'));
        
        if (arkoseFrame) {
             addLog("FAILED: Captcha Challenge Triggered.", "error");
             res.json({ success: false, logs: log, error: "Captcha Challenge. Proxy quality too low." });
        } else {
             // Try to find error text
             const errorEl = await page.$('div[aria-label="Error"]');
             const errText = errorEl ? await page.evaluate(e => e.textContent, errorEl) : "Unknown Validation Error";
             addLog(`Failed: ${errText}`, "error");
             res.json({ success: false, logs: log, error: errText });
        }
    }

  } catch (error) {
    addLog(`Critical Error: ${error.message}`, "error");
    res.status(500).json({ success: false, logs: log, error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

// --- CATCH ALL ROUTE FOR REACT SPA ---
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Bind to 0.0.0.0 is crucial for Docker containers
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fullstack Server running on port ${PORT}`);
});
