/* hero-data.js — 히어로 시안 공용 데이터 레이어
   index.html과 같은 Supabase 테이블을 읽고, 화면에 내보내면 안 되는 값(null·플레이스홀더·로그인 ID)은 걸러서 돌려준다.
   데이터 자체의 정합성은 db_loader 쪽에서 고칠 문제 — 여기서는 '보여주지 않기'만 담당. */
(function () {
  'use strict';
  const URL_ = 'https://zvnnpwdfeaakhxklcjfk.supabase.co/rest/v1/';
  const LOCAL_VIDEO = '../assets/anchor-briefing.mp4';

  const FALLBACK = {
    market: {
      date: '2026-09-30', kospi: '6,838.04', kospi_chg: '-0.48%', kosdaq: '855.91', kosdaq_chg: '+0.72%',
      usdkrw: '1,350.5', usdkrw_chg: '-0.67%',
      flows: { kospi: { foreign: '-20,650억', inst: '-7,990억', retail: '+12,110억' }, kosdaq: { foreign: '-710억', inst: '+480억', retail: '+190억' } },
      strong: [{ name: '기계·장비', chg: '+1.98%' }, { name: '화학', chg: '+0.83%' }, { name: '금속', chg: '+0.80%' }],
      weak: [{ name: '보험', chg: '-3.27%' }, { name: '금융', chg: '-1.40%' }, { name: '오락·문화', chg: '-1.28%' }]
    },
    globals: [{ name: 'NASDAQ', price: 26861.06, change_pct: 0.24 }, { name: 'S&P 500', price: 7651.54, change_pct: -0.25 }],
    briefings: [
      { kind: 'market', brief_date: '2026-09-30', title: '오늘의 시황 브리핑', script: '안녕하세요. 09.30 시황 브리핑입니다. 코스피는 -0.48%, 코스닥은 +0.72% 마감했습니다. 업종별로는 기계·장비, 화학 등이 강세, 보험, 금융 등이 약세를 보였습니다. 이상 오늘의 시황이었습니다.', video_url: LOCAL_VIDEO, thumbnail_url: null }
    ],
    reports: [], events: []
  };

  /* ── 표시 가드 ── */
  const bad = v => v == null || v === '' || /^(null|none|undefined|-|—)$/i.test(String(v).trim());
  const isLoginId = s => /^[a-z][a-z0-9_]{3,}$/i.test(String(s || '').trim());
  const isPlaceholderTitle = s => /^\[[^\]]+\]\s*리포트\.?$/.test(String(s || '').trim());
  const clean = v => (bad(v) ? null : String(v).trim());
  // 시황 담당자 인사말처럼 대본에 섞여 들어온 메일 문구 제거
  const BOILER = [/안녕하세요,\s*유진투자증권[^.]*입니다\.?/g, /자세한 내용은 자료 참고 부탁드립니다\.?/g];
  const tidyScript = s => BOILER.reduce((a, re) => a.replace(re, ''), String(s || '')).replace(/(\[[^\]]+\]\s*리포트\.\s*)+/g, '').replace(/\s{2,}/g, ' ').trim();

  async function readKey() {
    // 실제 anon 키는 index.html과 동일 — 시안에서는 index.html에서 읽어와 중복 하드코딩을 피한다
    try {
      const html = await (await fetch('../index.html')).text();
      const m = html.match(/SUPABASE_ANON\s*=\s*'([^']+)'/);
      return m ? m[1] : null;
    } catch (e) { return null; }
  }

  window.loadHeroData = async function () {
    const out = JSON.parse(JSON.stringify(FALLBACK)); out.live = false;
    const k = await readKey(); if (!k) return out;
    const H = { apikey: k, Authorization: 'Bearer ' + k };
    const get = p => fetch(URL_ + p, { headers: H }).then(r => r.ok ? r.json() : Promise.reject(r.status));
    const [ms, gi, br, rp, ev] = await Promise.allSettled([
      get('market_snapshot?select=*&order=snapshot_date.desc&limit=1'),
      get('global_indices?select=*'),
      get('ai_briefings?select=*&order=brief_date.desc&limit=6'),
      get('reports?select=*&order=published_at.desc&limit=40'),
      get('events?select=*&order=id.desc&limit=40')
    ]);
    if (ms.status === 'fulfilled' && ms.value[0]) {
      const m = ms.value[0]; out.live = true;
      out.market = {
        date: m.snapshot_date, kospi: m.kospi, kospi_chg: m.kospi_chg, kosdaq: m.kosdaq, kosdaq_chg: m.kosdaq_chg,
        usdkrw: m.usdkrw, usdkrw_chg: m.usdkrw_chg, flows: m.flows || FALLBACK.market.flows,
        strong: m.strong_sectors || [], weak: m.weak_sectors || []
      };
    }
    if (gi.status === 'fulfilled' && gi.value.length) out.globals = gi.value;
    if (br.status === 'fulfilled' && br.value.length) {
      const seen = {}; out.briefings = [];
      br.value.forEach(b => { if (!seen[b.kind] && b.video_url) { seen[b.kind] = 1; out.briefings.push(b); } });
      out.briefings.sort((a, b) => (a.kind === 'market' ? -1 : 1));
    }
    out.briefings.forEach(b => { b.script = tidyScript(b.script); });
    if (rp.status === 'fulfilled') {
      out.reports = rp.value
        .filter(r => clean(r.title) && !isPlaceholderTitle(r.title))
        .map(r => ({
          title: clean(r.title), category: clean(r.category), company: clean(r.company), rating: clean(r.rating),
          tp: clean(r.target_price), analyst: isLoginId(r.analyst) ? null : clean(r.analyst),
          date: clean(r.published_at), tone: r.tone, url: clean(r.url)
        })).slice(0, 4);
    }
    if (ev.status === 'fulfilled') {
      const rank = { High: 0, Mid: 1, Low: 2 };
      out.events = ev.value.filter(e => clean(e.name)).sort((a, b) => (rank[a.signal] ?? 3) - (rank[b.signal] ?? 3))
        .slice(0, 4).map(e => ({ name: e.name, tag: clean(e.surprise) || clean(e.sector), detail: clean(e.detail) ? e.detail.replace(/\s{2,}/g, ' ') : null, date: clean(e.ref_date), tone: e.tone }));
    }
    return out;
  };

  /* ── 공용 유틸 ── */
  window.HD = {
    num: s => parseFloat(String(s).replace(/−/g, '-').replace(/[,%억+]/g, '')),
    dir: s => (/^[-−]/.test(String(s).trim()) ? 'down' : 'up'),
    signed: s => { const t = String(s).trim(); return /^[-−]/.test(t) ? '−' + t.slice(1) : (t.startsWith('+') ? t : '+' + t); },
    pct: v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2) + '%',
    fmt: (v, d = 2) => Number(v).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d }),
    eok: s => { // '-20,650억' → '2.07조' 처럼 읽기 쉬운 단위
      const v = parseFloat(String(s).replace(/[,억+]/g, '')); if (isNaN(v)) return s;
      const a = Math.abs(v); return (v < 0 ? '−' : '+') + (a >= 10000 ? (a / 10000).toFixed(2) + '조' : a.toLocaleString('ko-KR') + '억');
    },
    dateKo: iso => { const d = new Date(iso + 'T00:00:00+09:00'); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${'일월화수목금토'[d.getDay()]}요일`; },
    mmdd: iso => String(iso || '').slice(5).replace('-', '.'),
    session: () => { // KST 기준 장 상태
      const now = new Date(Date.now() + (9 * 60 + new Date().getTimezoneOffset()) * 60000);
      const d = now.getDay(), m = now.getHours() * 60 + now.getMinutes();
      if (d === 0 || d === 6) return { key: 'closed', label: '휴장' };
      if (m < 8 * 60 + 30) return { key: 'pre', label: '장 시작 전' };
      if (m < 9 * 60) return { key: 'pre', label: '동시호가' };
      if (m < 15 * 60 + 30) return { key: 'open', label: '장중' };
      return { key: 'closed', label: '장 마감' };
    },
    sentences: s => String(s || '').split(/(?<=[.?!])\s+/).map(x => x.trim()).filter(Boolean),
    reduced: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };
})();
