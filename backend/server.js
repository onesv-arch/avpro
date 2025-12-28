const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Enable stealth to trick Spotify into thinking we are a real Chrome browser
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- UTILS ---
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- API ROUTES ---

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', mode: 'puppeteer', version: '5.0.0' });
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
      '--disable-dev-shm-usage',
      '--window-size=1280,800'
    ];

    if (proxy) {
        // Simple proxy parsing. For auth proxies, Puppeteer needs page.authenticate()
        // Here we assume ip:port for simplicity in args, handle auth later
        const parts = proxy.split(':');
        if (parts.length >= 2) {
            launchArgs.push(`--proxy-server=${parts[0]}:${parts[1]}`);
        }
    }

    browser = await puppeteer.launch({
      headless: "new", // Run in headless mode (no UI) for servers
      args: launchArgs
    });

    const page = await browser.newPage();
    
    // Proxy Auth if needed
    if (proxy) {
        const parts = proxy.split(':');
        if (parts.length === 4) {
            await page.authenticate({ username: parts[2], password: parts[3] });
        }
    }

    // Go to Spotify Signup
    addLog("Navigating to Spotify Signup...", "network");
    await page.goto('https://www.spotify.com/signup', { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for the form to load
    addLog("Waiting for form...", "info");
    
    // NOTE: Selectors change frequently. This is a best-effort example.
    // 2025 Selectors are often random strings. We try to find by input types.
    
    // 1. Email
    await page.waitForSelector('input#email, input[name="email"]', { timeout: 10000 });
    await page.type('input#email, input[name="email"]', email, { delay: 100 });
    addLog("Entered Email", "info");
    await sleep(500);

    // 2. Next Button (Step 1)
    // Spotify often has a multi-step form now.
    // Try to click "Next" if it exists, or continue filling if it's a single page
    const nextBtn = await page.$('button[data-testid="submit"]');
    if (nextBtn) {
        await nextBtn.click();
        await sleep(1000);
    }

    // 3. Password
    await page.waitForSelector('input#password, input[type="password"]');
    await page.type('input#password, input[type="password"]', password, { delay: 100 });
    addLog("Entered Password", "info");

    // 4. DOB & Gender
    // This part is tricky as Spotify changes inputs (dropdowns vs text)
    // We will attempt to fill, but if it fails, we catch it.
    addLog("Filling Profile details...", "info");
    
    // This is simplified. Real automation needs robust selector logic.
    try {
        await page.type('input#year', birthYear);
        await page.select('select#month', birthMonth); // If it's a select
        await page.type('input#day', birthDay);
    } catch (e) {
        addLog("Profile inputs varying, attempting fallbacks...", "warning");
    }

    // 5. Submit
    addLog("Clicking Submit...", "network");
    await page.click('button[type="submit"]');
    
    // 6. CHECK FOR CAPTCHA
    addLog("Verifying submission...", "info");
    await sleep(3000);

    // Check if URL changed to /download or /overview which implies success
    const currentUrl = page.url();
    if (currentUrl.includes('download') || currentUrl.includes('overview') || currentUrl.includes('account')) {
        addLog("Account Successfully Created!", "success");
        await browser.close();
        res.json({ success: true, logs: log });
    } else {
        // Check for error messages on screen
        const errorEl = await page.$('div[aria-label="Error"], div[class*="Error"]');
        const errorText = errorEl ? await page.evaluate(el => el.textContent, errorEl) : "Unknown Error";
        
        // Check for Captcha frame
        const frames = page.frames();
        const arkoseFrame = frames.find(f => f.url().includes('arkoselabs'));
        
        if (arkoseFrame) {
             addLog("FAILED: Captcha Challenge Triggered. Automation detected.", "error");
             res.json({ success: false, logs: log, error: "Captcha Challenge. You need a residential proxy or manual intervention." });
        } else {
             addLog(`Failed: ${errorText}`, "error");
             res.json({ success: false, logs: log, error: errorText });
        }
    }

  } catch (error) {
    addLog(`Critical Error: ${error.message}`, "error");
    if (browser) await browser.close();
    res.status(500).json({ success: false, logs: log, error: error.message });
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`Puppeteer Backend running on port ${PORT}`);
});