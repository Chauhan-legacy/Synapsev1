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
    this.listeners = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method) {
          for (const l of this.listeners) l(msg);
        }
        if (msg.id && this.callbacks.has(msg.id)) {
          const { res, rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) rej(new Error(msg.error.message));
          else res(msg.result);
        }
      };
    });
  }

  on(fn) {
    this.listeners.push(fn);
  }

  async send(method, params = {}) {
    const id = this.id++;
    return new Promise((res, rej) => {
      this.callbacks.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
  }
}

async function diagnose() {
  const port = 9228;
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(ARTIFACT_DIR, 'sandbox_edge_diag2')}`,
    '--no-first-run',
    '--no-default-browser-check',
  ]);

  try {
    await sleep(2000);
    const res = await fetch(`http://127.0.0.1:${port}/json/version`);
    const versionData = await res.json();

    const browserClient = new CDPClient(versionData.webSocketDebuggerUrl);
    await browserClient.connect();

    const { targetId } = await browserClient.send('Target.createTarget', { url: 'http://127.0.0.1:5173/#/relations' });
    const targetsRes = await fetch(`http://127.0.0.1:${port}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find((t) => t.id === targetId);

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    client.on((msg) => {
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value || a.description || JSON.stringify(a)).join(' ');
        console.log('[BROWSER CONSOLE]', msg.params.type, text);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.log('[BROWSER EXCEPTION]', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description);
      }
    });

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    await sleep(2500);

    // Open dataset dropdown and click LIGO
    console.log('Clicking dataset dropdown...');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const dsBtn = btns.find(b => b.innerText && (b.innerText.includes('Dataset') || b.innerText.includes('Omega')));
        if (dsBtn) dsBtn.click();
      })()`
    });
    await sleep(800);

    console.log('Clicking LIGO dataset option...');
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const items = Array.from(document.querySelectorAll('div, button, span'));
        const ligoItem = items.find(el => el.innerText && el.innerText.includes('LIGO GW150914'));
        if (ligoItem) ligoItem.click();
      })()`
    });
    await sleep(2000);

    const errorText = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const pre = document.querySelector('pre');
        return pre ? pre.innerText : 'NO PRE ERROR';
      })()`
    });
    console.log('DOM PRE ERROR TEXT:', errorText.result.value);

    await client.close();
    await browserClient.close();
  } finally {
    try { edgeProc.kill(); } catch (e) {}
  }
}

diagnose().catch(console.error);
