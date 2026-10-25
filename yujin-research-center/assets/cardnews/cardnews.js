/* 카드뉴스 렌더러 — db_loader/cardnews/SCHEMA.md 의 JSON → 1080×1350 슬라이드 DOM.
   사이트 뷰어(cardnews.html)와 PNG 내보내기(db_loader/cardnews_push.py)가 같이 쓴다. */
(function(){
  var DISCLAIMER='본 자료는 참고용이며 특정 주식에 대한 투자 목적으로 작성된 것이 아닙니다. 정확성이나 완전성을 보장할 수 없으며, 투자 결정은 투자자 본인의 판단과 책임 하에 이루어져야 합니다. 당사의 동의 없이 무단 복제·배포를 금합니다.';
  var esc=function(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  // **강조** → <b>, 부호로 색 지정(+ 빨강 / - 파랑)
  var rich=function(x){return esc(x).replace(/\*\*(.+?)\*\*/g,function(_,t){var s=t.trim();return '<b class="'+(s[0]==='+'?'up':s[0]==='-'?'down':'')+'">'+t+'</b>';});};
  var tone=function(t){return t==='up'||t==='down'?t:'';};
  var autoTone=function(v){var s=String(v||'').trim();return s[0]==='+'?'up':(s[0]==='-'||s[0]==='−')?'down':'';};
  var num=function(x){var n=typeof x==='number'?x:parseFloat(String(x||'').replace(/[^0-9.\-]/g,''));return isFinite(n)?n:0;};
  var pct=function(n,max){return max>0?Math.max(2,Math.min(100,Math.abs(n)/max*100)).toFixed(1)+'%':'0%';};

  var B={
    change:function(b){var f=b.from||{},t=b.to||{};return '<div class="cx-change"><div class="cx-lab">'+esc(b.label)+'</div><div class="vals">'
      +'<div><div class="cx-lab">'+esc(f.label)+'</div><div class="big cx-num '+tone(f.tone)+'">'+esc(f.value)+'</div></div><div class="arrow">→</div>'
      +'<div><div class="cx-lab">'+esc(t.label)+'</div><div class="big cx-num '+tone(t.tone)+'">'+esc(t.value)+'</div></div></div>'
      +(b.note?'<div class="note">'+rich(b.note)+'</div>':'')+'</div>';},
    stats:function(b){return '<div class="cx-tiles'+(b.compact?' compact':'')+'">'+(b.items||[]).map(function(it){
      return '<div class="cx-tile'+(it.hl?' hl':'')+'"><div class="lab">'+esc(it.label)+'</div><div class="big cx-num '+tone(it.tone)+'">'+esc(it.value)+(it.unit?'<span>'+esc(it.unit)+'</span>':'')+'</div>'
        +(it.cap?'<div class="cap">'+rich(it.cap)+'</div>':'')+'</div>';}).join('')+'</div>';},
    hero:function(b){return '<div class="cx-hero"><div class="lab">'+esc(b.label)+'</div><div class="big cx-num">'+esc(b.value)+(b.unit?'<span>'+esc(b.unit)+'</span>':'')+'</div>'+(b.cap?'<div class="cap">'+rich(b.cap)+'</div>':'')+'</div>';},
    bars:function(b){var items=b.items||[],max=Math.max.apply(null,items.map(function(i){return Math.abs(num(i.n!=null?i.n:i.value));}).concat([0]));
      return '<div class="cx-group'+(b.thick?' thick':'')+'">'+(b.title?'<h3>'+esc(b.title)+'</h3>':'')+items.map(function(i){var n=num(i.n!=null?i.n:i.value),tn=tone(i.tone)||autoTone(i.value)||(n<0?'down':'up');
        return '<div class="cx-bar"><span>'+esc(i.name)+'</span><div class="track"><i class="'+(n<0?'neg':'')+'" style="width:'+pct(n,max)+'"></i></div><span class="p cx-num '+(b.thick&&i!==items[0]?'':tn)+'">'+esc(i.value)+'</span></div>';}).join('')+'</div>';},
    flows:function(b){var items=b.items||[],max=Math.max.apply(null,items.map(function(i){return Math.abs(num(i.n!=null?i.n:i.value));}).concat([0]));
      return '<div class="cx-flow"><h3>'+esc(b.title)+(b.unit?'<span>'+esc(b.unit)+'</span>':'')+'</h3>'+items.map(function(i){var n=num(i.n!=null?i.n:i.value),w=pct(n,max);
        return '<div class="cx-fbar"><span>'+esc(i.name)+'</span><div class="neg">'+(n<0?'<i style="width:'+w+'"></i>':'')+'</div><div class="pos">'+(n>=0?'<i style="width:'+w+'"></i>':'')+'</div><span class="p cx-num '+(n<0?'down':'up')+'">'+esc(i.value)+'</span></div>';}).join('')+'</div>';},
    updown:function(b){var col=function(arr,cls,h){return '<div class="cx-col '+cls+'"><h3>'+h+'</h3>'+(arr||[]).map(function(g){
        return '<div class="cx-sec"><div class="t">'+esc(g.group)+'</div>'+(g.items||[]).map(function(i){return '<div class="s"><span>'+esc(i.name)+'</span><span class="cx-num '+(cls==='u'?'up':'down')+'">'+esc(i.value)+'</span></div>';}).join('')
          +(g.why?'<div class="why">'+esc(g.why)+'</div>':'')+'</div>';}).join('')+'</div>';};
      return '<div class="cx-cols">'+col(b.up,'u','▲ '+(b.upLabel||'강세'))+col(b.down,'d','▼ '+(b.downLabel||'약세'))+'</div>';},
    gauge:function(b){var lo=num(b.min),hi=num(b.max),span=(hi-lo)||1;
      return '<div class="cx-gauge"><h3>'+esc(b.title)+'</h3><div class="g"><div class="line"></div>'+(b.marks||[]).map(function(m){var x=Math.max(0,Math.min(100,(num(m.v)-lo)/span*100));
        return '<div class="mk'+(m.now?' now':'')+'" style="left:'+x.toFixed(1)+'%">'+esc(m.label)+'<div class="dot"></div>'+(m.sub?'<span class="b">'+esc(m.sub)+'</span>':'')+'</div>';}).join('')
        +'</div>'+(b.cap?'<div class="cap">'+rich(b.cap)+'</div>':'')+'</div>';},
    list:function(b){return (b.items||[]).map(function(it,i){return '<div class="cx-sig"><div class="n">'+(i+1)+'</div><div><div class="t">'+esc(it.title)+'</div>'+(it.desc?'<div class="d">'+rich(it.desc)+'</div>':'')+'</div></div>';}).join('');},
    takeaway:function(b){return '<div class="cx-take">'+rich(b.text).replace(/<b class="[^"]*">/g,'<b>')+'</div>';},
    kv:function(b){return '<div class="cx-kv"><span>'+rich(b.label)+'</span><span class="v cx-num '+(tone(b.tone)||autoTone(b.value))+'">'+esc(b.value)+'</span></div>';},
    note:function(b){return '<div class="cx-note">'+rich(b.text)+'</div>';},
  };

  function slideHTML(deck,s,i,n){
    var top='<div class="cx-top"><span>'+brandHTML(deck.brand)+'</span><span>'+String(i+1).padStart(2,'0')+' / '+String(n).padStart(2,'0')+'</span></div>';
    var foot='<div class="cx-foot"><span>'+esc(deck.source||'자료: 유진투자증권')+'</span><span>'+esc([deck.team,deck.analyst].filter(Boolean).join(' '))+'</span></div>';
    if(s.type==='cover'){
      var st=s.stats||[];
      return '<section class="cx cx--dark cx-cover"><div class="cx-glow"></div>'+top+'<h1 class="cx-h1">'+esc(s.title)+'</h1>'
        +(s.date?'<div class="cx-date">'+esc(s.date)+'</div>':'')
        +(st.length?'<div class="cx-idx'+(st.length===1?' one':'')+'">'+st.map(function(x){return '<div class="box"><div class="name">'+esc(x.label)+'</div><div class="chg cx-num '+(tone(x.tone)||autoTone(x.value))+'">'+esc(x.value)+'</div>'+(x.sub?'<div class="lvl cx-num">'+esc(x.sub)+'</div>':'')+'</div>';}).join('')+'</div>':'<div style="margin-top:auto"></div>')
        +foot+'</section>';
    }
    return '<section class="cx">'+top+(s.kicker?'<div class="cx-kicker">'+esc(s.kicker)+'</div>':'')+'<h1 class="cx-h1">'+esc(s.title)+'</h1>'
      +(s.sub?'<div class="cx-sub">'+rich(s.sub)+'</div>':'')
      +'<div class="cx-body"><div class="cx-bin">'+(s.blocks||[]).map(function(b){return (B[b.t]||function(){return '';})(b);}).join('')+'</div>'
      +(s.disc?'<div class="cx-disc">'+DISCLAIMER+'</div>':'')+'</div>'+foot+'</section>';
  }
  function brandHTML(b){b=String(b||'EUGENE RESEARCH');var k=b.indexOf(' ');return k>0?'<b>'+esc(b.slice(0,k))+'</b>'+esc(b.slice(k)):'<b>'+esc(b)+'</b>';}

  // 넘치면 본문을 단계적으로 축소(zoom). 제목·하단 고정.
  function fit(el){
    // 표지 큰 숫자: 박스 폭을 넘으면 글자 크기 축소
    el.querySelectorAll('.cx-idx .chg').forEach(function(c){ var fs=92; c.style.fontSize=''; while(c.scrollWidth>c.clientWidth+1&&fs>48){ fs-=4; c.style.fontSize=fs+'px'; } });
    var body=el.querySelector('.cx-body'), bin=el.querySelector('.cx-bin'); if(!body||!bin) return;
    var z=1; bin.style.zoom=1;
    var over=function(){return body.scrollHeight>body.clientHeight+1;};
    while(over()&&z>0.7){ z-=0.04; bin.style.zoom=z; }
  }

  function render(deck,host){
    var slides=deck.slides||[], n=slides.length, out=[];
    slides.forEach(function(s,i){
      var w=document.createElement('div'); w.innerHTML=slideHTML(deck,s,i,n);
      var el=w.firstChild; host.appendChild(el); fit(el); out.push(el);
    });
    return out;
  }
  window.CardNews={render:render,fit:fit,DISCLAIMER:DISCLAIMER};
})();
