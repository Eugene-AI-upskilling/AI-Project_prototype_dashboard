/* ══════════════════════════════════════════════════════════════════════
   trading.js — AI Trading League · 인터랙션 · 차트 · 리더보드 · 예측 · XP · Auth
   자체 완결(정적). 외부 의존: supabase-js(선택) · Pretendard.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const $=(s,e=document)=>e.querySelector(s);
const $$=(s,e=document)=>[...e.querySelectorAll(s)];
const fmt=(n,d=0)=>Number(n).toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d});
const sign=(n,d=2)=>(n>=0?'+':'')+fmt(n,d);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
window.$=$;window.$$=$$;

/* ───────── Toast + XP pop ───────── */
let toastT;
function toast(msg,xp){
  const t=$('#toast'); if(!t) return;
  t.innerHTML = (xp?`<span class="xp">+${xp} XP</span>`:'') + `<span>${msg}</span>`;
  t.classList.add('show'); clearTimeout(toastT);
  toastT=setTimeout(()=>t.classList.remove('show'),2600);
}
function xpPop(x,y,text){
  const el=document.createElement('div'); el.className='xp-pop'; el.textContent=text;
  el.style.left=x+'px'; el.style.top=y+'px'; document.body.appendChild(el);
  setTimeout(()=>el.remove(),1000);
}
window.toast=toast;

/* ───────── nav 스크롤 · FAB · 드로어 ───────── */
function wireChrome(){
  const nav=$('#tnav'), fab=$('#fab');
  const onScroll=()=>{ nav&&nav.classList.toggle('scrolled',scrollY>8); fab&&fab.classList.toggle('show',scrollY>560); };
  addEventListener('scroll',onScroll,{passive:true}); onScroll();
  fab&&fab.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
  // 드로어
  const dw=$('#drawer'), burger=$('#burger');
  const open=()=>{dw.classList.add('show');document.body.style.overflow='hidden';};
  const close=()=>{dw.classList.remove('show');document.body.style.overflow='';};
  burger&&burger.addEventListener('click',open);
  dw&&$$('[data-close]',dw).forEach(el=>el.addEventListener('click',close));
  dw&&$$('a',dw).forEach(a=>a.addEventListener('click',close));
  // 스크롤스파이(앵커 nav 활성화)
  const secs=$$('section[id]'); const links=$$('.tnav__links a[href^="#"]');
  if('IntersectionObserver'in window && secs.length){
    const spy=new IntersectionObserver(es=>{es.forEach(e=>{ if(e.isIntersecting){
      links.forEach(a=>a.classList.toggle('is-active',a.getAttribute('href')==='#'+e.target.id)); }});},
      {rootMargin:'-45% 0px -50% 0px'});
    secs.forEach(s=>spy.observe(s));
  }
}

/* ───────── reveal on scroll ───────── */
function wireReveal(){
  const els=$$('.reveal'); if(!els.length) return;
  if(!('IntersectionObserver'in window)){els.forEach(e=>e.classList.add('in'));return;}
  const io=new IntersectionObserver((es,ob)=>es.forEach((e,i)=>{ if(e.isIntersecting){
    setTimeout(()=>e.target.classList.add('in'), (i%4)*70); ob.unobserve(e.target); }}),{threshold:.12});
  els.forEach(e=>io.observe(e));
}

