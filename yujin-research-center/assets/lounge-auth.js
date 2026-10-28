/* ══════════════════════════════════════════════════════════════════════
   lounge-auth.js — 라운지 회원 · 승인 (Supabase Auth + public.lounge_members)
   쓰기는 RPC(lounge_request · lounge_decide)로만 한다. 테이블이 아직 없으면 ready=false 로 알려
   화면이 '승인 기능 준비 전' 안내를 띄우게 한다. (SQL: supabase/migrations/20261027_lounge_members.sql)
   전역 노출: window.LA
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  const URL_='https://zvnnpwdfeaakhxklcjfk.supabase.co';
  const ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2bm5wd2RmZWFha2h4a2xjamZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMjQyNzgsImV4cCI6MjA5NzYwMDI3OH0.eMQPCeKWTO1HS2VSlHmx9Nc9BFC2LGqsqtqAPvUqzuc';
  let sb=window.sb||null;
  if(!sb){ try{ sb=window.supabase.createClient(URL_,ANON); window.sb=sb; }catch(e){} }
  const missing=e=>!!e && /lounge_members|lounge_request|lounge_decide|does not exist|schema cache|PGRST20[02]|42P01|42883/i.test((e.code||'')+' '+(e.message||''));

  async function user(){ if(!sb) return null; const {data}=await sb.auth.getSession(); return data.session&&data.session.user||null; }

  /* 내 회원 정보: {ready, user, member} — ready=false 면 테이블 미적용 */
  async function me(){
    const u=await user();
    if(!u){ // 로그인 전: 테이블 존재만 확인 (없으면 '준비 전', 있으면 권한 오류가 정상)
      const {error}=sb?await sb.from('lounge_members').select('user_id').limit(1):{error:{message:'no client'}};
      return {ready:!missing(error), user:null, member:null}; }
    const {data,error}=await sb.from('lounge_members').select('*').eq('user_id',u.id).maybeSingle();
    if(error) return {ready:!missing(error), user:u, member:null, error};
    return {ready:true, user:u, member:data};
  }
  async function request(p){ const {data,error}=await sb.rpc('lounge_request',{p}); if(error) throw Object.assign(new Error(error.message),{missing:missing(error)}); return data; }
  async function list(){ const {data,error}=await sb.from('lounge_members').select('*').order('requested_at',{ascending:false}); if(error) throw Object.assign(new Error(error.message),{missing:missing(error)}); return data||[]; }
  async function decide(target, decision, memo){ const {data,error}=await sb.rpc('lounge_decide',{target, decision, memo:memo||null}); if(error) throw new Error(error.message); return data; }
  async function signOut(){ if(sb) await sb.auth.signOut(); try{ localStorage.removeItem('il.session'); }catch(e){} }

  /* 표시용 이름: 회원 이름 → Google 이름 → 이메일 앞부분 */
  const displayName=(member,u)=> (member&&member.name) || (u&&u.user_metadata&&(u.user_metadata.full_name||u.user_metadata.name)) || (u&&u.email||'').split('@')[0] || '';
  const isStaff=m=>!!m && (m.role==='analyst'||m.role==='admin') && m.status==='approved';

  /* 라운지 세션(localStorage)을 회원 정보로 갱신 */
  function syncSession(member,u){
    if(!member) return;
    try{
      const s=JSON.parse(localStorage.getItem('il.session')||'null')||{};
      Object.assign(s,{persona:member.persona||s.persona||'am', name:member.name, status:member.status, role:member.role,
        org:member.org||'', branch:member.branch||'', email:u&&u.email||s.email||'', uid:u&&u.id||s.uid||'', via:s.via&&s.via!=='demo'?s.via:'google'});
      localStorage.setItem('il.session',JSON.stringify(s));
    }catch(e){}
  }

  window.LA={ client:()=>sb, user, me, request, list, decide, signOut, displayName, isStaff, syncSession, missing };
})();
