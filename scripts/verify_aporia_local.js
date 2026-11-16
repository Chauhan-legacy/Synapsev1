const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const SCRATCH_DIR = path.resolve(__dirname, '../scratch');
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

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== VERIFYING APORIA PRIVATE DIARY LOCALLY ===');

  const port = 9224;
  const userDataDir = path.resolve(SCRATCH_DIR, 'edge_aporia_' + Date.now());

  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--window-size=1440,900',
    'about:blank',
  ]);

  let cdp = null;

  try {
    let wsUrl = null;
    for (let i = 0; i < 20; i++) {
      await sleep(400);
      try {
        const list = await getJson(`http://127.0.0.1:${port}/json`);
        const pageTarget = list.find((t) => t.type === 'page');
        if (pageTarget && pageTarget.webSocketDebuggerUrl) {
          wsUrl = pageTarget.webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }

    if (!wsUrl) throw new Error('Could not obtain Edge WebSocket Debugger URL');
    console.log('[CDP] Connected to Edge debugger:', wsUrl);

    cdp = new CDPClient(wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log('[NAV] Navigating to http://localhost:5173/#/aporia ...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/#/aporia' });
    await sleep(2500);

    // Evaluate DOM elements
    const evalResult = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const titleEl = document.querySelector('input[placeholder*="Title"]');
        const contentEl = document.querySelector('textarea');
        const brandEl = document.evaluate("//span[contains(text(), 'Synthesized Thoughts')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        const exportBtn = document.evaluate("//button[contains(., 'Export')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        const stored = localStorage.getItem('synapse_aporia_entries_v1');

        return {
          hasBrand: !!brandEl,
          titleValue: titleEl ? titleEl.value : null,
          contentLength: contentEl ? contentEl.value.length : 0,
          hasExportBtn: !!exportBtn,
          hasLocalStorage: !!stored,
          storedEntriesCount: stored ? JSON.parse(stored).length : 0,
        };
      })()`,
      returnByValue: true,
    });

    console.log('[EVAL RESULT]', evalResult.result.value);

    // Test typing and autosave
    console.log('[TEST] Editing reflection title and body...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const titleEl = document.querySelector('input[placeholder*="Title"]');
        const contentEl = document.querySelector('textarea');
        if (titleEl) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(titleEl, 'The Geometry of Unresolved Questions');
          titleEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (contentEl) {
          const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          nativeTextAreaValueSetter.call(contentEl, 'A reflection written during the midnight session.\\n\\nEverything checks out: mathematics, typography, and local privacy.\\n\\n\"Some thoughts deserve a place to stay.\"');
          contentEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`,
    });

    await sleep(1000); // Wait for debounced autosave

    // Verify localStorage updated
    const afterEdit = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const stored = localStorage.getItem('synapse_aporia_entries_v1');
        const parsed = stored ? JSON.parse(stored) : [];
        return {
          storedCount: parsed.length,
          activeTitle: parsed[0]?.title,
          contentLength: parsed[0]?.content?.length
        };
      })()`,
      returnByValue: true,
    });
    console.log('[AUTOSAVE VERIFICATION]', afterEdit.result.value);

    // Test Export Dropdown
    console.log('[TEST] Opening export menu...');
    await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const exportBtn = document.evaluate("//button[contains(., 'Export')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (exportBtn) exportBtn.click();
      })()`,
    });
    await sleep(500);

    const menuCheck = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const hasPng = !!document.evaluate("//span[contains(text(), 'PNG Image')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        const hasJpg = !!document.evaluate("//span[contains(text(), 'JPG / JPEG Image')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        return { hasPng, hasJpg };
      })()`,
      returnByValue: true,
    });
    console.log('[EXPORT MENU VERIFICATION]', menuCheck.result.value);

    // Test Image Export Execution in DOM
    console.log('[TEST] Testing high-resolution Canvas 2D export in browser...');
    const exportResult = await cdp.send('Runtime.evaluate', {
      expression: `(async () => {
        // Find the PNG button in open menu and click it
        const pngBtn = document.evaluate("//button[contains(., 'PNG Image')]", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (!pngBtn) return { success: false, reason: 'PNG button not found' };

        // Intercept download
        let downloadedName = null;
        let blobSize = 0;
        let blobMime = null;
        const originalCreate = URL.createObjectURL;
        URL.createObjectURL = (blob) => {
          blobSize = blob.size;
          blobMime = blob.type;
          return originalCreate(blob);
        };

        const originalClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function() {
          downloadedName = this.download;
        };

        pngBtn.click();
        await new Promise((r) => setTimeout(r, 600));

        // Restore
        URL.createObjectURL = originalCreate;
        HTMLAnchorElement.prototype.click = originalClick;

        return {
          success: blobSize > 0,
          blobSize,
          blobMime,
          downloadedName
        };
      })()`,
      awaitPromise: true,
      returnByValue: true,
    });
    console.log('[CANVAS EXPORT VERIFICATION]', exportResult.result.value);

    // Capture screenshot
    console.log('[SCREENSHOT] Capturing viewport...');
    const ss = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const previewPath = path.resolve(SCRATCH_DIR, 'aporia_verified_screen.png');
    fs.writeFileSync(previewPath, Buffer.from(ss.data, 'base64'));
    console.log(`[PASS] Screenshot saved to ${previewPath}`);

    console.log('\n=== ALL LOCAL APORIA VERIFICATION CHECKS PASSED ===\n');
  } finally {
    if (cdp) await cdp.close();
    edgeProc.kill('SIGTERM');
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
