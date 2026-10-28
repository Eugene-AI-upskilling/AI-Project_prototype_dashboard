/* ══════════════════════════════════════════════════════════════════════
   theme-rotation.js — 테마 로테이션(버블 + 구성 종목 · 리포트 · 뉴스 패널) 공용 모듈.
   home-feed.js의 버블 배치(겹침 없이 영역에 맞춤)와 패널 탭을 그대로 옮겼다.
   - Research(WM): 넓은 레이아웃으로 크게  · Quant Studio(기관): 전략 만들기와 연결
   ThemeRotation.mount(host, { wide:bool, onStrategy:(themeName)=>{} , strategyLabel })
   데이터: Supabase themes · theme_constituents · theme_news · reports (없으면 아래 기본값 유지)
   CSS: app.css의 .theme-split · .bubble* · .ptabs, 넓은 레이아웃은 .tr-wide (assets/research.css)
   ══════════════════════════════════════════════════════════════════════ */
window.ThemeRotation=(function(){
  'use strict';
  const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sgn=n=>(n>=0?'+':'')+Number(n).toLocaleString('ko-KR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const f1=n=>Number(n).toLocaleString('ko-KR',{minimumFractionDigits:1,maximumFractionDigits:1});
  const PASTEL=['rgba(168,218,220,.72)','rgba(241,192,232,.72)','rgba(207,186,240,.72)','rgba(163,196,243,.72)','rgba(144,219,244,.72)','rgba(142,236,245,.72)','rgba(152,216,200,.72)','rgba(247,215,148,.8)'];
  const STATE_DESC={Leadership:'자금이 가장 몰린 주도 테마',Acceleration:'모멘텀이 빨라지는 가속 국면',
    Emerging:'새로 부상하는 테마',Crowded:'쏠림이 큰 과열 구간 — 주의',Cooling:'열기가 식는 둔화 국면',Reversal:'바닥에서 반전 시도 구간'};

  function mount(host,opt){
    if(!host) return null; opt=opt||{};
    let themes=[
      {n:'AI 반도체',con:9.4,ret:14.2,x:32,y:42},{n:'전력기기',con:6.1,ret:11.0,x:64,y:30},
      {n:'2차전지',con:7.0,ret:-3.2,x:50,y:68},{n:'바이오',con:4.4,ret:6.8,x:80,y:58},
      {n:'방산',con:3.6,ret:8.1,x:18,y:72},{n:'엔터',con:2.8,ret:4.0,x:84,y:80},
      {n:'조선',con:3.2,ret:9.5,x:43,y:22},{n:'금융/배당',con:5.2,ret:2.1,x:74,y:46},
      {n:'로봇',con:2.4,ret:-1.5,x:24,y:24},
    ];
    let themeConst={}, themeNews={}, reports=[], cur=null, tab='stock';
    host.classList.add('tr-host'); if(opt.wide) host.classList.add('tr-wide');
    host.innerHTML=`<div class="theme-split">
        <div class="bubble-box"><div class="bubble-wrap" data-tr-wrap></div></div>
        <div class="card theme-panel"><div class="card__body" data-tr-panel></div></div>
      </div>
      <div class="bubble-legend">
        <span>버블 크기 = 1개월 수익률 · 색 = 테마 구분 · 숫자 = 1개월 수익률</span>
        <span>버블 클릭 → 오른쪽에 구성 종목 · 리포트 · 뉴스</span>
      </div>`;
    const wrap=host.querySelector('[data-tr-wrap]'), panel=host.querySelector('[data-tr-panel]');

    function renderBubbles(){
      if(!themes.length) return; wrap.innerHTML='';
      const W=wrap.clientWidth||620, H=wrap.clientHeight||440, GAP=6;
      const tip=document.createElement('div'); tip.className='bubble-tip'; wrap.appendChild(tip);
      const rets=themes.map(t=>t.ret), rMin=Math.min(...rets), rMax=Math.max(...rets), span=(rMax-rMin)||1;
      const rel=themes.map(t=>.45+.55*((t.ret-rMin)/span));
      const area=rel.reduce((a,r)=>a+Math.PI*r*r,0);
      const unit=Math.min(H*.19, Math.sqrt(.46*W*H/area));
      const xs=themes.map(t=>t.x), ys=themes.map(t=>t.y);
      const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys);
      const nx=v=>.1+.8*((v-x0)/((x1-x0)||1)), ny=v=>.12+.76*((v-y0)/((y1-y0)||1));
      const nodes=themes.map((t,i)=>({r:rel[i]*unit, x:nx(t.x)*W, y:ny(t.y)*H}));
      const clamp=n=>{ n.x=Math.max(n.r+2,Math.min(W-n.r-2,n.x)); n.y=Math.max(n.r+2,Math.min(H-n.r-2,n.y)); };
      nodes.forEach(clamp);
      for(let it=0;it<400;it++){ let moved=false;
        for(let a=0;a<nodes.length;a++)for(let b=a+1;b<nodes.length;b++){
          const A=nodes[a],B=nodes[b],dx=B.x-A.x,dy=B.y-A.y,dist=Math.hypot(dx,dy)||.01,min=A.r+B.r+GAP;
          if(dist<min){ const push=(min-dist)/2,ux=dx/dist,uy=dy/dist; A.x-=ux*push;A.y-=uy*push;B.x+=ux*push;B.y+=uy*push;clamp(A);clamp(B);moved=true; }
        }
        if(!moved) break;
      }
      themes.forEach((t,i)=>{
        const n=nodes[i], d=n.r*2, fs=Math.max(10,Math.min(opt.wide?17:15,n.r*.24));
        const pos=document.createElement('div'); pos.className='bubble-pos';
        pos.style.left=n.x+'px'; pos.style.top=n.y+'px'; pos.style.width=pos.style.height=d+'px';
        const el=document.createElement('button'); el.type='button'; el.className='bubble'+(t.n===cur?' sel':''); el.dataset.theme=t.n;
        el.setAttribute('aria-label',`${t.n} 1개월 수익률 ${sgn(t.ret)}%`);
        el.style.background=PASTEL[i%PASTEL.length]; el.style.fontSize=fs+'px'; el.style.border='0'; el.style.font='inherit'; el.style.fontSize=fs+'px';
        el.innerHTML=`<span class="bn">${esc(t.n)}</span><span class="bv" style="font-size:${Math.max(9,fs-1.5)}px">${sgn(t.ret)}%</span>`;
        pos.onmousemove=e=>{ const r=wrap.getBoundingClientRect(); tip.style.left=(e.clientX-r.left+14)+'px'; tip.style.top=(e.clientY-r.top+14)+'px'; tip.style.opacity=1;
          tip.innerHTML=`<b>${esc(t.n)}</b><br/>자금 집중도 ${f1(t.con)}<br/>1개월 수익률 ${sgn(t.ret)}%`; };
        pos.onmouseleave=()=>tip.style.opacity=0;
        el.onclick=()=>open(t.n);
        pos.appendChild(el); wrap.appendChild(pos);
      });
      if(!cur&&themes[0]) open(themes[0].n);
    }
    function open(name){ cur=name; tab='stock'; wrap.querySelectorAll('.bubble').forEach(b=>b.classList.toggle('sel',b.dataset.theme===name)); renderPanel(); }
    function related(name){
      const toks=name.replace(/[·/().]/g,' ').split(/\s+/).filter(w=>w.length>=2);
      return reports.filter(r=>{ const h=`${r.title||''} ${r.cat||''} ${r.co||''}`; return toks.some(x=>h.includes(x)); }).slice(0,6);
    }
    function renderPanel(){
      const name=cur;
      if(!name){ panel.innerHTML='<div class="sub" style="padding:20px 4px">버블을 클릭하면 종목·리포트·뉴스가 표시됩니다.</div>'; return; }
      const t=themes.find(x=>x.n===name)||{n:name};
      const rc=v=>v==null?'':(v>=0?'up':'down');
      let inner='';
      if(tab==='stock'){
        const cons=(themeConst[name]||[]).slice().sort((a,b)=>(b.ret_1d??-999)-(a.ret_1d??-999)).slice(0,opt.wide?16:12);
        inner=cons.length?cons.map(s=>`<div class="tr-row"><span class="tr-nm">${esc(s.name)}</span>
            <span class="cn-figure ${rc(s.ret_1d)}" style="font-weight:700;font-size:13px;flex:0 0 auto">${s.ret_1d==null?'—':sgn(s.ret_1d)+'%'}</span></div>`).join('')
          :'<div class="sub" style="padding:14px 4px">구성 종목 데이터 준비 중입니다.</div>';
      }else if(tab==='report'){
        const reps=related(name);
        inner=reps.length?reps.map(r=>`<a class="tr-rep" href="${r.url?esc(r.url):'#'}" ${r.url?'target="_blank" rel="noopener"':''}>
          <div style="font-size:var(--text-micro);color:var(--color-muted)">${esc(r.cat||'리포트')}${r.a?' · '+esc(r.a):''}${r.d?' · '+esc(r.d):''}</div>
          <div style="font-weight:700;margin-top:2px;line-height:1.4">${esc(r.title)}</div></a>`).join('')
          :'<div class="sub" style="padding:14px 4px">이 테마와 직접 연결된 리포트가 아직 없습니다.</div>';
      }else{
        const nw=themeNews[name]||[];
        inner=nw.length
          ? (nw[0].summary?`<div style="background:var(--surface-tint);border-radius:8px;padding:10px 12px;margin-bottom:10px;font-size:12px;line-height:1.6"><b style="color:var(--color-primary)">AI 요약</b> ${esc(nw[0].summary)}</div>`:'')
            +nw.slice(0,8).map(n=>`<a href="${esc(n.url)}" target="_blank" rel="noopener" class="tr-rep">
              <div style="font-weight:600;font-size:13px;line-height:1.4">${esc(n.title)}</div>
              <div style="font-size:11px;color:var(--color-muted);margin-top:2px">${esc(n.source||'')}${n.pub_date?' · '+esc(n.pub_date):''}</div></a>`).join('')
          : '<div class="sub" style="padding:14px 4px">관련 뉴스를 불러오는 중입니다.</div>';
      }
      panel.innerHTML=`
        <div style="font-weight:800;font-size:${opt.wide?22:18}px;color:var(--blue-navy)">${esc(name)}</div>
        <div style="font-size:var(--text-micro);color:var(--color-muted);margin-top:2px">${STATE_DESC[t.state]||'시장 자금 흐름을 추적하는 테마'}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 12px">
          ${t.state?`<span class="badge badge--brand">${esc(t.state)}</span>`:''}
          ${t.ret!=null?`<span class="badge ${t.ret>=0?'badge--up':'badge--down'} cn-figure">1M ${sgn(t.ret)}%</span>`:''}
          ${t.con!=null?`<span class="badge badge--muted cn-figure">집중도 ${f1(t.con)}</span>`:''}
        </div>
        <div class="ptabs" role="group" aria-label="테마 상세">
          <button type="button" class="${tab==='stock'?'on':''}" data-tab="stock">종목·전일</button>
          <button type="button" class="${tab==='report'?'on':''}" data-tab="report">리포트</button>
          <button type="button" class="${tab==='news'?'on':''}" data-tab="news">뉴스</button>
        </div>
        <div class="tr-list">${inner}</div>
        ${opt.onStrategy?`<button type="button" class="btn btn--primary btn--block btn--sm" data-strategy style="margin-top:12px">${esc(opt.strategyLabel||'이 테마로 전략 만들기')} →</button>`:''}`;
      panel.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ tab=b.dataset.tab; renderPanel(); });
      const sb2=panel.querySelector('[data-strategy]'); if(sb2) sb2.onclick=()=>opt.onStrategy(name);
    }

    renderBubbles();
    let rt; window.addEventListener('resize',()=>{ clearTimeout(rt); rt=setTimeout(renderBubbles,150); });

    (async function load(){
      const client=window.sb; if(!client) return;
      const q=p=>p.then(r=>r).catch(()=>({data:null}));
      const fmtMD=s=>s?String(s).slice(5).replace('-','.'):'';
      try{
        const [th,tc,nw,rep]=await Promise.all([
          q(client.from('themes').select('*').order('id')),
          q(client.from('theme_constituents').select('*')),
          q(client.from('theme_news').select('*').order('rank')),
          q(client.from('reports').select('title,category,company,analyst,published_at,url').order('published_at',{ascending:false}).limit(300)),
        ]);
        if(rep.data&&rep.data.length) reports=rep.data.map(r=>({title:r.title,cat:r.category,co:r.company,a:r.analyst,d:fmtMD(r.published_at),url:r.url}));
        if(tc.data&&tc.data.length){ const m={}; tc.data.forEach(r=>{ (m[r.theme_name]||(m[r.theme_name]=[])).push({name:r.stock_name,ret_1d:r.ret_1d}); }); themeConst=m; }
        if(nw.data&&nw.data.length){ const m={}; nw.data.forEach(r=>{ (m[r.theme_name]||(m[r.theme_name]=[])).push(r); }); themeNews=m; }
        if(th.data&&th.data.length){ themes=th.data.map(t=>({n:t.name,con:+t.concentration,ret:+t.ret_1m,x:+t.pos_x,y:+t.pos_y,state:t.state})); cur=null; renderBubbles(); }
        else renderPanel();
      }catch(e){ console.warn('theme load failed (keeping defaults)',e); }
    })();
    return { refresh:renderBubbles };
  }
  return { mount };
})();