/* ───────── 숫자 카운트업 ───────── */
function countUp(el){
  const to=parseFloat(el.dataset.count), dec=+(el.dataset.dec||0), pre=el.dataset.pre||'', suf=el.dataset.suf||'';
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){el.textContent=pre+fmt(to,dec)+suf;return;}
  const dur=1100, t0=performance.now();
  const step=t=>{ const p=clamp((t-t0)/dur,0,1); const e=1-Math.pow(1-p,3);
    el.textContent=pre+fmt(to*e,dec)+suf; if(p<1)requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function wireCountUp(){
  const els=$$('[data-count]'); if(!els.length)return;
  const io=new IntersectionObserver((es,ob)=>es.forEach(e=>{ if(e.isIntersecting){countUp(e.target);ob.unobserve(e.target);}}),{threshold:.5});
  els.forEach(e=>io.observe(e));
}

/* ───────── 카운트다운 (시즌 종료: 2026-07-10 15:30) ───────── */
function wireCountdown(){
  const END=new Date(2026,6,10,15,30,0);
  const tick=()=>{ $$('[data-countdown]').forEach(el=>{
    let d=Math.max(0,END-new Date());
    const days=Math.floor(d/864e5); d-=days*864e5;
    const h=Math.floor(d/36e5); d-=h*36e5; const m=Math.floor(d/6e4);
    if(el.dataset.countdown==='days') el.textContent=days;
    else el.innerHTML=`<b>${days}</b>D <b>${String(h).padStart(2,'0')}</b>:<b>${String(m).padStart(2,'0')}</b>`;
  });};
  tick(); setInterval(tick,30000);
}

/* ───────── SVG 라인/에어리어 차트 ───────── */
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function series(seed,n,drift,vol,start=100){
  const r=mulberry(seed); const a=[start];
  for(let i=1;i<n;i++){ a.push(a[i-1]*(1+drift/100)*(1+(r()-.5)*vol/100)); }
  return a;
}
function smooth(pts){
  if(pts.length<3)return pts.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
  let d='M'+pts[0].x.toFixed(1)+' '+pts[0].y.toFixed(1);
  for(let i=0;i<pts.length-1;i++){const p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;
    d+=`C${(p1.x+(p2.x-p0.x)/6).toFixed(1)} ${(p1.y+(p2.y-p0.y)/6).toFixed(1)},${(p2.x-(p3.x-p1.x)/6).toFixed(1)} ${(p2.y-(p3.y-p1.y)/6).toFixed(1)},${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;}
  return d;
}
function drawChart(svg,data,opt={}){
  const W=opt.w||560,H=opt.h||180,pad=opt.pad||8, color=opt.color||'#6C5CE7', id='g'+Math.random().toString(36).slice(2,7);
  const all=[].concat(...data.map(d=>d.v)); const max=Math.max(...all),min=Math.min(...all);
  const X=(i,len)=>pad+i/(len-1)*(W-pad*2);
  const Y=v=>H-pad-(v-min)/(max-min||1)*(H-pad*2);
  let out=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${color}" stop-opacity=".28"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
  data.forEach((d,di)=>{
    const pts=d.v.map((v,i)=>({x:X(i,d.v.length),y:Y(v)}));
    const path=smooth(pts);
    if(d.area){ const lx=pts[pts.length-1].x, x0=pts[0].x;
      out+=`<path d="${path} L ${lx.toFixed(1)} ${(H-pad).toFixed(1)} L ${x0.toFixed(1)} ${(H-pad).toFixed(1)} Z" fill="url(#${id})"/>`; }
    out+=`<path class="chart-line" data-i="${di}" d="${path}" fill="none" stroke="${d.color||color}" stroke-width="${d.w||2.4}" stroke-linecap="round" stroke-linejoin="round"${d.dash?` stroke-dasharray="1 7"`:''}/>`;
    if(d.dot){ const p=pts[pts.length-1];
      out+=`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${d.color||color}" stroke="#0B1120" stroke-width="2.5"/>`; }
  });
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`); svg.setAttribute('preserveAspectRatio','none'); svg.innerHTML=out;
  // 라인 드로우 애니메이션
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches){
    $$('.chart-line',svg).forEach((ln,i)=>{ if(ln.getAttribute('stroke-dasharray'))return;
      const len=ln.getTotalLength(); ln.style.strokeDasharray=len; ln.style.strokeDashoffset=len; ln.getBoundingClientRect();
      ln.style.transition=`stroke-dashoffset 1.2s ${'cubic-bezier(.16,1,.3,1)'} ${i*.15}s`;
      requestAnimationFrame(()=>ln.style.strokeDashoffset='0'); });
  }
}

/* ───────── 입자 ───────── */
function wireParticles(){
  const host=$('#particles'); if(!host)return;
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const r=mulberry(7);
  for(let i=0;i<14;i++){ const s=document.createElement('i');
    s.style.left=(r()*100)+'%'; s.style.bottom=(-10-r()*20)+'%';
    s.style.animationDuration=(6+r()*7)+'s'; s.style.animationDelay=(-r()*10)+'s';
    s.style.opacity=(.3+r()*.5); s.style.transform=`scale(${.6+r()*1.2})`;
    host.appendChild(s); }
}

/* ═══════════════ LEADERBOARD 데이터 ═══════════════ */
const AV=['#6C5CE7','#4F46E5','#22C55E','#EF4444','#F59E0B','#38BDF8','#EC4899','#14B8A6','#8B5CF6','#F97316'];
const avc=n=>AV[[...n].reduce((a,c)=>a+c.charCodeAt(0),0)%AV.length];
const ini=n=>{const s=n.replace(/[^가-힣A-Za-z0-9]/g,'');return /[가-힣]/.test(s)?s.slice(-2):s.slice(0,2).toUpperCase();};
// {name,tier,ret,acc,sharpe,badge,ai,me}
const BOARD=[
  {name:'QuantMaster', tier:'master', ret:14.25, acc:72, sharpe:2.31, badge:'Quant Master'},
  {name:'AlphaHunter', tier:'gold',   ret:12.48, acc:69, sharpe:2.02, badge:'Beat the AI'},
  {name:'AI Portfolio',tier:'ai',     ret:10.93, acc:75, sharpe:2.44, badge:'AI Analyst', ai:true},
  {name:'MarketWizard',tier:'gold',   ret:9.21,  acc:66, sharpe:1.78, badge:'5-Streak'},
  {name:'ValueInvestor',tier:'silver',ret:8.77,  acc:62, sharpe:1.65, badge:'Consistency'},
  {name:'모멘텀헌터',   tier:'gold',   ret:8.12,  acc:64, sharpe:1.71, badge:'Beat the AI'},
  {name:'배당장인',     tier:'silver', ret:7.44,  acc:60, sharpe:1.83, badge:'Low Vol'},
  {name:'테마스나이퍼', tier:'silver', ret:6.98,  acc:58, sharpe:1.42, badge:'Rookie'},
  {name:'reba_kim',    tier:'bronze', ret:6.10,  acc:55, sharpe:1.30, badge:'—'},
  {name:'딥밸류',       tier:'bronze', ret:5.52,  acc:53, sharpe:1.24, badge:'—'},
];
const TIER_LB={bronze:'Bronze',silver:'Silver',gold:'Gold',master:'Master',legend:'Legend',ai:'AI'};
function lbRow(p,i){
  const rank=i+1, g=rank<=3?` g${rank}`:'';
  return `<tr class="${p.ai?'is-ai':''}${p.me?' is-me':''}">
    <td><span class="lb-rank${g}">${rank}</span></td>
    <td><div class="lb-user"><span class="lb-av" style="background:${p.ai?'linear-gradient(135deg,#6C5CE7,#38BDF8)':avc(p.name)}">${p.ai?'AI':ini(p.name)}</span><span class="lb-name">${p.name}</span></div></td>
    <td><span class="tier tier--${p.tier}">${TIER_LB[p.tier]}</span></td>
    <td class="r"><b class="${p.ret>=0?'up':'down'}">${sign(p.ret)}%</b></td>
    <td class="r"><span class="acc-bar"><span class="track"><span class="fill" style="width:${p.acc}%"></span></span>${p.acc}%</span></td>
    <td class="r mono">${p.sharpe.toFixed(2)}</td>
    <td class="r">${p.badge==='—'?'<span style="color:var(--dim)">—</span>':`<span class="chip chip--primary">${p.badge}</span>`}</td>
  </tr>`;
}
const SORTS={
  overall:(a,b)=>b.ret-a.ret,
  return:(a,b)=>b.ret-a.ret,
  accuracy:(a,b)=>b.acc-a.acc,
  sharpe:(a,b)=>b.sharpe-a.sharpe,
  beatai:null,
};
function renderBoard(key){
  const body=$('#lbBody'); if(!body)return;
  let list=[...BOARD];
  if(key==='beatai'){ const ai=BOARD.find(p=>p.ai); list=BOARD.filter(p=>!p.ai&&p.ret>ai.ret).sort((a,b)=>b.ret-a.ret); }
  else list.sort(SORTS[key]||SORTS.overall);
  body.innerHTML = list.length? list.map(lbRow).join('')
    : `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--muted)">아직 AI를 앞선 참가자가 없어요. 첫 주자가 되어보세요.</td></tr>`;
}
function wireBoard(){
  $$('#lbTabs button').forEach(b=>b.onclick=()=>{
    $$('#lbTabs button').forEach(x=>x.classList.toggle('is-active',x===b));
    renderBoard(b.dataset.k);
  });
  renderBoard('overall');
}

