/* ══════════════════════════════════════════════════════════════════════
   home.js — 로그인 후 개인화 홈 (마스터 문서 B4)
   1) Jarvis Hero: 질문 → ILAPI.jarvis (유진 리포트 근거 우선 · 근거가 없을 때만 외부 웹 자료)
      서버 questions와 같은 엔진 · 같은 질문 기록. (Research의 AI 질문 화면은 없앴으므로 '이어보기' 링크는 두지 않는다)
      홀로그램은 jarvis 앱(?embed=hero)을 iframe으로 띄우고 상태만 postMessage로 전달. 없으면 내장 대체 화면.
   2) 행사: events-data.js (conferences.html과 같은 데이터)
   3) 기존 홈 섹션: home-feed.js(데이터 · 렌더) + v2.js(스크롤 모션)
   4) 이어보기: 최근 질문 · 신청한 행사
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  const $=(s,e=document)=>e.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const S=IL.getSession()||{}, persona=S.persona||'am', WM=persona==='hnw';
  const LBL={am:'법인 · 자산운용사',ia:'법인 · 투자자문 · 일임사',dma:'법인 · DMA 전문투자자',etc:'법인 · 기타 기관',hnw:'WM 고객'};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ARROW='<span aria-hidden="true">→</span>';

  $('#jvHello').textContent=`${S.name||'고객'}님 · ${LBL[S.cust_type]||LBL[persona]||''}${S.org?' · '+S.org:S.branch?' · '+S.branch:''}`;

  /* ═════════ 1. Jarvis ═════════ */
  const jv=$('#jarvis'), stateEl=$('#jvState'), chat=$('#jvChat'), answer=$('#jvAnswer'), input=$('#jvIn');
  const STATE_MSG={STANDBY:'질문을 기다리고 있습니다',LISTENING:'듣고 있습니다…',THINKING:'유진 리포트에서 근거를 찾는 중…',SPEAKING:'답변을 정리했습니다',ERROR:'답변을 가져오지 못했습니다'};
  const pill=$('#jvPill'), win=$('#jvWin'), toggle=$('#jvToggle');
  let frame=null, frameOrigin='', idleT=0;
  function setState(st,msg){
    jv.dataset.state=st; stateEl.textContent=msg||STATE_MSG[st];
    // 진행 중일 때만 홀로그램 아래에 짧게 표시 (평소에는 문구 없음)
    pill.hidden=!(st==='THINKING'||st==='LISTENING'); pill.textContent=msg||STATE_MSG[st];
    if(frame&&frame.contentWindow) frame.contentWindow.postMessage({type:'jarvis:state',state:st},frameOrigin);
    clearTimeout(idleT); if(st==='SPEAKING'||st==='ERROR') idleT=setTimeout(()=>setState('STANDBY'),6000);
  }

  /* 홀로그램: jarvis 서버가 떠 있을 때만 iframe (응답 없으면 내장 화면 유지) */
  (async function mountHolo(){
    const url=((window.IL_CONFIG||{}).jarvisUrl||'').replace(/\/$/,''); if(!url) return;
    try{ await fetch(url+'/embed.js',{mode:'no-cors',cache:'no-store'}); }catch(e){ return; }
    frameOrigin=new URL(url).origin;
    frame=document.createElement('iframe');
    frame.src=url+'/?embed=hero'; frame.title='Jarvis 홀로그램'; frame.tabIndex=-1; frame.setAttribute('aria-hidden','true');
    frame.className='jv__frame';
    addEventListener('message',e=>{ if(e.origin===frameOrigin&&e.data&&e.data.type==='jarvis:ready'){ $('#jvHolo').classList.add('is-live'); setState(jv.dataset.state); } });
    $('#jvHolo').appendChild(frame);
  })();

  /* 보기 방식: 홀로그램(기본) ↔ 가운데 채팅창 — 같은 대화. 결과 카드는 홀로그램 위에 덮는다 */
  function setMode(m){
    jv.dataset.mode=m; win.hidden=m!=='chat';
    toggle.setAttribute('aria-pressed',String(m==='chat'));
    toggle.querySelector('span').textContent=m==='chat'?'홀로그램 보기':'채팅으로 질문하기';
    if(m==='chat'){ closeAnswer(); chat.scrollTop=chat.scrollHeight; setTimeout(()=>input.focus({preventScroll:true}),50); }
  }
  function openAnswer(){
    answer.insertAdjacentHTML('afterbegin','<button type="button" class="jv__x" data-close-answer aria-label="답변 닫기">×</button>');
    answer.hidden=false; if(jv.dataset.mode==='chat') setMode('holo');
  }
  function closeAnswer(){ answer.hidden=true; answer.classList.remove('has-src'); hush(); }
  toggle.addEventListener('click',()=>setMode(jv.dataset.mode==='chat'?'holo':'chat'));
  answer.addEventListener('click',e=>{ if(e.target.closest('[data-close-answer]')){ closeAnswer(); toggle.focus(); } });
  jv.addEventListener('keydown',e=>{ if(e.key!=='Escape') return; if(!answer.hidden) closeAnswer(); else if(jv.dataset.mode==='chat') setMode('holo'); });

  function bubble(who,html){
    const d=document.createElement('div'); d.className='jv__msg jv__msg--'+who; d.innerHTML=html; chat.appendChild(d);
    chat.scrollTop=chat.scrollHeight; return d;
  }
  function roomLink(){}   // Research의 AI 질문 화면을 없애 '이어보기' 링크가 없다

  /* 검수된 질문(바로 답변) */
  const ST_LABEL={reviewed:'검수 완료',pending:'검수 전',drafting:'초안 작성 중',hold:'근거 부족',routed:'담당자 연결',error:'접수됨'};
  let live=false;
  (async function loadPresets(){
    const h=await ILAPI.ready(); live=!!h;
    if(!h){ $('#jvPresets').innerHTML=''; return; }
    const qs=await ILAPI.questions(persona).catch(()=>[]);
    const rv=qs.filter(q=>q.status==='reviewed').slice(0,4);
    $('#jvPresets').innerHTML=rv.length?`<span class="jv__ph">검수된 질문</span>`+rv.map(q=>`<button type="button" class="jv__chip" data-preset="${esc(q.text)}">${esc(q.text)}</button>`).join(''):'';
    renderRecent(qs);
    // 왼쪽 목록: 모든 고객 유형의 검수 완료 답변 (같은 질문은 한 번만)
    const all=await ILAPI.questions().catch(()=>qs), seen=new Set();
    const reviewed=all.filter(q=>q.status==='reviewed'&&!seen.has(q.text)&&seen.add(q.text));
    if(reviewed.length){
      $('#jvListItems').innerHTML=reviewed.map(q=>`<button type="button" class="jv__li" data-preset="${esc(q.text)}" data-id="${q.id}">
        <b>${esc(q.text)}</b><span><i>검수 완료</i>${q.topic?esc(q.topic):''}${q.reviewer?' · '+esc(q.reviewer):''}</span></button>`).join('');
      $('#jvList').hidden=false;
    }
  })();
  $('#jvListItems').addEventListener('click',e=>{ const b=e.target.closest('[data-preset]'); if(!b) return;
    document.querySelectorAll('.jv__li').forEach(x=>x.classList.toggle('on',x===b)); ask(b.dataset.preset); });
  $('#jvPresets').addEventListener('click',e=>{ const b=e.target.closest('[data-preset]'); if(b){ input.value=b.dataset.preset; ask(b.dataset.preset); } });

  /* ── 음성 답변: 유리가 답을 소리 내어 읽는다 (브라우저 한국어 음성 · 읽는 동안 호출 듣기는 멈춤) ── */
  const synth=window.speechSynthesis||null;
  const voiceOut=!!synth; let pendingSay=null;   // 음성 답변은 항상 켜짐 (끄는 버튼 없음)
  // 한국어 음성 목록: Chrome은 처음에 빈 목록을 주고 나중에 채운다 → 채워질 때까지 잠깐 기다린다
  let voicesReady=null;
  function loadVoices(){
    if(voicesReady) return voicesReady;
    voicesReady=new Promise(res=>{
      const done=()=>res(synth.getVoices());
      if(synth.getVoices().length) return done();
      synth.addEventListener?synth.addEventListener('voiceschanged',done,{once:true}):(synth.onvoiceschanged=done);
      setTimeout(done,1500);
    });
    return voicesReady;
  }
  function koVoice(vs){ vs=(vs||[]).filter(v=>/^ko/i.test(v.lang)||/korean|한국/i.test(v.name));
    return vs.find(v=>/SunHi|Natural/i.test(v.name))||vs.find(v=>/Google/i.test(v.name))||vs.find(v=>/Yuna|Heami|female|여/i.test(v.name))||vs[0]||null; }
  const plain=t=>String(t||'').replace(/https?:\/\/\S+/g,'').replace(/[#*_`>\[\]]/g,'').replace(/\s+/g,' ').trim();
  const firstSentences=(t,n)=>(plain(t).match(/[^.!?。]+[.!?。]?/g)||[]).slice(0,n).join(' ').trim();
  // 긴 문장은 Chrome에서 15초쯤 끊기므로 문장 단위로 나눠 차례로 읽는다
  const chunks=t=>{ const out=[]; (plain(t).match(/[^.!?。]+[.!?。]?/g)||[plain(t)]).forEach(s=>{ s=s.trim(); if(!s) return;
    if(out.length&&(out[out.length-1]+' '+s).length<120) out[out.length-1]+=' '+s; else out.push(s); }); return out; };
  let sayToken=0, keep=[];   // keep: 재생 중 문장 객체를 붙잡아 둔다(가비지 수집되면 Chrome이 중간에 멈춤)
  async function say(text,opts){
    opts=opts||{};
    if(!synth||!voiceOut||!text){ if(opts.ack&&opts.onDone) opts.onDone(); return; }
    const my=++sayToken;
    synth.cancel(); pauseWake();
    const v=koVoice(await loadVoices());
    if(my!==sayToken) return;
    if(!v){ if(opts.ack){ if(opts.onDone) opts.onDone(); return; } toast('이 브라우저에는 한국어 음성이 없어 소리로 읽을 수 없습니다. Edge나 Chrome 최신 버전을 이용해 주세요.'); runWake(); return; }
    const parts=chunks(text.slice(0,900)); let started=false;
    keep=parts.map((s,i)=>{ const u=new SpeechSynthesisUtterance(s); u.voice=v; u.lang=v.lang||'ko-KR'; u.rate=1.03; u.pitch=1.05;
      if(i===0) u.onstart=()=>{ started=true; if(!opts.ack){ setState('SPEAKING','유리가 답하는 중…'); clearTimeout(idleT); } };
      if(i===parts.length-1) u.onend=()=>{ if(my!==sayToken) return; keep=[];
        if(opts.ack){ if(opts.onDone) opts.onDone(); return; }
        if(jv.dataset.state==='SPEAKING') setState('STANDBY'); runWake(); };
      u.onerror=e=>{ if(my!==sayToken) return; if(e.error==='not-allowed'){ pendingSay=text; pill.hidden=false; pill.textContent='화면을 한 번 누르면 유리가 음성으로 답합니다'; synth.cancel(); }
        if(e.error!=='interrupted'&&e.error!=='canceled'){ if(opts.ack&&opts.onDone) opts.onDone(); else runWake(); } };
      return u; });
    setTimeout(()=>{ if(my!==sayToken) return; if(synth.paused) synth.resume(); keep.forEach(u=>synth.speak(u)); },150);   // cancel 직후 바로 speak하면 무시되는 문제 회피
    // 재생이 시작되지 않으면(브라우저가 막음) 다음 클릭 때 이어서 읽도록
    setTimeout(()=>{ if(my===sayToken&&!started&&!synth.speaking){
      if(opts.ack){ if(opts.onDone) opts.onDone(); return; }   // 짧은 대답이 막히면 자막만 두고 바로 질문 듣기
      pendingSay=text; pill.hidden=false; pill.textContent='화면을 한 번 누르면 유리가 음성으로 답합니다'; runWake(); } },2500);
  }
  function hush(){ pendingSay=null; sayToken++; keep=[]; if(synth) synth.cancel(); }
  // 브라우저가 첫 클릭 전 음성 재생을 막은 경우: 다음 클릭 때 이어서 읽기
  addEventListener('pointerdown',()=>{ if(pendingSay){ const t=pendingSay; pendingSay=null; pill.hidden=true; say(t); } });
  if(synth) loadVoices();   // 음성 목록 미리 불러오기

  /* 답변 카드 */
  /* 근거 칩 → 같은 화면 오른쪽에 리포트 원문 쪽을 띄우고 인용 구절을 강조 (Research로 이동하지 않음) */
  let cites=[];
  const cite=c=>{ if(!c||!c.title) return ''; const i=cites.push(c)-1;
    return `<button type="button" class="jv__cite" data-cite="${i}" title="원문 보기">${esc(c.title)}${c.date?' · '+esc(c.date):''}${c.page?' · '+esc(c.page)+'쪽':''}<span aria-hidden="true"> ↗</span></button>`; };
  function showReviewed(n){
    cites=[];
    const hyps=(n.hyps||[]).map(h=>{ const f=(h.facts||[])[0];
      return `<li><div class="jv__hyp"><b>${esc(h.t)}</b><span class="jv__str jv__str--${h.tone}">${esc(h.strength||'')}</span></div>${f?`<p>${esc(f.text)}</p>${cite(f.cite)}`:''}</li>`; }).join('');
    answer.innerHTML=`<div class="jv__split"><div class="jv__card">
      <div class="jv__card-h">${n.reviewed
          ?`<span class="jv__badge jv__badge--ok">검수 완료</span>${n.reviewer?`<span class="jv__meta">${esc(n.reviewer)} 검수${n.baseDate?' · 자료 기준 '+esc(n.baseDate):''}</span>`:''}`
          :`<span class="jv__badge jv__badge--draft">AI 초안 · 검수 전</span><span class="jv__meta">유진 리포트 근거로 만든 초안입니다. 애널리스트가 검수하면 '검수 완료'로 바뀝니다.</span>`}</div>
      ${n.reviewed&&n.reviewNote?`<div class="jv__note"><b>애널리스트 코멘트</b>${n.reviewer?` · ${esc(n.reviewer)}`:''}<p>${esc(n.reviewNote)}</p></div>`:''}
      <p class="jv__verdict">${esc(n.verdict)}</p>
      ${hyps?`<ol class="jv__hyps">${hyps}</ol>`:''}
      <div class="jv__card-f"><span>근거 칩을 누르면 리포트 원문이 옆에 열립니다.</span>
        <span class="jv__card-acts">${cites.length?`<button type="button" class="btn btn--primary btn--sm" data-cite="0">원문과 함께 보기 ${ARROW}</button>`:''}</span></div>
    </div><aside class="jv__src" id="jvSrc" aria-label="리포트 원문" hidden></aside></div>`;
    openAnswer(); bubble('ai',`<span class="jv__tag${n.reviewed?'':' jv__tag--draft'}">${n.reviewed?'검수 완료':'검수 전'}</span>${esc(n.verdict)}`); setState('SPEAKING');
    say(n.reviewed?'유진 애널리스트가 검수한 답변입니다. '+n.verdict+(n.reviewNote?' 애널리스트 코멘트입니다. '+n.reviewNote:'')
                  :'AI 초안으로 먼저 말씀드릴게요. 아직 애널리스트 검수 전입니다. '+n.verdict);
  }
  const norm=t=>String(t||'').replace(/\s+/g,' ').trim();
  function highlight(text,quote){
    const t=norm(text), q=norm(quote); if(!q) return esc(t);
    let i=t.indexOf(q), len=q.length;
    if(i<0){ const head=q.slice(0,Math.min(24,q.length)); i=t.indexOf(head); len=head.length; }   // 띄어쓰기 차이로 전체가 안 맞으면 앞부분으로
    if(i<0) return esc(t);
    return esc(t.slice(0,i))+'<mark id="jvMark">'+esc(t.slice(i,i+len))+'</mark>'+esc(t.slice(i+len));
  }
  async function openSource(c,page){
    const box=$('#jvSrc'); if(!box||!c) return;
    page=page||c.page;
    answer.classList.add('has-src'); box.hidden=false;
    box.innerHTML=`<div class="jv__src-h"><div><b>${esc(c.title)}</b><span>${esc(c.date||'')}${page?' · '+page+'쪽':''}</span></div>
      <button type="button" class="jv__x jv__x--src" data-src-close aria-label="원문 닫기">×</button></div>
      <div class="jv__src-b"><p class="jv__meta">원문을 불러오는 중…</p></div>`;
    let d=null;
    try{ d=c.rid&&page?await ILAPI.page(c.rid,page):null; }catch(e){ d=null; }
    const body=box.querySelector('.jv__src-b');
    const pdf=(d&&d.url)||c.url;
    box.querySelector('.jv__src-h').insertAdjacentHTML('beforeend',`<div class="jv__src-nav">
      ${c.rid?`<button type="button" class="btn btn--secondary btn--sm" data-src-page="${page-1}" ${page<=1?'disabled':''} aria-label="이전 쪽">‹</button>
      <button type="button" class="btn btn--secondary btn--sm" data-src-page="${+page+1}" aria-label="다음 쪽">›</button>`:''}
      ${pdf?`<a class="btn btn--text btn--sm" href="${esc(pdf)}" target="_blank" rel="noopener">PDF 원본 ↗</a>`:''}</div>`);
    box.dataset.idx=cites.indexOf(c);
    if(!d||!d.text){ body.innerHTML=`<p class="jv__meta">${c.quote?`인용 구절: “${esc(c.quote)}”`:''}</p><p class="jv__meta">이 쪽의 원문 텍스트를 불러오지 못했습니다${ILAPI.isStatic&&ILAPI.isStatic()?' (공개 시연 버전은 인용된 쪽만 담고 있습니다)':''}. PDF 원본으로 확인해 주세요.</p>`; return; }
    body.innerHTML=`<p class="jv__src-t">${page==c.page?highlight(d.text,c.quote):esc(norm(d.text))}</p>`;
    const m=$('#jvMark'); if(m) m.scrollIntoView({block:'center',behavior:reduced?'auto':'smooth'});
  }
  answer.addEventListener('click',e=>{
    const ci=e.target.closest('[data-cite]'); if(ci){ openSource(cites[+ci.dataset.cite]); return; }
    const pg=e.target.closest('[data-src-page]'); if(pg){ const box=$('#jvSrc'); openSource(cites[+box.dataset.idx],+pg.dataset.srcPage); return; }
    if(e.target.closest('[data-src-close]')){ answer.classList.remove('has-src'); $('#jvSrc').hidden=true; }
  });
  function showWeb(r){
    const src=(r.sources||[]).map(s=>`<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.title)}</a></li>`).join('');
    answer.innerHTML=`<div class="jv__card jv__card--web">
      <div class="jv__card-h"><span class="jv__badge jv__badge--web">외부 웹 자료 · 유진 검수 아님</span><span class="jv__meta">유진 리서치 자료에 해당 내용이 없어 외부 웹 자료로 답합니다</span></div>
      <p class="jv__verdict">${esc(r.text)}</p>
      ${src?`<h4 class="jv__srch">외부 출처</h4><ul class="jv__srcs">${src}</ul>`:''}
      <div class="jv__card-f"><span>유진 애널리스트 의견이 아닙니다. 깊은 분석은 리포트 요청이나 상담으로 연결해 드립니다.</span></div>
    </div>`;
    openAnswer(); bubble('ai',`<span class="jv__tag jv__tag--web">외부 자료</span>${esc(r.text)}`); setState('SPEAKING');
    say('유진 리서치 자료에는 해당 내용이 없어서, 외부 자료로 말씀드릴게요. '+firstSentences(r.text,3));
  }
  function showNote(msg,kind){
    answer.innerHTML=`<div class="jv__card jv__card--note"><p class="jv__verdict">${esc(msg)}</p></div>`;
    openAnswer(); bubble('ai',esc(msg)); setState(kind==='err'?'ERROR':'STANDBY'); say(msg);
  }
  function showProgress(r){
    const n=(r.evidence||[]).length;
    answer.innerHTML=`<div class="jv__card jv__card--wait">
      <ol class="jv__steps"><li class="done">질문 접수</li><li class="on">유진 리포트 ${n?`후보 ${n}건 `:''}근거 확인 · AI 초안 작성</li><li>초안 공개 (검수 전)</li><li>애널리스트 검수 · 코멘트</li></ol>
      <p class="jv__meta">유진 리포트 근거로 AI 초안을 만들고 있습니다. 완성되면 '검수 전' 딱지와 함께 바로 보여 드리고, 애널리스트가 검수하면 '검수 완료'로 바뀝니다.</p></div>`;
    openAnswer();
  }

  async function poll(id){
    for(let i=0;i<80;i++){
      await new Promise(r=>setTimeout(r,3000));
      let d; try{ d=await ILAPI.question(id); }catch(e){ continue; }
      if(d.status==='drafting') continue;
      if(d.status==='reviewed') return showReviewed(ILAPI.normAnswer(d));
      if(d.route==='hold'||d.status==='hold'){
        setState('THINKING','THINKING · 유진 자료에 근거가 없어 외부 자료를 찾고 있습니다');
        try{ const w=await ILAPI.jarvisWeb(id); return w.mode==='web'?showWeb(w):showNote(w.error||'외부 자료 안내를 만들지 못했습니다.','err'); }
        catch(e){ return showNote(e.message,'err'); }
      }
      if(d.status==='error') return showNote('질문은 접수됐습니다. 지금은 AI 초안을 만들지 못해 담당자가 직접 안내드립니다.');
      if(d.status==='routed') return showNote('이 질문은 적합성 확인이 필요해 담당자에게 연결했습니다.');
      // pending: 근거 있는 AI 초안 완료 → '검수 전' 딱지로 바로 보여 준다 (검수되면 '검수 완료' + 코멘트)
      const n=ILAPI.normAnswer(d);
      if(n.isDraft) return showReviewed(n);
      bubble('ai','유진 리포트에서 근거를 확인해 답변 초안을 만들었습니다. 애널리스트가 검수 중입니다.');
      say('유진 리포트에서 근거를 찾았어요. 애널리스트가 검수 중입니다.');
      return setState('SPEAKING');
    }
  }

  let busy=false;
  async function ask(text){
    text=(text||'').trim();
    if(text.length<4){ toast('질문은 4자 이상 입력해 주세요.'); input.focus(); return; }
    if(busy) return; busy=true; $('#jvSend').disabled=true;
    bubble('me',esc(text)); input.value=''; closeAnswer(); setMode('holo'); setState('THINKING'); hush();
    try{
      const h=await ILAPI.ready();
      if(!h) throw new Error('지금은 리서치 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      const r=await ILAPI.jarvis(text,persona);
      roomLink(r.id);
      if(r.mode==='reviewed') showReviewed(ILAPI.normAnswer(await ILAPI.question(r.id)));
      else if(r.mode==='eugene'){ showProgress(r); await poll(r.id); }
      else if(r.mode==='web') showWeb(r);
      else showNote(r.error||'질문이 접수됐습니다.');
      ILAPI.questions(persona).then(renderRecent).catch(()=>{});
    }catch(e){ showNote(e.message,'err'); }
    finally{ busy=false; $('#jvSend').disabled=false; }
  }
  $('#jvForm').addEventListener('submit',e=>{ e.preventDefault(); ask(input.value); });

  /* 음성 질문 — 사용자가 마이크를 눌렀을 때만 듣는다 (호출어 없음 · 브라우저 음성 인식 ko-KR)
     · 홀로그램에서는 '유리야'로 부른다 (아래 호출 블록)
     · 채팅창 마이크: 받아 적은 문장을 입력창에 채워 확인 · 수정 후 전송 */
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition, mic=$('#jvMic');
  let rec=null, recBtn=null;
  function listen(btn,autoSend){
    if(!SR){ toast('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome이나 Edge에서 이용해 주세요.'); return; }
    if(rec){ rec.stop(); return; }
    let said='';
    rec=new SR(); rec.lang='ko-KR'; rec.interimResults=true; rec.maxAlternatives=1; recBtn=btn;
    btn.setAttribute('aria-pressed','true'); setState('LISTENING', autoSend?'듣고 있습니다… 말을 마치면 바로 질문합니다':'듣고 있습니다…');
    rec.onresult=e=>{ said=[...e.results].map(r=>r[0].transcript).join(''); if(autoSend) pill.textContent='“'+said+'”'; else input.value=said; };
    rec.onerror=e=>{ toast(e.error==='not-allowed'||e.error==='service-not-allowed'?'마이크 권한이 꺼져 있습니다. 주소창의 자물쇠 아이콘에서 마이크를 허용해 주세요.':e.error==='no-speech'?'말소리가 들리지 않았습니다. 다시 눌러 말해 주세요.':'음성을 인식하지 못했습니다.'); };
    rec.onend=()=>{ rec=null; recBtn&&recBtn.setAttribute('aria-pressed','false'); recBtn=null;
      if(jv.dataset.state==='LISTENING') setState('STANDBY');
      said=said.trim();
      if(autoSend){ if(said.length>=4) ask(said); }
      else input.focus();
      runWake(); };
    try{ rec.start(); }catch(err){ rec=null; btn.setAttribute('aria-pressed','false'); setState('STANDBY'); toast('음성 인식을 시작하지 못했습니다.'); }
  }

  /* '유리' 호출 — 홈을 열면 바로 "유리야"를 기다린다(첫 방문에 마이크 허용 1회 · 탭이 보일 때만 · 끄면 그 선택을 기억)
     "유리야, ○○" 한 번에 또는 "유리야" 뒤 이어서 질문 */
  // 음성 인식이 '유리야'를 비슷하게 적는 경우까지: 유리야 · 유리 야 · 율이야 · 우리야 · 유니야 · 유리아 · Yuri
  const WAKE=/(유리|율이|우리|유니|yuri)\s*(야|아|씨|님|이야)[,.!?\s]*|(^|\s)(유리|yuri)[,.!?\s]+/gi;
  window.__yuri=[]; const ylog=s=>{ window.__yuri.push(new Date().toLocaleTimeString()+' '+s); if(window.__yuri.length>60) window.__yuri.shift(); };
  const wakeBtn=$('#jvWake'), wakeHint=$('#jvWakeHint');
  let wakeOn=false, wakeRec=null, waiting=false, waitT=0, autoMode=false, needMic=false, acked=false;
  function armWait(){ clearTimeout(waitT); waitT=setTimeout(()=>{ if(waiting){ waiting=false; ylog('질문 없음 · 대기로'); if(jv.dataset.state==='LISTENING') setState('STANDBY'); } },9000); }
  function wakeUI(){ wakeBtn.setAttribute('aria-pressed',String(wakeOn)); wakeBtn.querySelector('span').textContent=wakeOn?'유리가 듣는 중 · 끄기':'유리 호출 켜기'; wakeHint.hidden=!wakeOn;
    if(wakeOn) wakeHint.textContent='“유리야”라고 부른 뒤 질문해 보세요 · 예: 유리야, 반도체 전망 알려줘'; }
  function heard(q){ waiting=false; clearTimeout(waitT); q=q.trim(); if(q.length>=4) ask(q); else if(jv.dataset.state==='LISTENING') setState('STANDBY'); }
  function runWake(){
    if(!wakeOn||wakeRec||rec||document.hidden) return;
    const r=new SR(); r.lang='ko-KR'; r.continuous=true; r.interimResults=true; wakeRec=r;
    r.onstart=()=>ylog('듣기 시작');
    r.onresult=e=>{
      if(busy) return;
      // 이번 듣기 구간 전체 문장에서 마지막 호출어를 찾는다 ("유리" + "야 반도체…"처럼 나뉘어 와도 잡힘)
      let full=''; for(let i=0;i<e.results.length;i++) full+=e.results[i][0].transcript;
      const fin=e.results[e.results.length-1].isFinal;
      let last=null; WAKE.lastIndex=0; for(let m;(m=WAKE.exec(full));){ last=m; if(m[0]==='') WAKE.lastIndex++; }
      if(fin) ylog('들음: '+full.slice(-50));
      if(last&&!waiting){   // 호출어 → "네, 말씀하세요" (자막 + 음성)
        waiting=true; acked=false; setState('LISTENING','네, 말씀하세요…'); clearTimeout(waitT); ylog('호출어 인식');
        armWait();
      }
      // 호출어만 부르고 끝났으면(질문이 같은 말에 없으면) 소리로 대답한 뒤 질문을 듣는다
      if(waiting&&!acked&&fin&&last&&!(full.slice(last.index+last[0].length).trim())){
        acked=true; pauseWake(); clearTimeout(waitT); ylog('대답: 네, 말씀하세요');
        say('네, 말씀하세요.',{ack:true,onDone:()=>{ if(!waiting) return; setState('LISTENING','네, 말씀하세요…'); armWait(); runWake(); }});
        return;
      }
      if(!waiting) return;
      const q=(last?full.slice(last.index+last[0].length):full).trim();
      if(q) pill.textContent='“'+q+'”';
      if(fin&&q.length>=4){ ylog('질문: '+q); pauseWake(); heard(q); setTimeout(runWake,600); }   // 새 구간으로 다시 듣기(이전 문장 비우기)
    };
    r.onerror=e=>{ ylog('오류: '+e.error);
      if(e.error==='not-allowed'||e.error==='service-not-allowed'){ wakeOn=false; wakeUI(); needMic=true;
        wakeHint.hidden=false; wakeHint.textContent='마이크를 허용하면 “유리야”로 부를 수 있어요 · 화면을 한 번 누르거나 주소창 자물쇠에서 마이크 허용';
        if(!autoMode) toast('마이크 권한이 꺼져 있어 유리 호출을 켤 수 없습니다. 주소창의 자물쇠 아이콘에서 마이크를 허용해 주세요.'); } };
    r.onend=()=>{ wakeRec=null; if(wakeOn) setTimeout(runWake,300); };   // 브라우저가 듣기를 끊으면 다시 시작
    try{ r.start(); }catch(err){ wakeRec=null; }
  }
  function pauseWake(){ if(wakeRec){ const r=wakeRec; wakeRec=null; r.onend=null; try{ r.abort(); }catch(e){} } }
  function setWake(on){
    wakeOn=on; wakeUI();
    if(on) runWake(); else { pauseWake(); waiting=false; if(jv.dataset.state==='LISTENING') setState('STANDBY'); }
  }
  wakeBtn.addEventListener('click',()=>{
    if(!SR){ toast('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome이나 Edge에서 이용해 주세요.'); return; }
    autoMode=false; setWake(!wakeOn);
    try{ localStorage.setItem('il.yuri',wakeOn?'on':'off'); }catch(e){}
    toast(wakeOn?'유리 호출을 켰습니다. “유리야”라고 불러 보세요.':'유리 호출을 껐습니다. 다시 켜기 전까지 마이크를 쓰지 않습니다.');
  });
  /* 자동 시작: 사용자가 끈 적이 없으면 바로 듣기 시작. 브라우저가 첫 클릭 전 시작을 막으면 첫 클릭 · 키 입력 때 이어서 시작 */
  let yuriPref=null; try{ yuriPref=localStorage.getItem('il.yuri'); }catch(e){}
  if(SR&&yuriPref!=='off'){
    autoMode=true; setWake(true);
    // 첫 클릭 · 키 입력: 브라우저가 처음 시작을 막았거나(마이크 허용 전) 끊겼으면 사용자 동작으로 다시 켠다
    const kick=()=>{ if(!wakeRec&&!rec&&(wakeOn||needMic)){ needMic=false; autoMode=false; wakeOn=true; wakeUI(); runWake(); } };
    addEventListener('pointerdown',kick,{once:true}); addEventListener('keydown',kick,{once:true});
  }
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) pauseWake(); else runWake(); });
  if(!SR) wakeBtn.classList.add('is-unsupported');
  mic.addEventListener('click',()=>{ pauseWake(); listen(mic,false); });
  if(!SR){ mic.classList.add('is-unsupported'); mic.title='이 브라우저는 음성 인식을 지원하지 않습니다 (Chrome · Edge 권장)'; }

  /* ═════════ 2. 행사 (events-data.js 공용) ═════════ */
  const isPast=e=>!e.tba&&(e.end||e.start)<TODAY;
  const md=iso=>iso.slice(5).replace('-','.');
  const PREF=WM?['wm','ai','corp','ipo']:['corp','ipo','earnings','ndr','ai'];
  const statusOf=e=>{
    if(e.mode==='tba') return ['예정 · 일정 미확정','muted'];
    if(e.mode==='invite') return ['초청 전용','neutral'];
    if(e.deadline&&e.deadline<TODAY) return ['신청 마감','muted'];
    if(e.cap&&e.seats===0) return ['정원 마감','muted'];
    if(e.deadline){ const d=Math.round((Date.parse(e.deadline)-Date.parse(TODAY))/864e5); return d<=3?[d?`마감 D-${d}`:'오늘 마감','warn']:['신청 가능','brand']; }
    return ['일정 예고','muted'];
  };
  const srcTag=e=>e.source==='pattern'?'<span class="hm-tag">예정</span>':(e.source==='roster'||e.source==='notice')?'':'<span class="hm-tag">예시</span>';
  const canApply=e=>statusOf(e)[1]==='brand'||statusOf(e)[1]==='warn';
  const upcomingOf=cat=>EVENTS.filter(e=>!isPast(e)&&(!cat||e.cat===cat)).sort((a,b)=>a.start.localeCompare(b.start));
  const roster=EVENTS.filter(e=>(e.source==='roster'||e.roster)&&isPast(e)).sort((a,b)=>b.start.localeCompare(a.start));
  const evCard=e=>{
    const c=CATS.find(x=>x.id===e.cat), [lab,tone]=statusOf(e);
    const date=e.tba?esc(e.tba.split(' · ')[0]):`${md(e.start)}${e.end&&e.end!==e.start?'–'+md(e.end):''}`;
    return `<a class="hm-evc" href="conferences.html?event=${encodeURIComponent(e.id)}${isPast(e)?'&phase=past':''}" style="--dot:${DOT[e.cat]}">
      <span class="hm-evc__cat"><i></i>${esc(c?c.label:'')}${srcTag(e)}</span>
      <span class="hm-evc__date">${date}</span>
      <b class="hm-evc__t">${esc(e.title)}</b>
      <span class="hm-evc__m">${esc([e.analysts&&e.analysts.length?'담당 '+e.analysts.join(', '):'',e.time,e.place].filter(Boolean).join(' · ')||'세부 정보 추후 안내')}</span>
      <span class="badge badge--${tone==='warn'?'warn':tone}">${isPast(e)?'종료':lab}</span>
    </a>`; };

  /* 전면 Orbit Books — Events 페이지와 같은 모듈(assets/orbit-books.js). 책을 고르면 정면으로 와서 펼쳐지고 아래 카드가 그 카테고리로 바뀐다 */
  let curCat='all';
  $('#hmBooks').innerHTML=CATS.map(c=>{ const up=upcomingOf(c.id); return OrbitBooks.bookHTML(c,{up,open:up.filter(canApply).length,next:up[0],md,wd:iso=>'일월화수목금토'[new Date(iso+'T00:00:00').getDay()],esc}); }).join('');
  // 가운데 궤도 · 크게 / 포커스 시 책은 왼쪽(30%)으로, 내용은 오른쪽 패널에
  const shelfMotion=OrbitBooks.engine($('#hmShelf'),{toggle:$('#hmOrbitToggle'),isCurrent:id=>curCat===id,
    cx:.5, rx:w=>Math.min(w*.36,470), ry:118, focusX:.3});
  shelfMotion.init();
  $('#hmCatTabs').innerHTML=CATS.map(c=>`<button type="button" class="hm-cattab" data-hm-cat="${c.id}" aria-pressed="false" style="--dot:${DOT[c.id]}">${esc(c.label)}</button>`).join('');
  const dateOf=e=>e.tba?esc(e.tba.split(' · ')[0]):`${md(e.start)}${e.end&&e.end!==e.start?'–'+md(e.end):''}`;
  function renderDetail(){
    const box=$('#hmDetail');
    if(curCat==='all'){ box.hidden=true; box.innerHTML=''; return; }
    const c=CATS.find(x=>x.id===curCat), up=upcomingOf(curCat), past=roster.filter(e=>e.cat===curCat);
    const list=(up.length?up:past).slice(0,4);
    box.innerHTML=`<button type="button" class="hm-detail__x" data-hm-cat="all" aria-label="닫고 전체 행사 보기">×</button>
      <p class="hm-detail__k">${esc(c.ed)}</p>
      <h3>${esc(c.label)}<span>${esc(c.ko)}</span></h3>
      <p class="hm-detail__d">${esc(c.desc)}</p>
      <div class="hm-detail__stat"><span>예정 <b>${up.length}</b>건</span>${past.length?`<span>2026년 <b>${past.length}</b>회 진행</span>`:''}</div>
      <p class="hm-detail__h">${up.length?'다가오는 일정':past.length?'최근 진행한 행사':'예정된 행사가 없습니다'}</p>
      ${list.length?`<ul class="hm-detail__list">${list.map(e=>`<li><a href="conferences.html?event=${encodeURIComponent(e.id)}${isPast(e)?'&phase=past':''}">
        <time>${dateOf(e)}</time><span><b>${esc(e.title)}</b><em>${esc([(e.analysts||[]).join(', '),isPast(e)?'종료':statusOf(e)[0]].filter(Boolean).join(' · '))}${srcTag(e)}</em></span></a></li>`).join('')}</ul>`
        :'<p class="hm-detail__none">담당자에게 일정을 문의해 주세요.</p>'}
      <div class="hm-detail__acts"><a class="btn btn--primary btn--sm" href="conferences.html?category=${c.id}">${esc(c.ko)} 일정 보기 ${ARROW}</a>
        <button type="button" class="btn btn--text btn--sm" data-hm-cat="all">← 다른 행사 보기</button></div>`;
    box.hidden=false;
  }
  function renderAccess(){
    document.querySelectorAll('#hmBooks .book').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.book===curCat)));
    document.querySelectorAll('.hm-cattab').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.hmCat===curCat)));
    $('#hmBookDesc').innerHTML=`<a class="btn btn--text btn--sm" href="conferences.html${curCat!=='all'?'?category='+curCat:''}">전체 행사 일정 보기 ${ARROW}</a>`;
    renderDetail();
  }
  function setCat(id){ curCat=id; shelfMotion.focus(id==='all'?null:id); renderAccess(); }
  $('#hmBooks').addEventListener('click',e=>{ const b=e.target.closest('.book'); if(!b) return;
    if(curCat===b.dataset.book&&!OrbitBooks.mobileMQ.matches) shelfMotion.toggleOpen(b.dataset.book); else setCat(b.dataset.book); });
  $('#hmBooks').addEventListener('keydown',e=>{ if(!['ArrowLeft','ArrowRight'].includes(e.key)) return;
    const bs=[...document.querySelectorAll('#hmBooks .book')], i=bs.indexOf(document.activeElement); if(i<0) return;
    e.preventDefault(); const n=bs[(i+(e.key==='ArrowRight'?1:-1)+bs.length)%bs.length]; n.focus(); n.click(); });
  document.querySelector('#events').addEventListener('click',e=>{
    const c=e.target.closest('[data-hm-cat]'); if(c){ setCat(curCat===c.dataset.hmCat&&c.classList.contains('hm-cattab')?'all':c.dataset.hmCat); return; }
    const st=e.target.closest('[data-cat-step]'); if(st){ const i=CATS.findIndex(x=>x.id===curCat), n=CATS.length;
      setCat(CATS[((i<0?(+st.dataset.catStep>0?-1:0):i)+(+st.dataset.catStep)+n)%n].id); }
  });
  $('#hmShelf').addEventListener('keydown',e=>{ if(e.key==='Escape'&&curCat!=='all'){ setCat('all'); } });
  renderAccess();

  /* 3. 기존 홈 섹션(AI 앵커 · 리포트 카드뉴스 · 퀀트 안내/테마 버블)은 home-feed.js + v2.js */

  /* ═════════ 4. 이어보기 ═════════ */
  function renderRecent(qs){
    const mine=(qs||[]).slice(0,3);
    $('#ctQs').innerHTML=mine.length?mine.map(q=>`<a href="#jarvis"><span>${esc(q.text)}</span><em class="st st--${esc(q.status)}">${q.web?'외부 자료':ST_LABEL[q.status]||q.status}</em></a>`).join('')
      :`<p class="hm-empty">${live?'아직 질문이 없습니다. 위에서 첫 질문을 해 보세요.':'리서치 서버에 연결되면 질문 기록이 보입니다.'}</p>`;
  }
  renderRecent([]);
  let recs=[]; try{ recs=JSON.parse(localStorage.getItem('il-conf-records-v1')||'[]'); }catch(e){}
  $('#ctEv').innerHTML=(Array.isArray(recs)?recs:[]).slice(0,3).map(r=>{ const e=EVENTS.find(x=>x.id===r.eventId);
    return e?`<a href="conferences.html?event=${encodeURIComponent(e.id)}"><span>${esc(e.title)}</span><em>${r.kind==='apply'?'신청 완료':'문의 접수'}</em></a>`:''; }).join('')
    ||'<p class="hm-empty">신청한 행사가 없습니다.</p>';

  if(reduced) jv.classList.add('is-reduced');
})();
