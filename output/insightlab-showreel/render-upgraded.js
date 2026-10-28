const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url'), { spawn } = require('child_process');
const { chromium } = require('playwright');
const mode = process.argv[2] || 'stills', dir = __dirname;
const run = args => new Promise((resolve, reject) => {
  const p = spawn('ffmpeg', args, { cwd: dir, stdio: ['ignore', 'ignore', 'pipe'] });
  let error = ''; p.stderr.on('data', data => error = (error + data).slice(-6000));
  p.on('error', reject); p.on('close', code => code === 0 ? resolve() : reject(new Error(error)));
});
(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(dir, 'reel-upgraded.html')).href + '?render=1');
    await page.evaluate(() => window.ready);
    const grab = async () => Buffer.from((await page.evaluate(() => document.getElementById('c').toDataURL('image/png'))).split(',')[1], 'base64');
    if (mode === 'stills') {
      fs.mkdirSync(path.join(dir, 'stills-upgraded'), { recursive: true });
      const times = (process.argv[3] || '.95,1.72,2.72,3.25,5.55,7.55,8.15,9.65,10.25,14.2').split(',').map(Number);
      for (const time of times) {
        await page.evaluate(time => window.renderFrame(Math.round(time * 60), 60, 1), time);
        fs.writeFileSync(path.join(dir, 'stills-upgraded', `t${time.toFixed(2)}.png`), await grab());
      }
      console.log(JSON.stringify({ mode, errors, times }));
    } else if (mode === 'video') {
      const fps = 60, count = 900, master = 'EugeneInsightLab_Master_Upgraded_Silent.mp4';
      const ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', master], { cwd: dir, stdio: ['pipe', 'ignore', 'pipe'] });
      let err = '', failure; ff.stderr.on('data', d => err += d); ff.stdin.on('error', e => failure = e);
      const finished = new Promise((resolve, reject) => { ff.on('error', reject); ff.on('close', code => code === 0 ? resolve() : reject(new Error(err || `ffmpeg exit ${code}`))); });
      const started = Date.now();
      for (let i = 0; i < count; i++) {
        if (failure) throw failure;
        await page.evaluate(i => window.renderFrame(i, 60, 2), i);
        if (!ff.stdin.write(await grab())) await new Promise(resolve => ff.stdin.once('drain', resolve));
        if (i % 60 === 0) console.log(`frame ${i}/${count} · ${((Date.now() - started) / 1000).toFixed(1)}s`);
      }
      ff.stdin.end(); await finished;
      if (errors.length) throw new Error(errors.join('\n'));
      await run(['-y', '-hide_banner', '-loglevel', 'error', '-i', master, '-i', 'showreel.wav', '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-t', '15', '-movflags', '+faststart', 'EugeneInsightLab_Showreel_15s_Upgraded.mp4']);
      // Seamless looping needs a smooth white→dark bridge. Fade the final .35s
      // into the exact first frame while preserving the 15-second web loop.
      await run(['-y', '-hide_banner', '-loglevel', 'error', '-i', master, '-filter_complex', '[0:v]scale=1280:720,fps=30,split=2[main][head];[head]trim=0:0.033333,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.4,format=yuva420p,fade=t=in:st=0:d=0.3:alpha=1,setpts=PTS+14.65/TB[fade];[main][fade]overlay=eof_action=pass:format=auto,format=yuv420p[v]', '-map', '[v]', '-t', '15', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '22', '-movflags', '+faststart', 'EugeneInsightLab_Hero_Upgraded.mp4']);
      await run(['-y', '-hide_banner', '-loglevel', 'error', '-ss', '14.2', '-i', master, '-frames:v', '1', '-q:v', '2', 'poster-upgraded.jpg']);
      console.log('Upgrade master, original soundtrack, web loop and poster exported.');
    } else throw new Error('Use stills or video');
    if (errors.length) throw new Error(errors.join('\n'));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