/* ═══════════════ PREDICTION 인터랙션 ═══════════════ */
function wirePredictions(){
  $$('.pred').forEach(card=>{
    const opts=$$('.opt',card), xp=+card.dataset.xp||100;
    opts.forEach(opt=>opt.addEventListener('click',ev=>{
      const picked=opt.classList.contains('is-picked');
      opts.forEach(o=>o.classList.remove('is-picked'));
      if(picked){ return; } // 토글 해제
      opt.classList.add('is-picked');
      // 참여율 바 노출
      opts.forEach(o=>{ const bar=$('.opt__bar',o); if(bar) bar.style.width=(o.dataset.pct||0)+'%'; });
      const r=ev.currentTarget.getBoundingClientRect();
      xpPop(r.left+r.width/2, r.top, '+'+xp+' XP');
      toast(`예측을 등록했어요 · ${$('.opt__lb',opt).textContent.trim()}`, xp);
    }));
  });
}

/* ═══════════════ AI BATTLE 바 애니메이션 ═══════════════ */
function wireBattle(){
  const svg=$('#battleChart'); if(svg){
    drawChart(svg,[
      {v:series(31,26,.14,3.6),color:'#6C5CE7',area:true,dot:true,w:2.6},
      {v:series(88,26,.18,4.2),color:'#22C55E',area:false,dot:true,w:2.6},
    ],{w:560,h:150,color:'#6C5CE7'});
  }
}

