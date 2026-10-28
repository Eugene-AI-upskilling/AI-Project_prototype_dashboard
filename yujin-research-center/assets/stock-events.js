/* ══════════════════════════════════════════════════════════════════════
   stock-events.js — 종목 이벤트(Event Driven). 예전 events.html의 화면과 로직을 그대로 옮겨
   Research 시황 화면(기관 고객) 안에 넣는다. 국내 = DART 공시, 해외 = 주요기업 실적.
   국내/해외 전환은 페이지가 StockEvents.setRegion('kr'|'global')로 맞춘다 (자체 스위치 없음).
   사용: <div id="stockEvents"></div> + StockEvents.mount(document.getElementById('stockEvents'))
   CSS: assets/stock-events.css · 공용 헬퍼($ $$ toast sb getUser onAuth openAuth)는 partials.js
   ══════════════════════════════════════════════════════════════════════ */
window.StockEvents=(function(){
  'use strict';
  const MARKUP=`<!-- ═══ 해외: 실적 결과 / 발표 일정 ═══ -->
  <section class="section" id="glPane" style="padding:0;display:none">
    <div class="wrap">
      <div class="tabs" id="glTabs">
        <button data-g="result" class="is-active">실적 결과</button>
        <button data-g="schedule">발표 일정</button>
      </div>
      <p class="gl-desc" id="glDesc"></p>
      <div class="chip-row" id="glFilters" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px"></div>
      <div class="ev-stat" id="glStat"></div>
      <div class="card" style="margin-top:14px" id="glResultCard"><div class="card__body" style="padding:8px 8px 4px">
        <div class="tbl-scroll"><table class="tbl ev-tbl"><thead>
          <tr><th>종목</th><th>섹터</th><th class="num">발표일</th><th class="num">EPS (실제 / 컨센)</th><th class="num">서프라이즈</th><th></th></tr>
        </thead><tbody id="glBody"></tbody></table></div>
      </div></div>
      <div class="card" style="margin-top:14px;display:none" id="glSchedCard"><div class="card__body">
        <div class="cal" id="glCal"></div>
      </div></div>
      <p class="sub" style="color:var(--color-muted);margin-top:10px;font-size:var(--text-micro)">해외 커버리지 종목 기준 · 신고가·섹터 흐름은 <a href="global.html" style="color:var(--blue-cta)">해외 증시</a>에서 확인하세요.</p>
    </div>
  </section>

  <!-- ═══ 국내: 탭 + 필터 + 이벤트 테이블 ═══ -->
  <section class="section kr-only" style="padding:0">
    <div class="wrap">
      <div class="tabs" id="evTabs">
        <button data-ev="action" class="is-active">코퍼레이트 액션</button>
        <button data-ev="earnings">어닝 서프라이즈</button>
      </div>

      <div class="ev-filters">
        <div class="ev-frow" id="fMarketRow"><span class="lbl">시장</span><span id="fMarket" style="display:flex;gap:8px;flex-wrap:wrap"></span></div>
        <div class="ev-frow"><span class="lbl" id="fSectorLbl">유형</span><span id="fSector" style="display:flex;gap:8px;flex-wrap:wrap"></span></div>
        <div class="ev-frow"><span class="lbl">기간</span><span id="fPeriod" style="display:flex;gap:8px;flex-wrap:wrap"></span></div>
      </div>

      <div class="ev-stat" id="evStat"></div>

      <div class="card" style="margin-top:14px"><div class="card__body" style="padding:8px 8px 4px">
        <div class="tbl-scroll"><table class="tbl ev-tbl"><thead id="evHead"></thead><tbody id="evBody"></tbody></table></div>
      </div></div>
    </div>
  </section>

  <!-- 다가오는 이벤트 캘린더 -->
  <section class="section kr-only" style="padding:28px 0 0">
    <div class="wrap">
      <div class="sec-head">
        <div class="sec-eyebrow"><span class="dot"></span>UPCOMING</div>
        <h2 class="sec-title" style="font-size:var(--text-title)">다가오는 이벤트 캘린더</h2>
        <p class="sec-sub">실적 발표 · 배당락 · 주주총회 등 예정된 일정을 D-day로 확인하세요.</p>
      </div>
      <div class="grid-2" style="align-items:start">
        <div class="card"><div class="card__body">
          <div class="rep__top"><span class="badge badge--brand">예정 일정</span><span class="badge badge--muted" id="calAsof">이번 달</span></div>
          <div class="ev-cal" id="evCal" style="margin-top:8px"></div>
        </div></div>
        <div class="card"><div class="card__body" style="display:flex;flex-direction:column">
          <div class="rep__top"><span class="badge badge--point">이벤트 알림</span></div>
          <h3 style="font-size:var(--text-lg);font-weight:700;margin:8px 0 8px">새 공시가 뜨면 바로 알려드려요</h3>
          <p style="color:var(--color-body);line-height:1.7;font-size:var(--text-body)">관심 이벤트(자사주·배당·분할·실적 서프라이즈)의 신규 DART 공시를 이메일로 받아보세요. 로그인만 하면 1초면 끝나요.</p>
          <div style="flex:1"></div>
          <button class="btn btn--primary btn--block" id="alertBtn" style="margin-top:16px" onclick="registerAlert('event-alerts','종목 이벤트')">이벤트 알림 등록</button>
        </div></div>
      </div>
    </div>
  </section>

  <!-- 상세 모달 -->
<div class="ev-overlay" id="evOverlay" aria-hidden="true">
  <div class="ev-modal" role="dialog" aria-modal="true" aria-labelledby="evmTtl" id="evModal"></div>
</div>

`;
  let api=null;
  function mount(HOST){
    if(!HOST||api) return api;
    HOST.classList.add('se-host');
    HOST.innerHTML=MARKUP;
    /* ═════════ 종목 이벤트 페이지 데이터 & 렌더 ═════════ */

    /* action 폴백 (Supabase 없거나 결과 비면) — 홈 #events 목업과 동일 규약 */
    const DEFAULT_ACTIONS=[
      {kind:'action',ticker:'005930',name:'삼성전자',sector:'자사주',detail:'주요사항보고서(자기주식취득결정) 발행주식 3.2조원 규모 소각',ref_date:'06.20',surprise:'수급 개선',tone:'up',signal:'High'},
      {kind:'action',ticker:'005490',name:'POSCO홀딩스',sector:'배당',detail:'현금·현물배당결정 특별배당 주당 5,000원 (시가배당 1.3%)',ref_date:'06.28',surprise:'배당 매력',tone:'up',signal:'Medium'},
      {kind:'action',ticker:'035420',name:'NAVER',sector:'분할',detail:'회사분할결정 웹툰 사업부 인적분할 상장 추진',ref_date:'07.15',surprise:'가치 재평가',tone:'up',signal:'High'},
      {kind:'action',ticker:'068270',name:'셀트리온',sector:'액면분할',detail:'주식분할결정 5,000원→500원 (10:1)',ref_date:'07.01',surprise:'거래 활성화',tone:'up',signal:'Medium'},
      {kind:'action',ticker:'097950',name:'CJ제일제당',sector:'유상증자',detail:'유상증자결정 시설투자 목적 4,000억',ref_date:'06.25',surprise:'단기 희석',tone:'down',signal:'High'},
    ];

    /* 다가오는 이벤트 — TODO: 실데이터 연결 (events 미래 ref_date 또는 corp_calendar 등). 현재는 예시 */
    const UPCOMING=[
      {date:'2026-07-08',name:'삼성전자',kind:'실적발표',detail:'2분기 잠정실적 발표 예정'},
      {date:'2026-07-10',name:'POSCO홀딩스',kind:'컨퍼런스콜',detail:'2분기 실적 컨퍼런스콜'},
      {date:'2026-07-15',name:'NAVER',kind:'주주총회',detail:'웹툰 인적분할 승인 임시주총'},
      {date:'2026-07-21',name:'SK하이닉스',kind:'실적발표',detail:'2분기 확정실적 발표'},
      {date:'2026-07-31',name:'KOSPI 200',kind:'배당락',detail:'반기 배당락일'},
    ];

    /* ── 유틸 ── */
    const cleanDetail=s=>String(s||'').replace(/\s+/g,' ').replace(/^\[[^\]]*\]\s*/,'').trim();
    const toneCls=t=>t==='down'?'down':'up';
    const toneBadge=t=>t==='down'?'badge--down':'badge--up';
    function parseRefDate(s){
      const m=String(s||'').match(/(\d{1,2})[.\-\/](\d{1,2})/); if(!m) return null;
      const now=new Date(); const d=new Date(now.getFullYear(),+m[1]-1,+m[2]);
      if(d-now>86400000*2) d.setFullYear(now.getFullYear()-1);   // 미래로 튀면 작년으로
      return d;
    }
    function daysAgo(s){ const d=parseRefDate(s); return d?Math.round((Date.now()-d)/86400000):null; }
    function ddayOf(iso){ const d=new Date(iso+'T00:00:00'); const t=new Date(); t.setHours(0,0,0,0);
      return Math.round((d-t)/86400000); }
    /* 결정적 의사난수 (ticker 시드) — 새로고침해도 동일 차트 */
    function hashStr(str){ let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); } return h>>>0; }
    function seeded(seed){ let s=seed>>>0||1; return ()=>{ s=(Math.imul(s,1664525)+1013904223)>>>0; return s/4294967296; }; }

    /* ── 상태 ── */
    let ROWS=DEFAULT_ACTIONS.slice();          // 전체 원본 (action + earnings)
    let earningsLoaded=false;                    // DB에 earnings가 실제로 들어왔는지
    const state={ tab:'action', market:'전체', sector:'전체', period:'전체' };

    const tabRows=tab=>ROWS.filter(r=>(r.kind==='earnings'?'earnings':'action')===tab);
    function marketsOf(rows){ return [...new Set(rows.map(r=>r.market).filter(Boolean))]; }
    function sectorsOf(rows){ return [...new Set(rows.map(r=>r.sector).filter(Boolean))]; }

    function applyFilters(rows){
      return rows.filter(r=>{
        if(state.market!=='전체' && r.market!==state.market) return false;
        if(state.sector!=='전체' && r.sector!==state.sector) return false;
        if(state.period!=='전체'){ const d=daysAgo(r.ref_date); const lim=state.period==='7일'?7:30;
          if(d==null||d>lim) return false; }
        return true;
      });
    }

    /* ── 필터 칩 렌더 ── */
    function chip(label,active){ return `<button class="chip${active?' is-active':''}" data-v="${label}">${label}</button>`; }
    function renderFilters(){
      const rows=tabRows(state.tab);
      // 시장: 실데이터에 market 컬럼이 없으면 시장 필터 행 숨김(허수 필터 방지)
      const mkts=marketsOf(rows);
      const mkRow=$('#fMarketRow');
      if(mkts.length>=1){ mkRow.style.display='';
        $('#fMarket').innerHTML=['전체',...mkts].map(m=>chip(m,state.market===m)).join(''); }
      else { mkRow.style.display='none'; state.market='전체'; }
      // 유형(sector). earnings 탭에서는 '업종'으로 라벨 변경
      $('#fSectorLbl').textContent = state.tab==='earnings' ? '업종' : '유형';
      const secs=sectorsOf(rows);
      $('#fSector').innerHTML=['전체',...secs].map(s=>chip(s,state.sector===s)).join('');
      // 기간
      $('#fPeriod').innerHTML=['전체','7일','30일'].map(p=>chip(p==='전체'?'전체':('최근 '+p), (state.period===p))).join('');
      // 칩 → 값 매핑(라벨 텍스트에서 역추출)
      $$('#fMarket .chip').forEach(b=>b.onclick=()=>{ state.market=b.dataset.v; renderFilters(); renderTable(); });
      $$('#fSector .chip').forEach(b=>b.onclick=()=>{ state.sector=b.dataset.v; renderFilters(); renderTable(); });
      $$('#fPeriod .chip').forEach(b=>b.onclick=()=>{ const v=b.dataset.v; state.period= v==='전체'?'전체':(v.includes('7')?'7일':'30일'); renderFilters(); renderTable(); });
    }

    /* ── 통계 라인 ── */
    function renderStat(list){
      const up=list.filter(r=>r.tone!=='down').length, down=list.length-up;
      $('#evStat').innerHTML = list.length
        ? `<span>총 <b>${list.length}</b>건</span><span>긍정 효과 <b class="up">${up}</b></span><span>부정 효과 <b class="down">${down}</b></span>`
        : '';
    }

    /* ── 이벤트 테이블 ── */
    let VIEW=[];   // 현재 화면에 렌더된 필터링 결과 (모달 인덱스 기준)
    function renderTable(){
      const isEarn=state.tab==='earnings';
      VIEW=applyFilters(tabRows(state.tab));
      renderStat(VIEW);
      const head=isEarn
        ? ['종목','발표 실적','컨센서스','서프라이즈','당일 주가']
        : ['종목','유형','공시 내용','기준일','효과',''];
      const al=isEarn?[0,1,1,1,1]:[0,0,0,1,1,1];
      $('#evHead').innerHTML='<tr>'+head.map((h,i)=>`<th class="${al[i]?'num':''}">${h}</th>`).join('')+'</tr>';

      if(!VIEW.length){
        const msg = isEarn
          ? '어닝 서프라이즈 데이터를 준비 중입니다. 실적 시즌에 DART 공시로 실시간 업데이트됩니다.'
          : '조건에 맞는 이벤트가 없습니다. 필터를 조정해 보세요.';
        $('#evBody').innerHTML=`<tr><td colspan="${head.length}"><div class="ev-empty">${msg}</div></td></tr>`;
        return;
      }
      if(isEarn){
        $('#evBody').innerHTML=VIEW.map((r,i)=>`<tr data-i="${i}">
          <td><div class="co">${r.name}</div><div class="sub">${r.sector||''}</div></td>
          <td class="num co cn-figure">${r.actual||'—'}</td>
          <td class="num sub cn-figure">${r.consensus||'—'}</td>
          <td class="num ${toneCls(r.tone)} cn-figure" style="font-weight:700">${r.surprise||'—'}</td>
          <td class="num ${toneCls(r.tone)} cn-figure" style="font-weight:700">${r.price_move||'—'}</td>
        </tr>`).join('');
      }else{
        $('#evBody').innerHTML=VIEW.map((r,i)=>`<tr data-i="${i}">
          <td><div class="co"><span class="ev-sig ev-sig--${r.signal||'Low'}" title="신호 강도 ${r.signal||'—'}"></span>${r.name}</div>
              <div class="sub">${r.ticker||''}</div></td>
          <td><span class="badge badge--brand">${r.sector||'기타'}</span></td>
          <td class="detail">${cleanDetail(r.detail)}</td>
          <td class="num sub cn-figure">${r.ref_date||''}</td>
          <td class="num"><span class="badge ${toneBadge(r.tone)}">${r.surprise||'—'}</span></td>
          <td class="num chev">›</td>
        </tr>`).join('');
      }
      $$('#evBody tr[data-i]').forEach(tr=>tr.onclick=()=>openDetail(VIEW[+tr.dataset.i]));
    }

    /* ── 이벤트 후 주가 반응 미니차트 (인라인 SVG, ticker 시드) ── */
    function reactionSVG(r){
      const W=320,H=120,PAD=10, N=9;                 // D0 ~ D+8
      const rnd=seeded(hashStr((r.ticker||r.name||'x')+'|'+(r.tone||'')));
      const drift=(r.tone==='down'?-1:1)*(0.6+rnd()*0.9);
      const vals=[100]; for(let i=1;i<N;i++){ vals.push(vals[i-1]+drift+(rnd()-0.5)*2.4); }
      const min=Math.min(...vals), max=Math.max(...vals), span=(max-min)||1;
      const x=i=>PAD+i*(W-PAD*2)/(N-1);
      const y=v=>H-PAD-((v-min)/span)*(H-PAD*2);
      const pts=vals.map((v,i)=>[x(i),y(v)]);
      const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
      const area=line+` L ${x(N-1).toFixed(1)} ${H-PAD} L ${x(0).toFixed(1)} ${H-PAD} Z`;
      const col=r.tone==='down'?'#143f96':'#e0344b';
      const chg=((vals[N-1]-100)).toFixed(1), chgTxt=(chg>=0?'+':'')+chg+'%';
      return {svg:`<svg class="ev-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="이벤트 후 8일 주가 반응 ${chgTxt}">
        <defs><linearGradient id="evg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${col}" stop-opacity=".22"/><stop offset="1" stop-color="${col}" stop-opacity="0"/>
        </linearGradient></defs>
        <line x1="${PAD}" y1="${y(100).toFixed(1)}" x2="${W-PAD}" y2="${y(100).toFixed(1)}" stroke="#dde4eb" stroke-width="1" stroke-dasharray="3 3"/>
        <path d="${area}" fill="url(#evg)"/>
        <path d="${line}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
        <circle cx="${x(N-1).toFixed(1)}" cy="${y(vals[N-1]).toFixed(1)}" r="3.4" fill="${col}"/>
      </svg>`, chgTxt, col};
    }

    /* ── 상세 모달 ── */
    let lastFocus=null;
    function openDetail(r){
      if(!r) return;
      const hist=ROWS.filter(x=>x.ticker&&x.ticker===r.ticker) ; // 동일 종목 이벤트 이력
      const items=(hist.length?hist:[r]);
      const chart=reactionSVG(r);
      const tl=items.map(e=>`<div class="ev-tl__item">
          <span class="ev-tl__dot" style="background:${e.tone==='down'?'#143f96':'#e0344b'}"></span>
          <div style="flex:1;min-width:0">
            <div class="ev-tl__d">${e.ref_date||''} · ${e.sector||'이벤트'}</div>
            <div class="ev-tl__t">${e.surprise||'—'}</div>
            <div class="ev-tl__s">${cleanDetail(e.detail)||'상세 내용이 없습니다.'}</div>
          </div></div>`).join('');
      const modal=$('#evModal');
      modal.innerHTML=`
        <div class="ev-modal__head">
          <div>
            <div class="ev-modal__ttl" id="evmTtl">${r.name}</div>
            <div class="ev-modal__tk">${r.ticker?r.ticker+' · ':''}${r.sector||''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="badge ${toneBadge(r.tone)}">${r.surprise||'—'}</span>
            <button class="auth-x" aria-label="닫기" onclick="closeDetail()">×</button>
          </div>
        </div>

        <div class="mk-lbl">이벤트 후 8일 주가 반응 <span class="${toneCls(r.tone)} cn-figure" style="font-weight:800">${chart.chgTxt}</span></div>
        ${chart.svg}
        <div class="ev-chart__cap"><span>공시일 (D)</span><span>D+8</span></div>
        <div class="sub" style="font-size:11px;color:var(--color-muted);margin-top:2px">※ 예시 반응 곡선입니다. 실제 체결 데이터 연동 시 실주가로 대체됩니다.</div>

        <div class="mk-lbl">이벤트 이력</div>
        <div class="ev-tl">${tl}</div>

        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn--secondary" style="flex:1" onclick="registerAlert('event:${r.ticker||r.name}','${r.name}')">이 종목 알림</button>
          <a class="btn btn--primary" style="flex:1" href="reports.html">관련 리포트 →</a>
        </div>`;
      const ov=$('#evOverlay');
      lastFocus=document.activeElement;
      ov.classList.add('show'); ov.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
      document.addEventListener('keydown',modalKey);
      setTimeout(()=>{ const x=modal.querySelector('.auth-x'); if(x)x.focus(); },40);
    }
    function closeDetail(){
      const ov=$('#evOverlay'); ov.classList.remove('show'); ov.setAttribute('aria-hidden','true');
      document.body.style.overflow=''; document.removeEventListener('keydown',modalKey);
      if(lastFocus&&lastFocus.focus)lastFocus.focus();
    }
    function modalKey(e){
      if(e.key==='Escape'){ closeDetail(); return; }
      if(e.key==='Tab'){ const f=$$('#evModal a[href],#evModal button:not([disabled])'); if(!f.length)return;
        const first=f[0],last=f[f.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();} }
    }
    window.closeDetail=closeDetail;
    $('#evOverlay').addEventListener('click',e=>{ if(e.target===$('#evOverlay')) closeDetail(); });

    /* ── 다가오는 이벤트 캘린더 ── */
    function renderCalendar(){
      const list=UPCOMING.map(u=>({...u,dd:ddayOf(u.date)})).filter(u=>u.dd>=0).sort((a,b)=>a.dd-b.dd);
      $('#evCal').innerHTML = list.length ? list.map(u=>{
        const ddTxt = u.dd===0?'D-DAY':('D-'+u.dd);
        const md = u.date.slice(5).replace('-','.');
        const badgeCls = u.dd<=3?'badge--point':'badge--muted';
        return `<div class="ev-cal__row">
          <div class="ev-cal__d">
            <div class="dday" style="color:${u.dd<=3?'var(--color-primary)':'var(--ink-800)'}">${ddTxt}</div>
            <div class="date">${md}</div>
          </div>
          <div class="ev-cal__b"><div class="t">${u.name}</div><div class="s">${u.detail}</div></div>
          <span class="badge ${badgeCls}">${u.kind}</span>
        </div>`;
      }).join('') : '<div class="ev-empty">예정된 이벤트가 없습니다.</div>';
    }

    /* ── 이벤트 알림 등록 (로그인 게이트) ── */
    async function registerAlert(channel,label){
      const u=getUser();
      if(!u){ toast('로그인 후 알림을 등록할 수 있어요.'); openAuth('login'); return; }
      if(!sb){ toast('연결 오류로 등록하지 못했어요.'); return; }
      try{
        const {error}=await sb.from('subscriptions').upsert(
          {user_id:u.id, channel, channel_url:null}, {onConflict:'user_id,channel'});
        toast(error ? ('등록 실패: '+error.message) : `'${label}' 이벤트 알림을 등록했어요. 새 공시가 뜨면 알려드릴게요.`);
      }catch(e){ toast('등록 중 오류가 발생했어요.'); }
    }
    window.registerAlert=registerAlert;
    /* 로그인 상태 반영 — 알림 버튼 라벨 */
    onAuth(u=>{ const b=$('#alertBtn'); if(b) b.textContent = u ? '이벤트 알림 등록 ✓' : '이벤트 알림 등록'; });

    /* ── 탭 스위치 ── */
    $$('#evTabs button').forEach(b=>b.onclick=()=>{
      state.tab=b.dataset.ev; state.market='전체'; state.sector='전체'; state.period='전체';
      $$('#evTabs button').forEach(x=>x.classList.toggle('is-active',x===b));
      renderFilters(); renderTable();
    });

    /* ═════════ 해외: 실적 결과 / 발표 일정 (global_quotes) ═════════ */
    let gQuotes=[
      {ticker:'ORCL',name:'Oracle',sector:'AI 관련주',last_earnings_date:'2026-09-09',next_earnings_date:'2026-12-09',eps:1.47,eps_estimate:1.48,eps_surprise:-0.68},
      {ticker:'FDX', name:'FedEx',sector:'운송',last_earnings_date:'2026-09-17',next_earnings_date:'2026-12-16',eps:3.83,eps_estimate:3.59,eps_surprise:6.69},
      {ticker:'MU',  name:'Micron Technology',sector:'반도체',last_earnings_date:'2026-09-23',next_earnings_date:'2026-12-17',eps:3.03,eps_estimate:2.86,eps_surprise:5.94},
      {ticker:'NKE', name:'Nike',sector:'소비재',last_earnings_date:'2026-09-30',next_earnings_date:'2026-12-18',eps:0.49,eps_estimate:0.27,eps_surprise:81.48},
      {ticker:'JPM', name:'JPMorgan Chase',sector:'금융',last_earnings_date:'2026-07-14',next_earnings_date:'2026-10-14',eps:5.24,eps_estimate:4.48,eps_surprise:16.96},
      {ticker:'GE',  name:'GE Aerospace',sector:'산업재',last_earnings_date:'2026-07-17',next_earnings_date:'2026-10-21',eps:1.66,eps_estimate:1.43,eps_surprise:16.08},
      {ticker:'TSLA',name:'Tesla',sector:'자동차 관련주',last_earnings_date:'2026-07-22',next_earnings_date:'2026-10-21',eps:0.40,eps_estimate:0.43,eps_surprise:-6.98},
      {ticker:'INTC',name:'Intel',sector:'반도체',last_earnings_date:'2026-07-23',next_earnings_date:'2026-10-23',eps:-0.10,eps_estimate:0.01,eps_surprise:null},
      {ticker:'GOOGL',name:'Alphabet',sector:'빅테크 7',last_earnings_date:'2026-07-23',next_earnings_date:'2026-10-27',eps:2.31,eps_estimate:2.18,eps_surprise:5.96},
      {ticker:'MSFT',name:'Microsoft',sector:'빅테크 7',last_earnings_date:'2026-07-29',next_earnings_date:'2026-10-28',eps:3.65,eps_estimate:3.37,eps_surprise:8.31},
      {ticker:'META',name:'Meta Platforms',sector:'빅테크 7',last_earnings_date:'2026-07-29',next_earnings_date:'2026-10-28',eps:7.14,eps_estimate:5.92,eps_surprise:20.61},
      {ticker:'AAPL',name:'Apple',sector:'빅테크 7',last_earnings_date:'2026-07-30',next_earnings_date:'2026-10-29',eps:1.57,eps_estimate:1.43,eps_surprise:9.79},
      {ticker:'AMZN',name:'Amazon',sector:'빅테크 7',last_earnings_date:'2026-07-30',next_earnings_date:'2026-10-29',eps:1.68,eps_estimate:1.33,eps_surprise:26.32},
      {ticker:'NVDA',name:'NVIDIA',sector:'빅테크 7',last_earnings_date:'2026-08-27',next_earnings_date:'2026-11-19',eps:1.05,eps_estimate:1.01,eps_surprise:3.96},
    ];
    /* 컨콜 요약 (global_research kind='callsummary') — ticker가 정확히 일치할 때만 노출 */
    let CALLSUMMARIES=[];
    const gl={ view:'result', sector:'전체', all:false };
    const GL_LIMIT=15;   // Research 화면 안에서는 15종목만 먼저 보이고 '전체 보기'로 펼친다
    const dday=s=>s?ddayOf(s):null;
    const fmtSp=v=>v==null?'—':(v>=0?'+':'')+Number(v).toFixed(1)+'%';

    function glRenderFilters(){
      const secs=[...new Set(gQuotes.map(q=>q.sector).filter(Boolean))];
      $('#glFilters').innerHTML=['전체',...secs].map(s=>chip(s,gl.sector===s)).join('');
      $$('#glFilters .chip').forEach(b=>b.onclick=()=>{ gl.sector=b.dataset.v; gl.all=false; glRenderFilters(); glRender(); });
    }
    function glRender(){
      const base=gQuotes.filter(q=>gl.sector==='전체'||q.sector===gl.sector);
      const isRes=gl.view==='result';
      $('#glResultCard').style.display=isRes?'':'none';
      $('#glSchedCard').style.display=isRes?'none':'';
      $('#glDesc').textContent=isRes
        ? '최근 발표된 실적을 컨센서스와 비교합니다. 종목을 누르면 AI 실적 요약과 컨퍼런스콜 요약이 열립니다.'
        : '발표일이 가까운 순서로 정리했습니다. 실적 발표 전후 변동성에 대비하세요.';
      if(isRes){
        const list=base.filter(q=>q.last_earnings_date).sort((a,b)=>b.last_earnings_date.localeCompare(a.last_earnings_date));
        const beat=list.filter(q=>q.eps_surprise!=null&&q.eps_surprise>=0).length, miss=list.filter(q=>q.eps_surprise!=null&&q.eps_surprise<0).length;
        $('#glStat').innerHTML=list.length?`<span>총 <b>${list.length}</b>종목</span><span>컨센서스 상회 <b class="up">${beat}</b></span><span>하회 <b class="down">${miss}</b></span>`:'';
        const shown=gl.all?list:list.slice(0,GL_LIMIT);
    $('#glBody').innerHTML=list.length?shown.map(q=>{
          const sp=q.eps_surprise;
          return `<tr onclick="openGlDetail('${q.ticker}')">
            <td><div class="co">${q.ticker}</div><div class="sub">${(q.name||'').slice(0,22)}</div></td>
            <td><span class="badge badge--brand">${q.sector||'—'}</span></td>
            <td class="num sub cn-figure">${q.last_earnings_date.slice(5).replace('-','.')}</td>
            <td class="num sub cn-figure">${q.eps??'—'} / ${q.eps_estimate??'—'}</td>
            <td class="num cn-figure ${sp==null?'':(sp>=0?'up':'down')}" style="font-weight:700">${fmtSp(sp)}</td>
            <td class="num chev">›</td></tr>`;
        }).join(''):`<tr><td colspan="6"><div class="ev-empty">발표된 실적이 없습니다.</div></td></tr>`;
        if(list.length>GL_LIMIT){ $('#glBody').insertAdjacentHTML('beforeend',`<tr class="se-more"><td colspan="6" style="text-align:center;padding:12px"><button type="button" class="btn btn--text" id="glMore">${gl.all?'접기':`전체 ${list.length}종목 보기`}</button></td></tr>`);
          $('#glMore').onclick=e=>{ e.stopPropagation(); gl.all=!gl.all; glRender(); }; }
      }else{
        const fut=base.filter(q=>q.next_earnings_date&&dday(q.next_earnings_date)>=0)
          .sort((a,b)=>a.next_earnings_date.localeCompare(b.next_earnings_date));
        $('#glStat').innerHTML=fut.length?`<span>예정 <b>${fut.length}</b>종목</span><span>7일 이내 <b class="up">${fut.filter(q=>dday(q.next_earnings_date)<=7).length}</b></span>`:'';
        const byDate={}; fut.forEach(q=>(byDate[q.next_earnings_date]||(byDate[q.next_earnings_date]=[])).push(q));
        const dates=Object.keys(byDate).sort().slice(0,10), wd=['일','월','화','수','목','금','토'];
        $('#glCal').innerHTML=dates.length?dates.map(dt=>{
          const d=new Date(dt+'T00:00:00'), n=dday(dt);
          return `<div class="cal__day">
            <div class="cal__date"><span class="d">${dt.slice(5).replace('-','.')} (${wd[d.getDay()]})</span>
              <span class="badge ${n<=3?'badge--point':'badge--muted'}" style="align-self:flex-start">${n===0?'D-DAY':'D-'+n}</span></div>
            <div class="cal__list">${byDate[dt].map(q=>`<button class="cal__pill" onclick="openGlDetail('${q.ticker}')">
              <span class="tk">${q.ticker}</span><span class="nm">${(q.name||'').slice(0,14)}</span></button>`).join('')}</div></div>`;
        }).join(''):'<div class="ev-empty">예정된 실적 일정이 없습니다.</div>';
      }
    }
    function openGlDetail(tk){
      const q=gQuotes.find(x=>x.ticker===tk); if(!q)return;
      const sp=q.eps_surprise, n=dday(q.next_earnings_date);
      const call=CALLSUMMARIES.find(c=>c.ticker===q.ticker);
      const ai = sp==null
        ? `${q.ticker}의 직전 실적은 컨센서스와 비교 가능한 수치가 없습니다. 다음 발표 직후 AI 요약이 업데이트됩니다.`
        : `직전 분기 EPS ${q.eps}(컨센서스 ${q.eps_estimate})로 컨센서스를 ${Math.abs(sp).toFixed(1)}% ${sp>=0?'상회':'하회'}했습니다. ${sp>=0?'실적 모멘텀이 유효한 구간입니다.':'눈높이 하향 여부와 가이던스를 함께 점검할 필요가 있습니다.'}`;
      const row=(l,v,cls)=>`<tr><td class="sub">${l}</td><td class="num co cn-figure ${cls||''}">${v}</td></tr>`;
      $('#evModal').innerHTML=`
        <div class="ev-modal__head">
          <div><div class="ev-modal__ttl" id="evmTtl">${q.ticker}</div><div class="ev-modal__tk">${q.name||''} · ${q.sector||''}</div></div>
          <div style="display:flex;align-items:center;gap:10px">
            ${sp!=null?`<span class="badge ${sp>=0?'badge--up':'badge--down'}">${sp>=0?'컨센서스 상회':'컨센서스 하회'}</span>`:''}
            <button class="auth-x" aria-label="닫기" onclick="closeDetail()">×</button>
          </div>
        </div>
        <div class="mk-lbl">AI 실적 요약</div>
        <p style="font-size:var(--text-body);color:var(--color-body);line-height:1.65;margin:0">${ai}</p>
        <table class="tbl" style="margin-top:14px"><tbody>
          ${row('직전 실적 발표',q.last_earnings_date||'—')}
          ${row('EPS (실제 / 컨센서스)',`${q.eps??'—'} / ${q.eps_estimate??'—'}`)}
          ${row('EPS 서프라이즈',fmtSp(sp),sp==null?'':(sp>=0?'up':'down'))}
          ${row('다음 실적 발표',(q.next_earnings_date||'—')+(n!=null&&n>=0?` <span class="badge badge--point">D-${n}</span>`:''))}
        </tbody></table>
        ${call&&call.points.length?`<div class="mk-lbl">컨퍼런스콜 요약 <span class="badge badge--point">AI</span></div>
          <ul class="gq-points">${call.points.map(p=>`<li>${p}</li>`).join('')}</ul>`:''}
        <div style="display:flex;gap:10px;margin-top:20px">
          <button class="btn btn--secondary" style="flex:1" onclick="registerAlert('earnings:${q.ticker}','${q.ticker} 실적')">실적 발표 알림</button>
          <a class="btn btn--primary" style="flex:1" href="global.html">해외 증시 →</a>
        </div>`;
      const ov=$('#evOverlay'); lastFocus=document.activeElement;
      ov.classList.add('show'); ov.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
      document.addEventListener('keydown',modalKey);
      setTimeout(()=>{ const x=$('#evModal .auth-x'); if(x)x.focus(); },40);
    }
    window.openGlDetail=openGlDetail;
    $$('#glTabs button').forEach(b=>b.onclick=()=>setGlView(b.dataset.g));
    function setGlView(v){
      gl.view=v==='schedule'?'schedule':'result';
      $$('#glTabs button').forEach(x=>x.classList.toggle('is-active',x.dataset.g===gl.view));
      glRender();
    }

    /* ── 지역 스위치 (URL ?region=global&view=schedule 지원) ── */
    function setRegion(r){
      const g=r==='global';
      HOST.classList.toggle('is-global',g);
      $('#glPane').style.display=g?'':'none';
      $$('#regionSw button').forEach(x=>{ const on=x.dataset.r===(g?'global':'kr'); x.classList.toggle('is-active',on); x.setAttribute('aria-selected',on); });
    }

    /* ── 초기 렌더 ── */
    renderFilters(); renderTable(); renderCalendar();
    glRenderFilters(); glRender();


    /* ── 해외 실적 Supabase 로드 ── */
    (async function loadGlobal(){
      if(!window.sb) return;
      try{
        const [gq,gr]=await Promise.all([
          sb.from('global_quotes').select('*'),
          sb.from('global_research').select('*').eq('kind','callsummary'),
        ]);
        if(gr.data&&gr.data.length) CALLSUMMARIES=gr.data.filter(r=>r.ticker).map(r=>({ticker:r.ticker,points:(r.body&&r.body.points)||[]}));
        if(gq.data&&gq.data.length){ gQuotes=gq.data.map(r=>({...r,eps_surprise:r.eps_surprise==null?null:+r.eps_surprise})); glRenderFilters(); glRender(); }
      }catch(e){ console.warn('global earnings load failed (keeping defaults)', e); }
    })();

    /* ── Supabase 로드 (있으면 덮어씀) ── */
    (async function loadEvents(){
      if(!window.sb) return;
      try{
        const {data,error}=await sb.from('events').select('*').order('ref_date',{ascending:false}).order('id');
        if(error) throw error;
        if(data&&data.length){
          const norm=data.map(r=>Object.assign({},r,{kind:(r.kind==='earnings'?'earnings':'action')}));
          const acts=norm.filter(r=>r.kind==='action');
          const earns=norm.filter(r=>r.kind==='earnings');
          earningsLoaded=earns.length>0;
          // action이 실제로 있으면 폴백 대체, 없으면 목업 유지
          ROWS = (acts.length?acts:DEFAULT_ACTIONS.slice()).concat(earns);
          renderFilters(); renderTable();
          console.log('events loaded from Supabase:', data.length);
        }
      }catch(e){ console.warn('events load failed (keeping defaults)', e); }
    })();
    api={setRegion};
    return api;
  }
  return { mount, setRegion:r=>api&&api.setRegion(r) };
})();
