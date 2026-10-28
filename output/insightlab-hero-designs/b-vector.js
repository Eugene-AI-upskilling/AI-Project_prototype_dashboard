import { mountVector } from './vector-effect.js';

const host = document.querySelector('#vector-wordmark');
const effect = mountVector(host, {
  text: 'INSIGHT', background: '#f4f1e9', textColor: '#191815', shade: '#6f6b63',
  accent: '#d21f23', fontFamily: 'Pretendard, Arial, sans-serif', fontWeight: 900,
  fontSize: 278, letterSpacing: '-0.055em', reach: 325, speed: 28, damping: 72,
  handles: { size: 88, spread: 22, labels: true },
});
const hero = document.querySelector('.vector-hero');
const onScroll = () => {
  const rect = hero.getBoundingClientRect();
  effect.setScroll(Math.max(0, Math.min(1, -rect.top / Math.max(1, rect.height))));
};
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('pagehide', () => { effect.destroy(); window.removeEventListener('scroll', onScroll); }, { once: true });
onScroll();
