const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ARTIFACT_DIR = 'C:\\Users\\Priyansh\\.gemini\\antigravity\\brain\\128cee9c-e715-43ac-a260-d55803f57f9a';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  console.log('=== STARTING MAXIMIZED HEATMAP & CHART VERIFICATION ===');
  const port = 9341;
  const userDataDir = path.join(ARTIFACT_DIR, 'sandbox_edge_profile_heatmaps');
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

  console.log('Navigating to #/rack...');
  await pageSend('Page.navigate', { url: 'http://127.0.0.1:5173/#/rack' });
  await new Promise(r => setTimeout(r, 3000));

  // 1. Capture Small Card Rack view
  const smallShot = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'heatmap_small_rack.png'), Buffer.from(smallShot.data, 'base64'));
  console.log('Saved heatmap_small_rack.png');

  // 2. Maximize Short-Time Fourier Spectrogram
  console.log('Finding and maximizing Short-Time Fourier Spectrogram...');
  const maxStft = await pageSend('Runtime.evaluate', {
    expression: `(() => {
      // Find instrument card with "Short-Time Fourier"
      const cards = Array.from(document.querySelectorAll('div.rounded-xl'));
      const stftCard = cards.find(c => c.textContent.includes('Short-Time Fourier') || c.textContent.includes('Spectrogram'));
      if (stftCard) {
        const maxBtn = stftCard.querySelector('button[title="Maximize"]');
        if (maxBtn) {
          maxBtn.click();
          return { clicked: true };
        }
      }
      return { clicked: false, totalCards: cards.length };
    })()`,
    returnByValue: true
  });
  console.log('Max STFT result:', maxStft.result.value);
  await new Promise(r => setTimeout(r, 1500));

  const maxStftShot = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'heatmap_stft_maximized.png'), Buffer.from(maxStftShot.data, 'base64'));
  console.log('Saved heatmap_stft_maximized.png');

  // 3. Minimize STFT
  await pageSend('Runtime.evaluate', {
    expression: `(() => {
      const exitBtn = document.querySelector('button[title="Exit fullscreen"]');
      if (exitBtn) exitBtn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // 4. Maximize Continuous Wavelet Scalogram (Morlet)
  console.log('Finding and maximizing Continuous Wavelet Scalogram...');
  const maxCwt = await pageSend('Runtime.evaluate', {
    expression: `(() => {
      const cards = Array.from(document.querySelectorAll('div.rounded-xl'));
      const cwtCard = cards.find(c => c.querySelector('h3')?.textContent?.includes('Continuous Wavelet'));
      if (cwtCard) {
        cwtCard.scrollIntoView();
        const maxBtn = Array.from(cwtCard.querySelectorAll('button')).find(b => b.title === 'Maximize' || b.innerHTML.includes('lucide-maximize'));
        if (maxBtn) {
          maxBtn.click();
          return { clicked: true, title: cwtCard.querySelector('h3')?.textContent };
        }
      }
      return { clicked: false, availableCards: cards.map(c => c.querySelector('h3')?.textContent) };
    })()`,
    returnByValue: true
  });
  console.log('Max CWT result:', maxCwt.result.value);
  await new Promise(r => setTimeout(r, 2000));

  const maxCwtShot = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'heatmap_cwt_maximized.png'), Buffer.from(maxCwtShot.data, 'base64'));
  console.log('Saved heatmap_cwt_maximized.png');

  // 5. Test Zoom 150%
  console.log('Testing Zoom 150% (High-DPI 3x deviceScaleFactor)...');
  await pageSend('Emulation.setDeviceMetricsOverride', { width: 1536, height: 900, deviceScaleFactor: 3, mobile: false });
  await new Promise(r => setTimeout(r, 1000));
  const zoomShot = await pageSend('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'heatmap_cwt_maximized_150zoom.png'), Buffer.from(zoomShot.data, 'base64'));
  console.log('Saved heatmap_cwt_maximized_150zoom.png');

  try { edgeProc.kill(); } catch(e){}
  console.log('=== ALL SCREENSHOTS CAPTURED SUCCESSFULLY ===');
  process.exit(0);
})();