/* ═══════════════ 스코어 바 채우기 ═══════════════ */
function wireScore(){
  const io=new IntersectionObserver((es,ob)=>es.forEach(e=>{ if(e.isIntersecting){
    $$('.score-fill',e.target).forEach(f=>f.style.width=(f.dataset.w||0)+'%'); ob.unobserve(e.target);
  }}),{threshold:.4});
  const host=$('#scoreLegend'); host&&io.observe(host);
}

/* ═══════════════ 차트 마운트 (hero/arena) ═══════════════ */
function wireHeroCharts(){
  const a=$('#arenaChart'); if(a) drawChart(a,[
    {v:series(21,30,.2,3.2),color:'#8B7BF0',area:true,dot:true,w:2.4},
  ],{w:340,h:118,color:'#6C5CE7'});
}

/* ═══════════════ AUTH (Supabase 재사용 · 다크 모달) ═══════════════ */
const SB_URL='https://zvnnpwdfeaakhxklcjfk.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2bm5wd2RmZWFha2h4a2xjamZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMjQyNzgsImV4cCI6MjA5NzYwMDI3OH0.eMQPCeKWTO1HS2VSlHmx9Nc9BFC2LGqsqtqAPvUqzuc';
let sb=null; try{ sb=window.supabase&&window.supabase.createClient(SB_URL,SB_KEY); }catch(e){}
let authMode='login';
function openAuth(mode='login'){ authMode=mode; const ov=$('#authModal'); if(!ov)return;
  $$('#mtabs button').forEach(b=>b.classList.toggle('is-active',b.dataset.a===mode));
  $('#authTitle').textContent = mode==='signup'?'회원가입':'로그인';
  $('#authSubmit').textContent = mode==='signup'?'가입하고 아레나 입장':'로그인';
  $('#authMsg').textContent=''; $('#authMsg').className='modal__msg';
  ov.classList.add('show'); setTimeout(()=>$('#authEmail').focus(),40);
}
function closeAuth(){ $('#authModal').classList.remove('show'); }
window.openAuth=openAuth; window.closeAuth=closeAuth;
function setMsg(t,k){ const m=$('#authMsg'); if(m){m.textContent=t||'';m.className='modal__msg'+(k?' '+k:'');} }
async function doAuth(e){
  e&&e.preventDefault();
  const email=$('#authEmail').value.trim(), pw=$('#authPw').value;
  if(!email||!pw){ setMsg('이메일과 비밀번호를 입력해 주세요.','err'); return; }
  const btn=$('#authSubmit');
  if(!sb){ // 오프라인/데모 폴백
    closeAuth(); applyUser({email}); toast('데모 모드로 입장했어요.', 50); return;
  }
  btn.disabled=true; setMsg('처리 중…');
  try{
    if(authMode==='signup'){
      const {data,error}=await sb.auth.signUp({email,password:pw}); if(error)throw error;
      if(data.session){ closeAuth(); applyUser(data.session.user); toast('아레나에 합류했어요! 환영합니다.',100); }
      else setMsg('확인 메일을 보냈어요. 인증 후 로그인해 주세요.','ok');
    }else{
      const {data,error}=await sb.auth.signInWithPassword({email,password:pw}); if(error)throw error;
      closeAuth(); applyUser(data.user); toast('로그인되었습니다.');
    }
  }catch(err){ const m=(err&&err.message)||'';
    if(/Invalid login/i.test(m)) setMsg('이메일 또는 비밀번호가 올바르지 않습니다.','err');
    else if(/already registered/i.test(m)) setMsg('이미 가입된 이메일입니다. 로그인해 주세요.','err');
    else if(/at least 6/i.test(m)) setMsg('비밀번호는 6자 이상이어야 합니다.','err');
    else setMsg(m||'오류가 발생했습니다.','err');
  }finally{ btn.disabled=false; }
}
function applyUser(user){
  const chip=$('#userChip'), guest=$('#guestBtns');
  if(user){ guest.style.display='none'; chip.style.display='inline-flex';
    $('#userChip .ue').textContent=user.email; $('#userChip .ux').textContent=(user.email[0]||'U').toUpperCase(); }
  else { chip.style.display='none'; guest.style.display='inline-flex'; }
}
async function signOut(){ if(sb) await sb.auth.signOut(); applyUser(null); toast('로그아웃되었습니다.'); }
window.signOut=signOut;
function wireAuth(){
  $$('[data-auth]').forEach(b=>b.onclick=()=>openAuth(b.dataset.auth));
  $$('#mtabs button').forEach(b=>b.onclick=()=>openAuth(b.dataset.a));
  $('#authForm')&&$('#authForm').addEventListener('submit',doAuth);
  $('#authModal')&&$('#authModal').addEventListener('click',e=>{ if(e.target.id==='authModal')closeAuth(); });
  addEventListener('keydown',e=>{ if(e.key==='Escape')closeAuth(); });
  if(sb){ sb.auth.getSession().then(({data})=>applyUser(data.session&&data.session.user));
    sb.auth.onAuthStateChange((_e,s)=>applyUser(s&&s.user)); }
}

/* ═══════════════ 테마 토글 (다크 ⇄ 라이트, localStorage 저장) ═══════════════ */
function wireTheme(){
  const btn=$('#themeBtn'); if(!btn)return;
  btn.addEventListener('click',()=>{
    const isLight=document.documentElement.getAttribute('data-theme')==='light';
    const next=isLight?'dark':'light';
    if(next==='light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.removeAttribute('data-theme');
    try{localStorage.setItem('tl-theme',next);}catch(e){}
    toast(next==='light'?'라이트 모드로 전환했어요.':'다크 모드로 전환했어요.');
  });
}

/* ═══════════════ 부팅 ═══════════════ */
function boot(){
  wireChrome(); wireReveal(); wireCountUp(); wireCountdown();
  wireParticles(); wireHeroCharts(); wireBoard(); wirePredictions();
  wireBattle(); wireScore(); wireAuth(); wireTheme();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
