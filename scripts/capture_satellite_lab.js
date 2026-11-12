const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT_FILE = path.resolve(__dirname, '../docs/screenshots/satellite_lab_preview.png');

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

async function run() {
  const port = 9245;
  const edge = spawn(EDGE_PATH, [
    `--remote-debugging-port=${port}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${path.resolve(__dirname, '../scratch/edge_sat_profile')}`,
    'about:blank',
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await sleep(200);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const data = await res.json();
      wsUrl = data.webSocketDebuggerUrl;
      if (wsUrl) break;
    } catch {}
  }

  if (!wsUrl) {
    console.error('Failed to get CDP wsUrl');
    edge.kill();
    process.exit(1);
  }

  const cdp = new CDPClient(wsUrl);
  await cdp.connect();

  const { targetId } = await cdp.send('Target.createTarget', { url: 'http://127.0.0.1:5173/#satellite' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

  async function sendSession(method, params = {}) {
    const id = cdp.id++;
    return new Promise((res, rej) => {
      cdp.callbacks.set(id, { res, rej });
      cdp.ws.send(JSON.stringify({ id, sessionId, method, params }));
    });
  }

  await sendSession('Page.enable');
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 980,
    deviceScaleFactor: 1,
    mobile: false,
  });

  console.log('Navigating to http://127.0.0.1:5173/#satellite ...');
  await sendSession('Page.navigate', { url: 'http://127.0.0.1:5173/#satellite' });

  // Wait for canvas and charts to render
  await sleep(3500);

  const { data: b64 } = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT_FILE, Buffer.from(b64, 'base64'));
  console.log(`Saved screenshot to ${OUT_FILE}`);

  await cdp.close();
  edge.kill();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});

