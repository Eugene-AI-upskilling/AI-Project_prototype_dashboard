/* ══════════════════════════════════════════════════════════════════════
   admin-auth.js — 관리자 화면 출입(승인된 리서치센터 직원만) + 가입 승인(실데이터)
   window.AdminGate.ready : Promise<{mode:'staff'|'demo', member}>  — admin.js 가 기다렸다가 시작한다.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  const $=(s,e=document)=>e.querySelector(s), $$=(s,e=document)=>[...e.querySelectorAll(s)], E=IL.esc;
  const DESKS=['투자전략','반도체','IT · 전기전자','글로벌','퀀트','채권 · FICC','산업재','소비재','WM 지점','기타'];
  const toast=m=>{const t=$('#toast'); if(!t) return; t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2800);};

  function overlay(html){
    let ov=$('#gateOv');
    if(!ov){ ov=document.createElement('div'); ov.id='gateOv'; ov.className='ad-gate'; document.body.appendChild(ov); }
    ov.innerHTML=`<div class="ad-gate__card" role="dialog" aria-modal="true" aria-labelledby="gateH">
      <div class="ad-gate__brand"><img src="assets/eugene-logo.png" alt="유진투자증권"/><span>Insight Lab 리서치 관리자</span></div>${html}</div>`;
    document.body.classList.add('ad-locked');
    return ov;
  }
  function unlock(){ const ov=$('#gateOv'); if(ov) ov.remove(); document.body.classList.remove('ad-locked'); }

  async function start(){
    if(!window.LA||!LA.client()) return {mode:'demo'};
    let r; try{ r=await LA.me(); }catch(e){ r={ready:false}; }
    if(r.ready===false){
      return new Promise(res=>{ overlay(`<h2 id="gateH">직원 승인 기능 준비 전</h2>
        <p>Supabase에 회원 승인 테이블(<code>lounge_members</code>)이 아직 없습니다. <code>supabase/migrations/20261027_lounge_members.sql</code>을 적용하면 직원 로그인 · 승인이 켜집니다.</p>
        <button class="btn btn--primary btn--block" id="gDemo">시연 모드로 열기</button>`);
        $('#gDemo').onclick=()=>{ unlock(); res({mode:'demo'}); }; });
    }
    const u=r.user, m=r.member;
    if(m && LA.isStaff(m)){ return {mode:'staff', member:m, user:u}; }
    return new Promise(()=>{                 // 출입 불가 — 안내만 (승인 후 새로고침)
      if(!u){
        overlay(`<h2 id="gateH">리서치센터 직원 로그인</h2><p>검수 · 승인 화면은 승인된 리서치센터 직원만 사용할 수 있습니다.</p>
          <button class="lg-google" id="gG" type="button"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>Google 계정으로 로그인</button>
          <div class="lg-or">또는 이메일</div>
          <form id="gE" onsubmit="return false"><label class="lx-field"><span>이메일</span><input class="lx-input" id="gEm" type="email" autocomplete="email"/></label>
          <label class="lx-field"><span>비밀번호</span><input class="lx-input" id="gPw" type="password" autocomplete="current-password"/></label>
          <div class="auth-msg" id="gMsg"></div><button class="btn btn--primary btn--block" type="submit">로그인</button></form>
          <p class="auth-foot"><a href="login.html">고객 로그인으로 →</a></p>`);
        $('#gG').onclick=async()=>{ const {error}=await LA.client().auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:'select_account'}}}); if(error) toast(error.message); };
        $('#gE').addEventListener('submit',async()=>{ const {error}=await LA.client().auth.signInWithPassword({email:$('#gEm').value.trim(),password:$('#gPw').value});
          if(error){ $('#gMsg').textContent=/Invalid login/i.test(error.message)?'이메일 또는 비밀번호가 맞지 않습니다.':error.message; $('#gMsg').className='auth-msg err'; } else location.reload(); });
        return;
      }
      const nm=LA.displayName(m,u);
      if(m && (m.role==='analyst'||m.role==='admin') && m.status!=='approved'){
        overlay(`<h2 id="gateH">${m.status==='rejected'?'직원 등록이 반려됐습니다':'관리자 승인 대기 중'}</h2>
          <p><b>${E(nm)}</b> (${E(u.email)}) · ${E(m.org||'')}<br/>${m.status==='rejected'?E(m.note||'관리자에게 문의해 주세요.'):'관리자가 승인하면 이 화면이 열립니다. 승인 후 새로고침해 주세요.'}</p>
          <div class="ad-gate__acts"><button class="btn btn--secondary" id="gRe">새로고침</button><button class="btn btn--secondary" id="gOut">로그아웃</button></div>`);
      } else {
        overlay(`<h2 id="gateH">직원 등록 요청</h2>
          <p><b>${E(u.email)}</b> 계정은 아직 직원으로 등록되지 않았습니다. 등록을 요청하면 관리자가 확인 후 승인합니다.${m&&m.role==='customer'?'<br/><span class="lx-muted">이 계정은 고객으로 가입돼 있습니다. 요청하면 직원 등록으로 바뀝니다.</span>':''}</p>
          <form id="gReq" onsubmit="return false">
            <label class="lx-field"><span>이름</span><input class="lx-input" id="gNm" value="${E(nm)}" maxlength="20"/></label>
            <label class="lx-field"><span>부서 · 담당</span><select class="lx-select" id="gDesk">${DESKS.map(d=>`<option>${d}</option>`).join('')}</select></label>
            <div class="auth-msg" id="gMsg"></div>
            <button class="btn btn--primary btn--block" type="submit">직원 등록 요청</button></form>
          <div class="ad-gate__acts"><button class="btn btn--text" id="gOut">다른 계정으로 로그인</button></div>`);
        $('#gReq').addEventListener('submit',async()=>{
          try{ await LA.request({role:'analyst', name:$('#gNm').value.trim(), seg:'직원', org:$('#gDesk').value}); location.reload(); }
          catch(e){ $('#gMsg').textContent=e.message; $('#gMsg').className='auth-msg err'; } });
      }
      const re=$('#gRe'); if(re) re.onclick=()=>location.reload();
      $('#gOut').onclick=async()=>{ await LA.signOut(); location.reload(); };
    });
  }

  /* ───────── 가입 승인 (실데이터) ───────── */
  const TYPE={am:'자산운용사',ia:'투자자문 · 일임사',dma:'DMA 전문투자자',etc:'기타 기관',hnw:'고액자산가'};
  const ST={pending:'<span class="lx-st lx-st--wait">승인 대기</span>',approved:'<span class="lx-st lx-st--ok">승인</span>',rejected:'<span class="lx-st lx-st--hold">반려</span>'};
  const fmt=t=>t?new Date(t).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
  async function renderApprovals(me){
    const sec=$('[data-view="approvals"]'); if(!sec) return;
    let rows=[]; try{ rows=await LA.list(); }catch(e){ toast('회원 목록을 불러오지 못했습니다: '+e.message); return; }
    const isAdmin=me.role==='admin';
    const row=r=>{ const staff=r.role!=='customer', can=(staff?isAdmin:true) && r.user_id!==me.user_id;
      const kind=staff?`직원 · ${E(r.org||'')}`:`${E(r.seg||'')} · ${E(TYPE[r.cust_type]||'')}`;
      const where=staff?'리서치센터':r.seg==='WM'?`${E(r.branch||'')} · 초대 코드 ${E(r.invite_code||'')}`:E(r.org||'');
      return `<tr><td><div class="t">${E(r.name||'')}</div><div class="s">${E(r.email||'')}</div></td><td>${kind}</td><td>${where}</td>
        <td class="s">${fmt(r.requested_at)}</td><td>${ST[r.status]||''}${r.role==='admin'?' <span class="ad-pill">관리자</span>':''}</td>
        <td>${r.status==='pending'&&can?`<button class="btn btn--primary ad-mini" data-dec="approved" data-uid="${r.user_id}">승인</button> <button class="btn btn--secondary ad-mini" data-dec="rejected" data-uid="${r.user_id}">반려</button>`
          : r.status!=='pending'&&can&&r.role!=='admin'?`<button class="btn btn--secondary ad-mini" data-dec="pending" data-uid="${r.user_id}">되돌리기</button>`
          : r.status==='pending'?'<span class="s">관리자 승인 필요</span>':''}</td></tr>`; };
    const pend=rows.filter(r=>r.status==='pending'), staffP=pend.filter(r=>r.role!=='customer'), custP=pend.filter(r=>r.role==='customer');
    sec.innerHTML=`
      <div class="ad-panel"><div class="ad-panel__h"><h2>고객 가입 승인 <span class="ad-pill">${custP.length}건 대기</span></h2><span class="lx-muted" style="font-size:12px">소속 확인 후 승인 · 승인 전에는 검수된 답변만 열람</span></div>
        <div class="ad-tbl-wrap"><table class="ad-tbl"><thead><tr><th>이름</th><th>유형</th><th>소속 · 지점</th><th>요청</th><th>상태</th><th></th></tr></thead>
        <tbody>${rows.filter(r=>r.role==='customer').map(row).join('')||'<tr><td colspan="6" class="lx-muted">가입 요청이 없습니다.</td></tr>'}</tbody></table></div></div>
      <div class="ad-panel" style="margin-top:18px"><div class="ad-panel__h"><h2>직원(애널리스트) 등록 <span class="ad-pill">${staffP.length}건 대기</span></h2><span class="lx-muted" style="font-size:12px">${isAdmin?'관리자만 승인할 수 있습니다':'직원 승인은 관리자 권한이 필요합니다'}</span></div>
        <div class="ad-tbl-wrap"><table class="ad-tbl"><thead><tr><th>이름</th><th>구분</th><th>소속</th><th>요청</th><th>상태</th><th></th></tr></thead>
        <tbody>${rows.filter(r=>r.role!=='customer').map(row).join('')}</tbody></table></div></div>`;
    const n=$('.ad-link[data-v="approvals"] .n'); if(n){ n.textContent=pend.length; n.classList.toggle('hot',pend.length>0); }
  }

  document.addEventListener('click',async e=>{
    const b=e.target.closest('[data-dec]'); if(!b||!window.__adminMe) return;
    b.disabled=true;
    try{ await LA.decide(b.dataset.uid, b.dataset.dec); toast({approved:'승인했습니다. 고객이 다시 들어오면 바로 열립니다.',rejected:'반려했습니다.',pending:'승인 대기로 되돌렸습니다.'}[b.dataset.dec]); renderApprovals(window.__adminMe); }
    catch(err){ toast(err.message); b.disabled=false; }
  });

  window.AdminGate={ ready:start().then(g=>{
    if(g.mode==='staff'){
      window.__adminMe=g.member;
      const meBox=$('.ad-me');
      const drawMe=()=>{ const m=g.member; if(!meBox) return;
        meBox.innerHTML=`<span class="av">${E((m.name||'?')[0])}</span><div style="min-width:0"><b>${E(m.name)}</b><span>${E(m.org||'리서치센터')} · ${m.role==='admin'?'관리자':'애널리스트'}</span></div>
          <button class="ad-out" id="adName" title="이름 · 부서 수정">✎</button><button class="ad-out" id="adOut" title="로그아웃">↩</button>`;
        $('#adOut').onclick=async()=>{ await LA.signOut(); location.reload(); };
        $('#adName').onclick=()=>{ meBox.innerHTML=`<form id="adNameF" class="ad-namef" onsubmit="return false"><input class="lx-input" id="adNm" value="${E(m.name)}" maxlength="20" aria-label="이름"/>
            <input class="lx-input" id="adDept" value="${E(m.org||'')}" maxlength="20" placeholder="부서" aria-label="부서"/><div><button class="btn btn--primary ad-mini">저장</button> <button type="button" class="btn btn--secondary ad-mini" id="adCancel">취소</button></div></form>`;
          $('#adNm').focus(); $('#adCancel').onclick=drawMe;
          $('#adNameF').addEventListener('submit',async()=>{ try{ g.member=await LA.request({role:m.role==='customer'?'customer':'analyst', name:$('#adNm').value.trim(), seg:'직원', org:$('#adDept').value.trim()});
              window.__adminMe=g.member; toast('이름을 바꿨습니다.'); drawMe(); }catch(e){ toast(e.message); } }); }; };
      drawMe();
      renderApprovals(g.member);
    }
    return g; }), renderApprovals };
})();
