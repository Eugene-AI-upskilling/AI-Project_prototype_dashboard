// Blue Current v2: horizontal market/theme cards + card-news scroll timeline.
// Both sections are driven by native scroll (sticky pin) and smoothed with lerp,
// so wheel, trackpad, touch and keyboard all work without scroll-jacking.
import { mountFinanceScenes } from './finance-scenes.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = v => v < .5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2;
const seg = (p, a, b) => ease(clamp((p - a) / (b - a)));
const navH = () => document.querySelector('.site-nav')?.offsetHeight || 76;
// Frame-rate independent smoothing: ~90% of the way in 0.33s.
let smooth = 1;

/* ───────── 시황 · 테마 ───────── */
const pulse = document.querySelector('.pulse');
const pSticky = pulse.querySelector('.pulse-sticky'), track = pulse.querySelector('.pulse-track');
const pCards = [...pulse.querySelectorAll('.pulse-card')], pVisuals = pCards.map(c => c.querySelector('.pulse-visual'));
const pCount = pulse.querySelector('.pulse-count b'), pBar = pulse.querySelector('.pulse-progress');
let maxX = 0, pCur = 0, lastIdx = -1;

function measurePulse() {
  maxX = Math.max(0, track.scrollWidth - pSticky.clientWidth);
  pulse.style.height = `${maxX + pSticky.clientHeight}px`;
}
function pulseTarget() { return maxX ? clamp((navH() - pulse.getBoundingClientRect().top) / maxX) : 0; }
function renderPulse() {
  pCur = lerp(pCur, pulseTarget(), smooth);
  track.style.transform = `translate3d(${(-pCur * maxX).toFixed(2)}px,0,0)`;
  pBar.style.setProperty('--pp', pCur.toFixed(4));
  const mid = innerWidth / 2;
  let idx = 0, best = Infinity;
  pCards.forEach((c, i) => {
    const r = c.getBoundingClientRect(), d = r.left + r.width / 2 - mid;
    if (Math.abs(d) < best) { best = Math.abs(d); idx = i; }
    if (!reduce) pVisuals[i].style.setProperty('--par', `${(d * -.06).toFixed(1)}px`);
  });
  if (idx !== lastIdx) { lastIdx = idx; pCount.textContent = String(idx + 1).padStart(2, '0'); }
}
// Keyboard focus inside an off-screen card: scroll the page to where that card is centred.
track.addEventListener('focusin', e => {
  const card = e.target.closest('.pulse-card, .pulse-more'); if (!card || !maxX) return;
  pSticky.scrollLeft = 0;
  const x = clamp(card.offsetLeft + card.offsetWidth / 2 - pSticky.clientWidth / 2, 0, maxX);
  scrollTo({ top: pulse.getBoundingClientRect().top + scrollY - navH() + x, behavior: reduce ? 'auto' : 'smooth' });
});

mountFinanceScenes([...pulse.querySelectorAll('canvas[data-scene]')], { reduced: reduce });

/* ───────── 카드뉴스 ───────── */
const cn = document.querySelector('.cn');
const cSticky = cn.querySelector('.cn-sticky');
const slides = cn.querySelector('.cn-slides'), dots = [...cn.querySelectorAll('.cn-dots i')];
const tag = cn.querySelector('.cn-tag'), tagStack = cn.querySelector('.cn-tag-stack');
const sideItems = [...cn.querySelectorAll('.cn-side-item')], deskCards = [...cn.querySelectorAll('.cn-desk-grid .cnc')];
const cursors = [...cn.querySelectorAll('.cn-cursor')];
const ruler = cn.querySelector('.cn-ruler');
for (let k = -9; k <= 9; k++) { const s = document.createElement('span'); s.style.setProperty('--k', k); s.textContent = 9 - k; ruler.append(s); }

