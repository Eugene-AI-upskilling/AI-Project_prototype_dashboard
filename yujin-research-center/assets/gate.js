/* ══════════════════════════════════════════════════════════════════════
   gate.js — 로그인 후 페이지 보호 (시연 모드: il.session 기준 · 서버 승인은 범위 밖)
   <head>에서 다른 스크립트보다 먼저 동기 로드한다. 화면을 그리기 전에 판단해 보호 화면이 비치지 않게 한다.
   세션이 없거나 승인 전이면 지금 주소를 il.return에 담아 진입 페이지로 보낸다 → 로그인 후 그대로 복귀.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  var s=null; try{ s=JSON.parse(localStorage.getItem('il.session')||'null'); }catch(e){}
  if(s && s.persona && s.status==='approved') return;
  try{ sessionStorage.setItem('il.return',(location.pathname.split('/').pop()||'home.html')+location.search+location.hash); }catch(e){}
  location.replace('index.html?start=1');
})();
