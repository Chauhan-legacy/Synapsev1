const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../docs/screenshots');
const SCRATCH_DIR = path.resolve(__dirname, '../scratch');

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
      padding: 40px;
      background: radial-gradient(circle at 50% 25%, #EBE6DC 0%, #D5CEBF 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .macbook-window {
      width: 1440px;
      border-radius: 12px;
      overflow: hidden;
      background: #FFFFFF;
      box-shadow: 0 35px 95px -20px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.14);
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
      z-index: 2;
    }
    .light {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.4);
    }
    .close { background: #FF5F56; border: 0.5px solid #E0443E; }
    .minimize { background: #FFBD2E; border: 0.5px solid #DEA123; }
    .maximize { background: #27C93F; border: 0.5px solid #1AAB29; }
    .window-controls-right {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 2;
    }
    .pill-badge {
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: #0F766E;
      background: #E6F4F2;
      border: 1px solid rgba(15, 118, 110, 0.2);
      padding: 3px 10px;
      border-radius: 12px;
    }
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
      padding: 5px 28px;
      font-size: 12px;
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
      <div class="window-controls-right">
        <span class="pill-badge">Live CelesTrak TLE Propagator</span>
      </div>
    </div>
    <img class="app-screen" src="data:image/png;base64,${imgBase64}" />
  </div>
</body>
</html>`;
}

async function main() {
  console.log('=== CAPTURING SATELLITE TRACKING LAB ON MACBOOK BROWSER ===');

  const userDataDir = path.resolve(SCRATCH_DIR, 'edge_sat_macbook_' + Date.now());
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9247',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ]);

  try {
    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      await sleep(200);
      try {
        const res = await fetch('http://127.0.0.1:9247/json/version');
        const data = await res.json();
        wsUrl = data.webSocketDebuggerUrl;
        if (wsUrl) break;
      } catch {}
    }

    if (!wsUrl) throw new Error('Could not get CDP debugger url on port 9247');

    const client = new CDPClient(wsUrl);
    await client.connect();

    const { targetId } = await client.send('Target.createTarget', { url: 'http://127.0.0.1:5173/#satellite' });
    const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });

    async function sendSession(method, params = {}) {
      const id = client.id++;
      return new Promise((res, rej) => {
        client.callbacks.set(id, { res, rej });
        client.ws.send(JSON.stringify({ id, sessionId, method, params }));
      });
    }

    await sendSession('Page.enable');
    await sendSession('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('Navigating to http://127.0.0.1:5173/#satellite ...');
    await sendSession('Page.navigate', { url: 'http://127.0.0.1:5173/#satellite' });
    await sleep(3500);

    const rawShot = await sendSession('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'satellite_tracker_1440.png'), Buffer.from(rawShot.data, 'base64'));

    const satHtml = createMacbookHtml(rawShot.data, 'https://synapse.local/satellite');
    const satHtmlPath = path.join(SCRATCH_DIR, 'macbook_sat_tracker.html');
    fs.writeFileSync(satHtmlPath, satHtml);

    console.log('Rendering high-res MacBook browser frame...');
    await sendSession('Emulation.setDeviceMetricsOverride', {
      width: 1540,
      height: 1180,
      deviceScaleFactor: 2,
      mobile: false,
    });

    await sendSession('Page.navigate', { url: 'file:///' + satHtmlPath.replace(/\\/g, '/') });
    await sleep(1500);

    const finalShot = await sendSession('Page.captureScreenshot', { format: 'png' });
    const finalOutPath = path.join(SCREENSHOTS_DIR, 'satellite_tracker_macbook.png');
    fs.writeFileSync(finalOutPath, Buffer.from(finalShot.data, 'base64'));
    console.log(`Saved high-res MacBook Satellite Tracker to ${finalOutPath}`);

    const artifactPath = 'C:\\Users\\Priyansh\\.gemini\\antigravity\\brain\\128cee9c-e715-43ac-a260-d55803f57f9a\\satellite_tracker_macbook.png';
    fs.writeFileSync(artifactPath, Buffer.from(finalShot.data, 'base64'));
    console.log(`Copied to artifact path: ${artifactPath}`);

    await client.close();
  } finally {
    edgeProc.kill();
  }
}

main().catch((err) => {
  console.error('Error generating screenshot:', err);
  process.exit(1);
});

