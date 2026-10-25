// index-v2: 시황·테마 가로 카드 / AI 앵커 소개 / 카드뉴스 타임라인 / 퀀트 스튜디오 전환.
// 모두 네이티브 스크롤(sticky) 진행도에 시간 기반 lerp를 걸어 움직입니다 — 스크롤 하이재킹 없음.
// 페이지에 있는 섹션만 동작합니다(홈 전체, 서브 화면에는 카드뉴스 효과만 넣어도 됨).
const noop = () => {};
let measurePulse = noop, renderPulse = noop, renderAnc = noop, measureCn = noop, renderCn = noop, renderQg = noop;

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobileMQ = matchMedia('(max-width: 680px)');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = v => v < .5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2;
const seg = (p, a, b) => ease(clamp((p - a) / (b - a)));
const nav = document.querySelector('.nav');
const navH = () => nav?.offsetHeight || 64;
let smooth = 1;
const syncNavH = () => document.documentElement.style.setProperty('--nav-h', `${navH()}px`);

/* ───────── 실데이터 → 시황 카드 (원래 renderMarket 데이터 그대로) ───────── */
const noDec = v => (v == null ? '—' : String(v).replace(/\.\d+/, ''));
function chg(el, c) {
  if (!el) return;
  if (c == null || c === '') { el.textContent = ''; return; }
  const s = String(c).trim(), down = s.startsWith('-');
  el.className = down ? 'down' : 'up';
  el.textContent = `${down ? '▼' : '▲'} ${s.replace(/^[+-]/, '')}`;
}
function fillLive(data) {
  if (!data) return;
  const d = data.market || {}, ex = data.extra || {};
  const set = (k, v, c) => { const dd = document.querySelector(`[data-live="${k}"]`); if (!dd) return; dd.firstChild.textContent = `${noDec(v)} `; chg(dd.querySelector('em'), c); };
  set('kospi', d.kospi, d.kospi_chg);
  set('kosdaq', d.kosdaq, d.kosdaq_chg);
  const fk = d.flows?.kospi?.foreign ?? d.foreign_net;
  set('foreign', fk == null ? '—' : (String(fk).includes('억') ? fk : `${fk}억`), null);
  set('usdkrw', d.usdkrw, d.usdkrw_chg);
  if (ex.nasdaq) set('nasdaq', ex.nasdaq.v, ex.nasdaq.c);
  if (ex.sp500) set('sp500', ex.sp500.v, ex.sp500.c);
  const ov = (data.global || []).find(g => g.kind === 'overnight');
  const ovEl = document.querySelector('[data-live="overnight"]'); if (ov && ovEl) ovEl.textContent = ov.title;
  const asof = document.querySelector('.pulse-asof');
  if (asof) asof.textContent = d.date ? `${String(d.date).replace(/-/g, '.')} 종가 기준` : (d.asof || '');
}
fillLive(window.__v2data);
addEventListener('v2:data', e => fillLive(e.detail));

