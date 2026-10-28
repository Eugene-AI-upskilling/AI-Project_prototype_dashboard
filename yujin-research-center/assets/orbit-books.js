/* ══════════════════════════════════════════════════════════════════════
   orbit-books.js — D안 Orbit Books (행사 카테고리 책 · 공전 모션) 공용 모듈
   conferences.html(전체 인터랙션)과 home.html(Access Hub 전면)이 같은 코드를 쓴다. CSS: orbit-books.css
   책 한 권 = 행사 카테고리(회차 아님).
   window.OrbitBooks = {
     bookHTML(cat, {up, open, next, md, wd, esc}) → <button class="book"> 마크업
     engine(shelf, {toggle, isCurrent(id), cx, rx(w), ry, focusX}) → {init, dock(id|null), toggleOpen(id), focus(id|null)}
       cx · rx · ry: 궤도 중심(폭 비율) · 가로 반지름 · 세로 반지름 (기본값 = Events 페이지 배치)
       focusX: 지정하면 focus(id) 때 그 책이 정면에 온 뒤 이 위치(폭 비율)로 비켜서며 표지가 열린다 (Home: 스리키 교재 방식, 내용은 오른쪽)
   }
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const mobileMQ=matchMedia('(max-width:760px)');
  const scrollBehavior=()=>reduced.matches?'auto':'smooth';

  function bookHTML(c,{up,open,next,md,wd,esc}){
    const style=`--cover:${c.cover};${c.text?`--ctext:${c.text};`:''}`;
    return `<button class="book" type="button" data-book="${c.id}" aria-pressed="false" ${c.light?'data-light':''} style="${style}"
      aria-label="${c.label} — 예정 ${up.length}건, 신청 가능 ${open}건">
      <span class="book-vol" aria-hidden="true">
        <span class="book-paper"></span>
        <span class="book-inside">
          <small>${next?'NEXT · '+(next.tba?esc(next.tba.split(' · ')[0]):md(next.start)+' ('+wd(next.start)+')'):'NEXT · 추후 안내'}</small>
          <strong>${esc(next?next.title:c.ko+' 일정 준비 중')}</strong>
          <span class="bi-n">예정 <b>${up.length}</b>건 · 신청 가능 <b>${open}</b>건</span>
          <small>아래 일정 목록이<br>이 카테고리로 정리돼요</small>
        </span>
        <span class="book-cover">
          <span class="ed">${c.ed}</span>
          <span class="bt">${c.label.replace(' ',' <br>')}</span>
          <span class="mk">${c.mk}</span>
          <span class="bm">${next?`다음 ${next.tba?esc(next.tba.split(' · ')[0]):md(next.start)} · 예정 ${up.length}건`:'예정 일정 없음'}${open?` · 신청 가능 ${open}`:''}</span>
          <span class="bf"><span>${c.foot}</span><span>${up.length?String(up.length).padStart(2,'0'):'—'}</span></span>
        </span>
      </span>
    </button>`;
  }

  /* 데스크톱: 타원 궤도 공전 + 정면 도킹 · 표지 펼침 / 모바일: 가로 스와이프 카드 */
  function engine(shelf,{toggle,isCurrent,cx:CX=.66,rx:RX=w=>Math.min(w*.25,300),ry:RY=96,focusX=null}){
    let books=[], step=0, phase=Math.PI/2, prev=0, raf=0, paused=false, hovered=false, focused=false, visible=true, tween=null, openTimer=0;
    let w=0,h=0, focusId=null, fLvl=0, fFrom=0, fTo=0, fT0=0;   // fLvl: 0 = 궤도, 1 = 포커스 위치 (실제 시간 700ms, 프레임 속도와 무관)
    const active=()=>!mobileMQ.matches;
    function measure(){ w=shelf.clientWidth; h=shelf.clientHeight; }
    function draw(){
      if(!active()) return;
      const cx=w*CX, cy=h*.53, rx=RX(w), ry=RY;
      books.forEach((b,i)=>{
        const a=phase+i*step, depth=(Math.sin(a)+1)/2;
        let s=.64+depth*.36, x=cx+Math.cos(a)*rx-b.offsetWidth/2, y=cy+Math.sin(a)*ry-b.offsetHeight/2, o=.62+depth*.38, z=Math.round(depth*10)+4;
        if(focusX!=null&&fLvl>0){
          const me=b.dataset.book===focusId, k=fLvl;
          if(me){ x+=(w*focusX-b.offsetWidth/2-x)*k; y+=(cy-b.offsetHeight/2-y)*k; s+=(1.12-s)*k; o=1; z=40; }
          else { o*=1-k; s*=1-.18*k; }
        }
        b.style.transform=`translate(${x}px,${y}px) scale(${s})`;
        b.style.zIndex=String(z);
        b.style.opacity=String(o);
        b.style.setProperty('--by',(-14+Math.cos(a)*17)+'deg');
        b.style.setProperty('--bz',(Math.cos(a)*-4)+'deg');
      });
    }
    function clear(){ books.forEach(b=>{ b.style.transform=''; b.style.zIndex=''; b.style.opacity=''; }); }
    function tick(t){
      const dt=Math.min((t-prev)/1000,.05)||0; prev=t;
      if(active()&&visible&&!document.hidden){
        const fT=focusId&&!tween?1:0;
        if(fT!==fTo){ fFrom=fLvl; fTo=fT; fT0=t; }   // 목표가 바뀐 순간부터 시간으로 보간
        if(fLvl!==fTo){ const q=reduced.matches?1:Math.min((t-fT0)/700,1), e=1-Math.pow(1-q,3); fLvl=fFrom+(fTo-fFrom)*e; if(q===1) fLvl=fTo; }
        if(tween){ const p=Math.min((t-tween.t0)/850,1), e=1-Math.pow(1-p,4); phase=tween.from+tween.delta*e; if(p===1) tween=null; draw(); }
        else if(fLvl>0||focusId){ draw(); }
        else if(!paused&&!reduced.matches&&!hovered&&!focused){ phase+=dt*.2; draw(); }
      }
      raf=requestAnimationFrame(tick);
    }
    function label(){ if(!toggle) return; toggle.textContent=paused?'↻ 공전 재생':'Ⅱ 공전 멈추기'; toggle.setAttribute('aria-pressed',String(paused)); }
    function setOpen(id){ books.forEach(b=>b.classList.toggle('is-open',!!id&&b.dataset.book===id)); }
    function dock(id){
      clearTimeout(openTimer); setOpen(null);
      if(!id){ paused=false; label(); return; }
      const i=books.findIndex(b=>b.dataset.book===id); if(i<0) return;
      paused=true; label();
      if(!active()){ const b=books[i], tr=b.parentElement; tr.scrollTo({left:b.offsetLeft-(tr.clientWidth-b.clientWidth)/2,behavior:scrollBehavior()}); return; }   // 가로 트랙만 이동, 페이지는 그대로
      const target=Math.PI/2-i*step, delta=((target-phase+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
      if(reduced.matches){ phase+=delta; draw(); setOpen(id); return; }
      tween={from:phase,delta,t0:performance.now()};
      openTimer=setTimeout(()=>{ if(!isCurrent||isCurrent(id)) setOpen(id); },620);   // 정면에 도착한 뒤 표지를 펼침
    }
    function toggleOpen(id){ const b=books.find(x=>x.dataset.book===id); if(b&&active()) b.classList.toggle('is-open'); }
    /* 포커스: 정면으로 돌려 세운 뒤(dock) focusX 위치로 비켜서며 표지를 연다. null이면 궤도로 복귀 */
    function focus(id){
      focusId=id||null; shelf.classList.toggle('is-focus',!!focusId);
      if(!focusId){ dock(null); return; }
      dock(id);
    }
    function init(){
      books=[...shelf.querySelectorAll('.book')]; step=2*Math.PI/books.length; measure();
      new ResizeObserver(()=>{ measure(); active()?draw():clear(); }).observe(shelf);
      new IntersectionObserver(en=>{ visible=en[0].isIntersecting; },{threshold:0}).observe(shelf);
      shelf.addEventListener('pointerenter',e=>{ if(e.pointerType!=='touch') hovered=true; });
      shelf.addEventListener('pointerleave',()=>{ hovered=false; });
      shelf.addEventListener('focusin',()=>{ focused=true; });
      shelf.addEventListener('focusout',e=>{ focused=shelf.contains(e.relatedTarget); });
      if(toggle) toggle.addEventListener('click',()=>{ paused=!paused; tween=null; if(!paused){ setOpen(null); } label(); });
      mobileMQ.addEventListener('change',()=>{ measure(); active()?draw():clear(); });
      label(); draw(); raf=requestAnimationFrame(tick);
      addEventListener('pagehide',()=>cancelAnimationFrame(raf),{once:true});
    }
    return {init,dock,toggleOpen,focus};
  }

  window.OrbitBooks={bookHTML,engine,mobileMQ,reduced};
})();
