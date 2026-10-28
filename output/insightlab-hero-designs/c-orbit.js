(() => {
  'use strict';
  const hero=document.querySelector('.orbit-hero');
  const stage=document.querySelector('.orbit-stage');
  if(!hero||!stage)return;
  const cards=[...document.querySelectorAll('.research-card')];
  const core=document.querySelector('.eugene-core');
  const rings=document.querySelector('.orbital-rings');
  const heading=document.querySelector('.stage-heading');
  const toggle=document.querySelector('.motion-toggle');
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile=window.matchMedia('(max-width: 760px)');
  const content={
    tech:{number:'01',category:'SECTOR / TECH & AI',title:'기술의 변화에서, 산업의 다음을.',description:'새로운 기술이 산업의 구조를 바꾸는 순간을 포착합니다. 기업의 경쟁력과 밸류체인의 변화를 함께 살펴보는 리서치 관점입니다.',tags:['기술','산업','기업']},
    macro:{number:'02',category:'MARKET / MACRO',title:'시장의 흐름을, 더 넓은 맥락으로.',description:'금리와 환율, 유동성의 연결을 따라갑니다. 개별 지표를 넘어 글로벌 시장의 구조와 자산 사이의 관계를 읽는 리서치 관점입니다.',tags:['금리','환율','글로벌']},
    brief:{number:'03',category:'DAILY / BRIEFING',title:'오늘의 이슈에서, 중요한 맥락을.',description:'여러 리서치에 담긴 핵심 질문을 한곳에서 살펴봅니다. 기업과 산업, 거시경제의 이슈를 함께 연결해 하루의 관점을 정리합니다.',tags:['브리핑','핵심 이슈','관점']},
    insight:{number:'04',category:'IDEA / INSIGHT',title:'흩어진 데이터에서, 새로운 질문을.',description:'익숙한 정보에서도 새로운 연결을 발견합니다. 데이터를 비교하고 가설을 검토하며 다음 판단을 위한 질문을 만드는 리서치 관점입니다.',tags:['데이터','아이디어','연결']}
  };
  let selected='tech',motion=true,visible=true,frame=0,targetX=0,targetY=0,mouseX=0,mouseY=0,progress=0,targetProgress=0,stageWidth=0,stageHeight=0,heldCard=null;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const ease=x=>x*x*(3-2*x);
  function select(card){
    selected=card.dataset.card;
    cards.forEach(el=>{const active=el===card;el.classList.toggle('is-selected',active);el.setAttribute('aria-pressed',String(active));});
    const data=content[selected];
    document.querySelector('.summary-number').textContent=data.number+' / 04';
    document.querySelector('.summary-title').textContent=data.title;
    document.querySelector('.dossier-number').textContent=data.number;
    document.querySelector('.dossier-category').textContent=data.category;
    document.querySelector('.dossier-title').textContent=data.title;
    document.querySelector('.dossier-description').textContent=data.description;
    const tags=document.querySelector('.dossier-tags');
    tags.replaceChildren(...data.tags.map(label=>{const el=document.createElement('span');el.textContent=label;return el;}));
    schedule();
  }
  cards.forEach(card=>{
    card.addEventListener('click',()=>select(card));
    card.addEventListener('pointerenter',()=>{heldCard=card;});
    card.addEventListener('pointerleave',()=>{if(heldCard===card)heldCard=null;});
    card.addEventListener('focus',()=>{heldCard=card;});
    card.addEventListener('blur',()=>{if(heldCard===card)heldCard=null;});
  });
  function measure(){stageWidth=stage.clientWidth;stageHeight=stage.clientHeight;updateScroll();schedule();}
  function updateScroll(){
    const rect=hero.getBoundingClientRect();
    const span=hero.offsetHeight-(window.innerHeight-82)-82;
    targetProgress=reduce.matches||mobile.matches?0:clamp((82-rect.top)/Math.max(span,1),0,1);
    schedule();
  }
  function schedule(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(render);}
  function render(now){
    frame=0;
    const active=motion&&!reduce.matches;
    mouseX+=(targetX-mouseX)*.065;mouseY+=(targetY-mouseY)*.065;
    progress+=(targetProgress-progress)*.1;
    const p=ease(progress);
    const dx=active?mouseX:0,dy=active?mouseY:0;
    stage.style.setProperty('--light-x',(50+dx*42)+'%');stage.style.setProperty('--light-y',(50+dy*42)+'%');
    if(!mobile.matches){
      const initial=[[-.29,-.30,-7],[.245,-.135,8],[-.30,.25,-5],[.26,.34,6]];
      const half=(stageWidth<565?111:133);
      const final=[[-half,-110,0],[half,-110,0],[-half,90,0],[half,90,0]];
      cards.forEach((card,i)=>{
        if(active&&heldCard===card&&Math.abs(progress-targetProgress)<.005)return;
        const float=active?(Math.sin(now*.0007+i*1.9)*6)*(1-p):0;
        const x=initial[i][0]*stageWidth*(1-p)+final[i][0]*p+dx*(12+i*3)*(1-p);
        const y=initial[i][1]*stageHeight*(1-p)+final[i][1]*p+dy*(10+i*2)*(1-p)+float;
        const angle=initial[i][2]*(1-p);
        card.style.transform=`translate(-50%, -50%) translate3d(${x}px, ${y}px, ${card.dataset.card===selected?22:0}px) rotateX(${-dy*6*(1-p)}deg) rotateY(${dx*7*(1-p)}deg) rotateZ(${angle}deg)`;
      });
      core.style.transform=`translate(-50%, -50%) translate3d(${dx*20}px, ${dy*18}px, 0) scale(${1-p*.45}) rotateY(${dx*9}deg)`;
      core.style.opacity=String(1-p*.87);
      rings.style.opacity=String(1-p*.8);
      heading.style.opacity=String(p);
      heading.style.transform=`translateY(${10*(1-p)}px)`;
    }else{
      cards.forEach(card=>card.style.removeProperty('transform'));
      core.style.transform=`translate(-50%, -50%) translate(${dx*6}px, ${dy*5}px)`;
      core.style.opacity='1';rings.style.opacity='1';heading.style.opacity='1';heading.style.transform='none';
    }
    if(active||Math.abs(progress-targetProgress)>.001||Math.abs(mouseX-targetX)>.001||Math.abs(mouseY-targetY)>.001)schedule();
  }
  stage.addEventListener('pointermove',event=>{if(!motion||reduce.matches||event.pointerType==='touch')return;const box=stage.getBoundingClientRect();targetX=clamp((event.clientX-box.left)/box.width-.5,-.5,.5);targetY=clamp((event.clientY-box.top)/box.height-.5,-.5,.5);schedule();});
  stage.addEventListener('pointerleave',()=>{targetX=targetY=0;schedule();});
  toggle.addEventListener('click',()=>{motion=!motion;targetX=targetY=0;toggle.setAttribute('aria-pressed',String(!motion));toggle.replaceChildren(document.createTextNode(motion?'모션 끄기 ':'모션 켜기 '));const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=motion?'Ⅱ':'▷';toggle.append(icon);document.body.classList.toggle('motion-paused',!motion);schedule();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else if(frame){cancelAnimationFrame(frame);frame=0;}},{rootMargin:'40px'}).observe(hero);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&frame){cancelAnimationFrame(frame);frame=0;}else schedule();});
  window.addEventListener('scroll',updateScroll,{passive:true});
  window.addEventListener('resize',measure,{passive:true});
  reduce.addEventListener('change',measure);mobile.addEventListener('change',measure);
  document.querySelectorAll('a[href="#workspace"]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();const workspace=document.querySelector('#workspace');workspace.scrollIntoView({behavior:reduce.matches?'instant':'smooth'});const title=document.querySelector('#workspace-title');title.setAttribute('tabindex','-1');title.focus({preventScroll:true});}));
  measure();
})();