/* ───────── 시황 · 테마 ───────── */
const pulse = document.querySelector('.pulse');
if (pulse) {
const pSticky = pulse.querySelector('.pulse-sticky'), track = pulse.querySelector('.pulse-track');
const pCards = [...pulse.querySelectorAll('.pulse-card')], pVisuals = pCards.map(c => c.querySelector('.pulse-visual'));
const pCount = pulse.querySelector('.pulse-count b'), pTotal = pulse.querySelector('.pulse-count span'), pBar = pulse.querySelector('.pulse-progress');
let maxX = 0, pCur = 0, lastIdx = -1;
if (pTotal) pTotal.textContent = String(pCards.length).padStart(2, '0');
measurePulse = function () {
  if (mobileMQ.matches) { maxX = 0; pulse.style.height = ''; track.style.transform = ''; return; }
  maxX = Math.max(0, track.scrollWidth - pSticky.clientWidth);
  // 끝에 0.4화면 분량 멈춤: 마지막 카드(테마)가 화면에 꽉 찬 상태로 머무름
  pulse.style.height = `${maxX + pSticky.clientHeight * 1.4}px`;
}
renderPulse = function () {
  if (mobileMQ.matches) return;
  const target = maxX ? clamp((navH() - pulse.getBoundingClientRect().top) / maxX) : 0;
  pCur = lerp(pCur, target, smooth);
  track.style.transform = `translate3d(${(-pCur * maxX).toFixed(2)}px,0,0)`;
  pBar.style.setProperty('--pp', pCur.toFixed(4));
  const mid = innerWidth / 2;
  let idx = 0, best = Infinity;
  pCards.forEach((c, i) => {
    const r = c.getBoundingClientRect(), d = r.left + r.width / 2 - mid;
    if (Math.abs(d) < best) { best = Math.abs(d); idx = i; }
    if (!reduce && pVisuals[i]) pVisuals[i].style.setProperty('--par', `${(d * -.06).toFixed(1)}px`);
  });
  if (idx !== lastIdx) { lastIdx = idx; pCount.textContent = String(idx + 1).padStart(2, '0'); }
}
// 화면 밖 카드로 키보드 포커스가 가면, 그 카드가 가운데 오도록 페이지를 스크롤
track.addEventListener('focusin', e => {
  const card = e.target.closest('.pulse-card, .pulse-more'); if (!card || !maxX) return;
  pSticky.scrollLeft = 0;
  const x = clamp(card.offsetLeft + card.offsetWidth / 2 - pSticky.clientWidth / 2, 0, maxX);
  scrollTo({ top: pulse.getBoundingClientRect().top + scrollY - navH() + x, behavior: reduce ? 'auto' : 'smooth' });
});
import('./finance-scenes.js?v=2').then(m => m.mountFinanceScenes([...pulse.querySelectorAll('canvas[data-scene]')], { reduced: reduce }));
}

/* ───────── AI 앵커 소개 ───────── */
const anc = document.querySelector('.anc');
if (anc) {
new IntersectionObserver(es => es.forEach(e => e.isIntersecting && anc.classList.add('is-in')), { threshold: .25 }).observe(anc);
renderAnc = function () {
  const r = anc.getBoundingClientRect(), vh = innerHeight;
  anc.style.setProperty('--ap', (reduce ? 1 : ease(clamp((vh - r.top) / (vh * .75)))).toFixed(3));
};
}

