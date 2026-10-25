/* ══════════════════════════════════════════════════════════════════════
   lounge-api.js — 라운지 화면 ↔ 데이터 연결
   1) 로컬 서버(lounge_api/server.py)가 있으면 실서버 API
   2) 없으면 정적 스냅샷(assets/lounge-snapshot.json) — 공개 배포용. 검수 · 새 리포트 투입 등은
      서버와 같은 규칙으로 이 브라우저 안에서만 반영(localStorage)
   3) 둘 다 없으면 ready()=false → 화면은 예시 데이터로 동작
   전역 노출: window.ILAPI
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  let health=null, B=null;

  async function req(path, body){
    const opt = body===undefined ? {} : {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)};
    const r = await fetch(path, opt);
    const j = await r.json().catch(()=>({error:'응답을 읽지 못했습니다'}));
    if(!r.ok) throw new Error(j.error||('HTTP '+r.status));
    return j;
  }

  /* ───────── 1) 실서버 ───────── */
  const LIVE = {
    questions:p=>req('/api/questions'+(p?'?persona='+p:'')),
    question:(id,admin)=>req(`/api/questions/${id}`+(admin?'?admin=1':'')),
    ask:(text,persona)=>req('/api/ask',{text,persona}),
    page:(rid,p)=>req(`/api/reports/${rid}/pages/${p}`),
    feedback:(question_id,vote,persona)=>req('/api/feedback',{question_id,vote,persona}),
    consult:b=>req('/api/consults',b),
    applyEvent:(event_id,persona,state)=>req('/api/events/apply',{event_id,persona,state}),
    admin:{ queue:()=>req('/api/admin/queue'), stale:()=>req('/api/admin/stale'), library:()=>req('/api/admin/library'),
      consults:()=>req('/api/admin/consults'), metrics:()=>req('/api/admin/metrics'), reports:n=>req('/api/reports?limit='+(n||20)),
      review:b=>req('/api/admin/review',b), newReport:report_id=>req('/api/admin/new-report',{report_id}) },
  };

  /* ───────── 2) 정적 스냅샷 ───────── */
  function makeStatic(snap){
    const KEY='il.static.v1', now=()=>Date.now()/1000;
    let S=null;
    try{ S=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){}
    if(!S||S.gen!==snap.generated_at){
      S={gen:snap.generated_at, questions:JSON.parse(JSON.stringify(snap.questions)),
         consults:[{id:1,persona:'dma',kind:'DMA 상담',context:'반도체 답변 열람 후 DMA 수수료 · 주문 방식 문의',state:'연결 완료 · DMA 데스크',at:now()-86400}],
         feedback:[], apps:[]};
    }
    const save=()=>{ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){} };
    const ok=v=>Promise.resolve(v);
    const pub=(q,admin)=>{ const d={...q}; if(q.status!=='reviewed') delete d.answer; if(!admin) delete d.draft; return d; };
    const find=id=>S.questions.find(q=>String(q.id)===String(id));
    function metrics(){
      const rv=S.questions.filter(q=>q.status==='reviewed'&&q.reviewed_at);
      const today=new Date(); today.setHours(0,0,0,0);
      return { pending:S.questions.filter(q=>['drafting','pending'].includes(q.status)).length,
        stale:S.questions.filter(q=>q.stale).length, reviewed:S.questions.filter(q=>q.status==='reviewed').length,
        consults_today:S.consults.filter(c=>c.at>=today/1000).length,
        avg_review_hours:rv.length?Math.round(rv.reduce((a,q)=>a+(q.reviewed_at-q.created_at),0)/rv.length/36)/100:null,
        feedback_up:S.feedback.filter(f=>f.vote==='up').length, feedback_n:S.feedback.length,
        reports:snap.reports_total, pages:snap.pages_total };
    }
    return {
      health:()=>({ok:true, static:true, llm:false, ...metrics()}),
      questions:p=>ok(S.questions.filter(q=>!p||q.persona===p).slice().sort((a,b)=>b.id-a.id).map(q=>pub(q))),
      question:(id,admin)=>{ const q=find(id); return q?ok(pub(q,admin)):Promise.reject(new Error('없음')); },
      ask:(text,persona)=>{ text=(text||'').trim(); if(text.length<4) return Promise.reject(new Error('질문은 4~300자로 입력해 주세요.'));
        const id=Math.max(0,...S.questions.map(q=>q.id))+1;
        S.questions.push({id,text,persona,topic:'',status:'error',route:null,stale:0,created_at:now(),
          error:'공개 시연 버전에서는 새 질문의 AI 답변을 만들지 않습니다. 질문은 접수됐고, 담당자가 직접 안내드립니다.'});
        save(); return ok({id,status:'error'}); },
      page:(rid,p)=>{ const x=snap.pages[`${rid}-${p}`]; return x?ok(x):Promise.reject(new Error('공개 버전에는 인용된 쪽만 담겨 있습니다')); },
      feedback:(question_id,vote,persona)=>{ S.feedback.push({question_id,vote,persona,at:now()}); save(); return ok({ok:true}); },
      consult:b=>{ S.consults.unshift({id:S.consults.length+1,...b,state:'신규',at:now()}); save(); return ok({id:S.consults.length}); },
      applyEvent:(event_id,persona,state)=>{ S.apps.push({event_id,persona,state,at:now()}); save(); return ok({ok:true}); },
      admin:{
        queue:()=>ok(S.questions.filter(q=>['drafting','pending','error'].includes(q.status)||q.stale).sort((a,b)=>(b.stale-a.stale)||(a.id-b.id)).map(q=>pub(q,true))),
        stale:()=>ok(S.questions.filter(q=>q.stale).map(q=>pub(q))),
        library:()=>ok(S.questions.filter(q=>q.status==='reviewed').map(q=>pub(q))),
        consults:()=>ok(S.consults.slice()),
        metrics:()=>ok(metrics()),
        reports:n=>ok(snap.reports.slice(0,n||20)),
        review:({id,action,draft,reviewer})=>{ const q=find(id); if(!q) return Promise.reject(new Error('잘못된 요청'));
          const d=draft||q.draft||{}, who=reviewer||'반도체 담당 애널리스트';
          if(action==='save') q.draft=d;
          else if(action==='approve'){ Object.assign(q,{status:'reviewed',answer:d,draft:d,reviewer:who,reviewed_at:now(),stale:0,stale_reason:null}); }
          else { Object.assign(q,{status:action==='hold'?'hold':'routed',reviewer:who,reviewed_at:now()});
            if(action==='route'){ const to={pb:'담당 PB',desk:'DMA 데스크'}[d.route]||'법인영업 담당';
              S.consults.unshift({id:S.consults.length+1,persona:q.persona,kind:'질문 이관',question_id:q.id,context:`“${q.text}” · ${d.route_reason||''}`,state:'신규 · '+to,at:now()}); } }
          save(); return ok({ok:true}); },
        newReport:rid=>{ const rep=snap.reports.find(r=>r.id===+rid); if(!rep) return Promise.reject(new Error('리포트를 찾을 수 없습니다'));
          const flagged=[];
          S.questions.filter(q=>q.status==='reviewed').forEach(q=>{ const t=(q.topic||'').trim(); if(t.length<2) return;
            const n=(rep.topic_counts||{})[t]||0;
            if((rep.title||'').includes(t)||n>=5){
              q.stale=1; q.stale_reason=`새 리포트 「${rep.title}」(${rep.published_at})가 나왔습니다. '${t}'을(를) ${n}회 다뤄 이 답변의 근거와 겹칩니다. 애널리스트 재검토 중입니다.`;
              flagged.push(q.id); } });
          save(); return ok({flagged, report:{id:rep.id,title:rep.title,date:rep.published_at}}); },
      },
    };
  }

  async function ready(){
    if(health!==null) return health;
    try{ health=await req('/api/health'); B=LIVE; return health; }catch(e){}
    try{
      const r=await fetch('assets/lounge-snapshot.json',{cache:'no-cache'});
      if(r.ok){ B=makeStatic(await r.json()); health=B.health(); return health; }
    }catch(e){}
    health=false; return health;
  }

  /* API 답변 → 화면 공통 구조 */
  const TONE={'유효':'up','부분 유효':'neutral','약함':'down','단기 요인':'neutral'};
  function cite(s){
    const v=s.verify||{}, c=s.cite||{};
    return { title:v.title||'', date:v.date||'', page:v.page, rid:v.report_id, status:v.status||'missing', quote:c.quote||'', url:v.url||'' };
  }
  function normAnswer(d){
    const a=d.answer||d.draft||{};
    const stmt=s=>s&&s.text?{text:s.text, cite:cite(s)}:null;
    const fmt=t=>t?new Date(t*1000).toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
    const srcDates=((a.meta||{}).sources||[]).map(s=>s.date).filter(Boolean).sort();
    return {
      id:d.id, q:d.text, topic:d.topic||a.topic||'', status:d.status, persona:d.persona, route:d.route||a.route,
      stale:!!d.stale, staleNote:d.stale_reason||'', reviewer:d.reviewer||'', reviewedAt:fmt(d.reviewed_at), askedAt:fmt(d.created_at),
      baseDate:srcDates.length?srcDates[srcDates.length-1]:'', verdict:a.verdict||'', routeReason:a.route_reason||'', error:d.error||'',
      meta:a.meta||{},
      hyps:(a.hypotheses||[]).map(h=>({ t:h.title, strength:h.strength, tone:TONE[h.strength]||'neutral',
        facts:(h.facts||[]).map(stmt).filter(Boolean), view:stmt(h.view), counter:stmt(h.counter), check:h.checks||[] })),
    };
  }

  const call=(path)=>(...a)=>{ let o=B; for(const k of path) o=o[k]; return o(...a); };
  window.ILAPI = {
    ready, req, normAnswer,
    isStatic:()=>!!(health&&health.static),
    questions:call(['questions']), question:call(['question']), ask:call(['ask']), page:call(['page']),
    feedback:call(['feedback']), consult:call(['consult']), applyEvent:call(['applyEvent']),
    admin:{ queue:call(['admin','queue']), stale:call(['admin','stale']), library:call(['admin','library']),
      consults:call(['admin','consults']), metrics:call(['admin','metrics']), reports:call(['admin','reports']),
      review:call(['admin','review']), newReport:call(['admin','newReport']) },
  };
})();
