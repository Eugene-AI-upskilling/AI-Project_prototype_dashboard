/* ══════════════════════════════════════════════════════════════════════
   lounge-proto.js — AI 리서치 라운지 프로토타입 공용 데이터·헬퍼
   login.html · lounge.html · ask.html · admin.html 이 함께 쓴다.
   ※ 모든 데이터는 시연용 예시(가상 고객·가상 리포트)이며 기능 연동 전 단계다.
   전역 노출: window.IL
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ───────── 가상 고객(페르소나) ───────── */
  const PERSONAS = {
    am:  { key:'am',  seg:'법인', type:'자산운용사',     name:'김민준', org:'한빛자산운용(가상)',   role:'주식운용 매니저',
           format:'brief',      formatLabel:'회의용 브리핑', contact:'법인영업 담당', interests:['반도체','AI 인프라','2차전지'] },
    ia:  { key:'ia',  seg:'법인', type:'투자자문사',     name:'이서연', org:'온결투자자문(가상)',   role:'리서치 담당',
           format:'explainer',  formatLabel:'고객 설명자료', contact:'법인영업 담당', interests:['반도체','금리','배당주'] },
    dma: { key:'dma', seg:'법인', type:'DMA 전문투자자', name:'박지훈', org:'개인 전문투자자(가상)', role:'DMA 이용 검토',
           format:'brief',      formatLabel:'회의용 브리핑', contact:'DMA 데스크',   interests:['반도체','미국 기술주','환율'] },
    hnw: { key:'hnw', seg:'WM',   type:'고액자산가',     name:'최은정', org:'강남금융센터 고객(가상)', role:'WM 고객',
           format:'cardnews',   formatLabel:'카드뉴스',     contact:'담당 PB',      interests:['반도체','배당주','미국 금리'] },
  };

  /* ───────── 세션(프로토타입: localStorage, 실패해도 기본값으로 동작) ───────── */
  const KEY='il.session';
  function getSession(){ try{ return JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ return null; } }
  function setSession(s){ try{ localStorage.setItem(KEY, JSON.stringify(s)); }catch(e){} }
  function clearSession(){ try{ localStorage.removeItem(KEY); }catch(e){} }
  function persona(){ const s=getSession(); return PERSONAS[(s&&s.persona)||'am'] || PERSONAS.am; }
  function setPersona(k){ const s=getSession()||{}; s.persona=k; s.at=s.at||Date.now(); setSession(s); }

  /* ───────── 근거 자료(가상 리포트·공시) ───────── */
  const SOURCES = {
    S1:{ id:'S1', kind:'리포트', title:'반도체 하반기 전망: 사이클은 끝나지 않았다', date:'2026.06.30', by:'반도체 담당 애널리스트' },
    S2:{ id:'S2', kind:'리포트', title:'메모리 산업 점검: 재고와 가격',             date:'2026.07.21', by:'반도체 담당 애널리스트' },
    S3:{ id:'S3', kind:'리포트', title:'7월 주식시장 리뷰: 외국인 수급',            date:'2026.08.01', by:'투자전략팀' },
    S4:{ id:'S4', kind:'리포트', title:'해외 클라우드 기업 2Q 실적 정리',           date:'2026.08.05', by:'글로벌 리서치' },
    S5:{ id:'S5', kind:'리포트', title:'반도체 3Q 실적 프리뷰',                     date:'2026.10.22', by:'반도체 담당 애널리스트' },
  };

  /* ───────── 대표 질문의 근거형 답변 (가설별 구조) ───────── */
  const ANSWERS = {
    q1:{
      id:'q1', q:'반도체주 하락, AI 수요 둔화 때문인가?', topic:'반도체', asked:'2026.07.24',
      status:'reviewed', review:{by:'반도체 담당 애널리스트', at:'2026.07.24 16:20', mins:95},
      stale:{ on:true, by:'S5', note:'새 리포트 「반도체 3Q 실적 프리뷰」(10.22)가 가설 1·2의 근거와 겹칩니다. 애널리스트 재검토 중입니다.' },
      baseDate:'2026.08.05',
      verdict:'하락을 AI 수요 둔화 하나로 설명하긴 어렵습니다. 근거 강도는 가설 2(메모리 가격) > 가설 3(수급) > 가설 1(AI 수요) 순입니다.',
      hyps:[
        { t:'가설 1 · AI 수요 둔화', strength:'약함', tone:'down',
          fact:['북미 클라우드 기업들의 2Q 설비투자 가이던스는 유지 또는 상향됐습니다.'], factSrc:[['S4',3]],
          view:'AI 서버 수요가 꺾였다기보다, 상반기 급등에 따른 기대치 조정으로 봅니다.', viewSrc:[['S1',4]],
          counter:'일부 고객사의 HBM 재고 일수가 늘어 단기 주문 조정 가능성은 있습니다.', counterSrc:[['S2',2]],
          check:['3Q 실적의 HBM 출하 증가율','클라우드 기업 3Q 설비투자 가이던스'] },
        { t:'가설 2 · 메모리 가격·재고 사이클', strength:'유효', tone:'up',
          fact:['범용 DRAM 고정거래가격 상승폭이 6월 이후 둔화됐습니다.'], factSrc:[['S2',2]],
          view:'범용 메모리 가격 둔화가 이번 하락의 주요인 중 하나라고 판단합니다.', viewSrc:[['S2',3]],
          counter:'HBM 비중이 커지면서 평균판매가격은 방어되고 있습니다.', counterSrc:[['S1',6]],
          check:['4Q 고정거래가격 협상 결과'] },
        { t:'가설 3 · 외국인 수급', strength:'단기 요인', tone:'neutral',
          fact:['7월 외국인의 반도체 순매도가 확대됐습니다.'], factSrc:[['S3',6]],
          view:'환율과 차익실현 성격의 수급 요인으로, 펀더멘털 변화로 보긴 어렵습니다.', viewSrc:[['S3',7]],
          counter:'—', counterSrc:[],
          check:['외국인 순매수 전환 여부'] },
      ],
    },
    q2:{ id:'q2', q:'HBM 공급 과잉 우려, 내년까지 이어질까?', topic:'반도체', asked:'2026.10.23 09:12', status:'pending', eta:'오늘 중 답변' },
    q3:{ id:'q3', q:'미국 금리 인하가 국내 배당주에 주는 영향은?', topic:'배당주', asked:'2026.10.15', status:'reviewed', review:{by:'투자전략팀', at:'2026.10.15 14:05', mins:60} },
    q4:{ id:'q4', q:'2차전지 소재주 반등 근거가 있나?', topic:'2차전지', asked:'2026.10.20', status:'hold', holdNote:'승인된 자료에 근거가 부족해 답변을 보류했습니다. 담당 애널리스트 연결을 신청할 수 있습니다.' },
  };
  const PRESETS = [
    { id:'q1', q:'반도체주 하락, AI 수요 둔화 때문인가?', tag:'반도체' },
    { id:'q3', q:'금리가 오르는데 배당주·금융주는 괜찮을까?', tag:'배당주' },
    { id:'p3', q:'환율 1,400원대, 수출주에 유리한가?', tag:'환율' },
    { id:'p4', q:'AI 인프라 투자, 전력기기주까지 이어질까?', tag:'AI 인프라' },
  ];

  /* ───────── 행사(콥데이·세미나) ───────── */
  const EVENTS = [
    { id:'e1', date:'10.28', dow:'수', title:'반도체 소부장 온라인 콥데이', who:'법인', host:'리서치센터', fmt:'온라인 · 1:1 미팅', state:'applied' },
    { id:'e2', date:'11.06', dow:'금', title:'2027 시장 전망 자산가 세미나', who:'WM',  host:'WM 협업',   fmt:'오프라인 · 강남', state:'open' },
    { id:'e3', date:'11.13', dow:'금', title:'2차전지 밸류체인 컨퍼런스콜',   who:'법인', host:'리서치센터', fmt:'온라인',         state:'open' },
    { id:'e4', date:'11.20', dow:'금', title:'DMA 서비스 설명회',              who:'법인', host:'DMA 데스크', fmt:'온라인',         state:'waitlist' },
  ];

  /* ───────── 상담 요청(리드) ───────── */
  const CONSULTS = [
    { id:'c1', kind:'DMA 상담',      state:'연결 완료', to:'DMA 데스크',   when:'10.21', ctx:'반도체 질문 2건 열람 후 DMA 수수료·주문 방식 문의' },
    { id:'c2', kind:'법인계좌 개설', state:'접수',      to:'법인영업 담당', when:'10.23', ctx:'콥데이 신청 고객 · 반도체·AI 인프라 관심' },
  ];

  /* ───────── 헬퍼 ───────── */
  const statusBadge = s => ({
    reviewed:'<span class="lx-st lx-st--ok">검수 완료</span>',
    pending: '<span class="lx-st lx-st--wait">검수 대기</span>',
    hold:    '<span class="lx-st lx-st--hold">보류</span>',
    stale:   '<span class="lx-st lx-st--stale">재검토 필요</span>',
  }[s]||'');
  const srcChip = ([id,p]) => { const s=SOURCES[id]; if(!s) return '';
    return `<button type="button" class="lx-cite" data-src="${id}" title="${s.title} · ${s.date}">${id} · ${s.date.slice(2)} · p.${p}</button>`; };
  const esc = s => String(s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* 시연용 고객 전환 바 — 페이지 상단에 꽂아 쓴다 */
  function personaBar(onChange){
    const cur=persona();
    const el=document.createElement('div'); el.className='lx-demo';
    el.innerHTML=`<div class="wrap lx-demo__in">
      <span class="lx-demo__lbl"><i></i>시연용 가상 고객</span>
      <div class="lx-demo__opts" role="radiogroup" aria-label="시연 고객 선택">
        ${Object.values(PERSONAS).map(p=>`<button type="button" role="radio" aria-checked="${p.key===cur.key}" class="lx-demo__opt${p.key===cur.key?' on':''}" data-k="${p.key}">
          <b>${p.seg}</b>${p.type}</button>`).join('')}
      </div></div>`;
    el.addEventListener('click',e=>{ const b=e.target.closest('[data-k]'); if(!b) return;
      setPersona(b.dataset.k);
      el.querySelectorAll('.lx-demo__opt').forEach(x=>{ const on=x===b; x.classList.toggle('on',on); x.setAttribute('aria-checked',on); });
      onChange&&onChange(persona()); });
    return el;
  }

  /* 승인 상태: 실제 계정(google · email)이 승인 전이면 'pending' · 반려면 'rejected', 그 외(시연 · 승인)는 'ok' */
  function gate(){ const s=getSession(); if(!s||!(s.via==='google'||s.via==='email')) return 'ok';
    return s.status==='approved'?'ok':s.status==='rejected'?'rejected':'pending'; }
  const GATE_MSG={pending:'가입 승인 대기 중입니다. 리서치센터가 소속을 확인하면(1영업일) 질문 · 상담 · 자료 받기가 열립니다.',
    rejected:'가입이 승인되지 않았습니다. 소속 정보를 확인해 다시 신청하거나 담당자에게 문의해 주세요.'};
  window.IL = { gate, GATE_MSG, PERSONAS, SOURCES, ANSWERS, PRESETS, EVENTS, CONSULTS,
    getSession, setSession, clearSession, persona, setPersona, statusBadge, srcChip, esc, personaBar };
})();