/* ───────── 카드뉴스 ───────── */
const cn = document.querySelector('.cn');
if (cn) {
const cSticky = cn.querySelector('.cn-sticky');
const slides = cn.querySelector('.cn-slides'), dots = [...cn.querySelectorAll('.cn-dots i')];
const tag = cn.querySelector('.cn-tag'), tagStack = cn.querySelector('.cn-tag-stack');
const sideItems = [...cn.querySelectorAll('.cn-side-item')];
const deskCards = () => [...cn.querySelectorAll('.cn-desk-grid .cnc')];   // 카드가 나중에 다시 그려져도 따라가도록 매번 조회
const cursors = [...cn.querySelectorAll('.cn-cursor')];
const ruler = cn.querySelector('.cn-ruler');
for (let k = -9; k <= 9; k++) { const s = document.createElement('span'); s.style.setProperty('--k', k); s.textContent = 9 - k; ruler.append(s); }
let cCur = 0, dims = {};
measureCn = function () {
  const W = cSticky.clientWidth, H = cSticky.clientHeight, mobile = W <= 680;
  let ph = Math.min(760, H * (mobile ? .7 : .8)), pw = Math.min(mobile ? 290 : 380, W - 48, (ph - 150) / 1.25 + 28);
  ph = Math.min(ph, 1.25 * (pw - 28) + 172);
  let kw, kh;
  if (mobile) { kw = W - 32; const cw = (kw - 42) / 2; kh = 100 + cw * 2.5; if (kh > H * .74) { kh = H * .74; kw = (kh - 100) / 2.5 * 2 + 42; } }
  else { kw = Math.min(1100, W * .84); kh = 102 + 1.25 * (kw - 104) / 4; if (kh > H * .72) { kh = H * .72; kw = (kh - 102) * 4 / 1.25 + 104; } }
  dims = { W, H, pw, ph, kw, kh };
  cn.style.setProperty('--pw', `${pw}px`); cn.style.setProperty('--ph', `${ph}px`);
}
// 커서 경로(기기 중심 기준): 화면 밖 → 폰 주변 → 카드 위 → 퇴장
function cursorPath(i) {
  const { W, H, pw, ph } = dims;
  return [
    [[-W * .7, -H * .6], [-pw * .98, -ph * .2], [-pw * .22, -ph * .12], [-W * .8, -H * .25]],
    [[W * .7, -H * .55], [pw * .64, -ph * .32], [pw * .18, -ph * .02], [W * .8, -H * .7]],
    [[W * .7, H * .6], [pw * .72, ph * .14], [pw * .5, ph * .3], [W * .8, H * .35]],
    [[-W * .7, H * .55], [-pw * .9, ph * .3], [-pw * .62, ph * .06], [-W * .5, H * .8]],
  ][i];
}
const cset = (k, v) => cn.style.setProperty(k, v);
renderCn = function (time) {
  const target = clamp((navH() - cn.getBoundingClientRect().top) / (cn.offsetHeight - cSticky.clientHeight));
  cCur = lerp(cCur, target, smooth);
  const p = cCur, { H, pw, ph, kw, kh } = dims;
  cset('--title', (1 - seg(p, .05, .16)).toFixed(3));
  cset('--grid', seg(p, .08, .2).toFixed(3));
  const rise = seg(p, .07, .24);
  cset('--dy', `${((1 - rise) * H * .9).toFixed(1)}px`);
  const m = seg(p, .7, .86);
  cset('--dw', `${lerp(pw, kw, m).toFixed(1)}px`); cset('--dh', `${lerp(ph, kh, m).toFixed(1)}px`); cset('--dr', `${lerp(42, 22, m).toFixed(1)}px`);
  cset('--phone', (1 - seg(p, .7, .75)).toFixed(3));
  const desk = seg(p, .72, .8);
  cset('--desk', desk.toFixed(3));
  const live = desk > .9;
  if (live !== cn.classList.contains('desk-live')) { cn.classList.toggle('desk-live', live); deskCards().forEach(c => c.tabIndex = live ? 0 : -1); }
  deskCards().forEach((c, i) => c.style.setProperty('--o', seg(p, .74 + i * .02, .82 + i * .02).toFixed(3)));
  const slide = seg(p, .38, .44) + seg(p, .52, .58);
  slides.style.setProperty('--slide', slide.toFixed(3));
  dots.forEach((d, i) => d.classList.toggle('on', Math.round(slide) === i));
  const ti = slide + seg(p, .72, .8);
  tagStack.style.setProperty('--ti', ti.toFixed(3));
  cset('--tag', seg(p, .2, .27).toFixed(3));
  tag.classList.toggle('is-link', ti > 2.6); tag.tabIndex = ti > 2.6 ? 0 : -1;
  cset('--side', (seg(p, .26, .34) * (1 - seg(p, .68, .74))).toFixed(3));
  sideItems.forEach((s, i) => s.style.setProperty('--o', clamp(1 - Math.abs(slide - i) * 1.8).toFixed(3)));
  cursors.forEach((c, i) => {
    const [S, A, B, E] = cursorPath(i);
    const a = seg(p, .24 + i * .025, .36 + i * .025), b = seg(p, .46 + i * .01, .58 + i * .01), e = seg(p, .66 + i * .012, .76 + i * .012);
    let x = lerp(S[0], A[0], a), y = lerp(S[1], A[1], a);
    x = lerp(x, B[0], b); y = lerp(y, B[1], b);
    x = lerp(x, E[0], e); y = lerp(y, E[1], e);
    if (!reduce) { x += Math.sin(time / 900 + i * 1.7) * 5; y += Math.cos(time / 1100 + i) * 4; }
    c.style.setProperty('--x', `${x.toFixed(1)}px`); c.style.setProperty('--y', `${(y + (1 - rise) * H * .9).toFixed(1)}px`);
  });
};
}

