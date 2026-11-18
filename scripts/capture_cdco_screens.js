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

async function captureCDCOScreens() {
  console.log('=== CAPTURING CDCO RESEARCH WORKSTATION SCREENS ===');
  const userDataDir = path.join(ARTIFACT_DIR, 'sandbox_edge_profile_cdco');
  const port = 9336;

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

    const { targetId } = await browserClient.send('Target.createTarget', { url: 'http://127.0.0.1:5173/#/cdco' });
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

    // 1. CDCO Main Overview & Prewhitened CCF (Scrolled to show Section 4 CCF)
    console.log('Navigating to CDCO (http://127.0.0.1:5173/#/cdco)...');
    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/#/cdco' });
    await sleep(2500);
    await client.send('Runtime.evaluate', {
      expression: `
        const main = document.querySelector('main');
        if (main) main.scrollTop = 520;
        window.scrollTo(0, 520);
      `,
    });
    await sleep(800);
    const mainShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const mainPath = path.join(ARTIFACT_DIR, 'cdco_main_ccf_lag.png');
    fs.writeFileSync(mainPath, Buffer.from(mainShot.data, 'base64'));
    console.log('Saved CDCO main screenshot:', mainPath);

    // 2. Click Carter Coherence Tab
    console.log('Switching to Coherence Plane...');
    const clickRes2 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cross-Spectral Coherence'));
        if (!btn) return 'BUTTON_NOT_FOUND';
        btn.click();
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        const main = document.querySelector('main');
        if (main) main.scrollTop = 550;
        return 'CLICKED: ' + btn.textContent.trim();
      })()`,
      returnByValue: true,
    });
    console.log('Eval 2 result:', clickRes2.result.value);
    await sleep(1500);
    const cohShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const cohPath = path.join(ARTIFACT_DIR, 'cdco_coherence_carter.png');
    fs.writeFileSync(cohPath, Buffer.from(cohShot.data, 'base64'));
    console.log('Saved Coherence screenshot:', cohPath);

    // 3. Click IAAFT Surrogate Tab
    console.log('Switching to IAAFT Surrogate Null Plane...');
    const clickRes3 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('IAAFT Twin Surrogate'));
        if (!btn) return 'BUTTON_NOT_FOUND';
        btn.click();
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        const main = document.querySelector('main');
        if (main) main.scrollTop = 550;
        return 'CLICKED: ' + btn.textContent.trim();
      })()`,
      returnByValue: true,
    });
    console.log('Eval 3 result:', clickRes3.result.value);
    await sleep(1500);
    const surrShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const surrPath = path.join(ARTIFACT_DIR, 'cdco_iaaft_surrogates.png');
    fs.writeFileSync(surrPath, Buffer.from(surrShot.data, 'base64'));
    console.log('Saved Surrogates screenshot:', surrPath);

    // 4. Click Causal Safeguard Tab
    console.log('Switching to Causal Safeguard & Directionality Plane...');
    const clickRes4 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Causal Safeguard'));
        if (!btn) return 'BUTTON_NOT_FOUND';
        btn.click();
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        const main = document.querySelector('main');
        if (main) main.scrollTop = 550;
        return 'CLICKED: ' + btn.textContent.trim();
      })()`,
      returnByValue: true,
    });
    console.log('Eval 4 result:', clickRes4.result.value);
    await sleep(1500);
    const causalShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const causalPath = path.join(ARTIFACT_DIR, 'cdco_causal_safeguard.png');
    fs.writeFileSync(causalPath, Buffer.from(causalShot.data, 'base64'));
    console.log('Saved Causal Safeguard screenshot:', causalPath);

    // 5. Click ts2net Topological Network Tab
    console.log('Switching to Topological Network Plane...');
    const clickRes5 = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('ts2net'));
        if (!btn) return 'BUTTON_NOT_FOUND';
        btn.click();
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        const main = document.querySelector('main');
        if (main) main.scrollTop = 550;
        return 'CLICKED: ' + btn.textContent.trim();
      })()`,
      returnByValue: true,
    });
    console.log('Eval 5 result:', clickRes5.result.value);
    await sleep(1500);
    const netShot = await client.send('Page.captureScreenshot', { format: 'png' });
    const netPath = path.join(ARTIFACT_DIR, 'cdco_ts2net_graph.png');
    fs.writeFileSync(netPath, Buffer.from(netShot.data, 'base64'));
    console.log('Saved ts2net Network screenshot:', netPath);

    await client.close();
    await browserClient.close();
    console.log('All CDCO verification screenshots captured successfully!');
  } finally {
    try {
      edgeProc.kill();
    } catch (e) {}
  }
}

captureCDCOScreens().catch((err) => {
  console.error('CDCO capture error:', err);
  process.exit(1);
});
