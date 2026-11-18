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

async function runSandboxVerification() {
  console.log('=== STARTING SANDBOX BROWSER RUN & VERIFICATION ===');
  const userDataDir = path.join(ARTIFACT_DIR, 'sandbox_edge_profile');
  const port = 9222;

  const edgeArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1440,900',
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

    // Create target page
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
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

    console.log('Navigating to http://127.0.0.1:5173/ ...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/' });
    await sleep(3500);

    // Evaluate title and UI state
    const titleRes = await client.send('Runtime.evaluate', {
      expression: 'document.title',
    });
    console.log('Document Title:', titleRes.result.value);

    // Check if Synthesized Thoughts is visible
    const textCheck = await client.send('Runtime.evaluate', {
      expression: 'document.body.innerText.includes("Synthesized Thoughts")',
    });
    console.log('Synthesized Thoughts branding verified in DOM:', textCheck.result.value);

    // Capture screenshot
    const shot = await client.send('Page.captureScreenshot', { format: 'png' });
    const outPath = path.join(ARTIFACT_DIR, 'live_sandbox_stress_run.png');
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log('Saved live sandbox screenshot to:', outPath);

    await client.close();
    await browserClient.close();
    console.log('Sandbox browser verification completed successfully.');
  } finally {
    try {
      edgeProc.kill();
    } catch (e) { }
  }
}

runSandboxVerification().catch(err => {
  console.error('Sandbox verification error:', err);
  process.exit(1);
});
