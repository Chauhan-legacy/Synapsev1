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

const routes = [
  'relations',
  'spectra',
  'statistics',
  'timefreq',
  'anomalies',
  'dynamics',
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
  'methods',
  'overview',
  'workbench',
  'rack',
  'datasets',
  'explorer',
  'cdco',
];

async function run() {
  const port = 9230;
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(ARTIFACT_DIR, 'sandbox_edge_test_all')}`,
    '--no-first-run',
    '--no-default-browser-check',
  ]);
  try {
    await sleep(2000);
    const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const browser = new CDPClient(ver.webSocketDebuggerUrl);
    await browser.connect();
    const { targetId } = await browser.send('Target.createTarget', { url: 'http://127.0.0.1:5173/#/overview' });
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find(t => t.id === targetId);
    const client = new CDPClient(page.webSocketDebuggerUrl);
    await client.connect();

    const loggedErrors = [];
    client.on(msg => {
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        if (msg.params.type === 'error') {
          loggedErrors.push(text);
          console.error('[BROWSER ERROR]', text);
        }
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const details = msg.params.exceptionDetails;
        const errText = `${details.text}: ${details.exception ? details.exception.description : ''}`;
        loggedErrors.push(errText);
        console.error('[BROWSER EXCEPTION]', errText);
      }
    });

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await sleep(2000);

    // Select LIGO dataset first
    console.log('Selecting LIGO dataset...');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('header button[aria-haspopup="listbox"]');
        if (btn) btn.click();
      })()`
    });
    await sleep(600);
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const options = Array.from(document.querySelectorAll('button, div, span'));
        const ligo = options.find(el => el.innerText && el.innerText.includes('LIGO GW150914'));
        if (ligo) ligo.click();
      })()`
    });
    await sleep(1000);

    const results = {};
    for (const r of routes) {
      await client.send('Page.navigate', { url: `http://127.0.0.1:5173/#/${r}` });
      await sleep(1200);

      const check = await client.send('Runtime.evaluate', {
        expression: `(() => {
          const pre = document.querySelector('pre');
          const recov = document.body.innerText.includes('Analytical Module Recovered');
          return {
            hasErrorScreen: recov,
            preText: pre ? pre.innerText : null
          };
        })()`,
        returnByValue: true
      });

      results[r] = check.result.value;
      if (check.result.value?.hasErrorScreen) {
        console.log(`FAILED ROUTE: #${r} -> ${check.result.value.preText}`);
      } else {
        console.log(`PASSED ROUTE: #${r}`);
      }
    }

    console.log('\n--- SUMMARY ---');
    console.log(JSON.stringify(results, null, 2));

    await client.close();
    await browser.close();
  } finally {
    try { edgeProc.kill(); } catch(e){}
  }
}

run().catch(console.error);
