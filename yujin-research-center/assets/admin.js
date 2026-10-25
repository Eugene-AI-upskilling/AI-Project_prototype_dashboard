/* ══════════════════════════════════════════════════════════════════════
   admin.js — 리서치 관리자(애널리스트 검수) 화면
   로컬 서버가 있으면 실데이터(검수 큐 · AI 초안 · 재검토 · 상담 · 지표), 없으면 예시 데이터.
   ══════════════════════════════════════════════════════════════════════ */
(async function(){
  'use strict';
  const $=(s,e=document)=>e.querySelector(s), $$=(s,e=document)=>[...e.querySelectorAll(s)], E=IL.esc;
  function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2600);}
  const live = !!(await ILAPI.ready());
  const PLABEL={am:'법인 · 자산운용사',ia:'법인 · 투자자문사',dma:'법인 · DMA 전문투자자',hnw:'WM · 고액자산가'};
  const who=p=>{const P=IL.PERSONAS[p];return P?`${P.name} · ${P.org}`:p;};
  const ago=t=>{ if(!t) return ''; const m=Math.max(0,Math.round((Date.now()/1000-t)/60)); return m<60?`${m}분`:`${Math.floor(m/60)}시간 ${m%60}분`; };

  /* ───────── 공통: 메뉴 전환 · 행사 표 · 가입 승인 ───────── */
  function show(v){ const b=$(`.ad-link[data-v="${v}"]`); if(!b) return;
    $$('.ad-link').forEach(x=>x.classList.toggle('on',x===b));
    $$('.ad-view').forEach(s=>s.classList.toggle('on',s.dataset.view===v));
    $('#vTitle').textContent=[...b.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
    history.replaceState(null,'','#'+v); window.scrollTo({top:0});
    if(live && LOAD[v]) LOAD[v](); }
  const cap={e1:[46,60,'라운지 38 · 영업 초대 8'],e2:[48,80,'라운지 31 · PB 초대 17'],e3:[12,40,'라운지 12'],e4:[30,30,'라운지 22 · 대기 6']};
  $('#evRows').innerHTML=IL.EVENTS.map(e=>`<tr><td class="t">${e.date} (${e.dow})</td><td><div class="t">${E(e.title)}</div><div class="s">${E(e.host)} · ${E(e.fmt)}</div></td><td>${e.who}</td><td class="num">${cap[e.id][0]} / ${cap[e.id][1]}</td><td class="s">${cap[e.id][2]}</td></tr>`).join('');

  /* ───────── 예시 모드 ───────── */
  const MQ=[
    { id:'r1', q:'HBM 공급 과잉 우려, 내년까지 이어질까?', who:'김민준 · 한빛자산운용(가상)', seg:'법인 · 자산운용사', wait:'2시간 10분', warn:true, topic:'반도체',
      sum:'공급 과잉 우려는 내년 상반기까지 일부 이어질 수 있으나, 고객사 인증 일정상 하반기 수급은 균형에 가까워질 것으로 봅니다.',
      fact:'주요 업체들의 HBM 증설 계획이 상향됐습니다. (S5 p.7)', view:'증설분이 실제 출하로 이어지는 시점은 고객 인증 이후라 공급 과잉은 제한적이라고 봅니다. (S5 p.8)',
      counter:'AI 서버 투자 속도가 늦어지면 재고가 늘 수 있습니다. (S2 p.2)',
      cites:[['S5 p.7 · 증설 계획 문장','ok'],['S5 p.8 · 인증 일정 문장','ok'],['S2 p.2 · 재고 일수 문장','bad']],
      flags:[['매매 권유 표현 없음',true],['기준일 · 출처 표기',true],['수치 원문 일치',false]] },
    { id:'r3', q:'DMA 수수료 체계가 어떻게 되나요?', who:'박지훈 · 개인 전문투자자(가상)', seg:'법인 · DMA 전문투자자', wait:'40분', topic:'서비스 문의', route:'리서치 질문이 아닙니다 → DMA 데스크로 이관 권장',
      sum:'서비스 조건 문의라 AI가 답하지 않고 DMA 데스크로 연결합니다.', cites:[], flags:[['리서치 범위 밖 질문',false]] },
  ];
  let msel=MQ[0].id;
  function mockQueue(){
    $('#queue').innerHTML=MQ.map(x=>`<div class="ad-q${x.id===msel?' on':''}" data-q="${x.id}" tabindex="0" role="button"><div class="ad-q__t">${E(x.q)}</div>
      <div class="ad-q__m"><span class="ad-pill">${E(x.topic)}</span><span>${E(x.seg)}</span><span class="ad-sla${x.warn?' warn':''}">대기 ${E(x.wait)}</span>${x.route?'<span class="lx-st lx-st--hold">이관 권장</span>':''}</div></div>`).join('')||'<div class="ad-panel__b lx-muted">검수할 질문이 없습니다.</div>';
    $('#nReview').textContent=MQ.length; $('#kReview').innerHTML=`${MQ.length}<small>건</small>`;
    const x=MQ.find(y=>y.id===msel); if(!x){ $('#draft').innerHTML='<p class="lx-muted">검수할 질문이 없습니다.</p>'; return; }
    const ta=(l,v)=>`<div class="ad-box"><h4>${l}</h4><textarea rows="2">${E(v)}</textarea></div>`;
    $('#draft').innerHTML=`<div class="ad-draft"><div><div class="ad-q__m" style="margin-bottom:6px"><span>${E(x.who)}</span><span class="lx-proto">예시</span></div><div class="ad-draft__q">${E(x.q)}</div></div>
      ${x.route?`<div class="lg-note" style="margin:0"><div><b>${E(x.route)}</b></div></div>`:''}${ta('요약',x.sum)}${x.route?'':ta('사실',x.fact)+ta('당사 견해',x.view)+ta('반대 근거',x.counter)}
      <div class="ad-box"><h4>인용 · 준법 확인</h4><div class="ad-chk">${x.cites.map(([c,s])=>`<label><input type="checkbox" ${s==='ok'?'checked':''}/> ${E(c)} ${s==='ok'?'· 원문 일치':'<span class="bad">· 원문에서 문장을 찾지 못함</span>'}</label>`).join('')}
      ${x.flags.map(([f,ok])=>`<label><input type="checkbox" ${ok?'checked':''}/> ${ok?E(f):`<span class="bad">${E(f)}</span>`}</label>`).join('')}</div></div>
      <div class="ad-acts">${x.route?'<button class="btn btn--primary" data-act="route">담당자에게 이관</button>':'<button class="btn btn--primary" data-act="approve">승인 후 공개</button><button class="btn btn--secondary" data-act="save">수정 저장</button>'}
      <button class="btn btn--warn" data-act="hold">보류 (근거 부족)</button></div></div>`;
  }

  /* ───────── 실데이터 모드 ───────── */
  let Q=[], sel=null;
  const BAN=/(매수|매도)\s*하(세요|십시오)|사세요|파세요|담으세요|지금\s*사|추천\s*종목|수익\s*보장/;
  const vtag=s=>{ const v=s&&s.verify||{}; const st=v.status||'missing';
    const lbl={ok:'원문 일치',partial:'부분 일치',missing:'원문에서 찾지 못함'}[st];
    return `<span class="ad-vt ad-vt--${st}">${st==='ok'?'✓':st==='partial'?'△':'!'} ${lbl}</span>${v.title?`<span class="ad-src">${E(v.title.slice(0,24))} · ${E(v.date||'')} · p.${v.page}</span>`:''}`; };
  const stmtBox=(label,s,key,cls='')=>`<div class="ad-box ${cls}"><h4>${label} ${s&&s.text?vtag(s):''}</h4>
      <textarea rows="2" data-k="${key}">${E(s?s.text:'')}</textarea>${s&&s.cite&&s.cite.quote?`<div class="ad-quote">“${E(s.cite.quote)}”</div>`:''}</div>`;

  function compliance(d){
    const all=(d.hypotheses||[]).flatMap(h=>[...h.facts,h.view,h.counter]).filter(s=>s&&s.text);
    const ok=all.filter(s=>(s.verify||{}).status==='ok').length;
    const text=[d.verdict,...all.map(s=>s.text)].join(' ');
    return [[`인용 원문 대조 ${ok}/${all.length}`, all.length>0&&ok===all.length],
            ['매매 권유 표현 없음', !BAN.test(text)],
            ['모든 문장에 출처 표기', all.every(s=>s.cite&&s.cite.source_id)]];
  }

  function liveQueue(){
    $('#queue').innerHTML=Q.map(x=>{
      const d=x.draft||{}, r=d.route||x.route;
      const tag=x.stale?'<span class="lx-st lx-st--stale">재검토 필요</span>':x.status==='drafting'?'<span class="lx-st lx-st--wait">AI 초안 작성 중</span>':x.status==='error'?'<span class="lx-st lx-st--hold">AI 오류</span>'
        :(r==='pb'||r==='desk')?'<span class="lx-st lx-st--hold">이관 권장</span>':'';
      const mins=(Date.now()/1000-x.created_at)/60;
      return `<div class="ad-q${x.id===sel?' on':''}" data-q="${x.id}" tabindex="0" role="button"><div class="ad-q__t">${E(x.text)}</div>
        <div class="ad-q__m">${x.topic?`<span class="ad-pill">${E(x.topic)}</span>`:''}<span>${E(PLABEL[x.persona]||'')}</span><span class="ad-sla${mins>120?' warn':''}">대기 ${ago(x.created_at)}</span>${tag}</div></div>`; }).join('')
      ||'<div class="ad-panel__b lx-muted">검수할 질문이 없습니다. 고객 화면에서 새 질문을 보내 보세요.</div>';
    $('#nReview').textContent=Q.length; $('#kReview').innerHTML=`${Q.length}<small>건</small>`;
    liveDraft();
  }

  function liveDraft(){
    const x=Q.find(y=>y.id===sel);
    if(!x){ $('#draft').innerHTML='<p class="lx-muted">왼쪽에서 질문을 고르세요.</p>'; return; }
    if(x.status==='drafting'){ $('#draft').innerHTML=`<div class="ad-draft"><div class="ad-draft__q">${E(x.text)}</div><p class="lx-muted">AI가 리포트 원문에서 근거를 찾아 초안을 쓰는 중입니다…</p></div>`; return; }
    if(x.status==='error' || !x.draft){
      $('#draft').innerHTML=`<div class="ad-draft"><div class="ad-q__m"><span>${E(who(x.persona))}</span></div><div class="ad-draft__q">${E(x.text)}</div>
        <div class="lg-note" style="margin:0"><div><b>AI 초안을 만들지 못했습니다.</b><br/>${E(x.error||'')}</div></div>
        <div class="ad-acts"><button class="btn btn--primary" data-act="route">담당자에게 이관</button><button class="btn btn--warn" data-act="hold">보류</button></div></div>`; return; }
    const d=x.draft, m=d.meta||{}, r=d.route;
    const routed=r==='pb'||r==='desk'||r==='hold';
    const chk=compliance(d);
    $('#draft').innerHTML=`<div class="ad-draft">
      <div><div class="ad-q__m" style="margin-bottom:6px"><span>${E(who(x.persona))}</span><span>· ${E(m.model||'')}${m.secs?` · ${m.secs}초`:''}</span>${(m.sources||[]).length?`<span>· 근거 ${m.sources.length}쪽 검색</span>`:''}</div>
        <div class="ad-draft__q">${E(x.text)}</div></div>
      ${x.stale?`<div class="ax-stale" style="margin:0"><svg viewBox="0 0 24 24"><path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/></svg><div><b>재검토 필요</b><p>${E(x.stale_reason||'')}</p></div></div>`:''}
      ${r!=='answer'?`<div class="lg-note" style="margin:0"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg><div><b>AI 판단: ${E({pb:'담당 PB 연결',desk:'DMA 데스크 연결',hold:'근거 부족 · 보류'}[r]||r)}</b><br/>${E(d.route_reason||'')}</div></div>`:''}
      <div class="ad-box"><h4>요약 (고객이 먼저 읽는 문장)</h4><textarea rows="3" data-k="verdict">${E(d.verdict||'')}</textarea></div>
      ${(d.hypotheses||[]).map((h,i)=>`<div class="ad-hyp"><div class="ad-hyp__h"><b>${E(h.title)}</b><span class="ad-pill">근거 ${E(h.strength)}</span></div>
        ${h.facts.map((f,j)=>stmtBox('사실',f,`h${i}.f${j}`)).join('')}${stmtBox('당사 견해',h.view,`h${i}.view`)}${h.counter&&h.counter.text?stmtBox('반대 근거',h.counter,`h${i}.counter`):''}
        <div class="ad-box"><h4>확인할 점 (줄마다 하나)</h4><textarea rows="2" data-k="h${i}.checks">${E((h.checks||[]).join('\n'))}</textarea></div></div>`).join('')}
      ${routed?'':`<div class="ad-box"><h4>인용 · 준법 확인 (자동)</h4><div class="ad-chk">${chk.map(([t,ok])=>`<label><input type="checkbox" ${ok?'checked':''} disabled/> ${ok?E(t):`<span class="bad">${E(t)}</span>`}</label>`).join('')}</div></div>`}
      <div class="ad-acts">
        ${routed?`<button class="btn btn--primary" data-act="route">${r==='desk'?'DMA 데스크로 이관':r==='pb'?'담당 PB에게 연결':'담당자에게 이관'}</button>`
          :`<button class="btn btn--primary" data-act="approve">승인 후 공개</button><button class="btn btn--secondary" data-act="save">수정 저장</button>`}
        <button class="btn btn--warn" data-act="hold">보류 (근거 부족)</button>
      </div></div>`;
  }

  function collect(x){
    const d=JSON.parse(JSON.stringify(x.draft));
    $$('#draft [data-k]').forEach(t=>{ const k=t.dataset.k, v=t.value.trim();
      if(k==='verdict'){ d.verdict=v; return; }
      const m=k.match(/^h(\d+)\.(f(\d+)|view|counter|checks)$/); if(!m) return; const h=d.hypotheses[+m[1]];
      if(m[2]==='checks') h.checks=v.split('\n').map(s=>s.trim()).filter(Boolean);
      else if(m[3]!==undefined) h.facts[+m[3]].text=v; else h[m[2]].text=v; });
    return d;
  }

  async function loadQueue(){ try{ Q=await ILAPI.admin.queue(); }catch(e){ Q=[]; }
    if(!Q.find(x=>x.id===sel)) sel=Q[0]&&Q[0].id; liveQueue();
    if(Q.some(x=>x.status==='drafting')){ clearTimeout(loadQueue.t); loadQueue.t=setTimeout(loadQueue,5000); } }

  async function loadKpis(){ try{ const m=await ILAPI.admin.metrics();
    const k=$$('[data-view="review"] .ad-kpi .v'), d=$$('[data-view="review"] .ad-kpi .d');
    k[1].innerHTML=m.avg_review_hours!=null?`${m.avg_review_hours}<small>시간</small>`:'—'; d[1].innerHTML='목표 당일 · 검수 완료 '+m.reviewed+'건';
    k[2].innerHTML=`${m.stale}<small>건</small>`; d[2].textContent='새 자료로 근거가 바뀐 답변';
    k[3].innerHTML=`${m.consults_today}<small>건</small>`; d[3].textContent='오늘 들어온 상담 · 이관';
    d[0].textContent=`리포트 ${m.reports}건 · ${m.pages.toLocaleString()}쪽 색인`;
    const n=$$('.ad-link .n'); n[1].textContent=m.stale; n[2].textContent=m.reviewed;
    ILAPI.admin.consults().then(c=>{ n[3].textContent=c.length; }).catch(()=>{});
  }catch(e){} }

  async function loadStale(){
    const sec=$('[data-view="stale"]'); const tb=$('tbody',sec);
    if(!$('#newRep',sec)){
      const box=document.createElement('div'); box.className='ad-panel'; box.id='newRep'; box.style.marginBottom='18px';
      box.innerHTML=`<div class="ad-panel__h"><h2>새 리포트 투입 (시연)</h2><span class="lx-muted" style="font-size:12px">리포트가 새로 들어오면, 근거가 겹치는 검수 완료 답변에 자동으로 표시</span></div>
        <div class="ad-panel__b" style="display:flex;gap:10px;flex-wrap:wrap"><select class="lx-select" id="repSel" style="flex:1;min-width:240px"></select><button class="btn btn--primary" id="repGo" style="height:46px">새 자료로 투입</button></div>`;
      sec.prepend(box);
      const reps=await ILAPI.admin.reports(80).catch(()=>[]);
      const topics=(await ILAPI.admin.library().catch(()=>[])).map(r=>r.topic).filter(Boolean);
      const pref=reps.find(r=>topics.some(tp=>r.title.includes(tp)))||reps[0];
      $('#repSel').innerHTML=reps.map(r=>`<option value="${r.id}" ${pref&&r.id===pref.id?'selected':''}>${E(r.published_at)} · ${E(r.title)}</option>`).join('');
      $('#repGo').onclick=async()=>{ const r=await ILAPI.admin.newReport(+$('#repSel').value).catch(e=>({error:e.message}));
        if(r.error){ toast(r.error); return; }
        toast(r.flagged.length?`답변 ${r.flagged.length}건에 '재검토 필요'를 표시했습니다. 고객 화면에도 바로 보입니다.`:'근거가 겹치는 답변이 없습니다.'); loadStale(); loadKpis(); };
    }
    const rows=await ILAPI.admin.stale().catch(()=>[]);
    tb.innerHTML=rows.map(r=>`<tr><td><div class="t">${E(r.text)}</div><div class="s">${E(r.topic||'')} · 검수 ${E(r.reviewer||'')}</div></td>
      <td colspan="2">${E(r.stale_reason||'')}</td><td class="num">—</td><td><span class="lx-st lx-st--stale">재검토 필요</span></td>
      <td><button class="btn btn--primary ad-mini" data-restale="${r.id}">재검토</button></td></tr>`).join('')
      ||'<tr><td colspan="6" class="lx-muted">재검토가 필요한 답변이 없습니다. 위에서 새 리포트를 투입해 보세요.</td></tr>';
  }

  async function loadLibrary(){
    const rows=await ILAPI.admin.library().catch(()=>[]);
    $('tbody',$('[data-view="library"]')).innerHTML=rows.map(r=>{ const m=(r.answer||{}).meta||{};
      return `<tr><td><div class="t">${E(r.text)}</div><div class="s">근거 ${(m.sources||[]).length}쪽 · 원문 대조 ${m.cite_ok||0}/${m.cite_total||0}</div></td><td>${E(r.reviewer||'')}</td>
      <td class="num">—</td><td class="num">—</td><td>브리핑 · 설명자료 · 카드뉴스</td><td>${r.stale?'<span class="lx-st lx-st--stale">재검토 필요</span>':'<span class="lx-st lx-st--ok">공개 중</span>'}</td></tr>`; }).join('')
      ||'<tr><td colspan="6" class="lx-muted">검수 완료 답변이 없습니다.</td></tr>';
  }

  async function loadLeads(){
    const rows=await ILAPI.admin.consults().catch(()=>[]);
    if(!rows.length) return;
    $('tbody',$('[data-view="leads"]')).innerHTML=rows.map(r=>{ const P=IL.PERSONAS[r.persona]||{};
      return `<tr><td><div class="t">${E(P.name||r.persona||'')}</div><div class="s">${E(P.org||'')}</div></td><td>${E(r.kind||'')}</td><td>${E(r.context||'')}${r.memo?`<div class="s">메모: ${E(r.memo)}</div>`:''}</td>
      <td>${E(P.contact||'')}</td><td><span class="lx-st ${/연결 완료/.test(r.state)?'lx-st--ok':'lx-st--wait'}">${E(r.state||'신규')}</span></td>
      <td>${/연결 완료/.test(r.state)?'':'<button class="btn btn--primary ad-mini" data-toast="담당자에게 배정했습니다.">배정</button>'}</td></tr>`; }).join('');
  }

  const LOAD={review:()=>{loadQueue();loadKpis();}, stale:loadStale, library:loadLibrary, leads:loadLeads};

  /* ───────── 이벤트 ───────── */
  document.addEventListener('click',async e=>{
    const v=e.target.closest('[data-v]'); if(v){ show(v.dataset.v); return; }
    const q=e.target.closest('[data-q]'); if(q){ if(live){ sel=+q.dataset.q; liveQueue(); } else { msel=q.dataset.q; mockQueue(); } return; }
    const a=e.target.closest('[data-act]'); if(a){ const k=a.dataset.act;
      const msg={approve:'승인했습니다. 고객 화면에 공개되고 질문한 고객에게 알림이 갑니다.',save:'수정 내용을 저장했습니다.',hold:'보류했습니다. 고객에게 담당자 연결을 안내합니다.',route:'담당자에게 이관했습니다. 상담 요청 목록에 추가됐습니다.'}[k];
      if(live){ const x=Q.find(y=>y.id===sel); if(!x) return;
        try{ await ILAPI.admin.review({id:x.id, action:k, draft:x.draft?collect(x):undefined}); toast(msg); loadQueue(); loadKpis(); }catch(err){ toast(err.message); } }
      else { toast(msg); if(k!=='save'){ MQ.splice(MQ.findIndex(x=>x.id===msel),1); msel=MQ[0]&&MQ[0].id; mockQueue(); } }
      return; }
    const rs=e.target.closest('[data-restale]'); if(rs){ sel=+rs.dataset.restale; show('review');
      toast('새 자료와 비교해 수정한 뒤 다시 승인하면 고객 화면의 재검토 표시가 사라집니다.'); return; }
    const r=e.target.closest('[data-row]'); if(r){ r.parentNode.innerHTML=`<span class="lx-st ${r.dataset.row==='승인'?'lx-st--ok':'lx-st--hold'}">${r.dataset.row} 완료</span>`; toast(`가입 신청을 ${r.dataset.row}했습니다.`); return; }
    const t=e.target.closest('[data-toast]'); if(t){ toast(t.dataset.toast); }
  });
  document.addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-q]')){ e.preventDefault(); e.target.click(); } });

  /* ───────── 시작 ───────── */
  if(live && ILAPI.isStatic()){
    document.querySelector('.ad-top .r').insertAdjacentHTML('afterbegin','<span class="lx-st lx-st--wait" title="실제 리포트 기반 답변 · 검수 결과는 이 브라우저에만 저장">공개 시연</span><button class="btn btn--secondary btn--sm" id="resetDemo" title="검수 · 재검토 결과를 처음 상태로">시연 초기화</button>');
    $('#resetDemo').onclick=()=>{ try{ localStorage.removeItem('il.static.v1'); }catch(e){} location.reload(); };
    LOAD.review(); }
  else if(live){ document.querySelector('.ad-top .r').insertAdjacentHTML('afterbegin','<span class="lx-st lx-st--ok" title="lounge_api 서버 연결">실데이터</span>'); LOAD.review(); }
  else { document.querySelector('.ad-top .r').insertAdjacentHTML('afterbegin','<span class="lx-proto">예시 데이터</span>'); mockQueue(); }
  const h=location.hash.slice(1); if(h) show(h);
})();
