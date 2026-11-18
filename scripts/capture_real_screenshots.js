const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const ARTIFACT_DIR = 'C:\\Users\\Priyansh\\.gemini\\antigravity\\brain\\128cee9c-e715-43ac-a260-d55803f57f9a';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const port = 9229;
  const userDataDir = path.join(ARTIFACT_DIR, 'sandbox_edge_screenshots');
  const edgeArgs = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1440,900',
    'about:blank',
  ];
  const proc = spawn(EDGE_PATH, edgeArgs, { stdio: 'ignore' });
  await sleep(1500);

  try {
    const vRes = await fetch(`http://127.0.0.1:${port}/json/version`);
    const { webSocketDebuggerUrl } = await vRes.json();
    
    const ws = new WebSocket(webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let msgId = 1;
    function send(targetWs, method, params = {}) {
      return new Promise((res, rej) => {
        const id = msgId++;
        const handler = (evt) => {
          const msg = JSON.parse(evt.data);
          if (msg.id === id) {
            targetWs.removeEventListener('message', handler);
            if (msg.error) rej(msg.error);
            else res(msg.result);
          }
        };
        targetWs.addEventListener('message', handler);
        targetWs.send(JSON.stringify({ id, method, params }));
      });
    }

    const { targetId } = await send(ws, 'Target.createTarget', { url: 'http://127.0.0.1:5173/#/overview' });
    const listRes = await fetch(`http://127.0.0.1:${port}/json/list`);
    const targets = await listRes.json();
    const page = targets.find(t => t.id === targetId);

    const pageWs = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { pageWs.onopen = res; pageWs.onerror = rej; });

    await send(pageWs, 'Runtime.enable');
    await send(pageWs, 'Page.enable');
    await sleep(2500);

    // Click "Run analysis" first
    await send(pageWs, 'Runtime.evaluate', {
      expression: `
        (() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Run analysis'));
          if (btn) btn.click();
        })()
      `
    });
    await sleep(2000);

    const targetsToCapture = [
      { route: '#/overview', filename: 'paper_workbench_macbook.png' },
      { route: '#/aporia', filename: 'synthesized_thoughts_diary.png' },
      { route: '#/papergraph', filename: 'knowledge_graph_demo.png' },
      { route: '#/dynamics', filename: 'dynamics_attractor_mockup.png' },
      { route: '#/rack', filename: 'instrument_rack_macbook.png' },
      { route: '#/satellite', filename: 'satellite_tracker_macbook.png' },
    ];

    const outDir = path.join(__dirname, '..', 'docs', 'screenshots');

    for (const t of targetsToCapture) {
      console.log(`Navigating to ${t.route}...`);
      await send(pageWs, 'Runtime.evaluate', { expression: `window.location.hash = '${t.route}'` });
      await sleep(1500);

      const shotRes = await send(pageWs, 'Page.captureScreenshot', { format: 'png' });
      const buffer = Buffer.from(shotRes.data, 'base64');
      const dest = path.join(outDir, t.filename);
      fs.writeFileSync(dest, buffer);
      console.log(`Saved screenshot to ${t.filename} (${buffer.length} bytes)`);
    }

    pageWs.close();
    ws.close();
    console.log('All real screenshots captured successfully!');
  } finally {
    proc.kill('SIGKILL');
  }
}

run().catch(console.error);
