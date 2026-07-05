/* ══════════════════════════════════════════════════════════════════════
   anchor.js — AI 아나운서(비디오 앵커) 렌더러 (index·서브페이지 공용)
   window.renderAnchor(mountEl, {
     layout:'bar'|'card', eyebrow, title, caption, duration, videoUrl, tag,
     liveLabel, chapters:[{n,title,sub,time}], chaptersLabel
   })
   재생 클릭 → videoUrl 있으면 <video> 교체, 없으면 window.toast()로 안내(있을 때).
   CSS는 app.css의 .vanchor 계열을 사용. app.css + 이 스크립트만 있으면 어디서든 동작.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  const BUST='<svg viewBox="0 0 100 100"><circle cx="50" cy="34" r="20"/><path d="M12 100c0-21 17-33 38-33s38 12 38 33z"/></svg>';
  function stage(o){
    const wave=[8,16,11,20,7,14,18,9,15,12,19,8,13,17].map(h=>`<i style="height:${h}px"></i>`).join('');
    return `<div class="vanchor__stage">
      ${o.thumbnail?`<img class="vanchor__poster" src="${o.thumbnail}" alt="" loading="lazy">`:''}
      <span class="vanchor__live"><i></i>${o.liveLabel||'AI'}</span>
      ${o.tag?`<span class="vanchor__tag">${o.tag}</span>`:''}
      ${o.thumbnail?'':`<span class="vanchor__avatar">${BUST}</span>`}
      <button class="vanchor__play" type="button" aria-label="브리핑 재생"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
      <div class="vanchor__hud">
        <div class="vanchor__wave" aria-hidden="true">${wave}</div>
        <div class="vanchor__ctl"><div class="vanchor__bar"><i></i></div></div>
      </div></div>`;
  }
  window.renderAnchor=function(el,o){
    if(!el) return; o=o||{};
    if(o.layout==='card'){
      const chaps=(o.chapters&&o.chapters.length)?`<div class="card"><div class="card__body">
          <div class="rep__top"><span class="badge badge--point">${o.chaptersLabel||'브리핑 챕터'}</span></div>
          <div class="vchap" style="margin-top:8px">${o.chapters.map(c=>`<div class="vchap__row"><span class="ix">${c.n}</span><span class="tt"><b>${c.title||''}</b><span>${c.sub||''}</span></span><span class="tm">${c.time||''}</span></div>`).join('')}</div>
        </div></div>`:'';
      el.innerHTML=`<div class="vanchor-wrap${chaps?'':' solo'}">
        <div class="vanchor vanchor--card">${stage(o)}
          <div class="vanchor__cbody">
            ${o.eyebrow?`<div class="vanchor__eye">${o.eyebrow}</div>`:''}
            <h4>${o.title||''}</h4>
            ${o.caption?`<p>${o.caption}</p>`:''}
            <button class="btn btn--primary btn--block btn--sm vanchor__cta" type="button" style="margin-top:12px">브리핑 재생 ▶</button>
          </div>
        </div>${chaps}</div>`;
    }else{
      el.innerHTML=`<div class="vanchor vanchor--bar">${stage(o)}
        <div class="vanchor__body">
          ${o.eyebrow?`<div class="vanchor__eye">${o.eyebrow}</div>`:''}
          <h3 class="vanchor__ttl">${o.title||''}</h3>
          ${o.caption?`<p class="vanchor__sub">${o.caption}</p>`:''}
          <button class="btn btn--primary btn--sm vanchor__cta" type="button">브리핑 재생 ▶</button>
        </div></div>`;
    }
    const play=()=>{ if(o.videoUrl){ const st=el.querySelector('.vanchor__stage');
        // 절대 위치(inset:0)로 채워 stage(아웃라인) 크기를 그대로 유지 — 삽입 시 커지지 않게
        if(st) st.innerHTML=`<video src="${o.videoUrl}"${o.thumbnail?` poster="${o.thumbnail}"`:''} controls autoplay playsinline style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000"></video>`; }
      else if(window.toast) window.toast('브리핑 영상이 곧 제공됩니다. 지금은 미리보기예요.'); };
    el.querySelectorAll('.vanchor__play,.vanchor__cta').forEach(b=>b.addEventListener('click',play));
  };
})();
