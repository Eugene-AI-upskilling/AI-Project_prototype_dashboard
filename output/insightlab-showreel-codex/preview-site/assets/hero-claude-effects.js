(() => {
  'use strict';
  const hero = document.querySelector('.hero--claude');
  if (!hero) return;
  const stage = hero.querySelector('.hero-immersive__stage');
  const frame = hero.querySelector('.hero__reel-frame');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const effectsEnabled = () => !motion.matches && fine.matches;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  let pointerFrame = 0;
  let pointerEvent = null;

  function resetPointer() {
    hero.dataset.pointerActive = 'false';
    hero.style.setProperty('--claude-parallax-x', '0px');
    hero.style.setProperty('--claude-parallax-y', '0px');
    hero.style.setProperty('--claude-tilt-x', '0deg');
    hero.style.setProperty('--claude-tilt-y', '0deg');
    pointerEvent = null;
  }

  function paintPointer() {
    pointerFrame = 0;
    if (!pointerEvent || !effectsEnabled() || !stage || !frame) return;
    const { clientX, clientY } = pointerEvent;
    const box = stage.getBoundingClientRect();
    hero.dataset.pointerActive = 'true';
    hero.style.setProperty('--claude-light-x', `${(clientX - box.left).toFixed(1)}px`);
    hero.style.setProperty('--claude-light-y', `${(clientY - box.top).toFixed(1)}px`);
    // The outer frame belongs to scroll geometry; only the inner media plane tilts.
    const settled = hero.classList.contains('immersive-active')
      ? clamp((Number(hero.dataset.immersiveProgress || 0) - .7) / .2, 0, 1) : 1;
    const mediaBox = frame.getBoundingClientRect();
    const nx = clamp((clientX - mediaBox.left) / mediaBox.width - .5, -.5, .5);
    const ny = clamp((clientY - mediaBox.top) / mediaBox.height - .5, -.5, .5);
    hero.style.setProperty('--claude-parallax-x', `${(nx * 5 * settled).toFixed(2)}px`);
    hero.style.setProperty('--claude-parallax-y', `${(ny * 4 * settled).toFixed(2)}px`);
    hero.style.setProperty('--claude-tilt-x', `${(-ny * 3 * settled).toFixed(2)}deg`);
    hero.style.setProperty('--claude-tilt-y', `${(nx * 4 * settled).toFixed(2)}deg`);
  }

  stage?.addEventListener('pointermove', event => {
    if (!effectsEnabled()) return;
    pointerEvent = { clientX: event.clientX, clientY: event.clientY };
    if (!pointerFrame) pointerFrame = requestAnimationFrame(paintPointer);
  }, { passive: true });
  stage?.addEventListener('pointerleave', resetPointer);
  // A reverse scroll must remove the settled tilt even when the pointer is stationary.
  window.addEventListener('scroll', () => {
    if (pointerEvent && !pointerFrame) pointerFrame = requestAnimationFrame(paintPointer);
  }, { passive: true });
  fine.addEventListener('change', resetPointer);
  motion.addEventListener('change', resetPointer);

  const revealSelector = '.section .sec-head, #repBody > .rep-card, #globalBox > .card, #insightScroller > .card, #members .teaser, .cta-band h2, .cta-band > p, .cta-band .joinbox';
  const cardSelector = '#repBody > .rep-card, #globalBox > .card, #insightScroller > .card';
  const observed = new WeakSet();
  let observer = null;

  function showAll() {
    document.querySelectorAll('.claude-reveal-pending').forEach(el => {
      el.classList.remove('claude-reveal-pending');
      el.classList.add('claude-reveal-ready');
    });
  }

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.remove('claude-reveal-pending');
        el.classList.add('claude-reveal-ready');
        observer.unobserve(el);
        // Once revealed, release transforms for the existing card hover interaction.
        el.addEventListener('transitionend', () => {
          el.classList.remove('claude-reveal', 'claude-reveal-ready');
          el.style.removeProperty('--claude-reveal-delay');
        }, { once: true });
      });
    }, { threshold: .12, rootMargin: '0px 0px -4% 0px' });
  }

  function bindCardLight(card) {
    if (card.dataset.claudeLightBound) return;
    card.dataset.claudeLightBound = 'true';
    card.classList.add('claude-card-light');
    card.addEventListener('pointermove', event => {
      if (!effectsEnabled()) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--card-light-x', `${(event.clientX - rect.left).toFixed(1)}px`);
      card.style.setProperty('--card-light-y', `${(event.clientY - rect.top).toFixed(1)}px`);
      card.dataset.pointerActive = 'true';
    }, { passive: true });
    card.addEventListener('pointerleave', () => { card.dataset.pointerActive = 'false'; });
  }

  function armContent() {
    document.querySelectorAll(cardSelector).forEach(bindCardLight);
    if (!observer || motion.matches) { showAll(); return; }
    document.querySelectorAll(revealSelector).forEach(el => {
      if (observed.has(el)) return;
      observed.add(el);
      const rect = el.getBoundingClientRect();
      // Above-the-fold content, focus targets and data panels are never hidden.
      if (rect.top < innerHeight * .94 || el.contains(document.activeElement)) return;
      const siblings = [...el.parentElement.children].filter(child => child.matches(revealSelector));
      el.style.setProperty('--claude-reveal-delay', `${Math.min(Math.max(0, siblings.indexOf(el)) * 85, 255)}ms`);
      el.classList.add('claude-reveal', 'claude-reveal-pending');
      observer.observe(el);
      el.addEventListener('focusin', () => {
        el.classList.remove('claude-reveal-pending');
        el.classList.add('claude-reveal-ready');
        observer.unobserve(el);
      }, { once: true });
    });
  }

  // Data renders replace cards after load; watch child lists without touching values.
  const updates = new MutationObserver(armContent);
  ['repBody', 'globalBox', 'insightScroller'].forEach(id => {
    const el = document.getElementById(id);
    if (el) updates.observe(el, { childList: true });
  });
  motion.addEventListener('change', () => {
    if (motion.matches) showAll();
    else armContent();
  });
  armContent();
})();
