/* ══════════════════════════════════════════════════════════════════════
   login.js — 법인/WM 고객 유형 · 이름 · 소속 → Google · 이메일 로그인 → 승인 확인
   진입 페이지(index.html)의 [data-login-root] 안에서 동작한다. login.html은 index.html로 넘긴다.
   승인 상태는 시연 모드(il.session). ?demo_status=pending|rejected 로 대기 · 제한 화면을 볼 수 있다.
   승인되면 home.html(또는 로그인 전에 열려던 페이지 il.return)로 이동.
   ══════════════════════════════════════════════════════════════════════ */
(async function(){
  'use strict';
  const ROOT=document.querySelector('[data-login-root]'); if(!ROOT) return;
  const $=(s,e=ROOT)=>e.querySelector(s), $$=(s,e=ROOT)=>[...e.querySelectorAll(s)];
  const DEMO_STATUS=(new URLSearchParams(location.search).get('demo_status')||'').toLowerCase();
  const demoStatus=()=>['pending','rejected'].includes(DEMO_STATUS)?DEMO_STATUS:'approved';
  const st={seg:null,type:null};
  const LABEL={am:'법인 · 자산운용사',ia:'법인 · 투자자문 · 일임사',dma:'법인 · DMA 전문투자자',etc:'법인 · 기타 기관',hnw:'WM · 고액자산가'};
  const PMAP={am:'am',ia:'ia',dma:'dma',etc:'am',hnw:'hnw'};
  const PENDING='il.pending';
  const sb=LA.client();
  function toast(m){const t=document.getElementById('toast'); if(!t) return;t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2800);}
  function msg(t,kind){ const m=$('#authMsg'); m.textContent=t||''; m.className='auth-msg'+(kind?' '+kind:''); }

  let googleOn=false;
  try{ const r=await fetch('https://zvnnpwdfeaakhxklcjfk.supabase.co/auth/v1/settings',{headers:{apikey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2bm5wd2RmZWFha2h4a2xjamZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMjQyNzgsImV4cCI6MjA5NzYwMDI3OH0.eMQPCeKWTO1HS2VSlHmx9Nc9BFC2LGqsqtqAPvUqzuc'}}); googleOn=!!((await r.json()).external||{}).google; }catch(e){}

  /* ── 단계 ── */
  function go(p){
    $$('.lg-pane').forEach(x=>x.classList.toggle('on',x.dataset.p===p));
    const n=p[0];
    $$('.lg-steps .s').forEach(s=>{const k=s.dataset.s;s.classList.toggle('on',k===n);s.classList.toggle('done',k<n);});
    const f=$(`.lg-pane[data-p="${p}"] input, .lg-pane[data-p="${p}"] button`); if(f) f.focus({preventScroll:true});
  }
  window.ILLogin={go};
  $$('.lg-seg').forEach(b=>b.addEventListener('click',()=>{
    st.seg=b.dataset.seg; $$('.lg-seg').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-checked',on);});
    $('#to2').disabled=false; }));
  $('#to2').addEventListener('click',()=>{ if(st.seg==='wm') st.type='hnw'; go(st.seg==='wm'?'2wm':'2corp'); });
  $$('.lg-pane[data-p="2corp"] .lg-type').forEach(b=>b.addEventListener('click',()=>{
    st.type=b.dataset.type; $$('.lg-pane[data-p="2corp"] .lg-type').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-checked',on);});
    $('#to3c').disabled=false; }));
  const nameVal=()=>(st.seg==='wm'?$('#nameWm'):$('#nameCorp')).value.trim();
  function profile(){
    return st.seg==='wm'
      ? {role:'customer', name:nameVal(), seg:'WM', cust_type:'hnw', persona:'hnw', branch:$('#branchIn').value, invite_code:$('#codeIn').value.trim()}
      : {role:'customer', name:nameVal(), seg:'법인', cust_type:st.type, persona:PMAP[st.type]||'am', org:$('#orgIn').value.trim()};
  }
  function toStep3(){
    if(nameVal().length<2){ toast('이름을 입력해 주세요.'); (st.seg==='wm'?$('#nameWm'):$('#nameCorp')).focus(); return; }
    if(st.seg==='wm' && !$('#codeIn').value.trim()){ toast('초대 코드를 입력해 주세요.'); return; }
    if(st.seg!=='wm' && !$('#orgIn').value.trim()){ toast('소속 기관명을 입력해 주세요.'); $('#orgIn').focus(); return; }
    $('#selName').textContent=`${nameVal()} · ${LABEL[st.type]||''}`;
    $('#selSub').textContent= st.seg==='wm' ? `${$('#branchIn').value} · 초대 코드 ${$('#codeIn').value.trim()} · 승인 후 이용` : `${$('#orgIn').value.trim()} · 소속 확인 후 승인`;
    go('3'); }
  $('#to3c').addEventListener('click',toStep3);
  $('#to3w').addEventListener('click',toStep3);
  $$('[data-back]').forEach(b=>b.addEventListener('click',()=>{ const k=b.dataset.back; go(k==='2'?(st.seg==='wm'?'2wm':'2corp'):'1'); }));

  /* ── 진입: 승인 → 홈(또는 원래 가려던 페이지), 대기 · 제한 → 같은 패널의 안내 ── */
  function home(){ let r=null; try{ r=sessionStorage.getItem('il.return'); sessionStorage.removeItem('il.return'); }catch(e){}
    return r && /^[\w./?=&%#-]+$/.test(r) && !/^\/\//.test(r) ? r : 'home.html'; }   // 같은 출처 상대경로만
  function showWait(s){
    const rej=s.status==='rejected';
    $('#waitBadge').textContent=rej?'이용 제한':'승인 대기'; $('#waitBadge').dataset.kind=rej?'rej':'wait';
    $('#waitH').textContent=rej?'지금은 이용할 수 없습니다':'소속 확인 중입니다';
    $('#waitLead').textContent=rej?'입력하신 소속 정보로는 이용이 승인되지 않았습니다. 담당 영업점이나 리서치센터에 문의해 주세요.'
                                  :'리서치센터가 소속을 확인한 뒤 승인합니다(1영업일). 승인되면 Insight Lab 홈이 열립니다.';
    $('#waitName').textContent=`${s.name||'고객'} · ${LABEL[s.persona==='hnw'?'hnw':(s.cust_type||s.persona)]||''}`;
    $('#waitSub').textContent=s.persona==='hnw'?`${s.branch||''} · WM 고객`:`${s.org||''} · 법인 고객`;
    go('wait'); const h=$('#waitH'); if(h) h.focus({preventScroll:true});
  }
  function enter(m, via, u){
    const s={persona:m.persona||'am', via, at:Date.now(), email:u&&u.email||'', uid:u&&u.id||'', name:m.name||'',
      org:m.org||'', branch:m.branch||'', cust_type:m.cust_type||'', status:m.status||'pending', role:m.role||'customer'};
    IL.setSession(s);
    try{ localStorage.removeItem(PENDING); }catch(e){}
    if(s.status!=='approved'){ showWait(s); return; }
    toast(via==='demo' ? '시연 모드로 들어갑니다.' : `${m.name}님, 환영합니다.`);
    setTimeout(()=>location.href=home(),700);
  }
  $('#waitApprove').addEventListener('click',()=>{ const s=IL.getSession()||{}; s.status='approved'; IL.setSession(s); location.href=home(); });
  $('#waitReset').addEventListener('click',()=>{ IL.clearSession(); go('1'); });
  window.ILLogin.showWait=showWait;

  /* 로그인된 사용자 → 회원 확인 · 없으면 가입 요청 */
  async function afterAuth(u, via, meta){
    const r=await LA.me();
    if(r.member && !meta){ LA.syncSession(r.member,u); enter(r.member, via, u); return true; }
    if(!meta) return false;                                   // 회원 아님 · 아직 유형 선택 전
    if(!r.ready){                                              // 승인 테이블 미적용 → 계정 정보에만 저장
      await sb.auth.updateUser({data:{lounge:meta}}).catch(()=>{});
      enter({...meta, status:demoStatus()}, via, u); return true;   // 시연 모드(D4): 승인 테이블 없이 진입
    }
    try{ const m=await LA.request(meta); LA.syncSession(m,u); enter(m, via, u); return true; }
    catch(e){ toast('가입 요청 실패: '+e.message); return false; }
  }

  /* Google */
  $('#google').addEventListener('click',async()=>{
    if(!$('#agreeIn').checked){ toast('필수 동의에 체크해 주세요.'); return; }
    const meta=profile();
    if(!googleOn||!sb){ toast('Google 로그인은 관리자 설정 후 열립니다. 지금은 시연 모드로 들어갑니다.'); setTimeout(()=>enter({...meta,status:demoStatus()},'demo'),900); return; }
    try{ localStorage.setItem(PENDING, JSON.stringify(meta)); }catch(e){}
    const {error}=await sb.auth.signInWithOAuth({provider:'google',
      options:{redirectTo:location.origin+location.pathname.replace(/[^/]*$/,'')+'index.html?oauth=1', queryParams:{prompt:'select_account'}}});
    if(error) toast('Google 로그인을 시작하지 못했습니다: '+error.message);
  });

  /* 이메일 (없으면 가입) */
  $('#emailForm').addEventListener('submit',async()=>{
    const email=$('#emIn').value.trim(), pw=$('#pwIn').value;
    if(!$('#agreeIn').checked){ msg('필수 동의에 체크해 주세요.','err'); return; }
    if(!email||pw.length<6){ msg('이메일과 6자 이상 비밀번호를 입력해 주세요.','err'); return; }
    if(!sb){ msg('인증 서버에 연결할 수 없습니다.','err'); return; }
    const meta=profile(); $('#emailGo').disabled=true; msg('확인 중…');
    try{
      let {data,error}=await sb.auth.signInWithPassword({email,password:pw});
      if(error && /Invalid login/i.test(error.message)){
        const r=await sb.auth.signUp({email,password:pw,options:{data:{full_name:meta.name}}});
        if(r.error) throw r.error;
        if(!r.data.session){ try{ localStorage.setItem(PENDING, JSON.stringify(meta)); }catch(e){} msg('가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 다시 로그인해 주세요.','ok'); return; }
        data=r.data;
      } else if(error) throw error;
      await afterAuth(data.user,'email',meta);
    }catch(e){
      const m=e.message||'';
      msg(/already registered/i.test(m)?'이미 가입된 이메일입니다. 비밀번호를 확인해 주세요.':/Email not confirmed/i.test(m)?'메일 인증 후 로그인할 수 있어요.':m||'오류가 발생했습니다.','err');
    }finally{ $('#emailGo').disabled=false; }
  });
  $('#demoGo').addEventListener('click',()=>{ if(!st.type){ go('1'); toast('고객 유형을 먼저 골라 주세요.'); return; } enter({...profile(),status:demoStatus()},'demo'); });

  /* ── Google에서 돌아왔거나 이미 로그인된 경우 ── */
  const u=await LA.user();
  if(u){
    let pending=null; try{ pending=JSON.parse(localStorage.getItem(PENDING)||'null'); }catch(e){}
    const via=(u.app_metadata||{}).provider==='google'?'google':'email';
    if(pending && !pending.name) pending.name=LA.displayName(null,u);
    const done=await afterAuth(u, via, pending);
    if(!done){
      // 로그인은 됐지만 아직 회원 정보가 없음 → 유형 선택부터. 이름은 Google 이름으로 미리 채움
      const nm=LA.displayName(null,u); $('#nameCorp').value=nm; $('#nameWm').value=nm;
      toast(`${nm}님, 고객 유형과 소속을 알려 주세요.`);
    }
  }
  if(!googleOn) $('#google').insertAdjacentHTML('afterend','<p class="auth-foot" style="margin-top:6px">Google 로그인은 관리자 설정 후 사용할 수 있어요. 지금은 누르면 시연 모드로 들어갑니다.</p>');
  /* 대기 · 제한 세션으로 다시 왔으면 안내부터 */
  const cur=IL.getSession();
  if(cur && cur.persona && cur.status && cur.status!=='approved') showWait(cur);
})();
