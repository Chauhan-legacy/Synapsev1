const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ARTIFACT_DIR = 'C:\\Users\\Priyansh\\.gemini\\antigravity\\brain\\128cee9c-e715-43ac-a260-d55803f57f9a';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const port = 9337;
  const userDataDir = path.join(ARTIFACT_DIR, 'sandbox_edge_profile_relations');
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

  const { targetId } = await send('Target.createTarget', { url: 'http://127.0.0.1:5173/#/relations' });
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

  console.log('Navigating to #/relations...');
  await pageSend('Page.navigate', { url: 'http://127.0.0.1:5173/#/relations' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Selecting LIGO dataset...');
  await pageSend('Runtime.evaluate', {
    expression: `(() => {
      const select = document.querySelector('select');
      if (select) {
        const opt = Array.from(select.options).find(o => o.value.includes('ligo') || o.text.includes('LIGO'));
        if (opt) {
          select.value = opt.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    })()`
  });
  await new Promise(r => setTimeout(r, 2500));

  const screenshot = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'relations_ligo_fixed.png'), Buffer.from(screenshot.data, 'base64'));
  console.log('Saved relations_ligo_fixed.png');

  try { edgeProc.kill(); } catch(e){}
  process.exit(0);
})();
