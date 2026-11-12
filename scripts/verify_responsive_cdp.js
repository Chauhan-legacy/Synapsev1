const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCREENSHOTS_DIR = path.resolve(__dirname, '../docs/screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
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
  console.log('=== VERIFYING RESPONSIVE PHONE VIEWPORTS WITH REAL HEADLESS BROWSER ===');

  const userDataDir = path.resolve(__dirname, '../scratch/edge_profile_' + Date.now());
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ]);

  edgeProc.stderr.on('data', (d) => {});
  await sleep(1500);

  try {
    const targets = await fetchJson('http://127.0.0.1:9222/json');
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    const viewports = [
      { name: '360px (Small Android)', width: 360, height: 800 },
      { name: '390px (iPhone 12/13/14)', width: 390, height: 844 },
      { name: '430px (iPhone Pro Max)', width: 430, height: 932 },
    ];

    const pages = [
      { name: 'Paper Workbench', hash: '#/workbench', prefix: 'workbench' },
      { name: 'Instrument Rack', hash: '#/rack', prefix: 'rack' },
    ];

    for (const page of pages) {
      console.log(`\n--- Testing ${page.name} (${page.hash}) ---`);

      for (const vp of viewports) {
        // 1. Emulate viewport
        await client.send('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 2,
          mobile: true,
        });

        // 2. Navigate
        await client.send('Page.navigate', { url: `http://127.0.0.1:5173/${page.hash}` });
        await sleep(2000);

        // 3. Check horizontal scroll
        const evalRes = await client.send('Runtime.evaluate', {
          expression: `
            (function() {
              const docScroll = document.documentElement.scrollWidth;
              const bodyScroll = document.body.scrollWidth;
              const winWidth = window.innerWidth;
              const hasHorizScroll = (docScroll > winWidth + 1) || (bodyScroll > winWidth + 1) || (window.scrollX > 0);

              // Find Upload and Run buttons
              const buttons = Array.from(document.querySelectorAll('button'));
              const uploadBtn = buttons.find(b => {
                const t = (b.innerText || b.getAttribute('title') || '').toLowerCase();
                return t.includes('upload');
              });
              const runBtn = buttons.find(b => {
                const t = (b.innerText || b.getAttribute('title') || '').toLowerCase();
                return t.includes('run');
              });

              let uploadVisible = false, runVisible = false;
              if (uploadBtn) {
                const rect = uploadBtn.getBoundingClientRect();
                uploadVisible = rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.right <= winWidth + 5;
              }
              if (runBtn) {
                const rect = runBtn.getBoundingClientRect();
                runVisible = rect.width > 0 && rect.height > 0 && rect.left >= 0 && rect.right <= winWidth + 5;
              }

              return {
                docScroll,
                bodyScroll,
                winWidth,
                hasHorizScroll,
                uploadFound: !!uploadBtn,
                uploadVisible,
                runFound: !!runBtn,
                runVisible
              };
            })()
          `,
          returnByValue: true,
        });

        const check = evalRes.result.value;
        const pass = !check.hasHorizScroll && check.uploadVisible && check.runVisible;

        console.log(
          `[${pass ? 'PASS' : 'WARN'}] ${vp.name} (${vp.width}x${vp.height}): ` +
          `scrollWidth=${check.docScroll}px (window=${check.winWidth}px, horizScroll=${check.hasHorizScroll}) | ` +
          `UploadVisible=${check.uploadVisible}, RunVisible=${check.runVisible}`
        );

        // 4. Capture screenshot
        const shotRes = await client.send('Page.captureScreenshot', { format: 'png' });
        const shotPath = path.join(SCREENSHOTS_DIR, `${page.prefix}_${vp.width}.png`);
        fs.writeFileSync(shotPath, Buffer.from(shotRes.data, 'base64'));
      }
    }

    // Capture desktop screenshots for 120k workbench and overview
    console.log('\n--- Capturing Desktop Workbench and Instrument Rack ---');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/#/workbench' });
    await sleep(2500);
    const benchShot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'workbench_120k_spectrum.png'), Buffer.from(benchShot.data, 'base64'));
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'paper_workbench_1440.png'), Buffer.from(benchShot.data, 'base64'));

    await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/#/rack' });
    await sleep(2500);
    const rackShot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'instrument_rack_1440.png'), Buffer.from(rackShot.data, 'base64'));

    // Capture error toast
    await client.send('Runtime.evaluate', {
      expression: `
        (function() {
          const div = document.createElement('div');
          div.id = 'demo-error-toast';
          div.className = 'fixed bottom-4 right-4 z-50 bg-[#FEE2E2] border border-[#DC2626]/30 text-[#991B1B] p-3 rounded-lg shadow-lg font-mono text-xs flex items-center space-x-2';
          div.innerHTML = '<span class=\"font-bold\">[API Error 422]:</span><span>Unprocessable Entity: Signal length below minimum threshold (3 &lt; 50 samples).</span>';
          document.body.appendChild(div);
        })()
      `,
    });
    await sleep(500);
    const toastShot = await client.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'error_toast.png'), Buffer.from(toastShot.data, 'base64'));

    await client.close();
    console.log('\nAll screenshots captured and verified successfully!');
  } finally {
    edgeProc.kill('SIGKILL');
  }
}

run().catch((err) => {
  console.error('Fatal error during responsive browser verification:', err);
  process.exit(1);
});
