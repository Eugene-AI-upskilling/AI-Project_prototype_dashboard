// node render-long.js stills [t1,t2,...] | video
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url'), { spawn } = require('child_process');
const { chromium } = require('playwright');
const mode = process.argv[2] || 'stills', dir = __dirname;
const run = args => new Promise((resolve, reject) => {
  const p = spawn('ffmpeg', args, { cwd: dir, stdio: ['ignore', 'ignore', 'pipe'] });
  let error = ''; p.stderr.on('data', d => error = (error + d).slice(-6000));
  p.on('error', reject); p.on('close', code => code === 0 ? resolve() : reject(new Error(error)));
});
(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(dir, 'reel-long.html')).href + '?render=1');
    await page.evaluate(() => window.ready);
    const DUR = await page.evaluate(() => window.DUR);
    const grab = async (type = 'image/png') => Buffer.from((await page.evaluate(tp => document.getElementById('c').toDataURL(tp, .9), type)).split(',')[1], 'base64');
    if (mode === 'stills') {
      const outDir = path.join(dir, 'stills-long'); fs.mkdirSync(outDir, { recursive: true });
      const times = (process.argv[3] || '1,3,5,6.5,8.7,9.5,10.2,10.8,12,14,16.5,21,23,26,27.3,28.5,30,31.8,34,38').split(',').map(Number);
      const t0 = Date.now();
      for (const time of times) {
        await page.evaluate(time => window.renderFrame(Math.round(time * 60), 60, 1), time);
        fs.writeFileSync(path.join(outDir, `t${time.toFixed(2).padStart(5, '0')}.jpg`), await grab('image/jpeg'));
      }
      console.log(JSON.stringify({ mode, errors, n: times.length, ms: Date.now() - t0 }));
    } else if (mode === 'video') {
      const fps = 60, count = Math.round(DUR * fps), master = 'EugeneInsightLab_Master_Long_Silent.mp4';
      const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', master], { cwd: dir, stdio: ['pipe', 'ignore', 'pipe'] });
      let err = '', failure; ff.stderr.on('data', d => err += d); ff.stdin.on('error', e => failure = e);
      const finished = new Promise((resolve, reject) => { ff.on('error', reject); ff.on('close', code => code === 0 ? resolve() : reject(new Error(err || `ffmpeg exit ${code}`))); });
      const started = Date.now();
      for (let i = 0; i < count; i++) {
        if (failure) throw failure;
        await page.evaluate(i => window.renderFrame(i, 60, 2), i);
        if (!ff.stdin.write(await grab())) await new Promise(r => ff.stdin.once('drain', r));
        if (i % 300 === 0) console.log(`frame ${i}/${count} · ${((Date.now() - started) / 1000).toFixed(1)}s`);
      }
      ff.stdin.end(); await finished;
      if (errors.length) throw new Error(errors.join('\n'));
      await run(['-y', '-hide_banner', '-loglevel', 'error', '-i', master, '-i', 'showreel-long.wav', '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-t', String(DUR), '-movflags', '+faststart', 'EugeneInsightLab_Showreel_Long.mp4']);
      await run(['-y', '-hide_banner', '-loglevel', 'error', '-i', master, '-vf', 'scale=1280:720,fps=30', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-movflags', '+faststart', 'EugeneInsightLab_Hero_Long.mp4']);
      await run(['-y', '-hide_banner', '-loglevel', 'error', '-ss', '10.2', '-i', master, '-frames:v', '1', '-q:v', '2', 'poster-long.jpg']);
      console.log(`done in ${((Date.now() - started) / 1000).toFixed(0)}s`);
    }
    if (errors.length) throw new Error(errors.join('\n'));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
