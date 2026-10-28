/* ══════════════════════════════════════════════════════════════════════
   config.js — 서버 주소 한 곳에서 관리 (마스터 문서 D3: 정적 사이트 Netlify + 서버 Railway)
   apiBase   : lounge_api 주소. 비우면 같은 출처(로컬 python -m lounge_api.server). 서버가 없으면 정적 스냅샷으로 동작.
   jarvisUrl : Jarvis(Next.js) 주소. 비우면 홈 Hero는 내장 홀로그램(대체 화면)으로 동작.
   서버 주소가 바뀌면 아래 두 값만 바꾼다. API 키는 여기에 두지 않는다(서버 환경변수).
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  var local=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  window.IL_CONFIG=Object.assign({
    // 배포 서버: Render (저장소 codikids/eugene-insightlab-servers, render.yaml). 로컬은 같은 출처 lounge_api + jarvis dev(3300)
    apiBase: local ? '' : 'https://eugene-lounge-api.onrender.com',
    jarvisUrl: local ? 'http://localhost:3300' : 'https://eugene-jarvis.onrender.com'
  }, window.IL_CONFIG||{});
})();
