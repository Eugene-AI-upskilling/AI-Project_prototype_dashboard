const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('../node_modules/playwright');
const siteRoot = path.resolve(__dirname, '../../../yujin-research-center');
const qaRoot = __dirname;
const report = { checks: [], errors: [], passed: false };
const contentTypes = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript', '.jpg':'image/jpeg', '.png':'image/png', '.mp4':'video/mp4', '.woff2':'font/woff2' };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(siteRoot, '.' + urlPath);
  if (!file.startsWith(siteRoot + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  const size = fs.statSync(file).size;
  const headers = { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges':'bytes', 'Cache-Control':'no-store' };
  const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if (range) {
    const start = Number(range[1]), end = Math.min(size - 1, range[2] ? Number(range[2]) : size - 1);
    if (start >= size || start > end) { res.writeHead(416); res.end(); return; }
    res.writeHead(206, { ...headers, 'Content-Range':`bytes ${start}-${end}/${size}`, 'Content-Length':end-start+1 });
    fs.createReadStream(file, { start, end }).pipe(res);
  } else { res.writeHead(200, { ...headers, 'Content-Length':size }); fs.createReadStream(file).pipe(res); }
});
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const seek = (page, time) => page.locator('#heroShowreel').evaluate((video, t) => new Promise(resolve => {
  video.pause();
  video.addEventListener('seeked', () => requestAnimationFrame(() => requestAnimationFrame(resolve)), { once:true });
  video.currentTime = t;
}), time);
async function geometry(page) {
  return page.evaluate(() => {
    const hero = document.querySelector('.hero');
    const frame = hero.querySelector('.hero__reel-frame').getBoundingClientRect();
    const stage = hero.querySelector('.hero-immersive__stage');
    const navHeight = document.querySelector('.nav').getBoundingClientRect().height;
    return { heroTop:hero.getBoundingClientRect().top+scrollY-navHeight, travel:hero.offsetHeight-stage.offsetHeight,
      x:frame.x,y:frame.y,width:frame.width,height:frame.height,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      progress:hero.dataset.immersiveProgress,copyInert:hero.querySelector('.left').inert };
  });
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.argv[2] || `http://127.0.0.1:${server.address().port}/hero-options/showreel-claude-upgraded.html`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport:{width:1440,height:900} });
    page.on('pageerror', error => report.errors.push(error.message));
    // The visual study uses the site's existing fallback content during deterministic QA.
    await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await page.goto(base, { waitUntil:'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('heroShowreel').currentTime > .2);
    await seek(page, 7.7);
    await settle(page);
    let open = await geometry(page);
    const heroValues = await page.locator('#heroIndices .v').allTextContents();
    assert(open.width === 1440 && open.copyInert, 'Opening stage must fill viewport and hide copy from keyboard focus');
    assert(open.scrollWidth <= open.viewport, 'Desktop has horizontal overflow');
    await page.screenshot({ path:path.join(qaRoot, 'hero-upgraded-desktop-open.png') });
    await page.evaluate(g => scrollTo(0, g.heroTop+g.travel*.84), open);
    await settle(page);
    const settled = await geometry(page);
    assert(JSON.stringify(heroValues) === JSON.stringify(await page.locator('#heroIndices .v').allTextContents()), 'Hero index figures changed during presentation');
    assert(settled.width < 900 && !settled.copyInert, 'Scroll did not shrink video and reveal interactive copy');
    const outerTransform = await page.locator('.hero__reel-frame').evaluate(el => getComputedStyle(el).transform);
    await page.mouse.move(settled.x+settled.width*.9, settled.y+settled.height*.25);
    await page.waitForFunction(() => document.querySelector('.hero').dataset.pointerActive === 'true');
    await page.waitForTimeout(520);
    const tilt = await page.locator('.hero-claude__media').evaluate(el => getComputedStyle(el).transform);
    assert(tilt !== 'none' && tilt !== 'matrix(1, 0, 0, 1, 0, 0)', 'Settled pointer tilt is missing');
    assert(await page.locator('.hero__reel-frame').evaluate(el => getComputedStyle(el).transform) === outerTransform, 'Pointer tilt replaced scroll geometry');
    await seek(page, 7.7);
    await page.screenshot({ path:path.join(qaRoot, 'hero-upgraded-desktop-settled.png') });
    report.checks.push({ desktop: { open, settled, innerTilt:tilt, outerTransformPreserved:true, heroIndexValuesStable:true } });
    await page.evaluate(() => scrollTo(0,0)); await settle(page);
    await page.mouse.move(1420,100); await page.waitForTimeout(520);
    assert(await page.locator('.hero').evaluate(el => el.style.getPropertyValue('--claude-tilt-x')) === '0.00deg', 'Opening media retained settled tilt after reverse scroll');
    await page.locator('#heroReelWatch').click();
    assert(await page.locator('#showreelModal').evaluate(el => el.open), 'Showreel modal did not open');
    await page.keyboard.press('Escape');
    assert(await page.locator('#showreelModal').evaluate(el => !el.open), 'Escape did not close showreel');
    assert(await page.evaluate(() => document.activeElement.id === 'heroReelWatch'), 'Showreel focus was not restored');
    report.checks.push({ modalEscapeAndFocus:true, reverseScrollTiltReset:true });
    await page.locator('.hero-immersive__skip').click();
    await page.waitForFunction(() => !document.querySelector('.hero .left').inert && document.activeElement.matches('.hero .left .btn'));
    report.checks.push({ skipFocus:true });
    const marketValues = await page.locator('#marketBox .cn-figure').allTextContents();
    await page.locator('#market').scrollIntoViewIfNeeded();
    await page.waitForTimeout(750);
    assert(JSON.stringify(marketValues) === JSON.stringify(await page.locator('#marketBox .cn-figure').allTextContents()), 'Market figures changed during reveal');
    await page.locator('#reports').scrollIntoViewIfNeeded();
    await page.waitForTimeout(950);
    const cards = await page.locator('#repBody > .rep-card').count();
    assert(cards > 0, 'Research fallback cards did not render');
    assert(await page.locator('#repBody > .rep-card').first().evaluate(el => !el.classList.contains('claude-reveal-pending')), 'Visible research card remained hidden');
    assert(await page.locator('#repBody > .rep-card').first().evaluate(el => getComputedStyle(el,'::after').backgroundImage.includes('linear-gradient')), 'Pointer light replaced the research text contrast overlay');
    report.checks.push({ researchCards:cards, marketValuesStable:true, researchContrastOverlayPreserved:true });
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(() => scrollTo(0,0)); await settle(page);
    let mobileOpen = await geometry(page);
    assert(mobileOpen.scrollWidth <= 390 && mobileOpen.width === 390, 'Mobile opening overflow');
    await seek(page, 7.7);
    await page.screenshot({path:path.join(qaRoot, 'hero-upgraded-mobile-open.png')});
    await page.evaluate(g => scrollTo(0,g.heroTop+g.travel*.84),mobileOpen); await settle(page);
    const mobileSettled = await geometry(page);
    assert(mobileSettled.scrollWidth <= 390 && !mobileSettled.copyInert, 'Mobile settled overflow or hidden copy');
    await seek(page, 7.7);
    await page.screenshot({path:path.join(qaRoot, 'hero-upgraded-mobile-settled.png')});
    report.checks.push({ mobile:{open:mobileOpen,settled:mobileSettled} });
    const reduced = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    await reduced.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await reduced.goto(base,{waitUntil:'domcontentloaded'}); await settle(reduced);
    assert(await reduced.locator('.hero').evaluate(el => !el.classList.contains('immersive-active')), 'Reduced motion still pins hero');
    assert(await reduced.locator('#heroShowreel').evaluate(el => el.paused && getComputedStyle(el).visibility === 'hidden'), 'Reduced motion autoplayed');
    assert(await reduced.locator('.claude-reveal-pending').count() === 0, 'Reduced motion hides content');
    await reduced.screenshot({path:path.join(qaRoot,'hero-upgraded-reduced.png')});
    const nojs = await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:false});
    await nojs.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await nojs.goto(base,{waitUntil:'domcontentloaded'});
    assert(await nojs.locator('.hero .left').evaluate(el => getComputedStyle(el).opacity === '1'), 'No-JS hides hero copy');
    assert(await nojs.locator('.hero__reel-poster').evaluate(el => getComputedStyle(el).display !== 'none'), 'No-JS hides poster');
    assert(await nojs.locator('#heroReelWatch').evaluate(el => getComputedStyle(el).display === 'none'), 'No-JS exposes unusable showreel controls');
    report.checks.push({reducedMotionPoster:true,noJsReadable:true});
    if (fs.existsSync(path.join(siteRoot,'assets/showreel-claude/EugeneInsightLab_Hero_Upgraded.mp4'))) {
      const media = await browser.newPage({viewport:{width:1440,height:900}});
      await media.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
      await media.goto(base,{waitUntil:'domcontentloaded'});
      await media.waitForFunction(() => document.getElementById('heroShowreel').currentTime > .2);
      const meta = await media.locator('#heroShowreel').evaluate(v => ({duration:v.duration,width:v.videoWidth,height:v.videoHeight,muted:v.muted,paused:v.paused,error:v.error?.message||null}));
      assert(meta.width > 0 && meta.muted && !meta.paused && !meta.error,'Hero media did not play');
      report.checks.push({heroMedia:meta});
    } else report.checks.push({heroMedia:'awaiting upgraded render'});
    assert(report.errors.length === 0, 'Page errors: '+report.errors.join('; '));
    report.passed = true;
  } finally {
    await browser.close(); server.close();
    fs.writeFileSync(path.join(qaRoot,'hero-upgraded-qa.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report));
  }
})().catch(error => { console.error(error); server.close(); process.exitCode=1; });
