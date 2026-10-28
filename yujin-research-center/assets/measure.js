/* ══════════════════════════════════════════════════════════════════════
   measure.js — 효과 측정(기획서 04②): 기존 방식 vs AI 라운지 탐색 시간 · 근거 정확도
   로컬 서버가 있으면 /api/measure*, 공개 배포(정적)에서는 스냅샷 과제 + 이 브라우저(localStorage)에 기록.
   색: 기존 방식 #e8833a / AI 라운지 #3182f6 (dataviz 검증 통과 · 밝은 화면)
   ══════════════════════════════════════════════════════════════════════ */
(async function(){
  'use strict';
  const $=s=>document.querySelector(s), E=IL.esc;
  const COL={legacy:'#e8833a',lounge:'#3182f6'}, CL={legacy:'기존 방식',lounge:'AI 라운지'};
  const TOOL={legacy:['reports.html','리포트 목록 열기'],lounge:['lounge.html#ask','리서치 데스크 열기']};
  function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2600);}

  /* ───────── 데이터 백엔드 ───────── */
  const live=await ILAPI.ready();
  const SEQS=[[['T1','legacy'],['T2','lounge']],[['T1','lounge'],['T2','legacy']],[['T2','legacy'],['T1','lounge']],[['T2','lounge'],['T1','legacy']]];
  const seqOf=p=>{ const d=(String(p).match(/\d+/)||['1'])[0]; return SEQS[(parseInt(d,10)-1)%4].map(([task,cond])=>({task,cond})); };
  let API;
  if(live && !ILAPI.isStatic()){
    API={ list:()=>ILAPI.req('/api/measure'), reports:()=>ILAPI.req('/api/reports/all'), seq:p=>ILAPI.req('/api/measure/sequence/'+encodeURIComponent(p)),
      add:b=>ILAPI.req('/api/measure/trial',b), sample:()=>ILAPI.req('/api/measure/sample',{n:6}), reset:all=>ILAPI.req('/api/measure/reset',{all}) };
  } else {
    let snap={measure:{tasks:[],reports:[]}}; try{ snap=await (await fetch('assets/lounge-snapshot.json')).json(); }catch(e){}
    const M=snap.measure||{tasks:[],reports:[]}, KEY='il.measure.v1';
    let T=[]; try{ T=JSON.parse(localStorage.getItem(KEY)||'[]'); }catch(e){}
    const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(T)); }catch(e){} };
    const grade=(task,rid,page)=>{ const k=M.tasks.find(t=>t.id===task)||{}; const okR=rid!=null&&+rid===k.key_report; return .5*okR+.5*(okR&&+page===k.key_page); };
    const add=b=>{ const r={id:T.length+1,...b,score:grade(b.task,b.report_id,b.page),created_at:Date.now()/1000}; T.push(r); save(); return r; };
    API={ list:async()=>({tasks:M.tasks,trials:T.slice().sort((a,b)=>a.participant.localeCompare(b.participant)||a.ord-b.ord)}),
      reports:async()=>M.reports, seq:async p=>seqOf(p), add:async b=>add(b),
      sample:async()=>{ T=T.filter(t=>!t.sample); let s=7; const rnd=()=>((s=s*16807%2147483647)/2147483647);
        for(let i=1;i<=6;i++){ const p='P'+String(i).padStart(2,'0'); seqOf(p).forEach((q,o)=>{ const k=M.tasks.find(t=>t.id===q.task)||{}; const lg=q.cond==='legacy';
          const right=rnd()<(lg?.6:.93); add({participant:p,task:q.task,cond:q.cond,ord:o+1,secs:Math.round((lg?9+rnd()*10:2.5+rnd()*3)*60),
            report_id:right||rnd()<.5?k.key_report:null,page:right?k.key_page:k.key_page+1,sample:1}); }); }
        return API.list(); },
      reset:async all=>{ T=all?[]:T.filter(t=>!t.sample); save(); return API.list(); } };
  }
  if(!live) $('.ms-lead').insertAdjacentHTML('afterend','<p class="lx-proto" style="margin-bottom:12px">데이터 연결이 없어 측정을 저장할 수 없습니다.</p>');

  let data=await API.list(), reports=await API.reports().catch(()=>[]);
  const repLabel=r=>`${r.published_at} · ${r.title}`;
  const byLabel=new Map(reports.map(r=>[repLabel(r),r])), byId=new Map(reports.map(r=>[r.id,r]));
  const task=id=>data.tasks.find(t=>t.id===id)||{};

  /* 상단 버튼 */
  $('#topR').innerHTML=`${ILAPI.isStatic()?'<span class="lx-st lx-st--wait" title="기록은 이 브라우저에만 저장">공개 시연</span>':'<span class="lx-st lx-st--ok">실데이터</span>'}
    <button class="btn btn--secondary btn--sm" id="smp">예시 데이터 채우기</button><button class="btn btn--secondary btn--sm" id="rst">예시 지우기</button>`;
  $('#smp').onclick=async()=>{ data=await API.sample(); renderAll(); toast('예시 참가자 6명을 채웠습니다. 표에 ‘예시’로 표시됩니다.'); };
  $('#rst').onclick=async()=>{ data=await API.reset(false); renderAll(); toast('예시 데이터를 지웠습니다. 실제 측정 기록은 남아 있습니다.'); };

  /* ───────── 진행 ───────── */
  let run=null, tick=null;
  $('#pGo').onclick=async()=>{ const p=$('#pIn').value.trim().toUpperCase(); if(!p){ toast('참가자 코드를 입력하세요.'); return; }
    if(data.trials.some(t=>t.participant===p&&!t.sample)){ toast(`${p}는 이미 측정했습니다. 다른 코드를 쓰세요.`); return; }
    run={p, seq:await API.seq(p), i:0, t0:null, done:[]}; $('#seqTag').textContent=`${p} · ${run.seq.map(s=>`${s.task} ${CL[s.cond]}`).join(' → ')}`; drawRun(); };
  $('#pIn').addEventListener('keydown',e=>{ if(e.key==='Enter') $('#pGo').click(); });
  const mmss=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`;

  function drawRun(){
    clearInterval(tick);
    if(!run){ $('#run').innerHTML='<p class="lx-muted" style="margin:12px 0 0">참가자 코드를 넣고 순서를 받으면 과제가 나옵니다.</p>'; return; }
    if(run.i>=run.seq.length){
      $('#run').innerHTML=`<div class="ms-done"><b>${E(run.p)} 측정 완료</b>${run.done.map(d=>`<div>${d.task} · ${CL[d.cond]} · ${mmss(d.secs)} · 정확도 ${Math.round(d.score*100)}%</div>`).join('')}
        <button class="btn btn--primary btn--sm" id="nextP" style="margin-top:10px">다음 참가자</button></div>`;
      $('#nextP').onclick=()=>{ run=null; $('#pIn').value=''; $('#seqTag').textContent='참가자를 입력하세요'; drawRun(); $('#pIn').focus(); };
      return; }
    const s=run.seq[run.i], t=task(s.task), [href,lbl]=TOOL[s.cond];
    $('#run').innerHTML=`<div class="ms-card">
      <div class="ms-card__h"><span class="ad-pill">과제 ${run.i+1}/${run.seq.length} · ${s.task}</span><span class="ms-cond" style="--c:${COL[s.cond]}">${CL[s.cond]}</span><span class="ms-clock" id="clock">00:00</span></div>
      <p class="ms-q">${E(t.q||'')}</p>
      ${run.t0?`<a class="btn btn--secondary btn--sm" href="${href}" target="_blank" rel="noopener">${lbl} ↗</a>
        <form class="ms-ans" id="ansF" onsubmit="return false">
          <label class="lx-field"><span>근거 리포트</span><input class="lx-input" id="aRep" list="repList" placeholder="날짜나 제목으로 검색" autocomplete="off"/></label>
          <label class="lx-field ms-page"><span>쪽</span><input class="lx-input" id="aPage" type="number" min="1" max="60" inputmode="numeric"/></label>
          <label class="lx-field ms-ev"><span>찾은 근거 문장 (선택)</span><input class="lx-input" id="aEv" placeholder="예: 실적 훼손이 아닌 과도한 우려"/></label>
          <div class="ms-acts"><button class="btn btn--primary" type="submit">제출하고 시간 멈추기</button><button class="btn btn--secondary" type="button" id="skip">못 찾음</button></div>
        </form>`
      :`<button class="btn btn--primary" id="start">시작 · ${lbl}</button><p class="ax-disc" style="margin-top:8px">누르면 ${CL[s.cond]} 화면이 새 탭으로 열리고 시간이 잽니다. 찾으면 이 화면으로 돌아와 제출하세요.</p>`}
    </div><datalist id="repList">${reports.map(r=>`<option value="${E(repLabel(r))}">`).join('')}</datalist>`;
    if(!run.t0){ $('#start').onclick=()=>{ run.t0=Date.now(); window.open(href,'_blank','noopener'); drawRun(); }; return; }
    const upd=()=>{ const c=$('#clock'); if(c) c.textContent=mmss((Date.now()-run.t0)/1000); }; upd(); tick=setInterval(upd,500);
    const submit=async found=>{ const secs=Math.round((Date.now()-run.t0)/1000), r=found?byLabel.get($('#aRep').value.trim()):null;
      if(found && !r){ toast('목록에서 리포트를 골라 주세요.'); return; }
      const res=await API.add({participant:run.p, persona:IL.persona().key, task:s.task, cond:s.cond, ord:run.i+1, secs,
        report_id:r?r.id:null, page:found?parseInt($('#aPage').value,10)||null:null, evidence:found?$('#aEv').value.trim():''});
      run.done.push({...s, secs, score:res.score}); run.i++; run.t0=null; data=await API.list(); renderAll(); drawRun(); };
    $('#ansF').addEventListener('submit',()=>submit(true)); $('#skip').onclick=()=>submit(false);
  }

  /* ───────── 집계 · 차트 ───────── */
  const tip=$('#tip');
  document.addEventListener('mousemove',e=>{ const el=e.target.closest('[data-tip]'); if(!el){ tip.classList.remove('show'); return; }
    tip.innerHTML=el.dataset.tip; tip.classList.add('show'); const w=tip.offsetWidth;
    tip.style.left=Math.min(window.innerWidth-w-8,e.clientX+14)+'px'; tip.style.top=(e.clientY+14)+'px'; });

  const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
  function stats(){
    const by=c=>data.trials.filter(t=>t.cond===c);
    const L=by('legacy'), A=by('lounge');
    return { n:new Set(data.trials.map(t=>t.participant)).size, sample:data.trials.some(t=>t.sample),
      tL:mean(L.map(t=>t.secs/60)), tA:mean(A.map(t=>t.secs/60)), aL:mean(L.map(t=>t.score*100)), aA:mean(A.map(t=>t.score*100)), nL:L.length, nA:A.length };
  }
  function bars(el, rows, max, fmt){
    const W=Math.max(300,el.clientWidth||460),LB=78,RP=64,H=rows.length*40+28, sx=v=>(W-LB-RP)*v/max;
    const ticks=[0,max/2,max];
    el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" class="ms-svg" width="${W}" height="${H}" role="img" aria-label="${rows.map(r=>`${r.label} ${fmt(r.value)}`).join(', ')}">
      ${ticks.map(t=>`<line x1="${LB+sx(t)}" x2="${LB+sx(t)}" y1="6" y2="${H-22}" class="ms-grid"/><text x="${LB+sx(t)}" y="${H-6}" class="ms-axis" text-anchor="middle">${fmt(t)}</text>`).join('')}
      ${rows.map((r,i)=>{ const y=10+i*40, w=Math.max(2,sx(r.value||0));
        return `<g data-tip="<b>${r.label}</b><br/>${fmt(r.value)} · 기록 ${r.n}건"><rect x="0" y="${y-4}" width="${W}" height="34" fill="transparent"/>
          <text x="${LB-10}" y="${y+15}" class="ms-lbl" text-anchor="end">${r.label}</text>
          <path d="M${LB},${y+2} h${w-4} a4,4 0 0 1 4,4 v10 a4,4 0 0 1 -4,4 h-${w-4} z" fill="${r.color}"/>
          <text x="${LB+w+8}" y="${y+16}" class="ms-val">${r.value==null?'—':fmt(r.value)}</text></g>`; }).join('')}
      <line x1="${LB}" x2="${LB}" y1="6" y2="${H-22}" class="ms-base"/></svg>`;
  }
  function pairs(el){
    const ps=[...new Set(data.trials.map(t=>t.participant))].sort();
    if(!ps.length){ el.innerHTML='<p class="lx-muted">아직 기록이 없습니다. 측정을 진행하거나 예시 데이터를 채워 보세요.</p>'; return; }
    const rows=ps.map(p=>{ const g=c=>data.trials.find(t=>t.participant===p&&t.cond===c); const L=g('legacy'),A=g('lounge');
      return {p, L:L&&L.secs/60, A:A&&A.secs/60, sL:L&&L.score, sA:A&&A.score, sample:(L||A||{}).sample}; });
    const max=Math.max(5,Math.ceil(Math.max(...rows.flatMap(r=>[r.L||0,r.A||0]))/5)*5);
    const W=Math.max(320,el.clientWidth||720),LB=64,RP=24,RH=30,H=rows.length*RH+34, sx=v=>LB+(W-LB-RP)*v/max;
    const ticks=[...Array(max/5+1).keys()].map(i=>i*5);
    el.innerHTML=`<svg viewBox="0 0 ${W} ${H}" class="ms-svg" width="${W}" height="${H}" role="img" aria-label="참가자별 기존 방식과 AI 라운지 탐색 시간 비교">
      ${ticks.map(t=>`<line x1="${sx(t)}" x2="${sx(t)}" y1="4" y2="${H-24}" class="ms-grid"/><text x="${sx(t)}" y="${H-8}" class="ms-axis" text-anchor="middle">${t}분</text>`).join('')}
      ${rows.map((r,i)=>{ const y=16+i*RH;
        const dot=(v,c,s)=>v==null?'':`<circle cx="${sx(v)}" cy="${y}" r="6" fill="${COL[c]}" stroke="#fff" stroke-width="2"/>`;
        return `<g data-tip="<b>${r.p}${r.sample?' (예시)':''}</b><br/>기존 방식 ${r.L!=null?r.L.toFixed(1)+'분 · 정확도 '+Math.round(r.sL*100)+'%':'—'}<br/>AI 라운지 ${r.A!=null?r.A.toFixed(1)+'분 · 정확도 '+Math.round(r.sA*100)+'%':'—'}">
          <rect x="0" y="${y-RH/2}" width="${W}" height="${RH}" fill="transparent"/>
          <text x="${LB-12}" y="${y+4}" class="ms-lbl" text-anchor="end">${r.p}</text>
          ${r.L!=null&&r.A!=null?`<line x1="${sx(r.A)}" x2="${sx(r.L)}" y1="${y}" y2="${y}" class="ms-link"/>`:''}${dot(r.L,'legacy')}${dot(r.A,'lounge')}</g>`; }).join('')}
    </svg>`;
  }
  function renderAll(){
    const s=stats(), f1=v=>v==null?'—':v.toFixed(1)+'분', fp=v=>v==null?'—':Math.round(v)+'%';
    const cut=s.tL&&s.tA?Math.round((1-s.tA/s.tL)*100):null, dAcc=s.aL!=null&&s.aA!=null?Math.round(s.aA-s.aL):null;
    $('#sumTag').innerHTML=s.sample?'<span class="lx-proto">예시 포함</span>':'';
    $('#kpis').innerHTML=`<div class="ad-kpi"><div class="l">참가자</div><div class="v">${s.n}<small>명</small></div><div class="d">목표 5~10명</div></div>
      <div class="ad-kpi"><div class="l">탐색 시간</div><div class="v">${cut==null?'—':cut+'<small>% 단축</small>'}</div><div class="d">${f1(s.tL)} → ${f1(s.tA)}</div></div>
      <div class="ad-kpi"><div class="l">근거 정확도</div><div class="v">${dAcc==null?'—':(dAcc>=0?'+':'')+dAcc+'<small>%p</small>'}</div><div class="d">${fp(s.aL)} → ${fp(s.aA)}</div></div>`;
    const tmax=Math.max(5,Math.ceil(Math.max(s.tL||0,s.tA||0)/5)*5);
    bars($('#chTime'),[{label:'기존 방식',value:s.tL,color:COL.legacy,n:s.nL},{label:'AI 라운지',value:s.tA,color:COL.lounge,n:s.nA}],tmax,v=>v==null?'—':(+v).toFixed(1)+'분');
    bars($('#chAcc'),[{label:'기존 방식',value:s.aL,color:COL.legacy,n:s.nL},{label:'AI 라운지',value:s.aA,color:COL.lounge,n:s.nA}],100,v=>v==null?'—':Math.round(v)+'%');
    pairs($('#chPair'));
    $('#rows').innerHTML=data.trials.map(t=>{ const r=byId.get(t.report_id), k=task(t.task);
      return `<tr><td class="t">${E(t.participant)}</td><td>${t.ord}</td><td>${E(t.task)}</td><td><span class="ms-cond" style="--c:${COL[t.cond]}">${CL[t.cond]}</span></td>
        <td class="num">${mmss(t.secs)}</td><td>${r?`${E(r.published_at)} · ${E(r.title.slice(0,28))}${r.title.length>28?'…':''} · ${t.page??'—'}쪽`:'<span class="lx-muted">못 찾음</span>'}</td>
        <td class="num">${Math.round(t.score*100)}%</td><td>${t.sample?'<span class="lx-proto">예시</span>':''}</td></tr>`; }).join('')
      ||'<tr><td colspan="8" class="lx-muted">아직 기록이 없습니다.</td></tr>';
  }
  renderAll(); drawRun();
  let rz; window.addEventListener('resize',()=>{ clearTimeout(rz); rz=setTimeout(renderAll,150); });
})();
