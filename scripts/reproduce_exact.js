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
  const port = 9229;
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(ARTIFACT_DIR, 'sandbox_edge_repro')}`,
    '--no-first-run',
    '--no-default-browser-check',
  ]);
  try {
    await sleep(2000);
    const ver = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    const browser = new CDPClient(ver.webSocketDebuggerUrl);
    await browser.connect();
    const { targetId } = await browser.send('Target.createTarget', { url: 'http://127.0.0.1:5173/#/relations' });
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = list.find(t => t.id === targetId);
    const client = new CDPClient(page.webSocketDebuggerUrl);
    await client.connect();

    client.on(msg => {
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
        console.log('[CONSOLE]', msg.params.type, text);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.log('[EXCEPTION]', JSON.stringify(msg.params.exceptionDetails, null, 2));
      }
    });
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await sleep(2500);

    console.log('--- Switching to LIGO dataset ---');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('header button[aria-haspopup="listbox"]');
        if (btn) btn.click();
      })()`
    });
    await sleep(800);

    const clickRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const options = Array.from(document.querySelectorAll('button, div, span'));
        const ligo = options.find(el => el.innerText && el.innerText.includes('LIGO GW150914'));
        if (ligo) {
          ligo.click();
          return 'Clicked LIGO option';
        }
        return 'LIGO option not found; available: ' + options.map(o => o.innerText).filter(Boolean).slice(0, 15).join(' | ');
      })()`
    });
    console.log('Option click:', clickRes.result.value);
    await sleep(2500);

    console.log('--- Clicking Run Analysis button ---');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const runBtn = btns.find(b => b.innerText && (b.innerText.includes('Run analysis') || b.innerText.includes('Run')));
        if (runBtn) {
          runBtn.click();
          return 'Clicked Run Analysis';
        }
        return 'Run Analysis button not found';
      })()`,
      returnByValue: true
    });
    await sleep(4000);

    const err = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const pre = document.querySelector('pre');
        const h3 = document.querySelector('h3');
        const alert = document.querySelector('.text-red-700, [class*="red"]');
        return {
          pre: pre ? pre.innerText : null,
          h3: h3 ? h3.innerText : null,
          alert: alert ? alert.innerText : null,
          bodyText: document.body.innerText.substring(0, 400)
        };
      })()`,
      returnByValue: true,
    });
    console.log('DOM RESULT:', JSON.stringify(err.result.value, null, 2));

    await client.close();
    await browser.close();
  } finally {
    try { edgeProc.kill(); } catch(e){}
  }
}
run().catch(console.error);
