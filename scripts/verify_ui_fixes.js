const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\Priyansh\\.gemini\\antigravity\\brain\\128cee9c-e715-43ac-a260-d55803f57f9a';

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
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
  }
}

async function captureScreens() {
  const port = 9226;
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(ARTIFACT_DIR, 'sandbox_edge_profile_fixes')}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1536,900',
  ]);

  try {
    await sleep(2000);
    let versionData = null;
    for (let i = 0; i < 10; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/version`);
        versionData = await res.json();
        break;
      } catch (e) {
        await sleep(500);
      }
    }

    const browserClient = new CDPClient(versionData.webSocketDebuggerUrl);
    await browserClient.connect();

    const { targetId } = await browserClient.send('Target.createTarget', { url: 'http://127.0.0.1:5173/' });
    const targetsRes = await fetch(`http://127.0.0.1:${port}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.id === targetId);

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('DOM.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1536,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

    // 1. Capture Paper Workbench
    console.log('Navigating to Workbench (http://127.0.0.1:5173/#/workbench) ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/#/workbench' });
    await sleep(2500);

    const shot1 = await client.send('Page.captureScreenshot', { format: 'png' });
    const shotPath1 = path.join(ARTIFACT_DIR, 'workbench_fixed_spacing.png');
    fs.writeFileSync(shotPath1, Buffer.from(shot1.data, 'base64'));
    console.log('Saved workbench screenshot:', shotPath1);

    // 2. Click to open Audio Lab and capture
    console.log('Opening Audio Lab ...');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const el = document.querySelector('[title*="Audio Lab"]');
        if (el) el.click();
      })()`
    });
    await sleep(1500);

    const shot2 = await client.send('Page.captureScreenshot', { format: 'png' });
    const shotPath2 = path.join(ARTIFACT_DIR, 'music_player_docked_right.png');
    fs.writeFileSync(shotPath2, Buffer.from(shot2.data, 'base64'));
    console.log('Saved music player screenshot:', shotPath2);

    // 3. Navigate to Instrument Rack
    console.log('Navigating to Instrument Rack ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/#/rack' });
    await sleep(2500);

    const shot3 = await client.send('Page.captureScreenshot', { format: 'png' });
    const shotPath3 = path.join(ARTIFACT_DIR, 'rack_dynamic_verified.png');
    fs.writeFileSync(shotPath3, Buffer.from(shot3.data, 'base64'));
    console.log('Saved rack screenshot:', shotPath3);

    await client.close();
    await browserClient.close();
  } finally {
    try { edgeProc.kill(); } catch (e) {}
  }
}

captureScreens().catch(console.error);
