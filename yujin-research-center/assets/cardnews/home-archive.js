/* 홈 카드뉴스 아카이브(.cn-desk-grid) ↔ card_news 연결 — index-v2 빌드(build_v2.py)의 renderReps 위에 덧씌우는 독립 스크립트.
   · 카드뉴스가 있는 리포트 카드: 클릭 → reports.html?cn=(카드뉴스 뷰어), 제목은 카드뉴스 제목, 하단 '원문 보기' → reports.html?id=
   · 카드뉴스가 없으면 기존 동작(원문 PDF) 그대로.
   · '카드뉴스는 Private Desk에서' 태그 → desk.html#cardnews (카드뉴스는 Private Desk로 이동) */
(function(){
  var byUrl={}, loaded=false;
  var esc=function(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  var norm=function(u){return String(u||'').replace(/^https?:\/\//,'');};

  function apply(){
    if(!loaded) return;
    document.querySelectorAll('.cn-desk-grid .rcn').forEach(function(el){
      var c=byUrl[norm(el.dataset.url)]; if(!c) return;
      el.dataset.cn=c.id; el.setAttribute('tabindex','0');
      el.setAttribute('aria-label',(c.title||'카드뉴스')+' 카드뉴스 보기');
      var h=el.querySelector('h4'); if(h) h.textContent=c.title;
      var f=el.querySelector('.cnc-foot');
      if(f) f.innerHTML='<a class="rcn-src" href="reports.html'+(c.report_id?'?id='+c.report_id:'')+'" style="color:inherit;text-decoration:none">원문 보기 →</a>';
    });
  }

  // renderReps 가 다시 그릴 때마다(데이터 로드·종목명 조회 후) 재적용
  if(typeof window.renderReps==='function'){
    var orig=window.renderReps;
    window.renderReps=function(){ var r=orig.apply(this,arguments); apply(); return r; };
  }
  var grid=document.querySelector('.cn-desk-grid');
  if(grid){
    // 기존 클릭 핸들러(원문 PDF)보다 먼저 가로채기 — capture 단계
    grid.addEventListener('click',function(e){
      if(e.target.closest('a')){ e.stopPropagation(); return; }
      var c=e.target.closest('.rcn[data-cn]'); if(!c) return;
      e.stopPropagation(); e.preventDefault(); location.href='desk.html?cn='+c.dataset.cn+'#cardnews';
    },true);
    grid.addEventListener('keydown',function(e){
      if(e.key!=='Enter'&&e.key!==' ') return;
      var c=e.target.closest('.rcn[data-cn]'); if(!c||e.target.closest('a')) return;
      e.stopPropagation(); e.preventDefault(); location.href='desk.html?cn='+c.dataset.cn+'#cardnews';
    },true);
  }
  var tag=document.querySelector('a.cn-tag'); if(tag) tag.setAttribute('href','desk.html#cardnews');

  var client=(typeof sb!=='undefined'&&sb)||window.sb;
  if(!client) return;
  client.from('card_news').select('id,report_id,report_url,title').order('published_at',{ascending:false}).limit(200)
    .then(function(res){ (res.data||[]).forEach(function(c){ byUrl[norm(c.report_url)]=c; }); loaded=true; apply(); })
    .catch(function(e){ console.warn('card_news load failed',e); });
})();
