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
    if (this.ws) this.ws.close();
  }
}

async function captureVerification() {
  console.log('=== CAPTURING SPACING & MUSIC PLAYER VERIFICATION ===');
  const userDataDir = path.join(ARTIFACT_DIR, 'sandbox_edge_profile_spacing_verify');
  const port = 9335;

  const edgeArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1536,900',
    'about:blank',
  ];

  const edgeProc = spawn(EDGE_PATH, edgeArgs, { stdio: 'ignore' });
  await sleep(1500);

  try {
    let versionData;
    for (let i = 0; i < 10; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/version`);
        versionData = await res.json();
        break;
      } catch (e) {
        await sleep(500);
      }
    }

    if (!versionData || !versionData.webSocketDebuggerUrl) {
      throw new Error('Failed to obtain WebSocket Debugger URL from Edge');
    }

    const browserClient = new CDPClient(versionData.webSocketDebuggerUrl);
    await browserClient.connect();

    const { targetId } = await browserClient.send('Target.createTarget', { url: 'http://127.0.0.1:5173/#/workbench' });
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

    // 1. Paper Workbench with decompressed sidebar & clean axis
    console.log('Navigating to Paper Workbench...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/#/workbench' });
    await sleep(3000);
    const benchShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const benchPath = path.join(ARTIFACT_DIR, 'workbench_decompressed_spacing.png');
    fs.writeFileSync(benchPath, Buffer.from(benchShot.data, 'base64'));
    console.log('Saved workbench screenshot:', benchPath);

    // 2. Click Music Player to open Floating Studio Card
    console.log('Opening Music Player Audio Lab Floating Panel...');
    await client.send('Runtime.evaluate', {
      expression: `
        const pill = document.querySelector('div[title="Click to open Audio Lab"]') || document.querySelector('button[title*="Audio Lab"]');
        if (pill) pill.click();
      `,
    });
    await sleep(1500);
    const musicShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const musicPath = path.join(ARTIFACT_DIR, 'workbench_music_player_floating.png');
    fs.writeFileSync(musicPath, Buffer.from(musicShot.data, 'base64'));
    console.log('Saved floating music player screenshot:', musicPath);

    // 3. Navigate to Main Sidebar / Rack view to test Sidebar.tsx
    console.log('Navigating to Instrument Rack with main sidebar...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/#/rack' });
    await sleep(3000);
    const rackShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const rackPath = path.join(ARTIFACT_DIR, 'rack_sidebar_music_pill.png');
    fs.writeFileSync(rackPath, Buffer.from(rackShot.data, 'base64'));
    console.log('Saved rack screenshot:', rackPath);

    await client.close();
    await browserClient.close();
    console.log('All verification screenshots captured successfully!');
  } finally {
    try {
      edgeProc.kill();
    } catch (e) {}
  }
}

captureVerification().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
