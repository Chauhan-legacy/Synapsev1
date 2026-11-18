const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ARTIFACT_DIR = 'C:\\Users\\Priyansh\\.gemini\\antigravity\\brain\\128cee9c-e715-43ac-a260-d55803f57f9a';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const port = 9340;
  const userDataDir = path.join(ARTIFACT_DIR, 'sandbox_edge_profile_switch');
  const edgeProc = spawn(EDGE_PATH, [
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + userDataDir,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--window-size=1536,900',
    'about:blank'
  ], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1500));

  const res = await fetch('http://127.0.0.1:' + port + '/json/version');
  const ver = await res.json();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const curId = id++;
    const handler = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === curId) {
        ws.removeEventListener('message', handler);
        resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: curId, method, params }));
  });

  const { targetId } = await send('Target.createTarget', { url: 'http://127.0.0.1:5173/#/rack' });
  const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const pageTarget = targets.find(t => t.id === targetId);

  const pageWs = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(r => pageWs.onopen = r);
  let pId = 1;
  const pageSend = (method, params = {}) => new Promise((resolve) => {
    const curId = pId++;
    const handler = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id === curId) {
        pageWs.removeEventListener('message', handler);
        resolve(msg.result);
      }
    };
    pageWs.addEventListener('message', handler);
    pageWs.send(JSON.stringify({ id: curId, method, params }));
  });

  await pageSend('Page.enable');
  await pageSend('DOM.enable');
  await pageSend('Runtime.enable');
  await pageSend('Emulation.setDeviceMetricsOverride', { width: 1536, height: 900, deviceScaleFactor: 2, mobile: false });

  await new Promise(r => setTimeout(r, 2000));

  // Get all available datasets from the dropdown
  console.log('Opening dropdown to list datasets...');
  const dsList = await pageSend('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.querySelector('button[aria-haspopup="listbox"]');
      if (btn) btn.click();
      const items = Array.from(document.querySelectorAll('div[class*="cursor-pointer"]')).map(el => el.textContent.trim()).filter(Boolean);
      return { found: items };
    })()`,
    returnByValue: true
  });
  console.log('Datasets listed:', dsList.result.value);

  // Switch between first 3 datasets
  for (let idx = 0; idx < 3; idx++) {
    console.log(`Selecting dataset at index ${idx}...`);
    const clickRes = await pageSend('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('button[aria-haspopup="listbox"]');
        if (btn) btn.click();
        const items = document.querySelectorAll('div[class*="cursor-pointer"]');
        if (items[${idx}]) {
          const name = items[${idx}].textContent;
          items[${idx}].click();
          return { clicked: true, name };
        }
        return { clicked: false };
      })()`,
      returnByValue: true
    });
    console.log('Result:', clickRes.result.value);
    await new Promise(r => setTimeout(r, 2000));

    // Verify error screen
    const errCheck = await pageSend('Runtime.evaluate', {
      expression: `(() => {
        const errText = document.body.innerText;
        return {
          hasAnalyticalError: errText.includes('Analytical Module Recovered'),
          hasUndefinedReading: errText.includes("Cannot read properties of undefined (reading '0')")
        };
      })()`,
      returnByValue: true
    });
    console.log('Error check:', errCheck.result.value);
    if (errCheck.result.value.hasAnalyticalError || errCheck.result.value.hasUndefinedReading) {
      console.error('ERROR DETECTED on dataset switch!');
      process.exit(1);
    }
  }

  console.log('ALL 3 DATASETS SWITCHED CLEANLY WITH ZERO ERRORS!');
  try { edgeProc.kill(); } catch(e){}
  process.exit(0);
})();
