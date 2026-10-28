/* ══════════════════════════════════════════════════════════════════════
   home-feed.js — 로그인 후 홈의 기존 홈 섹션 데이터 · 렌더 (index.html 인라인 스크립트에서 해당 부분만 옮김)
   AI 앵커(#anchor) · 리포트 카드뉴스 웹 이펙트(#reports) · 테마 버블(#themes, WM) 렌더 + Supabase 로드.
   스크롤 모션은 assets/v2/v2.js(index와 공용). 공용 헬퍼($ $$ fmt sign toast soon sb)는 partials.js.
   ※ 아래 각 블록은 index.html 원본과 같은 코드다. 수정 시 양쪽을 함께 본다.
   ══════════════════════════════════════════════════════════════════════ */
function openReport(url,title){ if(url){window.open(url,'_blank','noopener');} else {toast('「'+title+'」 원문 링크가 아직 없습니다.');} }
const fmtMD=s=>s?String(s).slice(5).replace('-','.'):'';
let marketData={date:'',ai_summary:''};   // 홈 앵커 자막 기본값(시황 요약 문장은 쓰지 않음 · 브리핑 caption 우선)

/* ───────── 1. RESEARCH REPORTS ───────── */
let reports=[
  {kind:'sector',cat:'반도체',risk:'적극투자',tone:'up',title:'HBM 슈퍼사이클, 아직 2회말입니다',sum:'엔비디아 차세대 GPU 채택 가속 + HBM4 양산 전환. 국내 메모리 3社 수혜 폭 점검.',co:'SK하이닉스',rate:'적극매수',tp:'+22%',a:'김도현',d:'06.13'},
  {kind:'sector',cat:'2차전지',risk:'중립',tone:'up',title:'전기차 캐즘 끝? 하반기 수요 회복 신호',sum:'유럽 보조금 재개와 미국 IRA 수혜로 셀·소재 재고 정상화. 단기 반등은 가능하나 추세 전환은 확인 필요.',co:'에코프로비엠',rate:'중립',tp:'+5%',a:'이서연',d:'06.12'},
  {kind:'macro',cat:'투자전략',risk:'안정',tone:'up',title:'금리 인하기, 고배당주로 갈아탈 시간',sum:'밸류업 공시 기업 중 배당성향 상향 + 자사주 소각 병행 종목 선별. 변동성 방어.',co:'KB금융',rate:'매수',tp:'+11%',a:'박준영',d:'06.11'},
  {kind:'sector',cat:'AI인프라',risk:'적극투자',tone:'up',title:'데이터센터 전력난, 다음 수혜는 전력기기',sum:'AI 학습 전력 수요 폭증 → 변압기·전선 슈퍼사이클. 미국 수출 비중 높은 기업 주목.',co:'HD현대일렉트릭',rate:'적극매수',tp:'+27%',a:'정민수',d:'06.10'},
  {kind:'sector',cat:'바이오',risk:'적극투자',tone:'up',title:'비만치료제 밸류체인, CDMO가 핵심',sum:'GLP-1 수요 폭발로 위탁생산 캐파 부족. 국내 바이오 CDMO 수주 모멘텀 점검.',co:'삼성바이오로직스',rate:'매수',tp:'+16%',a:'한지우',d:'06.09'},
  {kind:'company',cat:'리츠',risk:'안정',tone:'down',title:'리츠, 단기 과열 — 차익 실현 구간',sum:'금리 인하 기대가 선반영되며 밸류에이션 부담 확대. 우량 물류 리츠로 압축, 단기 비중 축소 권고.',co:'ESR켄달스퀘어리츠',rate:'비중축소',tp:'-6%',a:'박준영',d:'06.06'},
];
const REP_GROUPS=[['전체',''],['매크로','macro'],['산업분석','sector'],['기업분석','company']];
let repFilter='';
const rateCls=v=>({'적극매수':'rate--buy','매수':'rate--buy','비중확대':'rate--buy','중립':'rate--hold','비중축소':'rate--reduce','매도':'rate--reduce'})[v]||'rate--hold';
/* 리포트 카드 배경 그림 — 카테고리/제목 키워드로 섹터 모티브 자동 선택.
   데이터가 매일 갱신되면 카테고리·제목이 바뀌므로 그림도 자동으로 함께 바뀜. */