let cCur = 0, dims = {};
function measureCn() {
  const W = cSticky.clientWidth, H = cSticky.clientHeight, mobile = W <= 680;
  let ph = Math.min(600, H * (mobile ? .64 : .7)), pw = Math.min(mobile ? 250 : 300, (ph - 150) / 1.25 + 28);
  ph = Math.min(ph, 1.25 * (pw - 28) + 172);
  let kw, kh;
  if (mobile) { kw = W - 32; const cw = (kw - 42) / 2; kh = 100 + cw * 2.5; if (kh > H * .74) { kh = H * .74; kw = (kh - 100) / 2.5 * 2 + 42; } }
  else { kw = Math.min(1100, W * .84); kh = 102 + 1.25 * (kw - 104) / 4; if (kh > H * .72) { kh = H * .72; kw = (kh - 102) * 4 / 1.25 + 104; } }
  dims = { W, H, pw, ph, kw, kh };
  cn.style.setProperty('--pw', `${pw}px`); cn.style.setProperty('--ph', `${ph}px`);
  cn.style.setProperty('--kw', `${kw}px`); cn.style.setProperty('--kh', `${kh}px`);
}
// Cursor waypoints, relative to the device centre: start off-screen → around the phone → onto the cards → exit.
function cursorPath(i) {
  const { W, H, pw, ph } = dims;
  return [
    [[-W * .7, -H * .6], [-pw * .98, -ph * .2], [-pw * .22, -ph * .12], [-W * .8, -H * .25]],
    [[W * .7, -H * .55], [pw * .64, -ph * .32], [pw * .18, -ph * .02], [W * .8, -H * .7]],
    [[W * .7, H * .6], [pw * .72, ph * .14], [pw * .5, ph * .3], [W * .8, H * .35]],
    [[-W * .7, H * .55], [-pw * .9, ph * .3], [-pw * .62, ph * .06], [-W * .5, H * .8]],
  ][i];
}
const set = (k, v) => cn.style.setProperty(k, v);
function renderCn(time) {
  const scrollable = cn.offsetHeight - cSticky.clientHeight;
  const target = clamp((navH() - cn.getBoundingClientRect().top) / scrollable);
  cCur = lerp(cCur, target, smooth);
  const p = cCur, { H, pw, ph, kw, kh } = dims;

  // 1) 큰 타이틀 → 2) 그리드와 폰 등장
  set('--title', (1 - seg(p, .05, .16)).toFixed(3));
  set('--grid', seg(p, .08, .2).toFixed(3));
  const rise = seg(p, .07, .24);
  set('--dy', `${((1 - rise) * H * .9).toFixed(1)}px`);
  // 5) 폰 → 데스크톱 아카이브로 변형
  const m = seg(p, .7, .86);
  set('--dw', `${lerp(pw, kw, m).toFixed(1)}px`); set('--dh', `${lerp(ph, kh, m).toFixed(1)}px`); set('--dr', `${lerp(42, 22, m).toFixed(1)}px`);
  set('--phone', (1 - seg(p, .7, .75)).toFixed(3));
  set('--desk', seg(p, .72, .8).toFixed(3));
  deskCards.forEach((c, i) => c.style.setProperty('--o', seg(p, .74 + i * .02, .82 + i * .02).toFixed(3)));
  // 3) 카드 넘김과 태그 전환
  const slide = seg(p, .38, .44) + seg(p, .52, .58);
  slides.style.setProperty('--slide', slide.toFixed(3));
  dots.forEach((d, i) => d.classList.toggle('on', Math.round(slide) === i));
  const ti = slide + seg(p, .72, .8);
  tagStack.style.setProperty('--ti', ti.toFixed(3));
  set('--tag', seg(p, .2, .27).toFixed(3));
  tag.classList.toggle('is-link', ti > 2.6); tag.tabIndex = ti > 2.6 ? 0 : -1;
  set('--side', (seg(p, .26, .34) * (1 - seg(p, .68, .74))).toFixed(3));
  sideItems.forEach((s, i) => s.style.setProperty('--o', clamp(1 - Math.abs(slide - i) * 1.8).toFixed(3)));
  // 4) 협업 커서: 화면 밖 → 폰 주변 → 카드 위 → 퇴장
  cursors.forEach((c, i) => {
    const [S, A, B, E] = cursorPath(i);
    const a = seg(p, .24 + i * .025, .36 + i * .025), b = seg(p, .46 + i * .01, .58 + i * .01), e = seg(p, .66 + i * .012, .76 + i * .012);
    let x = lerp(S[0], A[0], a), y = lerp(S[1], A[1], a);
    x = lerp(x, B[0], b); y = lerp(y, B[1], b);
    x = lerp(x, E[0], e); y = lerp(y, E[1], e);
    if (!reduce) { x += Math.sin(time / 900 + i * 1.7) * 5; y += Math.cos(time / 1100 + i) * 4; }
    c.style.setProperty('--x', `${x.toFixed(1)}px`); c.style.setProperty('--y', `${(y + (1 - rise) * H * .9).toFixed(1)}px`);
  });
}

/* ───────── loop ───────── */
function measure() { measurePulse(); measureCn(); }
measure();
addEventListener('resize', measure);
document.fonts?.ready.then(measure);
let visible = { pulse: true, cn: true };
const io = new IntersectionObserver(es => es.forEach(e => { visible[e.target === pulse ? 'pulse' : 'cn'] = e.isIntersecting; }), { rootMargin: '200px 0px' });
io.observe(pulse); io.observe(cn);
let last = performance.now();
(function loop(time) {
  const dt = Math.min(.1, (time - last) / 1000); last = time;
  smooth = reduce ? 1 : 1 - Math.exp(-dt * 7);
  if (visible.pulse) renderPulse();
  if (visible.cn) renderCn(time);
  requestAnimationFrame(loop);
})(performance.now());
