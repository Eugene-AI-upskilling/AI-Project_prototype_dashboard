(() => {
  'use strict';
  const hero = document.querySelector('.hero--showreel');
  const loop = document.getElementById('heroShowreel');
  const toggle = document.getElementById('heroReelToggle');
  const watch = document.getElementById('heroReelWatch');
  const modal = document.getElementById('showreelModal');
  const full = document.getElementById('fullShowreel');
  const close = document.getElementById('showreelClose');
  if (!hero || !loop || !toggle || !watch || !modal || !full || !close) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = motion.matches;
  let inView = true;
  let modalOpen = false;
  let returnFocus = null;
  let previousOverflow = '';

  function updateToggle() {
    const paused = loop.paused;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? '히어로 쇼릴 재생' : '히어로 쇼릴 일시정지');
    toggle.title = paused ? '쇼릴 재생' : '쇼릴 일시정지';
  }

  function syncPlayback() {
    if (userPaused || !inView || document.hidden || modalOpen) {
      loop.pause();
      updateToggle();
      return;
    }
    loop.play().then(updateToggle).catch(updateToggle);
  }

  // Set this before attempting playback; reduced motion keeps the poster visible.
  loop.autoplay = !motion.matches;
  loop.muted = true;
  if (motion.matches) {
    loop.pause();
    loop.style.visibility = 'hidden';
  }
  const source = loop.querySelector('source[data-src]');
  if (source) {
    source.src = source.dataset.src;
    loop.load();
  }

  toggle.addEventListener('click', () => {
    userPaused = !loop.paused;
    if (!userPaused) loop.style.visibility = '';
    syncPlayback();
  });
  loop.addEventListener('play', updateToggle);
  loop.addEventListener('pause', updateToggle);
  loop.addEventListener('error', updateToggle);

  function openReel() {
    if (modalOpen) return;
    returnFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    modalOpen = true;
    syncPlayback();
    modal.showModal();
    document.body.style.overflow = 'hidden';
    close.focus({ preventScroll: true });
    full.currentTime = 0;
    full.muted = false;
    full.play().catch(() => { /* Native controls remain available if play is blocked. */ });
  }

  function closeReel() {
    if (modal.open) modal.close();
    finishClose();
  }

  function finishClose() {
    if (!modalOpen) return;
    full.pause();
    modalOpen = false;
    document.body.style.overflow = previousOverflow;
    if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
    syncPlayback();
  }

  watch.addEventListener('click', openReel);
  close.addEventListener('click', closeReel);
  modal.addEventListener('cancel', event => {
    event.preventDefault();
    closeReel();
  });
  modal.addEventListener('click', event => {
    if (event.target !== modal) return;
    const box = modal.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeReel();
  });
  modal.addEventListener('close', finishClose);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) full.pause();
    syncPlayback();
  });
  motion.addEventListener('change', event => {
    userPaused = event.matches;
    loop.autoplay = !event.matches;
    if (event.matches) {
      loop.pause();
      loop.currentTime = 0;
      loop.style.visibility = 'hidden';
    } else {
      loop.style.visibility = '';
    }
    syncPlayback();
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      syncPlayback();
    }, { threshold: 0.12 });
    observer.observe(loop);
  }
  window.addEventListener('pagehide', () => { loop.pause(); full.pause(); });
  window.addEventListener('pageshow', syncPlayback);
  syncPlayback();
})();