/* ───────── 퀀트 스튜디오 전환 ───────── */
const qg = document.querySelector('.qg');
if (qg) {
const qSticky = qg.querySelector('.qg-sticky'), chips = [...qg.querySelectorAll('.qg-chip')];
const qCount = [...qg.querySelectorAll('[data-count]')];
(function buildCurve() {
  // 결정적 랜덤워크: 전략선이 벤치마크를 꾸준히 이기는 10년 누적수익 곡선(시안용)
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const N = 120, a = [], b = []; let va = 0, vb = 0;
  for (let i = 0; i <= N; i++) { va += .9 + (rnd() - .46) * 7; vb += .35 + (rnd() - .5) * 5; a.push(va); b.push(vb); }
  const lo = Math.min(...a, ...b), hi = Math.max(...a, ...b), X = i => (i / N) * 1200, Y = v => 480 - ((v - lo) / (hi - lo)) * 440;
  const path = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  qg.querySelector('.qg-line').setAttribute('d', path(a));
  qg.querySelector('.qg-bench').setAttribute('d', path(b));
  qg.querySelector('.qg-area').setAttribute('d', `${path(a)} L1200 500 L0 500 Z`);
})();
let qCur = 0;
renderQg = function () {
  const target = clamp((navH() - qg.getBoundingClientRect().top) / (qg.offsetHeight - qSticky.clientHeight));
  qCur = lerp(qCur, target, smooth);
  const p = qCur;
  qg.style.setProperty('--draw', seg(p, .02, .5).toFixed(3));
  qg.style.setProperty('--q', seg(p, .2, .4).toFixed(3));
  chips.forEach((c, i) => c.style.setProperty('--o', (seg(p, .12 + i * .045, .24 + i * .045) * (1 - seg(p, .62, .7))).toFixed(3)));
  qCount.forEach(el => { const v = +el.dataset.count * seg(p, .2, .45); el.textContent = Number.isInteger(+el.dataset.count) ? Math.round(v) : v.toFixed(1); });
  qg.style.setProperty('--iris', seg(p, .6, .9).toFixed(3));
  qg.style.setProperty('--done', seg(p, .82, .95).toFixed(3));
  qg.querySelector('.qg-iris').inert = p < .85;
};
}

/* ───────── loop ───────── */
// 창 크기가 바뀌면 원래 버블 차트를 새 크기로 다시 배치 (예전 크기로 계산된 버블이 잘리지 않게)
let bubbleT, bubbleSize = '';
function rebubble() {
  const w = document.getElementById('bubbleWrap'); if (!w || typeof window.renderBubbles !== 'function') return;
  const size = `${w.clientWidth}x${w.clientHeight}`; if (size === bubbleSize) return;
  bubbleSize = size; window.renderBubbles();
  if (window.__bubblesShown) w.querySelectorAll('.bubble.pop-init').forEach(b => b.classList.remove('pop-init'));
}
function measure() { syncNavH(); measurePulse(); measureCn(); clearTimeout(bubbleT); bubbleT = setTimeout(rebubble, 150); }
measure();
addEventListener('resize', measure);
mobileMQ.addEventListener('change', measure);
addEventListener('v2:relayout', () => requestAnimationFrame(measure));
document.fonts?.ready.then(measure);
const vis = new Map();
const io = new IntersectionObserver(es => es.forEach(e => vis.set(e.target, e.isIntersecting)), { rootMargin: '300px 0px' });
[pulse, anc, cn, qg].filter(Boolean).forEach(el => { vis.set(el, true); io.observe(el); });
let last = performance.now();
(function loop(time) {
  // 프레임이 느려도(저사양·3D 부하) 진행도가 즉시 따라오도록 dt 상한을 넉넉히
  const dt = Math.min(.35, (time - last) / 1000); last = time;
  smooth = reduce ? 1 : 1 - Math.exp(-dt * 7);
  if (pulse && vis.get(pulse)) renderPulse();
  if (anc && vis.get(anc)) renderAnc();
  if (cn && vis.get(cn)) renderCn(time);
  if (qg && vis.get(qg)) renderQg();
  requestAnimationFrame(loop);
})(performance.now());
