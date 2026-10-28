import { mountWave } from './wave-effect.js';

const host = document.getElementById('signal-wave');
const hero = document.querySelector('.signal-hero');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const effect = mountWave(host, {
  bg: '#100b0c', colors: ['#d21f23', '#f74538', '#ff8067'],
  density: 110, mobileDensity: 62, dotSize: 2.35,
  waveHeight: 180, waveLength: 2070, waveSpeed: 100,
  tiltStart: 7, cameraHeight: 53, cursorLift: 175,
  hoverGlow: 200, scrollTilt: 7, scrollHeight: 90
});
// Listen on the hero as well: headline and CTA remain fully interactive, while
// pointer movement above them still reaches the underlying data surface.
for (const name of ['pointermove','pointerdown','pointerleave']) hero.addEventListener(name, e => {
  if (e.target === host || host.contains(e.target)) return;
  host.dispatchEvent(new PointerEvent(name, {clientX:e.clientX,clientY:e.clientY,pointerId:e.pointerId,pointerType:e.pointerType}));
}, {passive:true});
let pending = false;
function updateScroll() {
  pending = false;
  const rect = hero.getBoundingClientRect();
  const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height)));
  effect.setScroll(progress);
  if (!reduced.matches) {
    document.querySelector('.signal-copy').style.transform = `translateY(${-progress * 40}px)`;
    document.querySelector('.signal-copy').style.opacity = `${Math.max(.1, 1 - progress * .75)}`;
  }
}
addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(updateScroll); } }, {passive:true});
addEventListener('resize', updateScroll, {passive:true});
updateScroll();
window.signalField = effect;
const motionSwitch = document.querySelector('.signal-motion');
motionSwitch.addEventListener('click', () => {
  const paused = motionSwitch.getAttribute('aria-pressed') !== 'true';
  effect.setPaused(paused);
  motionSwitch.setAttribute('aria-pressed', String(paused));
  motionSwitch.textContent = paused ? '모션 재생' : '모션 일시정지';
});
