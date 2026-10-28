const { chromium } = require('../insightlab-showreel/node_modules/playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = [];
  fs.mkdirSync(path.join(__dirname, 'qa'), { recursive: true });
  for (const [name, size, reducedMotion] of [
    ['desktop', { width: 1440, height: 900 }, 'no-preference'],
    ['mobile', { width: 390, height: 844 }, 'no-preference'],
    ['small-mobile', { width: 375, height: 667 }, 'no-preference'],
    ['reduced', { width: 1440, height: 900 }, 'reduce'],
  ]) {
    const page = await browser.newPage({ viewport: size, reducedMotion });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:4190/b-vector.html');
    await page.waitForFunction(() => document.querySelector('#vector-wordmark').dataset.effectReady === 'true');
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      const element = document.querySelector('#vector-wordmark');
      return { ...element.dataset, overflow: document.documentElement.scrollWidth > innerWidth, canvasWidth: element.querySelector('canvas').width };
    });
    await page.screenshot({ path: path.join(__dirname, 'qa', `b-${name}.png`) });
    if (name === 'desktop') {
      const before = await page.locator('.vector-coord').allTextContents();
      await page.mouse.move(1020, 360);
      await page.waitForTimeout(350);
      const after = await page.locator('.vector-coord').allTextContents();
      info.pointerUpdates = JSON.stringify(before) !== JSON.stringify(after);
      await page.screenshot({ path: path.join(__dirname, 'qa', 'b-pointer.png') });
      await page.locator('.hero-summary a').click();
      await page.waitForTimeout(750);
      info.researchReached = await page.evaluate(() => document.querySelector('#research').getBoundingClientRect().top < 150);
      await page.screenshot({ path: path.join(__dirname, 'qa', 'b-research.png') });
      const api = await page.evaluate(async () => {
        const { mountVector } = await import('./vector-effect.js');
        const box = document.createElement('div');
        box.style.cssText = 'width:600px;height:180px;position:fixed;top:100px;left:10px;';
        document.body.append(box);
        const instance = mountVector(box, { text: 'EUGENE' });
        await new Promise(resolve => setTimeout(resolve, 200));
        instance.setScroll(.5);
        instance.setPaused(true);
        const paused = box.dataset.effectStatus;
        instance.setPaused(false);
        const resumed = box.dataset.effectStatus;
        instance.destroy();
        const destroyed = box.dataset.effectStatus;
        const canvases = box.querySelectorAll('canvas').length;
        box.remove();
        return { paused, resumed, destroyed, canvases };
      });
      info.api = api;
    }
    results.push({ name, ...info, errors });
    await page.close();
  }
  const fallback = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (/webgl/.test(type)) return null;
      return original.call(this, type, ...args);
    };
  });
  await fallback.goto('http://127.0.0.1:4190/b-vector.html');
  await fallback.waitForFunction(() => document.querySelector('#vector-wordmark').dataset.effectReady === 'true');
  results.push({ name: 'webgl-unavailable', ...(await fallback.locator('#vector-wordmark').evaluate(element => ({ ...element.dataset }))) });
  await fallback.screenshot({ path: path.join(__dirname, 'qa', 'b-fallback.png') });
  await fallback.close();
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'qa', 'b-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})().catch(error => { console.error(error); process.exit(1); });
