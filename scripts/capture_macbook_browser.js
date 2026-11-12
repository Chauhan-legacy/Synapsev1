const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../docs/screenshots');
const SCRATCH_DIR = path.resolve(__dirname, '../scratch');

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
if (!fs.existsSync(SCRATCH_DIR)) fs.mkdirSync(SCRATCH_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { res, rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) rej(new Error(msg.error.message));
          else res(msg.result);
        }
      };
    });
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((res, rej) => {
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    if (this.ws) this.ws.close();
  }
}

function createMacbookHtml(imgBase64, urlText) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px;
      background: radial-gradient(circle at 50% 20%, #EDE8DF 0%, #D8D2C5 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .macbook-window {
      width: 1440px;
      border-radius: 12px;
      overflow: hidden;
      background: #FFFFFF;
      box-shadow: 0 30px 80px -15px rgba(20, 24, 35, 0.35), 0 0 0 1px rgba(0, 0, 0, 0.12);
    }
    .macbook-titlebar {
      height: 48px;
      background: #F4F1EA;
      border-bottom: 1px solid #DDD6C7;
      display: flex;
      align-items: center;
      padding: 0 20px;
      position: relative;
    }
    .traffic-lights {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .light {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .close { background: #FF5F56; border: 0.5px solid #E0443E; }
    .minimize { background: #FFBD2E; border: 0.5px solid #DEA123; }
    .maximize { background: #27C93F; border: 0.5px solid #1AAB29; }
    .address-bar-container {
      position: absolute;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      pointer-events: none;
    }
    .address-bar {
      background: #FFFFFF;
      border: 1px solid #DDD6C7;
      border-radius: 8px;
      padding: 5px 24px;
      font-size: 12.5px;
      font-family: 'JetBrains Mono', -apple-system, monospace;
      color: #4A5060;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .lock-icon {
      width: 12px;
      height: 12px;
      fill: #0F766E;
    }
    .app-screen {
      width: 1440px;
      display: block;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div class="macbook-window">
    <div class="macbook-titlebar">
      <div class="traffic-lights">
        <div class="light close"></div>
        <div class="light minimize"></div>
        <div class="light maximize"></div>
      </div>
      <div class="address-bar-container">
        <div class="address-bar">
          <svg class="lock-icon" viewBox="0 0 24 24"><path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7c0-2.757-2.243-5-5-5zm-3 5c0-1.654 1.346-3 3-3s3 1.346 3 3v3H9V7z"/></svg>
          <span>${urlText}</span>
        </div>
      </div>
    </div>
    <img class="app-screen" src="data:image/png;base64,${imgBase64}" />
  </div>
</body>
</html>`;
}

async function main() {
  console.log('=== CAPTURING MACBOOK BROWSER WORKBENCH & ACTIVE INSTRUMENT RACK ===');

  const userDataDir = path.resolve(SCRATCH_DIR, 'edge_macbook_' + Date.now());
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ]);

  await sleep(1500);

  try {
    const targets = await (await fetch('http://127.0.0.1:9222/json')).json();
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    // 1. Capture Raw Paper Workbench
    console.log('Capturing Paper Workbench...');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/#/workbench' });
    await sleep(2500);
    const benchShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const benchRawPath = path.join(SCREENSHOTS_DIR, 'paper_workbench_1440.png');
    fs.writeFileSync(benchRawPath, Buffer.from(benchShot.data, 'base64'));

    // Wrap in MacBook Browser Frame
    const benchHtml = createMacbookHtml(benchShot.data, 'https://synapse.local/workbench');
    const benchHtmlPath = path.join(SCRATCH_DIR, 'macbook_workbench.html');
    fs.writeFileSync(benchHtmlPath, benchHtml);

    // 2. Capture Active Instrument Rack (with Satellite & KdV Soliton + GRACE + Oscilloscope + Welch)
    console.log('Capturing Active Instrument Rack...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/#/rack' });
    await sleep(2000);

    // Click 'Satellite' preset to activate KdV Soliton, GRACE-FO, and Oscilloscope
    await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          const btns = Array.from(document.querySelectorAll('button'));
          const satBtn = btns.find(b => b.innerText.trim() === 'Satellite');
          if (satBtn) satBtn.click();
        })()
      `,
    });
    await sleep(2000);
    const rackShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const rackRawPath = path.join(SCREENSHOTS_DIR, 'instrument_rack_1440.png');
    fs.writeFileSync(rackRawPath, Buffer.from(rackShot.data, 'base64'));

    // Wrap in MacBook Browser Frame
    const rackHtml = createMacbookHtml(rackShot.data, 'https://synapse.local/rack');
    const rackHtmlPath = path.join(SCRATCH_DIR, 'macbook_rack.html');
    fs.writeFileSync(rackHtmlPath, rackHtml);

    // 3. Render MacBook Wrappers to Final Presentation Screenshots
    console.log('Rendering MacBook browser frames...');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1520,
      height: 1040,
      deviceScaleFactor: 2,
      mobile: false,
    });

    // Render Workbench MacBook frame
    await client.send('Page.navigate', { url: 'file:///' + benchHtmlPath.replace(/\\/g, '/') });
    await sleep(1000);
    const macBenchShot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'paper_workbench_macbook.png'), Buffer.from(macBenchShot.data, 'base64'));

    // Render Instrument Rack MacBook frame
    await client.send('Page.navigate', { url: 'file:///' + rackHtmlPath.replace(/\\/g, '/') });
    await sleep(1000);
    const macRackShot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'instrument_rack_macbook.png'), Buffer.from(macRackShot.data, 'base64'));

    await client.close();
    console.log('Screenshots generated successfully!');
  } finally {
    edgeProc.kill('SIGKILL');
  }
}

main().catch((err) => {
  console.error('Error generating screenshots:', err);
  process.exit(1);
});