const REP_ICONS={
  chip:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/></svg>',
  battery:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="7" width="16" height="10" rx="2"/><path d="M20 10.5v3"/><rect x="5" y="10" width="8" height="4" rx="1" fill="currentColor" stroke="none"/></svg>',
  building:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 21V6l8-3 8 3v15"/><path d="M9 21v-4h6v4"/><path d="M8 8h2M14 8h2M8 12h2M14 12h2"/></svg>',
  robot:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="8" width="14" height="10" rx="2"/><path d="M12 8V5M9 3h6M3 12v3M21 12v3"/><circle cx="9.5" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13" r="1.2" fill="currentColor" stroke="none"/></svg>',
  bio:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 3c0 5 10 7 10 12M17 3c0 5-10 7-10 12M7 21c0-2 10-4 10-6M17 21c0-2-10-4-10-6"/><path d="M8.5 6h7M8.5 18h7M10 9h4M10 15h4"/></svg>',
  car:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 13l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v5h-2M5 18H3v-5m2 5h2m2 0h6"/><circle cx="7.5" cy="18" r="1.6" fill="currentColor" stroke="none"/><circle cx="16.5" cy="18" r="1.6" fill="currentColor" stroke="none"/></svg>',
  bolt:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
  bag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 7h12l1 13H5z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
  coins:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg>',
  ai:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l2.5 2.5M16.5 16.5 19 19M19 5l-2.5 2.5M7.5 16.5 5 19"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="12" width="4" height="8" rx="1"/><rect x="10" y="7" width="4" height="13" rx="1"/><rect x="17" y="3" width="4" height="17" rx="1"/></svg>',
};
const REP_IMG_BASE='assets/reports/';
function repTheme(r){
  const s=`${r&&r.cat||''} ${r&&r.title||''} ${r&&r.co||''}`;
  const has=(...ks)=>ks.some(k=>s.includes(k));
  let t;   // [아이콘, 이미지파일, 그라데이션 시작, 끝]
  if(has('반도체','파운드리','HBM','소부장','메모리','칩')) t=['chip','semiconductor','#0b2b63','#123a86'];
  else if(has('가상자산','암호화폐','비트코인','코인','블록체인','디지털자산')) t=['coins','crypto','#0b2340','#12457a'];
  else if(has('2차전지','배터리','전지','양극','음극','전해질','셀')) t=['battery','battery','#0d3a2e','#12795a'];
  else if(has('건설','부동산','리츠','시멘트','디벨로퍼','주택')) t=['building','building','#3a1224','#7a1f3d'];
  else if(has('로봇','방산','조선','기계','운송','우주','항공','중공업')) t=['robot','robot','#0d3a4a','#127a86'];
  else if(has('바이오','제약','헬스','치료','신약','CDMO','의료','의약')) t=['bio','bio','#241a3a','#4a2f86'];
  else if(has('자동차','모빌리티','전기차','타이어','완성차')) t=['car','auto','#12233a','#27508a'];
  else if(has('에너지','전력','신재생','태양광','원전','풍력','전선','변압기','수소','LNG')) t=['bolt','energy','#3a2410','#8a5a1f'];
  else if(has('소비','유통','엔터','게임','미디어','콘텐츠','화장품','음식료','음료','면세','관광')) t=['bag','consumer','#3a1230','#7a1f66'];
  else if(has('AI','인공지능','데이터센터','클라우드','소프트웨어','인터넷','플랫폼')) t=['ai','ai','#1a2340','#2f4a8a'];
  else if(has('금융','은행','증권','보험','배당','밸류업','지주')) t=['coins','finance','#0b2340','#12457a'];
  else t=['chart','finance','#1a2530','#2e4a66'];   // 매크로·투자전략·기타
  return {icon:REP_ICONS[t[0]],img:REP_IMG_BASE+t[1]+'.jpg',grad:`linear-gradient(135deg,${t[2]} 0%,${t[3]} 100%)`};
}
function renderRepFilters(){
  $('#repNav').innerHTML=REP_GROUPS.map(([l,k])=>{
    const n=k?reports.filter(r=>r.kind===k).length:reports.length;
    return `<button class="chip rep-chip ${k===repFilter?'is-active':''}" data-k="${k}">${l}<span class="rep-chip__n">${n}</span></button>`;
  }).join('');
  $$('#repNav .rep-chip').forEach(b=>b.onclick=()=>{repFilter=b.dataset.k;renderRepFilters();renderReps();});
}
function renderReps(){
  const list=reports.filter(r=>!repFilter||r.kind===repFilter);
  $('#repBody').innerHTML=list.length?list.map((r,i)=>{const th=repTheme(r);return `
    <article class="rep-card" style="background:${th.grad}" onclick="openReport('${r.url||''}','${(r.title||'').replace(/'/g,'')}')">
      <span class="rep-card__ic" aria-hidden="true">${th.icon}</span>
      <img class="rep-card__img" src="${th.img}" alt="" loading="lazy" onerror="this.remove()">
      <div class="rep-card__top">
        <span class="rep-card__cat">${r.cat||'리포트'}</span>
        ${r.tp?`<span class="rep-card__tp ${r.tone||''}">${r.tp}</span>`:''}
      </div>
      <div class="rep-card__bottom">
        <h3 class="rep-card__ttl">${r.title||''}</h3>
        <div class="rep-card__meta">
          <span class="rep-card__date">${r.d||''}</span>
          ${r.co?`<span class="rep-card__co">${r.co}</span>`:''}
          ${r.rate?`<span class="rate ${rateCls(r.rate)}">${r.rate}</span>`:''}
        </div>
      </div>
    </article>`;}).join(''):'<p class="rep-empty">표시할 리포트가 없습니다.</p>';
}
renderRepFilters();renderReps();


