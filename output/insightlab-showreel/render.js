// node render.js frames  -> key-frame stills;  node render.js video -> showreel_silent.mp4
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path'), fs = require('fs');
const mode = process.argv[2] || 'frames';
(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('console', m => console.log('[page]', m.text()));
  page.on('pageerror', e => console.log('[err]', e.message));
  await page.goto(require('url').pathToFileURL(path.resolve(__dirname, 'reel.html')).href + '?render=1');
  await page.evaluate(() => window.ready);
  const grab = async () => Buffer.from((await page.evaluate(() => document.getElementById('c').toDataURL('image/png'))).split(',')[1], 'base64');
  if (mode === 'frames') {
    fs.mkdirSync('stills', { recursive: true });
    const times = (process.argv[3] || '0.3,0.65,1.0,1.4,1.62,2.2,2.7,3.25,3.75,3.95,4.6,5.3,5.9,6.3,6.9,7.6,8.3,8.7,9.4,10.0,10.6,11.2,11.6,12.3,13.0,14.2').split(',').map(Number);
    for (const t of times) { await page.evaluate(i => window.renderFrame(i, 60, 1), Math.round(t * 60)); fs.writeFileSync(`stills/t${t.toFixed(2)}.png`, await grab()); }
  } else {
    const fps = 60, N = 15 * fps;
    const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'showreel_silent.mp4'], { stdio: ['pipe', 'ignore', 'inherit'] });
    for (let i = 0; i < N; i++) {
      await page.evaluate(i => window.renderFrame(i, 60, 4), i);
      if (!ff.stdin.write(await grab())) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 60 === 0) console.log('frame', i);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
