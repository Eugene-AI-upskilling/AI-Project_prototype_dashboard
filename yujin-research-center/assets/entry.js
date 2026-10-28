/* ══════════════════════════════════════════════════════════════════════
   entry.js — 진입 시퀀스: 기존 쇼릴(experience.js) → 쇼릴이 접히면 바로 고객 유형 선택(login.js)
   - 처음부터 폼 단계 배치(작은 쇼릴 + 오른쪽 폼)로 두어, 스크롤로 쇼릴이 접히는 순간 폼이 함께 나타난다. 별도 '시작하기' 없음.
   - '로그인' · '쇼릴 건너뛰기'는 접힌 지점으로 바로 이동. 폼 접근은 애니메이션 · 영상 재생에 묶지 않는다.
   - ?start=1 · ?oauth=1 · 대기 중 세션이면 처음부터 접힌 지점에서 시작.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
  const body=document.body, section=q('.experience'), stage=q('.experience-stage'), nav=q('.nav');
  const form=q('[data-login-root]');
  if(!section||!form) return;
  const isStatic=()=>body.classList.contains('experience-static');

  /* 쇼릴이 접힌 지점(experience.js의 진행률 p≈0.9) 스크롤 위치 */
  function foldEnd(){
    const navH=nav?nav.offsetHeight:0;
    const start=section.getBoundingClientRect().top+scrollY-navH;
    return start+Math.max(0,section.offsetHeight-stage.offsetHeight)*.9;
  }

  /* 접힌 지점(쇼릴 축소 + 폼)으로 이동 */
  function showForm(opts){
    opts=opts||{};
    const y=foldEnd(), near=Math.abs(scrollY-y)<24;
    if(isStatic()) form.scrollIntoView({block:'start',behavior:opts.instant?'auto':'smooth'});
    else if(!near) scrollTo({top:y,behavior:opts.instant?'auto':'smooth'});
    if(!opts.silent) focusForm();
  }
  function focusForm(){
    const pane=form.querySelector('.lg-pane.on'); const h=pane&&pane.querySelector('h2');
    if(h){ if(!h.hasAttribute('tabindex')) h.setAttribute('tabindex','-1'); setTimeout(()=>h.focus({preventScroll:true}),60); }
  }

  qa('[data-entry-start],[data-entry-skip]').forEach(b=>b.addEventListener('click',e=>{ e.preventDefault(); showForm(); }));
  window.openAuth=()=>showForm();                               // 다른 화면의 '로그인' 버튼도 같은 폼으로


  /* 처음부터 폼이 필요한 경우 */
  const params=new URLSearchParams(location.search);
  let pending=false; try{ const s=JSON.parse(localStorage.getItem('il.session')||'null'); pending=!!(s&&s.persona&&s.status&&s.status!=='approved'); }catch(e){}
  const direct=params.has('start')||params.has('oauth')||pending||/access_token/.test(location.hash);
  body.dataset.entry='form';                                  // 처음부터 폼 배치 → 쇼릴이 접히면 폼이 바로 보인다
  dispatchEvent(new Event('resize'));
  if(direct){
    const go=()=>requestAnimationFrame(()=>showForm({instant:true}));
    if(body.dataset.ready==='true') go(); else addEventListener('load',go,{once:true});
  }
})();
