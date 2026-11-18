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

async function testSingle(route) {
  const port = 9232;
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(ARTIFACT_DIR, 'sandbox_indiv_' + route)}`,
    '--no-first-run',
    '--no-default-browser-check',
  ]);
  try {
    await sleep(1500);
    const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const browser = new CDPClient(ver.webSocketDebuggerUrl);
    await browser.connect();
    const { targetId } = await browser.send('Target.createTarget', { url: `http://127.0.0.1:5173/#/${route}` });
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find(t => t.id === targetId);
    const client = new CDPClient(page.webSocketDebuggerUrl);
    await client.connect();

    client.on(msg => {
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('EXCEPTION ON #' + route + ':', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
      }
    });
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await sleep(2000);

    const check = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const pre = document.querySelector('pre');
        const recov = document.body.innerText.includes('Analytical Module Recovered');
        return { hasErrorScreen: recov, preText: pre ? pre.innerText : null };
      })()`,
      returnByValue: true
    });
    console.log('Direct test #' + route + ':', JSON.stringify(check.result.value));
    await client.close();
    await browser.close();
  } finally {
    try { edgeProc.kill(); } catch(e){}
  }
}

async function main() {
  const routesToTest = [
    'overview',
    'workbench',
    'spectra',
    'statistics',
    'relations',
    'cdco',
    'datasets',
    'explorer',
    'astronomy',
    'physics',
    'biosignals',
    'chaos',
    'earth_systems',
    'quantum',
    'feynman',
    'satellite',
    'geophysics',
    'inference',
    'findings',
    'evidence',
    'reproducibility',
    'benchmarks',
    'methods'
  ];
  for (const r of routesToTest) {
    await testSingle(r);
  }
}
main().catch(console.error);