/* ───────── 3. THEME BUBBLE CHART ───────── */
/* size = 자금집중도, color = 1개월 수익률(빨강 과열 ~ 파랑 소외) */
let themes=[
  {n:'AI 반도체',con:9.4,ret:14.2,x:32,y:42},{n:'전력기기',con:6.1,ret:11.0,x:64,y:30},
  {n:'2차전지',con:7.0,ret:-3.2,x:50,y:68},{n:'바이오',con:4.4,ret:6.8,x:80,y:58},
  {n:'방산',con:3.6,ret:8.1,x:18,y:72},{n:'엔터',con:2.8,ret:4.0,x:84,y:80},
  {n:'조선',con:3.2,ret:9.5,x:43,y:22},{n:'금융/배당',con:5.2,ret:2.1,x:74,y:46},
  {n:'로봇',con:2.4,ret:-1.5,x:24,y:24},
];
function retColor(r){ // -6 → blue, +15 → red
  const t=Math.max(0,Math.min(1,(r+6)/21));
  const c1=[49,130,246],c2=[224,52,75];
  const mix=c1.map((v,i)=>Math.round(v+(c2[i]-v)*t));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}
const PASTEL=['rgba(168,218,220,.72)','rgba(241,192,232,.72)','rgba(207,186,240,.72)','rgba(163,196,243,.72)','rgba(144,219,244,.72)','rgba(142,236,245,.72)','rgba(152,216,200,.72)','rgba(247,215,148,.8)'];
let themeConst={}, themeNews={}, curTheme=null, curThemeTab='stock';
const STATE_DESC={Leadership:'자금이 가장 몰린 주도 테마',Acceleration:'모멘텀이 빨라지는 가속 국면',
  Emerging:'새로 부상하는 테마',Crowded:'쏠림이 큰 과열 구간 — 주의',Cooling:'열기가 식는 둔화 국면',Reversal:'바닥에서 반전 시도 구간'};
