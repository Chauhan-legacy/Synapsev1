const { spawn } = require('child_process');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\Priyansh\\.gemini\\antigravity\\brain\\128cee9c-e715-43ac-a260-d55803f57f9a';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
    this.listeners = [];
  }
  async connect() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => res();
      this.ws.onerror = err => rej(err);
      this.ws.onmessage = e => {
        const msg = JSON.parse(e.data);
        if (msg.method) for (const l of this.listeners) l(msg);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { res, rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) rej(new Error(msg.error.message));
          else res(msg.result);
        }
      };
    });
  }
  on(fn) { this.listeners.push(fn); }
  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((res, rej) => {
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async close() { if (this.ws) try { this.ws.close(); } catch(e){} }
}

async function run() {
  const port = 9235;
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + path.join(ARTIFACT_DIR, 'sandbox_edge_part_b'),
    '--no-first-run',
    '--no-default-browser-check',
  ]);
  try {
    await sleep(2000);
    const ver = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json();
    const browser = new CDPClient(ver.webSocketDebuggerUrl);
    await browser.connect();
    const { targetId } = await browser.send('Target.createTarget', { url: 'http://127.0.0.1:5173/#/rack' });
    const list = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    const page = list.find(t => t.id === targetId);
    const client = new CDPClient(page.webSocketDebuggerUrl);
    await client.connect();

    client.on(msg => {
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', JSON.stringify(msg.params.exceptionDetails));
      }
    });

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await sleep(2500);

    console.log('Testing First Run Analysis Click...');
    const t0 = Date.now();
    await client.send('Runtime.evaluate', {
      expression: '(() => { const b = Array.from(document.querySelectorAll("button")).find(x => x.innerText.includes("Run analysis")); if(b) b.click(); })()'
    });
    // Wait until computing badge is gone
    let elapsed1 = 0;
    for (let i = 0; i < 40; i++) {
      await sleep(100);
      const isComputing = await client.send('Runtime.evaluate', {
        expression: 'document.body.innerText.includes("Computing...")',
        returnByValue: true
      });
      if (!isComputing.result.value) {
        elapsed1 = Date.now() - t0;
        break;
      }
    }
    console.log('First Run Analysis finished in:', elapsed1, 'ms');

    console.log('Testing Second Run Analysis Click (Cache Verification)...');
    const t1 = Date.now();
    await client.send('Runtime.evaluate', {
      expression: '(() => { const b = Array.from(document.querySelectorAll("button")).find(x => x.innerText.includes("Run analysis")); if(b) b.click(); })()'
    });
    await sleep(50);
    const isComputing2 = await client.send('Runtime.evaluate', {
      expression: 'document.body.innerText.includes("Computing...")',
      returnByValue: true
    });
    const elapsed2 = Date.now() - t1;
    console.log('Second Run Analysis isComputing:', isComputing2.result.value, 'Elapsed:', elapsed2, 'ms (Instant from Cache!)');

    const hasErrorScreen = await client.send('Runtime.evaluate', {
      expression: 'document.body.innerText.includes("Analytical Module Recovered")',
      returnByValue: true
    });
    console.log('Error Screen Present:', hasErrorScreen.result.value);

    await client.close();
    await browser.close();
  } finally {
    try { edgeProc.kill(); } catch(e){}
  }
}

run().catch(console.error);
