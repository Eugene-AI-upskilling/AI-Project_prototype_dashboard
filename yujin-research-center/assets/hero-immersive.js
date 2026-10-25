(() => {
  'use strict';
  const hero = document.querySelector('.hero--immersive');
  if (!hero) return;
  const stage = hero.querySelector('.hero-immersive__stage');
  const frame = hero.querySelector('.hero__reel-frame');
  const figure = hero.querySelector('.hero__reel');
  const copy = hero.querySelector('.left');
  const cue = hero.querySelector('.hero-immersive__cue');
  const skip = hero.querySelector('.hero-immersive__skip');
  const nav = document.querySelector('.nav');
  if (!stage || !frame || !figure || !copy || !cue || !skip) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const shortTouch = matchMedia('(max-width: 980px) and (max-height: 660px)');
  const target = document.createElement('div');
  target.className = 'hero__reel-target';
  target.setAttribute('aria-hidden', 'true');
  let active = false;
  let queued = false;
  let geometry;
  const clamp = n => Math.min(1, Math.max(0, n));
  const smooth = n => n * n * (3 - 2 * n);

  function measure() {
    if (!active) return;
    const navHeight = nav ? nav.getBoundingClientRect().height : 64;
    // Pin to the layout viewport, so mobile browser chrome does not stretch the scene.
    const viewportHeight = document.documentElement.clientHeight;
    hero.style.setProperty('--immersive-nav', `${navHeight}px`);
    hero.style.setProperty('--immersive-viewport', `${viewportHeight}px`);
    const stageBox = stage.getBoundingClientRect();
    const targetBox = target.getBoundingClientRect();
    geometry = {
      start: hero.getBoundingClientRect().top + window.scrollY - navHeight,
      travel: Math.max(1, hero.offsetHeight - stage.offsetHeight),
      width: stageBox.width, height: stageBox.height,
      x: targetBox.left - stageBox.left, y: targetBox.top - stageBox.top,
      endWidth: targetBox.width, endHeight: targetBox.height,
    };
    render();
  }

  function render() {
    queued = false;
    if (!active || !geometry) return;
    const progress = clamp((window.scrollY - geometry.start) / geometry.travel);
    // Keep the opening image full for a short beat; settle before the scene releases.
    const shrink = smooth(clamp((progress - .055) / .77));
    const reveal = smooth(clamp((progress - .35) / .36));
    const meta = smooth(clamp((progress - .59) / .23));
    const intro = 1 - smooth(clamp(progress / .18));
    const mix = (a, b) => a + (b - a) * shrink;
    hero.style.setProperty('--immersive-reel-w', `${mix(geometry.width, geometry.endWidth).toFixed(2)}px`);
    hero.style.setProperty('--immersive-reel-h', `${mix(geometry.height, geometry.endHeight).toFixed(2)}px`);
    hero.style.setProperty('--immersive-reel-x', `${(geometry.x * shrink).toFixed(2)}px`);
    hero.style.setProperty('--immersive-reel-y', `${(geometry.y * shrink).toFixed(2)}px`);
    hero.style.setProperty('--immersive-radius', `${(18 * shrink).toFixed(2)}px`);
    hero.style.setProperty('--immersive-reveal', reveal.toFixed(3));
    hero.style.setProperty('--immersive-meta', meta.toFixed(3));
    hero.style.setProperty('--immersive-intro', intro.toFixed(3));
    const controlsBase = innerWidth <= 480 ? 14 : 26;
    hero.style.setProperty('--immersive-controls', `${(controlsBase + (1 - shrink) * 58).toFixed(2)}px`);
    hero.dataset.immersiveProgress = progress.toFixed(3);
    copy.inert = reveal < .65;
    cue.inert = intro < .1;
    copy.style.visibility = reveal === 0 ? 'hidden' : '';
    cue.style.visibility = intro === 0 ? 'hidden' : '';
  }

  function requestRender() {
    if (!queued && active) { queued = true; requestAnimationFrame(render); }
  }

  function syncMode() {
    const shouldActivate = !motion.matches && !shortTouch.matches;
    if (shouldActivate === active) { measure(); return; }
    active = shouldActivate;
    if (active) {
      frame.before(target);
      stage.appendChild(frame);
      hero.classList.add('immersive-active');
      requestAnimationFrame(measure);
    } else {
      target.replaceWith(frame);
      hero.classList.remove('immersive-active');
      copy.inert = false;
      cue.inert = false;
      copy.style.visibility = '';
      cue.style.visibility = '';
    }
  }

  skip.addEventListener('click', () => {
    if (!geometry) return;
    window.scrollTo({ top: geometry.start + geometry.travel * .84, behavior: motion.matches ? 'instant' : 'smooth' });
    const focusTarget = copy.querySelector('.btn');
    if (focusTarget) {
      const settle = () => { if (active && !copy.inert) focusTarget.focus({ preventScroll: true }); };
      // scrollend is supported by current browsers; timeout covers older Safari.
      window.addEventListener('scrollend', settle, { once: true });
      setTimeout(settle, 900);
    }
  });
  window.addEventListener('scroll', requestRender, { passive: true });
  window.addEventListener('resize', () => { syncMode(); measure(); }, { passive: true });
  motion.addEventListener('change', syncMode);
  shortTouch.addEventListener('change', syncMode);
  if (document.fonts) document.fonts.ready.then(measure);
  syncMode();
})();