function renderBubbles(){
  const wrap=$('#bubbleWrap'); if(!wrap)return; wrap.innerHTML='';
  const scale=Math.min(1.05,Math.max(.62,(wrap.clientWidth||620)/640));
  const tip=document.createElement('div');tip.className='bubble-tip';wrap.appendChild(tip);
  // ── 버블 지름 = 1개월 수익률 기준(테마 최소~최대를 실제 크기로 정규화해 차이를 크게) ──
  const rets=themes.map(t=>t.ret), rMin=Math.min(...rets), rMax=Math.max(...rets), rSpan=rMax-rMin||1;
  const D_MIN=58, D_MAX=180; // px @ scale=1
  const diaOf=t=>(D_MIN+((t.ret-rMin)/rSpan)*(D_MAX-D_MIN))*scale;
  const isBig=t=>((t.ret-rMin)/rSpan)>0.55;
  // ── 겹침 방지: 지정 위치를 시작점으로 원 충돌을 반복 완화(relaxation) ──
  const W=wrap.clientWidth||620, H=wrap.clientHeight||440, GAP=-14*scale; // 음수 = 살짝 겹침 허용
  const nodes=themes.map(t=>{const d=diaOf(t); return {r:d/2,x:t.x/100*W,y:t.y/100*H};});
  const clamp=n=>{n.x=Math.max(n.r,Math.min(W-n.r,n.x));n.y=Math.max(n.r,Math.min(H-n.r,n.y));};
  nodes.forEach(clamp);
  for(let it=0;it<120;it++){
    for(let a=0;a<nodes.length;a++)for(let b2=a+1;b2<nodes.length;b2++){
      const A=nodes[a],B=nodes[b2];let dx=B.x-A.x,dy=B.y-A.y;
      let dist=Math.hypot(dx,dy)||.01;const min=A.r+B.r+GAP;
      if(dist<min){const push=(min-dist)/2,ux=dx/dist,uy=dy/dist;
        A.x-=ux*push;A.y-=uy*push;B.x+=ux*push;B.y+=uy*push;clamp(A);clamp(B);}
    }
  }
  themes.forEach((t,i)=>{
    const d=diaOf(t), big=isBig(t);
    const pos=document.createElement('div');pos.className='bubble-pos';
    pos.style.left=nodes[i].x+'px';pos.style.top=nodes[i].y+'px';pos.style.width=pos.style.height=d+'px';
    const b=document.createElement('div');b.className='bubble'+(t.n===curTheme?' sel':'');b.dataset.theme=t.n;
    b.style.background=PASTEL[i%PASTEL.length];b.style.fontSize=((big?13:11)*scale)+'px';
    b.innerHTML=`<span class="bn">${t.n}</span><span class="bv" style="font-size:${((big?12:10)*scale)}px">${sign(t.ret)}%</span>`;
    pos.onmousemove=e=>{const r=wrap.getBoundingClientRect();tip.style.left=(e.clientX-r.left+14)+'px';
      tip.style.top=(e.clientY-r.top+14)+'px';tip.style.opacity=1;
      tip.innerHTML=`<b>${t.n}</b><br/>자금 집중도 ${fmt(t.con,1)}<br/>1개월 수익률 ${sign(t.ret)}%`;};
    pos.onmouseleave=()=>tip.style.opacity=0;
    b.onclick=()=>openThemeDetail(t.n);
    pos.appendChild(b);wrap.appendChild(pos);
  });
  if(!curTheme&&themes[0])openThemeDetail(themes[0].n);
}
function setThemeTab(tab){ curThemeTab=tab; renderThemePanel(); }
function openThemeDetail(name){
  curTheme=name; curThemeTab='stock';
  $$('.bubble').forEach(b=>b.classList.toggle('sel',b.dataset.theme===name));
  renderThemePanel();
}
function relatedReports(name){
  const toks=name.replace(/[·/().]/g,' ').split(/\s+/).filter(w=>w.length>=2);
  return (reports||[]).filter(r=>{const h=`${r.title||''} ${r.cat||''} ${r.co||''}`;return toks.some(x=>h.includes(x));}).slice(0,6);
}
function renderThemePanel(){
  const host=$('#themePanel'); if(!host)return;
  const name=curTheme;
  if(!name){ host.innerHTML='<div class="sub" style="padding:20px 4px">버블을 클릭하면 종목·리포트·뉴스가 표시됩니다.</div>'; return; }
  const t=(themes||[]).find(x=>x.n===name)||{n:name};
  const retCls=v=>v==null?'':(v>=0?'up':'down');
  let inner='';
  if(curThemeTab==='stock'){
    const cons=(themeConst[name]||[]).slice().sort((a,b)=>(b.ret_1d??-999)-(a.ret_1d??-999)).slice(0,12);
    inner=cons.length?cons.map(s=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 2px;border-bottom:1px solid var(--color-hairline)">
        <span style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</span>
        <span class="cn-figure ${retCls(s.ret_1d)}" style="font-weight:700;font-size:13px;flex:0 0 auto">${s.ret_1d==null?'—':sign(s.ret_1d)+'%'}</span>
      </div>`).join('')
      :'<div class="sub" style="padding:14px 4px">구성 종목 데이터 준비 중입니다.</div>';
  }else if(curThemeTab==='report'){
    const reps=relatedReports(name);
    inner=reps.length?reps.map(r=>`<div onclick="openReport('${r.url||''}','${(r.title||'').replace(/'/g,'')}')" style="padding:11px 2px;border-bottom:1px solid var(--color-hairline);cursor:pointer">
      <div style="font-size:var(--text-micro);color:var(--color-muted)">${r.cat||'리포트'}${r.a?' · '+r.a:''}${r.d?' · '+r.d:''}</div>
      <div style="font-weight:700;margin-top:2px;line-height:1.4">${r.title||''}</div></div>`).join('')
      :'<div class="sub" style="padding:14px 4px">이 테마와 직접 연결된 리포트가 아직 없습니다.</div>';
  }else{
    const nw=themeNews[name]||[];
    if(nw.length){
      const sum=nw[0].summary;
      inner=(sum?`<div style="background:var(--surface-tint);border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:12px;line-height:1.6"><b style="color:var(--color-primary)">AI 요약</b> ${sum}</div>`:'')
        +nw.slice(0,8).map(n=>`<a href="${n.url}" target="_blank" rel="noopener" style="display:block;padding:9px 2px;border-bottom:1px solid var(--color-hairline);text-decoration:none;color:inherit">
          <div style="font-weight:600;font-size:13px;line-height:1.4">${n.title}</div>
          <div style="font-size:11px;color:var(--color-muted);margin-top:2px">${n.source||''}${n.pub_date?' · '+n.pub_date:''}</div></a>`).join('');
    }else{
      inner='<div class="sub" style="padding:14px 4px">관련 뉴스를 불러오는 중입니다.</div>';
    }
  }
  host.innerHTML=`
    <div style="font-weight:800;font-size:18px;color:var(--blue-navy)">${name}</div>
    <div style="font-size:var(--text-micro);color:var(--color-muted);margin-top:2px">${STATE_DESC[t.state]||'시장 자금 흐름을 추적하는 테마'}</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 12px">
      ${t.state?`<span class="badge badge--brand">${t.state}</span>`:''}
      ${t.ret!=null?`<span class="badge ${t.ret>=0?'badge--up':'badge--down'} cn-figure">1M ${sign(t.ret)}%</span>`:''}
      ${t.con!=null?`<span class="badge badge--muted cn-figure">집중도 ${fmt(t.con,1)}</span>`:''}
    </div>
    <div class="ptabs">
      <button class="${curThemeTab==='stock'?'on':''}" onclick="setThemeTab('stock')">종목·전일</button>
      <button class="${curThemeTab==='report'?'on':''}" onclick="setThemeTab('report')">리포트</button>
      <button class="${curThemeTab==='news'?'on':''}" onclick="setThemeTab('news')">뉴스</button>
    </div>
    <div style="flex:1;overflow-y:auto;overflow-x:hidden;max-height:300px;margin-top:8px">${inner}</div>`;
}
renderBubbles();

/* ───────── 테마 Long/Short 시그널 (기본값 → DB 있으면 덮어씀) ───────── */
let sigLong=[
  {name:'LG화학',themes:'2차전지 셀 / 2차전지 소재 / 바이오시밀러',n_themes:5},
  {name:'POSCO홀딩스',themes:'2차전지 셀 / 2차전지 소재 / 신재생',n_themes:5},
  {name:'LG전자',themes:'2차전지 셀 / K-콘텐츠 / 휴머노이드',n_themes:4},
  {name:'NAVER',themes:'AI Agent / K-콘텐츠 / 스테이블코인',n_themes:4},
  {name:'현대차',themes:'2차전지 셀 / 방산 / 휴머노이드',n_themes:4},
];
let sigShort=[
  {name:'코스모신소재',themes:'2차전지 셀 / 2차전지 소재',balance_change:'+0.74%p'},
  {name:'주성엔지니어링',themes:'AI 반도체 / 신재생(태양광)',balance_change:'+0.68%p'},
  {name:'코미코',themes:'신재생(태양광)',balance_change:'+0.58%p'},
  {name:'대원전선',themes:'전력기기·송배전',balance_change:'+0.43%p'},
  {name:'하나투어',themes:'면세·관광',balance_change:'+0.42%p'},
];
function renderSignals(){
  const shTh=t=>(t||'').split('/').slice(0,3).map(s=>s.trim()).join(' · ');
  const lb=$('#longBody'), sb2=$('#shortBody');
  if(lb)lb.innerHTML=sigLong.slice(0,5).map(x=>`<tr><td class="co">${x.name}</td><td class="sub">${shTh(x.themes)}</td><td class="num"><span class="badge badge--up cn-figure">${x.n_themes}개 테마</span></td></tr>`).join('');
  if(sb2)sb2.innerHTML=sigShort.slice(0,5).map(x=>`<tr><td class="co">${x.name}</td><td class="sub">${shTh(x.themes)}</td><td class="num"><span class="badge badge--down cn-figure">잔고 ${x.balance_change}</span></td></tr>`).join('');
}
renderSignals();
// 반응형: 리사이즈 시 스케일 재계산 (디바운스)
let bubbleRT;
window.addEventListener('resize',()=>{clearTimeout(bubbleRT);bubbleRT=setTimeout(renderBubbles,150);});


/* ───────── 홈 AI 데일리 브리핑 앵커 (bar) ───────── */
// ElevenLabs(남자 애기 목소리 등)로 생성한 브리핑 mp3 경로.
// 빠른 테스트: 파일을 assets/에 넣고 아래에 'assets/briefing.mp3'처럼 지정.
// 자동화: home_brief 테이블에 audio_url 컬럼을 채우면 그 값이 우선 사용됨.
const HOME_ANCHOR_AUDIO='assets/briefing.mp3';
// HeyGen 아바타 영상(하준 목소리 입힘). 영상이 있으면 음성보다 우선 재생.
const HOME_ANCHOR_VIDEO='assets/anchor-briefing.mp4?v=22';
let homeBrief=null;
function homeFirstSentence(t){ if(!t)return ''; const s=String(t).trim(); const m=s.match(/^[\s\S]*?[.。다](?=\s|$)/); return (m?m[0]:s).trim().slice(0,96); }
function renderHomeAnchor(){
  if(!window.renderAnchor) return;
  const d=marketData;
  const cnt=(typeof reports!=='undefined'&&reports.length)?reports.length:0;
  const base=homeFirstSentence(d.ai_summary);
  const cap=(homeBrief&&homeBrief.caption)
    || (base ? `${base} 이어서 오늘 발간된 리포트${cnt?` ${cnt}건`:''} 요약까지, AI 앵커가 한 번에 브리핑해 드려요.`
             : `오늘의 시황과 오늘 발간된 리포트${cnt?` ${cnt}건`:''}의 핵심을 AI 앵커가 한 번에 브리핑해 드려요.`);
  renderAnchor($('#homeAnchor'),{
    layout:'card', tag:'유진 AI 앵커',
    liveLabel:(d.date?String(d.date).slice(5).replace('-','.'):'')+' 브리핑',
    eyebrow:'DAILY BRIEFING · 시황 + 리포트',
    title:'오늘의 시황과 발간 리포트, AI 앵커가 한 번에 브리핑',
    caption:cap,
    thumbnail:(homeBrief&&homeBrief.thumbnail_url)||null,
    videoUrl:(homeBrief&&homeBrief.video_url)||HOME_ANCHOR_VIDEO||null,   // 영상이 있으면 영상 우선
    audioUrl:(homeBrief&&homeBrief.audio_url)||HOME_ANCHOR_AUDIO||null,   // 없으면 ElevenLabs 음성(mp3) 재생
  });
}
renderHomeAnchor();

/* v2: 테마 버블 — 영역 크기에 맞춰 버블 지름을 자동 축소하고, 서로 겹치지 않게 배치 */
(function(){
  renderBubbles=function(){
    var wrap=document.getElementById('bubbleWrap'); if(!wrap||!themes||!themes.length) return; wrap.innerHTML='';
    var W=wrap.clientWidth||620, H=wrap.clientHeight||440, GAP=6;
    var tip=document.createElement('div'); tip.className='bubble-tip'; wrap.appendChild(tip);
    var rets=themes.map(function(t){return t.ret;}), rMin=Math.min.apply(null,rets), rMax=Math.max.apply(null,rets), span=(rMax-rMin)||1;
    var rel=themes.map(function(t){return .45+.55*((t.ret-rMin)/span);});           // 상대 반지름 0.45~1
    var area=rel.reduce(function(a,r){return a+Math.PI*r*r;},0);
    var unit=Math.min(H*.19, Math.sqrt(.46*W*H/area));                                // 버블들이 영역의 약 46%만 차지
    // 데이터 위치(x,y %)를 영역 전체에 고르게 펴서 한쪽으로 몰리지 않게
    var xs=themes.map(function(t){return t.x;}), ys=themes.map(function(t){return t.y;});
    var x0=Math.min.apply(null,xs), x1=Math.max.apply(null,xs), y0=Math.min.apply(null,ys), y1=Math.max.apply(null,ys);
    var nx=function(v){return .1+.8*((v-x0)/((x1-x0)||1));}, ny=function(v){return .12+.76*((v-y0)/((y1-y0)||1));};
    var nodes=themes.map(function(t,i){return {r:rel[i]*unit, x:nx(t.x)*W, y:ny(t.y)*H};});
    var clamp=function(n){ n.x=Math.max(n.r+2,Math.min(W-n.r-2,n.x)); n.y=Math.max(n.r+2,Math.min(H-n.r-2,n.y)); };
    nodes.forEach(clamp);
    for(var it=0;it<400;it++){ var moved=false;
      for(var a=0;a<nodes.length;a++)for(var b=a+1;b<nodes.length;b++){
        var A=nodes[a],Bn=nodes[b],dx=Bn.x-A.x,dy=Bn.y-A.y,dist=Math.hypot(dx,dy)||.01,min=A.r+Bn.r+GAP;
        if(dist<min){var push=(min-dist)/2,ux=dx/dist,uy=dy/dist;A.x-=ux*push;A.y-=uy*push;Bn.x+=ux*push;Bn.y+=uy*push;clamp(A);clamp(Bn);moved=true;}
      }
      if(!moved) break;
    }
    themes.forEach(function(t,i){
      var n=nodes[i], d=n.r*2, fs=Math.max(10,Math.min(15,n.r*.24));
      var pos=document.createElement('div'); pos.className='bubble-pos';
      pos.style.left=n.x+'px'; pos.style.top=n.y+'px'; pos.style.width=pos.style.height=d+'px';
      var el=document.createElement('div'); el.className='bubble'+(t.n===curTheme?' sel':''); el.dataset.theme=t.n;
      el.style.background=PASTEL[i%PASTEL.length]; el.style.fontSize=fs+'px';
      el.innerHTML='<span class="bn">'+t.n+'</span><span class="bv" style="font-size:'+Math.max(9,fs-1.5)+'px">'+sign(t.ret)+'%</span>';
      pos.onmousemove=function(e){var r=wrap.getBoundingClientRect();tip.style.left=(e.clientX-r.left+14)+'px';tip.style.top=(e.clientY-r.top+14)+'px';tip.style.opacity=1;
        tip.innerHTML='<b>'+t.n+'</b><br/>자금 집중도 '+fmt(t.con,1)+'<br/>1개월 수익률 '+sign(t.ret)+'%';};
      pos.onmouseleave=function(){tip.style.opacity=0;};
      el.onclick=function(){openThemeDetail(t.n);};
      pos.appendChild(el); wrap.appendChild(pos);
    });
    if(!curTheme&&themes[0]) openThemeDetail(themes[0].n);
  };
  renderBubbles();
})();
/* v2: 카드뉴스 이펙트 마지막 아카이브 카드 = 최신 리포트 4건 (클릭 → 원문)
   사진 자동 선택: 제목 키워드 → (없으면) PDF 파일명의 업종코드(GICS, 예: B2510=자동차) → 기업 리포트는 종목코드로 stocks 테이블의 회사명·업종 */
(function(){
  var esc=function(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  var val=function(x){ return (x==null||x==='null'||x==='undefined')?'':String(x).trim(); };
  // 업종코드(GICS) → [표시 이름, repTheme 키워드]
  var GICS={'10':['에너지','에너지'],'1010':['에너지','에너지'],'15':['소재','에너지'],'1510':['화학','2차전지'],'1520':['소재','에너지'],'1540':['철강·금속','에너지'],
    '20':['산업재','기계'],'2010':['자본재','기계'],'2020':['상업서비스','기계'],'2030':['운송','운송'],'2040':['조선·기계','조선'],
    '25':['경기소비재','소비'],'2510':['자동차','자동차'],'2520':['내구소비재','소비'],'2530':['소비자서비스','소비'],'2550':['유통','유통'],
    '30':['필수소비재','소비'],'35':['헬스케어','바이오'],'3510':['의료기기','의료'],'3520':['제약·바이오','바이오'],'40':['금융','금융'],
    '45':['IT','반도체'],'4510':['소프트웨어','소프트웨어'],'4520':['IT하드웨어','반도체'],'4530':['반도체','반도체'],
    '50':['미디어·통신','미디어'],'55':['유틸리티','전력'],'60':['부동산','부동산']};
  // stocks.sector(국문) → repTheme 키워드
  var SECTOR=[[/반도체|IT하드웨어|IT가전|디스플레이/,'반도체'],[/건강|제약|바이오|의료/,'바이오'],[/자동차/,'자동차'],[/화학|2차전지/,'2차전지'],
    [/조선|기계|자본재|운송|상사/,'기계'],[/건설|건축/,'건설'],[/은행|증권|보험|금융/,'금융'],[/에너지|유틸리티|전력/,'에너지'],[/철강|비철|목재/,'에너지'],
    [/소프트웨어|인터넷/,'소프트웨어'],[/미디어|교육|게임|엔터|화장품|소비|유통|호텔|레저|음식/,'소비']];
  var stockInfo={}, baseTheme=repTheme;
  var IMG=function(k){ return REP_IMG_BASE+k+'.jpg'; };
  // 매크로(투자전략) 리포트 주제 → 사진
  var MACRO=[[/FICC|FI Weekly|Fixed Income|채권|금리|국채|크레딧/,'bonds'],[/환율|달러|외환|FX|원\/달러/,'currency'],
    [/China|중국|위안|홍콩|상해|상하이/,'china'],[/Equity|증시|코스피|KOSPI|코스닥|시황|주식|ETF|IPO|악재|반등|조정|천선|아래로|위로|하락|상승|급락|급등|랠리/,'market']];
  function codeOf(r){ var m=/\d{8}_([A-Z]?\d*)_/.exec(r.url||''); return m?m[1]:''; }
  function info(r){
    var code=codeOf(r), label='', kw='', name='';
    if(/^\d{6}$/.test(code)){ var st=stockInfo[code]; if(st){ name=st.name; label=st.sector||''; for(var i=0;i<SECTOR.length;i++) if(SECTOR[i][0].test(st.sector||'')){kw=SECTOR[i][1];break;} } }
    else if(/^B\d+$/.test(code)){ var g=GICS[code.slice(1)]||GICS[code.slice(1,3)]; if(g){ label=g[0]; kw=g[1]; } }
    var th=baseTheme(r);
    if(/finance\.jpg$/.test(th.img)&&kw) th=baseTheme({title:kw});
    // 국내 경제·수출 매크로 리포트 → 서울 스카이라인
    if(/finance\.jpg$/.test(th.img)&&/Korea Economy|수출|국내 경제|GDP|물가/.test(r.title||'')) th={icon:th.icon,img:'assets/hero-skyline.jpg',grad:th.grad};
    if(/finance\.jpg$/.test(th.img)){ for(var j=0;j<MACRO.length;j++) if(MACRO[j][0].test(r.title||'')){ th={icon:th.icon,img:IMG(MACRO[j][1]),grad:th.grad}; break; } }
    var placeholder=/^\s*\[[^\]]+\]\s*리포트\s*$/.test(r.title||'')||!val(r.title);
    var cat=(r.cat||'리포트').replace(/^\[|\]$/g,'');
    var title=placeholder?((name||label)?((name||label)+' '+cat):(cat+' 리포트')):r.title;
    return {th:th,label:name?(name+(label?' · '+label:'')):label,title:title};
  }
  var origRR=renderReps;
  function renderDesk(){
    var cards=document.querySelectorAll('.cn-desk-grid .cnc'); if(!cards.length||!reports.length) return;
    // 최신 40건 중에서 사진이 서로 겹치지 않게 4건 선택(부족하면 최신순으로 채움)
    var pool=reports.slice(0,40), picks=[], seen={};
    pool.forEach(function(r){ if(picks.length<cards.length){ var k=info(r).th.img; if(!seen[k]){ seen[k]=1; picks.push(r); } } });
    pool.forEach(function(r){ if(picks.length<cards.length&&picks.indexOf(r)<0) picks.push(r); });
    picks.sort(function(a,b){ return String(b.d||'').localeCompare(String(a.d||'')); });
    cards.forEach(function(el,i){
      var r=picks[i]; if(!r) return;
      var x=info(r), co=val(r.co);
      el.classList.add('rcn');
      el.setAttribute('role','link'); el.setAttribute('aria-label',x.title+' 원문 보기');
      el.dataset.url=r.url||''; el.dataset.title=(x.title||'').replace(/'/g,'');
      el.innerHTML='<div class="cnc-in">'
        +'<p class="cnc-meta">'+esc(r.cat||'리포트')+(x.label?' · '+esc(x.label):'')+(r.d?' · '+esc(r.d):'')+'</p>'
        +'<h4>'+esc(x.title)+'</h4>'
        +'<div class="rcn-art" style="background:'+x.th.grad+'"><img src="'+x.th.img+'" alt="" loading="lazy" onerror="this.remove()"><span class="rcn-ic" aria-hidden="true">'+x.th.icon+'</span></div>'
        +'<p class="cnc-foot">'+(co?esc(co)+' · ':'')+'원문 보기 →</p>'
        +'</div>';
    });
    // 기업 리포트(종목코드)는 stocks 테이블에서 회사명·업종을 받아 한 번 더 그림
    var need=reports.slice(0,40).map(codeOf).filter(function(c){return /^\d{6}$/.test(c)&&!stockInfo[c];});
    if(need.length&&typeof sb!=='undefined'&&sb){
      sb.from('stocks').select('code,name,sector').in('code',need.map(function(c){return 'A'+c;})).then(function(res){
        (res.data||[]).forEach(function(s){ stockInfo[String(s.code).replace(/^A/,'')]=s; });
        need.forEach(function(c){ if(!stockInfo[c]) stockInfo[c]={name:'',sector:''}; });
        renderReps();
      });
    }
  }
  // 원래 리포트 카드에도 같은 사진 규칙 적용
  repTheme=function(r){ return info(r).th; };
  // 리포트 찾기: 검색어로 걸러서 원래 renderReps로 그림(필터 칩은 원래 그대로)
  var qEl=document.getElementById('homeRepQ'), cntEl=document.getElementById('homeRepCount');
  renderReps=function(){
    var all=reports, q=(qEl&&qEl.value||'').trim().toLowerCase();
    if(q) reports=all.filter(function(r){ return [r.title,r.co,r.cat,r.a].some(function(v){ return String(v||'').toLowerCase().indexOf(q)>=0; }); });
    try{ origRR(); }finally{ reports=all; }
    if(cntEl){ var n=document.querySelectorAll('#repBody .rep-card').length; cntEl.textContent=q?('“'+qEl.value.trim()+'” 검색 결과 '+n+'건'):''; }
    renderDesk();
  };
  if(qEl){ var qT; qEl.addEventListener('input',function(){ clearTimeout(qT); qT=setTimeout(renderReps,160); }); }
  var grid=document.querySelector('.cn-desk-grid');
  if(grid){
    var open=function(el){ openReport(el.dataset.url, el.dataset.title); };
    grid.addEventListener('click',function(e){ var c=e.target.closest('.rcn'); if(c) open(c); });
    grid.addEventListener('keydown',function(e){ var c=e.target.closest('.rcn'); if(c&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); open(c); } });
  }
  renderReps();
})();
/* v2: 오늘 발간 리포트 AI 앵커(리포트 페이지와 같은 ai_briefings kind='reports') */
(function(){
  var brief=null;
  function md(d){ var m=/(\d{4})-(\d{2})-(\d{2})/.exec(d||''); return m?(m[2]+'.'+m[3]):''; }
  function render(){
    var host=document.getElementById('homeReportAnchor'); if(!host||!window.renderAnchor) return;
    var top=(reports||[]).slice().sort(function(a,b){ return String(b.d||'').localeCompare(String(a.d||'')); }).slice(0,5);
    var latest=top[0]&&top[0].d, today=(reports||[]).filter(function(r){ return r.d===latest; }).length;
    renderAnchor(host,{
      layout:'card', tag:'유진 AI 앵커', objectPosition:'center 60%',
      liveLabel:(latest?latest:'')+' 브리핑',
      eyebrow:'AI ANCHOR · 리포트 브리핑', title:(brief&&brief.title)||'오늘의 리포트, AI 앵커가 3분 요약',
      caption:(brief&&brief.caption)||('오늘 발간된 '+today+'개 리포트의 핵심만 모았어요.'),
      thumbnail:(brief&&brief.thumbnail_url)||null, videoUrl:(brief&&brief.video_url)||null,
      chaptersLabel:'오늘 브리핑에 담긴 리포트',
      chapters:top.map(function(r,i){ return {n:i+1,title:r.title,sub:(r.co||r.cat||''),time:Math.floor(i*40/60)+':'+String((i*40)%60).padStart(2,'0')}; })
    });
  }
  var orr=renderReps; renderReps=function(){ orr(); render(); };
  render();
  if(typeof sb!=='undefined'&&sb){
    sb.from('ai_briefings').select('*').eq('kind','reports').order('brief_date',{ascending:false}).limit(1)
      .then(function(res){ if(res.data&&res.data.length){ brief=res.data[0]; render(); } });
  }
})();

/* ───────── 콘텐츠 DB 로드 (홈에 필요한 것만 · 없으면 기본값 유지) ───────── */
(async function loadHomeContent(){
  if(!sb) return;
  try{
    const [rep,th,ts,tc,nw,ab,mk]=await Promise.all([
      sb.from('reports').select('*').order('published_at',{ascending:false}),
      sb.from('themes').select('*').order('id'),
      sb.from('theme_signals').select('*').order('rank'),
      sb.from('theme_constituents').select('*'),
      sb.from('theme_news').select('*').order('rank'),
      sb.from('ai_briefings').select('*').eq('kind','market').order('brief_date',{ascending:false}).limit(1),
      sb.from('market_snapshot').select('snapshot_date').order('snapshot_date',{ascending:false}).limit(1),
    ]);
    if(mk.data&&mk.data.length) marketData.date=mk.data[0].snapshot_date;
    if(ab.data&&ab.data.length) homeBrief=ab.data[0];
    if(rep.data&&rep.data.length){ reports=rep.data.map(r=>({kind:r.kind,cat:r.category,risk:r.risk,tone:r.tone,title:r.title,sum:r.summary,co:r.company,rate:r.rating,tp:r.target_price,a:r.analyst,d:fmtMD(r.published_at),url:r.url})); renderRepFilters(); renderReps(); }
    renderHomeAnchor();
    if(th.data&&th.data.length){ themes=th.data.map(t=>({n:t.name,con:+t.concentration,ret:+t.ret_1m,x:+t.pos_x,y:+t.pos_y,state:t.state})); renderBubbles(); }
    if(ts.data&&ts.data.length){
      const Lg=ts.data.filter(x=>x.side==='long').map(x=>({name:x.name,themes:x.themes,n_themes:x.n_themes}));
      const Sh=ts.data.filter(x=>x.side==='short').map(x=>({name:x.name,themes:x.themes,balance_change:x.balance_change}));
      if(Lg.length)sigLong=Lg; if(Sh.length)sigShort=Sh; renderSignals();
    }
    if(tc.data&&tc.data.length){ const m={}; tc.data.forEach(r=>{ (m[r.theme_name]||(m[r.theme_name]=[])).push({name:r.stock_name,ret_1d:r.ret_1d,ret_1w:r.ret_1w}); }); themeConst=m; if(curTheme)renderThemePanel(); }
    if(nw.data&&nw.data.length){ const m={}; nw.data.forEach(r=>{ (m[r.theme_name]||(m[r.theme_name]=[])).push(r); }); themeNews=m; if(curTheme)renderThemePanel(); }
  }catch(e){ console.warn('home content load failed (keeping defaults)', e); }
})();
