/* ══════════════════════════════════════════════════════════════════════
   partials.js — 서브페이지 공용 chrome (nav · 모바일 drawer · footer ·
   auth 모달 · toast) + Supabase 인증 + 공용 헬퍼.
   서브페이지는 <script src="assets/partials.js"></script> 한 줄로 아래를 공유한다.
   - 전역 노출: $, $$, fmt, sign, dirCls, dirBadge, noDec, toast, soon,
     openAuth, closeAuth, signOut, sb(Supabase client), getUser(), onAuth(cb)
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  /* ───────── 공용 헬퍼 (index.html과 동일 규약) ───────── */
  const $  = (s,e=document)=>e.querySelector(s);
  const $$ = (s,e=document)=>[...e.querySelectorAll(s)];
  const fmt  = (n,d=2)=>Number(n).toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d});
  const sign = n=>(n>=0?'+':'')+fmt(n);
  const dirCls   = v=>String(v).trim().startsWith('-')?'down':'up';
  const dirBadge = v=>String(v).trim().startsWith('-')?'badge--down':'badge--up';
  const noDec    = v=>(v==null?v:String(v).replace(/\.\d+/,''));
  Object.assign(window,{$,$$,fmt,sign,dirCls,dirBadge,noDec});

  /* ───────── 네비게이션: Home · Events · Research (+ 기관 고객만 Quant Studio) ─────────
     고객 유형은 il.session.persona (hnw = WM, 나머지 = 법인·기관).
     Research = 시황 중심 화면(market.html, 기관=종목 이벤트 · WM=테마). 개인 화면은 이름 옆 Private Desk(desk.html) 하나.
     예전 하위 페이지 목록(프로필 메뉴 · 드로어의 보조 링크)은 없앴다. */
  let SESSION=null; try{ SESSION=JSON.parse(localStorage.getItem('il.session')||'null'); }catch(e){}
  const IS_WM = !!SESSION && SESSION.persona==='hnw';
  const NAV = [
    ['home.html','Home'],
    ['conferences.html','Events'],
    ['market.html','Research'],
    ...(IS_WM ? [] : [['quant.html','Quant Studio']]),
  ];
  /* 메뉴에 없는 페이지 → 어느 상단 메뉴에 속하는지 (브레드크럼 · 현재 메뉴 표시) */
  const PARENT = {'reports.html':'market.html','global.html':'market.html','league.html':IS_WM?'market.html':'quant.html'};
  const HERE = (location.pathname.split('/').pop()||'index.html').toLowerCase();
  const ACTIVE = PARENT[HERE] || HERE;
  const navLinks = NAV.map(([h,l])=>`<a href="${h}"${h===ACTIVE?' class="is-current" aria-current="page"':''}>${l}</a>`).join('');
  const drawerLinks = NAV.map(([h,l])=>`<a href="${h}" data-close${h===ACTIVE?' aria-current="page"':''}>${l}</a>`).join('')
    + `<a href="desk.html" data-close${HERE==='desk.html'?' aria-current="page"':''}>Private Desk</a>`;

  const BRAND = `<span class="nav__brand">
      <img class="nav__logoimg" src="assets/eugene-logo.png" alt="유진투자증권" />
      <span class="nav__divider"></span>
      <span class="nav__sub">Insight Lab</span>
    </span>`;

  /* ───────── chrome 주입 ───────── */
  function mount(){
    // NAV (디자인 C: 현재메뉴 pill)
    const header=document.createElement('header');
    header.className='nav nav--pill'+(document.body.dataset.nav==='dark'?' nav--dark':'');   // <body data-nav="dark">: 아래 네이비 영역과 같은 색
    header.innerHTML=`
      <a href="home.html" style="text-decoration:none" aria-label="Insight Lab 홈">${BRAND}</a>
      <nav class="nav__links" aria-label="주 메뉴">${navLinks}</nav>
      <div class="nav__spacer"></div>
      <div class="nav__auth">
        <span id="navUser" style="display:none;align-items:center;gap:12px">
          ${SESSION&&(SESSION.role==='analyst'||SESSION.role==='admin')?'<a class="btn btn--text nav__logout" href="admin.html">관리자</a>':''}
          <a class="btn btn--text nav__logout nav__desk" href="desk.html"${HERE==='desk.html'?' aria-current="page"':''}>Private Desk</a>
          <a class="nav-prof__btn" href="desk.html" id="profBtn" style="text-decoration:none" aria-label="Private Desk로 이동">
            <span class="nav-prof__av" id="profAv" aria-hidden="true"></span><span id="navEmail"></span>
          </a>
          <button class="btn btn--text nav__logout" type="button" onclick="signOut()">로그아웃</button>
        </span>
        <span id="navGuest" style="display:inline-flex;align-items:center;gap:12px">
          <button class="btn btn--primary btn--sm" onclick="openAuth('login')">로그인</button>
        </span>
      </div>
      <button class="nav__burger" id="navBurger" aria-label="메뉴 열기" aria-expanded="false" aria-controls="mnav">
        <svg viewBox="0 0 24 24" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>`;

    // MOBILE DRAWER
    const mnav=document.createElement('div');
    mnav.className='mnav'; mnav.id='mnav'; mnav.setAttribute('aria-hidden','true');
    mnav.innerHTML=`
      <div class="mnav__scrim" data-close></div>
      <nav class="mnav__panel" role="dialog" aria-modal="true" aria-label="모바일 메뉴">
        <div class="mnav__head">${BRAND}<button class="auth-x" data-close aria-label="메뉴 닫기">×</button></div>
        ${drawerLinks}
        <div class="mnav__cta" id="mnavCta">
          <button class="btn btn--primary btn--block" data-close onclick="openAuth('login')">로그인</button>
        </div>
      </nav>`;

    // FOOTER
    const footer=document.createElement('footer');
    footer.className='footer';
    footer.innerHTML=`
      <div class="wrap">
        <div class="top">${BRAND}<span class="badge badge--muted">유진투자증권 리서치센터</span></div>
        <p class="disc">
          이 화면의 리포트·수치·백테스트 결과는 정보 제공을 위한 자료이며, 투자를 권유하는 내용은 아니에요. 과거의 성과가 미래의 수익을 보장하지는 않아요.
          금융투자상품은 원금 손실이 발생할 수 있어요. 투자에 대한 최종 판단과 책임은 투자자 본인에게 있어요.<br/>
          © 2026 Yujin Investment &amp; Securities Co., Ltd. · 리서치센터
        </p>
      </div>`;

    // AUTH MODAL
    const auth=document.createElement('div');
    auth.className='auth-overlay'; auth.id='authOverlay';
    auth.addEventListener('click',e=>{ if(e.target===auth) closeAuth(); });
    auth.innerHTML=`
      <div class="auth-modal" role="dialog" aria-modal="true">
        <div class="auth-modal__head">
          <img class="nav__logoimg" src="assets/eugene-logo.png" alt="유진투자증권" style="height:24px" />
          <span class="nav__divider"></span>
          <span style="font-weight:800;color:var(--blue-cta);font-size:15px">Insight Lab</span>
          <button class="auth-x" onclick="closeAuth()" aria-label="닫기">×</button>
        </div>
        <div class="tabs" id="authTabs" style="width:100%">
          <button data-a="login" class="is-active" style="flex:1">로그인</button>
          <button data-a="signup" style="flex:1">회원가입</button>
        </div>
        <form id="authForm" onsubmit="return false">
          <div class="field"><label>이메일</label><input class="auth-input" id="authEmail" type="email" placeholder="you@example.com" autocomplete="email" /></div>
          <div class="field"><label>비밀번호</label><input class="auth-input" id="authPw" type="password" placeholder="6자 이상" autocomplete="current-password" /></div>
          <div id="authMsg" class="auth-msg"></div>
          <button class="btn btn--primary btn--block" id="authSubmit" type="submit">로그인</button>
        </form>
        <p class="auth-foot">가입 시 정보 제공·투자 위험 고지에 동의하게 돼요. 본 화면은 시연용 프로토타입이에요.</p>
      </div>`;

    const toastEl=document.createElement('div'); toastEl.className='toast'; toastEl.id='toast';
    const fab=document.createElement('button'); fab.className='fab'; fab.setAttribute('aria-label','맨 위로');
    fab.innerHTML=`<svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>`;
    fab.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

    // 브레드크럼 (홈 › 현재 페이지)
    const curEntry = NAV.find(([h])=>h===HERE), parent = NAV.find(([h])=>h===PARENT[HERE]);
    const curLabel = curEntry ? curEntry[1] : (document.title.split('·')[0].trim());
    const crumb=document.createElement('nav'); crumb.className='crumb'; crumb.setAttribute('aria-label','위치');
    crumb.innerHTML=`<a href="home.html" class="back"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>Home</a>
      ${parent?`<span class="sep">›</span><a href="${parent[0]}">${parent[1]}</a>`:''}
      <span class="sep">›</span><span class="here" aria-current="page">${curLabel}</span>`;

    // 페이지 헤더 밴드 — <body data-page-title="..." data-page-eyebrow="..." data-page-desc="..."> 있으면 주입
    let phead=null;
    const pt=document.body.dataset.pageTitle;
    if(pt){
      const eyebrow=document.body.dataset.pageEyebrow||'';
      const desc=document.body.dataset.pageDesc||'';
      phead=document.createElement('section'); phead.className='phead';
      phead.innerHTML=`<div class="wrap">
        <div class="phead__t">
          ${eyebrow?`<div class="eyebrow">${eyebrow}</div>`:''}
          <h1>${pt}</h1>
          ${desc?`<p>${desc}</p>`:''}
        </div>
        <button class="btn btn--home" onclick="location.href='home.html'">홈으로 ↩</button>
      </div>`;
    }

    // 순서: skip → nav → drawer → 브레드크럼 → (헤더 밴드) → [기존 body 콘텐츠] → footer → auth → toast → fab
    const skip=document.createElement('a'); skip.className='skip'; skip.href='#main'; skip.textContent='본문 바로가기';
    const frag=document.createDocumentFragment();
    frag.append(skip, header, mnav);
    if(!document.body.hasAttribute('data-no-crumb')) frag.append(crumb);
    if(phead) frag.append(phead);
    document.body.insertBefore(frag, document.body.firstChild);
    document.body.append(footer, auth, toastEl, fab);

    wireDrawer(); wireFab(fab); wireNavShadow(header); wireTabsA11y(); wireAuthUI(); wireProfile();
  }

  /* ───────── toast / soon ───────── */
  let toastT;
  function toast(msg){ const t=$('#toast'); if(!t)return; t.textContent=msg; t.classList.add('show');
    clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2400); }
  function soon(label){ toast(`${label}은(는) 정식 오픈 시 제공돼요. 지금은 미리보기 화면이에요.`); }
  Object.assign(window,{toast,soon});

  /* ───────── 모바일 드로어 (ESC · 포커스 트랩) ───────── */
  function wireDrawer(){
    const burger=$('#navBurger'), mnav=$('#mnav'); if(!burger||!mnav) return;
    const panel=$('.mnav__panel',mnav); let lastFocus=null;
    const focusables=()=>$$('a[href],button:not([disabled])',panel);
    function open(){ lastFocus=document.activeElement; mnav.classList.add('show'); mnav.setAttribute('aria-hidden','false');
      burger.setAttribute('aria-expanded','true'); document.body.style.overflow='hidden';
      const f=focusables(); if(f.length)f[0].focus(); document.addEventListener('keydown',onKey); }
    function close(){ mnav.classList.remove('show'); mnav.setAttribute('aria-hidden','true');
      burger.setAttribute('aria-expanded','false'); document.body.style.overflow='';
      document.removeEventListener('keydown',onKey); if(lastFocus&&lastFocus.focus)lastFocus.focus(); }
    function onKey(e){ if(e.key==='Escape'){close();return;}
      if(e.key==='Tab'){ const f=focusables(); if(!f.length)return; const first=f[0],last=f[f.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();} } }
    burger.addEventListener('click',open);
    $$('[data-close]',mnav).forEach(el=>el.addEventListener('click',close));
    window.syncMnavCta=function(user){ const cta=$('#mnavCta'); if(!cta)return;
      cta.innerHTML = user
        ? `<div style="font-size:var(--text-body);color:var(--color-muted);padding:0 2px 6px">${user.email}</div>
           <a class="btn btn--secondary btn--block" href="desk.html">Private Desk</a>
           <button class="btn btn--secondary btn--block" data-close onclick="signOut()">로그아웃</button>`
        : `<button class="btn btn--secondary btn--block" data-close onclick="openAuth('login')">로그인</button>
           <button class="btn btn--primary btn--block" data-close onclick="openAuth('signup')">회원가입</button>`;
      $$('[data-close]',cta).forEach(el=>el.addEventListener('click',close)); };
  }

  /* ───────── 사용자 이름 = Private Desk 바로가기 (드롭다운 서브메뉴 없음) ───────── */
  function wireProfile(){
    const btn=$('#profBtn'); if(!btn) return;
    const s=SESSION||{};
    $('#profAv').textContent=(s.name||'고객').slice(0,1);
    btn.title=`${s.name||'고객'}님의 Private Desk`;
    if(HERE==='desk.html') btn.setAttribute('aria-current','page');
  }

  /* ───────── nav 스크롤 그림자 + FAB ───────── */
  function wireNavShadow(nav){ const on=()=>nav.classList.toggle('scrolled',window.scrollY>8);
    window.addEventListener('scroll',on,{passive:true}); on(); }
  function wireFab(fab){ const on=()=>fab.classList.toggle('show',window.scrollY>480);
    window.addEventListener('scroll',on,{passive:true}); on(); }

  /* ───────── 탭 a11y (role/aria/roving tabindex/←→) ───────── */
  function wireTabsA11y(){
    $$('.tabs').forEach(tl=>{
      tl.setAttribute('role','tablist');
      const tabs=$$('button',tl);
      const sync=()=>tabs.forEach(t=>{const on=t.classList.contains('is-active');
        t.setAttribute('aria-selected',on?'true':'false'); t.setAttribute('tabindex',on?'0':'-1');});
      tabs.forEach(t=>{t.setAttribute('role','tab'); t.addEventListener('click',sync);});
      sync();
      tl.addEventListener('keydown',e=>{ if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return; e.preventDefault();
        const i=tabs.indexOf(document.activeElement); if(i<0)return;
        const n=(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); });
    });
  }
  // 서브페이지가 탭을 동적으로 추가한 뒤 호출할 수 있도록 노출
  window.wireTabsA11y = wireTabsA11y;

  /* ═════════ SUPABASE — auth ═════════ */
  const SUPABASE_URL='https://zvnnpwdfeaakhxklcjfk.supabase.co';
  const SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2bm5wd2RmZWFha2h4a2xjamZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMjQyNzgsImV4cCI6MjA5NzYwMDI3OH0.eMQPCeKWTO1HS2VSlHmx9Nc9BFC2LGqsqtqAPvUqzuc';
  let sb=null, currentUser=null; const authCbs=[];
  try { sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON); } catch(e){ console.warn('supabase init failed', e); }
  window.sb = sb;
  window.getUser = ()=>currentUser;
  window.onAuth = cb=>{ authCbs.push(cb); if(currentUser!==undefined) cb(currentUser); };

  let authMode='login';
  /* 라운지 프로토타입: 로그인 · 회원가입은 고객 유형을 고르는 login.html로 보낸다 (기존 모달은 openAuthModal로 남김) */
  function openAuth(mode='login'){ location.href='login.html'+(mode==='signup'?'?mode=signup':''); }
  function openAuthModal(mode='login', email=''){ authMode=mode;
    $$('#authTabs button').forEach(b=>b.classList.toggle('is-active',b.dataset.a===mode));
    $('#authSubmit').textContent = mode==='signup' ? '회원가입' : '로그인';
    $('#authEmail').value=email||''; $('#authPw').value=''; setAuthMsg('');
    $('#authOverlay').classList.add('show');
    setTimeout(()=>$(email?'#authPw':'#authEmail').focus(),50); }
  function closeAuth(){ $('#authOverlay').classList.remove('show'); }
  function setAuthMsg(t,kind){ const m=$('#authMsg'); if(!m)return; m.textContent=t||''; m.className='auth-msg'+(kind?(' '+kind):''); }
  Object.assign(window,{openAuth,closeAuth});

  async function doAuth(){
    if(!sb){ setAuthMsg('연결 오류: 잠시 후 다시 시도해주세요.','err'); return; }
    const email=$('#authEmail').value.trim(), pw=$('#authPw').value;
    if(!email||!pw){ setAuthMsg('이메일과 비밀번호를 입력해주세요.','err'); return; }
    $('#authSubmit').disabled=true; setAuthMsg('처리 중…');
    try{
      if(authMode==='signup'){
        const {data,error}=await sb.auth.signUp({email,password:pw}); if(error) throw error;
        if(data.session){ closeAuth(); toast('가입 완료! 환영해요.'); }
        else { setAuthMsg('확인 메일을 보냈어요. 메일함에서 인증 후 로그인해주세요.','ok'); }
      }else{
        const {error}=await sb.auth.signInWithPassword({email,password:pw}); if(error) throw error;
        closeAuth(); toast('로그인됐어요.');
      }
    }catch(err){ const msg=(err&&err.message)||'';
      if(/Invalid login/i.test(msg)) setAuthMsg('이메일 또는 비밀번호가 올바르지 않아요.','err');
      else if(/already registered/i.test(msg)) setAuthMsg('이미 가입된 이메일이에요. 로그인해주세요.','err');
      else if(/at least 6/i.test(msg)) setAuthMsg('비밀번호는 6자 이상으로 입력해주세요.','err');
      else setAuthMsg(msg||'오류가 발생했어요.','err');
    }finally{ $('#authSubmit').disabled=false; }
  }
  /* 라운지 프로토타입 세션 (login.html이 저장) */
  const NAMES={am:'김민준',ia:'이서연',dma:'박지훈',hnw:'최은정'};
  function navName(u){ let s=null; try{ s=JSON.parse(localStorage.getItem('il.session')||'null'); }catch(e){}
    const m=u&&u.user_metadata||{}; const nm=(s&&s.name)||m.full_name||m.name||(u&&u.email||'').split('@')[0]||'';
    return nm?nm+'님':''; }
  function loungeUser(){ try{ const s=JSON.parse(localStorage.getItem('il.session')||'null');
    return s&&s.persona ? {email:`${s.name||NAMES[s.persona]||'고객'}님`, lounge:true} : null; }catch(e){ return null; } }
  window.signOut = async function(){ if(sb){ await sb.auth.signOut(); }
    try{ localStorage.removeItem('il.session'); }catch(e){}
    toast('로그아웃됐어요.'); updateAuthUI(null);
    setTimeout(()=>location.href='index.html?entry=1',500); };

  function updateAuthUI(user){ currentUser=user||null;           // getUser()는 실제 Supabase 사용자만 반환
    const shown=currentUser||loungeUser();                        // 헤더 표시는 라운지 시연 세션도 포함
    const guest=$('#navGuest'), u=$('#navUser');
    if(shown){ guest.style.display='none'; u.style.display='inline-flex'; const el=$('#navEmail'); el.textContent=currentUser?navName(currentUser):shown.email; el.title=currentUser?currentUser.email:''; }
    else { u.style.display='none'; guest.style.display='inline-flex'; }
    if(window.syncMnavCta)window.syncMnavCta(shown);
    authCbs.forEach(cb=>{ try{cb(currentUser);}catch(e){console.warn(e);} });
  }

  function wireAuthUI(){
    $$('#authTabs button').forEach(b=>b.onclick=()=>openAuthModal(b.dataset.a,$('#authEmail').value));
    $('#authForm').addEventListener('submit',doAuth);
    // 모달 ESC + 포커스 트랩
    const ov=$('#authOverlay'), modal=$('.auth-modal',ov);
    const aFoc=()=>$$('a[href],button:not([disabled]),input:not([disabled])',modal);
    let authLast=null; const _open=window.openAuth, _close=window.closeAuth;
    window.openAuth=function(){ authLast=document.activeElement; return _open.apply(this,arguments); };
    window.closeAuth=function(){ const r=_close.apply(this,arguments); if(authLast&&authLast.focus)authLast.focus(); return r; };
    document.addEventListener('keydown',e=>{ if(!ov.classList.contains('show'))return;
      if(e.key==='Escape'){ closeAuth(); return; }
      if(e.key==='Tab'){ const f=aFoc(); if(!f.length)return; const first=f[0],last=f[f.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();} } });
    if(sb){ sb.auth.getSession().then(({data})=>updateAuthUI(data.session&&data.session.user));
      sb.auth.onAuthStateChange((_e,session)=>updateAuthUI(session&&session.user)); }
    else { updateAuthUI(null); }
  }

  /* AI 아나운서(renderAnchor)는 assets/anchor.js 로 분리 — 각 페이지가 별도 로드 */

  /* ───────── 부팅 ───────── */
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount);
  else mount();
})();
