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

async function findLigoError() {
  const port = 9229;
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(ARTIFACT_DIR, 'sandbox_edge_ligo')}`,
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

    await sleep(2000);

    // Switch dataset to LIGO via clicking or context
    console.log('Selecting LIGO dataset...');
    const switchRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        // Find dropdown button
        const btns = Array.from(document.querySelectorAll('button'));
        const dsBtn = btns.find(b => b.getAttribute('aria-haspopup') === 'listbox');
        if (dsBtn) {
          dsBtn.click();
          return 'dropdown_clicked';
        }
        return 'no_dropdown_btn';
      })()`,
      returnByValue: true
    });
    console.log('Dropdown click:', switchRes.result.value);

    await sleep(600);

    const selectRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const divs = Array.from(document.querySelectorAll('div'));
        const ligo = divs.find(d => d.innerText && d.innerText.includes('LIGO GW150914'));
        if (ligo) {
          ligo.click();
          return 'ligo_clicked';
        }
        return 'ligo_not_found';
      })()`,
      returnByValue: true
    });
    console.log('LIGO click:', selectRes.result.value);

    await sleep(2500);

    // Check for error text in DOM
    const details = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const pre = document.querySelector('pre');
        const details = document.querySelector('details');
        const h3 = document.querySelector('h3');
        return {
          h3: h3 ? h3.innerText : null,
          pre: pre ? pre.innerText : null,
          details: details ? details.innerText : null,
          bodyText: document.body.innerText.slice(0, 500)
        };
      })()`,
      returnByValue: true
    });
    console.log('DOM check:', JSON.stringify(details.result.value, null, 2));

    await client.close();
    await browserClient.close();
  } finally {
    try { edgeProc.kill(); } catch (e) {}
  }
}

findLigoError().catch(console.error);
