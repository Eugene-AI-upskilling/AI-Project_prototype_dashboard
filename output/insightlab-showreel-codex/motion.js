/* Insight in Motion. Original deterministic motion system. 32 beats / 128 BPM. */
(() => {
'use strict';
const W=1920,H=1080,D=15,S=1.875,TAU=Math.PI*2;
const canvas=document.getElementById('reel'),out=canvas.getContext('2d',{alpha:false});
const work=document.createElement('canvas');work.width=W;work.height=H;
const c=work.getContext('2d',{alpha:false});
const C={paper:'#f6f4f1',white:'#ffffff',ink:'#130c0e',red:'#d21f23',deep:'#451318',muted:'#7c7273',light:'#ffd9db'};
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const mix=(a,b,t)=>a+(b-a)*t;
const progress=(t,a,b)=>clamp((t-a)/(b-a));
const ease=p=>1-Math.pow(1-clamp(p),5);
const smooth=p=>{p=clamp(p);return p*p*(3-2*p)};
const expo=p=>p<=0?0:p>=1?1:Math.pow(2,10*(p-1));
const elastic=t=>t<=0?0:1-Math.exp(-10*t)*(Math.cos(17*t)+.43*Math.sin(17*t));
const F=(size,weight=800)=>`${weight} ${size}px Reel`;
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const random=rng(4821);
const particles=Array.from({length:210},()=>({x:random(),y:random(),z:random(),s:random(),a:random()*TAU}));
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>mul(a,1/(Math.hypot(...a)||1));
function rotate(a,rx,ry,rz){let[x,y,z]=a;[y,z]=[y*Math.cos(rx)-z*Math.sin(rx),y*Math.sin(rx)+z*Math.cos(rx)];[x,z]=[x*Math.cos(ry)+z*Math.sin(ry),-x*Math.sin(ry)+z*Math.cos(ry)];return[x*Math.cos(rz)-y*Math.sin(rz),x*Math.sin(rz)+y*Math.cos(rz),z]}
function fill(col){c.fillStyle=col;c.fillRect(0,0,W,H)}
function text(str,x,y,size=40,col=C.ink,weight=800,align='left'){c.fillStyle=col;c.font=F(size,weight);c.textAlign=align;c.textBaseline='alphabetic';c.fillText(str,x,y)}
function rule(x,y,w,col=C.ink,alpha=.2){c.save();c.globalAlpha=alpha;c.fillStyle=col;c.fillRect(x,y,w,1.3);c.restore()}
function label(str,x,y,col=C.ink,align='left',size=20){c.save();c.letterSpacing='3px';text(str,x,y,size,col,600,align);c.restore()}
function circ(x,y,r,col,stroke=false,width=1){c.beginPath();c.arc(x,y,Math.max(.01,r),0,TAU);if(stroke){c.strokeStyle=col;c.lineWidth=width;c.stroke()}else{c.fillStyle=col;c.fill()}}
function round(x,y,w,h,r,fillColor){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fillColor;c.fill()}
function arrow(x,y,s,col){c.save();c.translate(x,y);c.strokeStyle=col;c.lineWidth=s*.07;c.lineCap='square';c.beginPath();c.moveTo(0,s);c.lineTo(s,0);c.moveTo(0,0);c.lineTo(s,0);c.lineTo(s,s);c.stroke();c.restore()}
function brand(light=false){const col=light?C.white:C.ink;label('EUGENE',96,91,col);label('INSIGHT LAB',96,118,col);circ(78,82,5,C.red);label('INSIGHT IN MOTION',1824,95,col,'right',18)}
function footer(n,title,light=false){const col=light?C.white:C.ink;rule(96,958,1728,col,.25);label(`0${n+1} / 08`,96,1003,col);label(title,290,1003,col);label('RESEARCH. REIMAGINED.',1824,1003,col,'right',17)}
function reveal(str,x,y,size,col,e,delay=0,weight=850,spacing=-5){c.save();c.font=F(size,weight);c.textBaseline='alphabetic';c.textAlign='left';const chars=[...str];let xx=x;c.beginPath();c.rect(0,y-size*1.06,W,size*1.40);c.clip();chars.forEach((ch,i)=>{const p=ease((e-delay-i*.027)/.43);const ww=c.measureText(ch).width;c.save();c.translate(xx,y+(1-p)*(size*1.1));c.rotate((1-p)*.045);c.fillStyle=col;c.fillText(ch,0,0);c.restore();xx+=ww+spacing});c.restore()}
function shadow(x,y,rx,ry,alpha=.16){c.save();c.translate(x,y);c.scale(rx,ry);const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(55,18,23,${alpha})`);g.addColorStop(1,'rgba(55,18,23,0)');c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore()}
function glow(x,y,r,color='210,31,35',a=.16){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${color},${a})`);g.addColorStop(1,`rgba(${color},0)`);c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2)}
// A closed torus knot with a parallel tube frame, lit as brushed chrome / Eugene red.
const knot=[];
const K=144,Q=16;
const curve=u=>[(2+Math.cos(3*u))*Math.cos(2*u),(2+Math.cos(3*u))*Math.sin(2*u),Math.sin(3*u)*1.15];
for(let i=0;i<K;i++){const u=i/K*TAU,p=curve(u),t=norm(sub(curve(u+.0001),curve(u-.0001))),n=norm(cross(t,[0,0,1])),b=norm(cross(t,n));knot.push(Array.from({length:Q},(_,j)=>add(p,mul(add(mul(n,Math.cos(j/Q*TAU)),mul(b,Math.sin(j/Q*TAU))),.46))))}
// Smooth interpolated normals and a procedural studio environment give the hero
// sculpture real depth, continuous reflections, and a clean silhouette.
const materialCanvas=document.createElement('canvas');materialCanvas.width=W;materialCanvas.height=H;
let gl,glProgram,glCount=0;
try{
 gl=materialCanvas.getContext('webgl',{alpha:true,antialias:true,preserveDrawingBuffer:true,premultipliedAlpha:false});
 if(gl){
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
  const vertex=`attribute vec3 aPosition;attribute vec3 aNormal;uniform vec3 uRotation;uniform vec2 uCenter;uniform float uSize;varying vec3 vNormal;varying vec3 vPosition;
  vec3 spin(vec3 p){float cx=cos(uRotation.x),sx=sin(uRotation.x),cy=cos(uRotation.y),sy=sin(uRotation.y),cz=cos(uRotation.z),sz=sin(uRotation.z);p=vec3(p.x,p.y*cx-p.z*sx,p.y*sx+p.z*cx);p=vec3(p.x*cy+p.z*sy,p.y,-p.x*sy+p.z*cy);return vec3(p.x*cz-p.y*sz,p.x*sz+p.y*cz,p.z);}
  void main(){vec3 p=spin(aPosition)*uSize;float k=2300.0/(2300.0+p.z);vec2 xy=uCenter+p.xy*k;gl_Position=vec4(xy.x/960.0-1.0,1.0-xy.y/540.0,(p.z+850.0)/1700.0-0.5,1.0);vNormal=spin(aNormal);vPosition=p;}`;
  const fragment=`precision highp float;varying vec3 vNormal;varying vec3 vPosition;
  float band(float x,float center,float width){return 1.0-smoothstep(width,width*1.8,abs(x-center));}
  void main(){vec3 n=normalize(vNormal);vec3 v=normalize(vec3(-vPosition.xy,-2300.0-vPosition.z));if(dot(n,v)<0.0)n=-n;vec3 r=reflect(-v,n);
  float soft=smoothstep(-0.7,0.55,r.y);vec3 env=mix(vec3(0.085,0.034,0.039),vec3(0.92,0.88,0.87),soft);
  env=mix(env,vec3(1.0,0.98,0.96),band(r.y,-0.23,0.12)*0.92);env*=1.0-band(r.y,0.52,0.055)*0.82;
  float brandReflection=band(r.y,0.02,0.09)*(0.72+0.28*sin(r.x*3.0));env=mix(env,vec3(0.78,0.08,0.10),brandReflection*0.92);
  float highlight=pow(max(dot(n,normalize(vec3(-0.55,-0.75,-1.0))),0.0),45.0);float fresnel=pow(1.0-max(dot(n,v),0.0),3.0);
  vec3 col=env*0.88+vec3(highlight*0.34)+vec3(0.12,0.055,0.055)*fresnel;gl_FragColor=vec4(pow(clamp(col,0.0,1.0),vec3(0.88)),1.0);}`;
  glProgram=gl.createProgram();gl.attachShader(glProgram,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(glProgram,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(glProgram);if(!gl.getProgramParameter(glProgram,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(glProgram));
  const vertices=[],ns=[],indices=[],segments=224,tube=48;
  for(let i=0;i<=segments;i++){const u=i/segments*TAU,p=curve(u),t=norm(sub(curve(u+.0001),curve(u-.0001))),n=norm(cross(t,[0,0,1])),b=norm(cross(t,n));for(let j=0;j<=tube;j++){const angle=j/tube*TAU,normal=add(mul(n,Math.cos(angle)),mul(b,Math.sin(angle)));vertices.push(...add(p,mul(normal,.46)));ns.push(...normal)}}
  for(let i=0;i<segments;i++)for(let j=0;j<tube;j++){const a=i*(tube+1)+j,b=a+tube+1;indices.push(a,b,a+1,b,b+1,a+1)}
  gl.useProgram(glProgram);
  for(const[name,data]of[['aPosition',vertices],['aNormal',ns]]){const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);const loc=gl.getAttribLocation(glProgram,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0)}
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);glCount=indices.length;gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.viewport(0,0,W,H);
 }
}catch(err){console.warn('Using Canvas material fallback:',err.message);gl=null}
function sculpture(time,x,y,size,material='chrome',intro=1){
  const rz=-.42+time*.19,rx=.68+Math.sin(time*.45)*.3,ry=time*.31+.3;
  if(gl&&material==='chrome'){
   gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(glProgram);gl.uniform3f(gl.getUniformLocation(glProgram,'uRotation'),rx,ry,rz);gl.uniform2f(gl.getUniformLocation(glProgram,'uCenter'),x,y);gl.uniform1f(gl.getUniformLocation(glProgram,'uSize'),size*intro);gl.drawElements(gl.TRIANGLES,glCount,gl.UNSIGNED_SHORT,0);c.drawImage(materialCanvas,0,0);return;
  }
  const pts=knot.map(row=>row.map(p=>rotate(mul(p,size),rx,ry,rz)));
  const faces=[];const camera=2300;
  const screen=p=>{const k=camera/(camera+p[2]);return[x+p[0]*k*intro,y+p[1]*k*intro]};
  for(let i=0;i<K;i++)for(let j=0;j<Q;j++){
    const a=pts[i][j],b=pts[(i+1)%K][j],d=pts[i][(j+1)%Q],e=pts[(i+1)%K][(j+1)%Q];
    const n=norm(cross(sub(b,a),sub(d,a)));if(n[2]>.4)continue;
    const shine=Math.pow(clamp(dot(n,norm([-.4,-.6,-1]))),7),rim=Math.pow(1-Math.abs(n[2]),2);
    const reflection=.48+.27*Math.sin(n[1]*7.2+n[0]*2.6)+shine*.48;
    let rgb;if(material==='chrome'){const v=clamp(reflection,.08,1);rgb=[mix(59,255,v),mix(26,247,v),mix(31,243,v)];if(n[1]>.2&&n[1]<.44)rgb=[210+shine*35,31+shine*95,35+shine*90]}
    else{const v=clamp(reflection,.05,1);rgb=[112+v*128,18+v*35+shine*100,26+v*35+shine*95];rgb[0]+=rim*15;rgb[1]+=rim*12}
    faces.push({p:[a,b,e,d].map(screen),z:(a[2]+b[2]+e[2]+d[2])/4,col:`rgb(${rgb.map(v=>Math.round(v)).join(',')})`});
  }
  faces.sort((a,b)=>b.z-a.z);
  for(const f of faces){c.beginPath();c.moveTo(...f.p[0]);for(let i=1;i<4;i++)c.lineTo(...f.p[i]);c.closePath();c.fillStyle=f.col;c.strokeStyle=f.col;c.lineWidth=.7;c.fill();c.stroke()}
}
function orbit(x,y,r,t,col=C.red){c.save();c.translate(x,y);c.rotate(-.5);c.scale(1,.42);c.lineWidth=2;c.strokeStyle=col;c.beginPath();c.ellipse(0,0,r,r,0,0,TAU);c.stroke();circ(Math.cos(t)*r,Math.sin(t)*r,11,C.red);c.restore()}
// 01 / Signal: a living material establishes the visual motif.
function signal(e,t){
  fill(C.paper);glow(1460,510,630,'210,31,35',.1);
  c.save();c.globalAlpha=.045;text('SIGNAL',62,829,485,C.ink,900);c.restore();
  const enter=elastic(e+.13);const zoom=1+expo(progress(e,1.6,S))*.9;
  shadow(1390,817,390*zoom,85,.2);
  c.save();c.translate(1390,510);c.scale(zoom,zoom);c.translate(-1390,-510);
  orbit(1410,501,472,t*.65,C.light);sculpture(t,1390,490,147,'chrome',enter);c.restore();
  reveal('SEE THE',96,404,167,C.ink,e,.06,880,-8);
  reveal('SIGNAL.',96,589,190,C.red,e,.17,900,-9);
  c.save();c.globalAlpha=ease((e-.42)/.55);text('시장의 움직임에서, 의미 있는 신호를.',104,693,34,C.deep,550);arrow(103,767,57,C.red);label('FROM DATA TO INSIGHT',195,810,C.deep);c.restore();
  brand();footer(0,'SEE WHAT MATTERS');
  // Camera-travelling wipe carries the red material into the next cut.
  if(e>1.69){const p=smooth(progress(e,1.69,S));c.fillStyle=C.red;c.beginPath();c.moveTo(W+280-p*(W+500),0);c.lineTo(W,0);c.lineTo(W,H);c.lineTo(W-p*(W+500),H);c.closePath();c.fill()}
}
// 02 / Kinetic typography: scale, tracking and depth move on the beat.
function data(e,t){
  fill(C.red);const enter=ease(e/.4);const exit=expo(progress(e,1.48,S));
  c.save();c.translate(-exit*350,0);
  c.save();c.globalAlpha=.24;c.strokeStyle=C.white;c.lineWidth=2;c.font=F(392,900);c.textAlign='left';for(let i=0;i<3;i++)c.strokeText('DATA',90+i*35+e*60,349-i*80);c.restore();
  reveal('DATA',82,610,423,C.white,e,.03,900,-25);
  reveal('IN MOTION.',95,819,141,C.white,e,.2,850,-6);
  for(let i=0;i<9;i++){const xx=1420+i*40;const h=130+Math.sin(i*.65+e*4.4)*100;c.fillStyle=i%3===0?C.light:'#ffffff44';c.fillRect(xx,680-h*enter,17,h*enter)}
  c.save();c.translate(1644,332);c.rotate(-.3+e*.36);for(let i=0;i<5;i++){c.strokeStyle=`rgba(255,255,255,${.15+i*.12})`;c.lineWidth=11-i*1.5;c.beginPath();c.ellipse(0,0,151+i*30,151+i*30,0,0,TAU);c.stroke()}arrow(-62,-62,124,C.white);c.restore();
  c.restore();brand(true);footer(1,'MAKE THE COMPLEX MOVE',true);
  if(e>1.62){c.fillStyle=C.ink;c.fillRect(0,H*(1-smooth(progress(e,1.62,S))),W,H)}
}
// 03 / Flow field: structured data becomes a continuous landscape.
function field(e,t){
  fill(C.ink);glow(1290,660,780,'210,31,35',.2);
  const camera=900,rows=31,cols=82;
  for(let j=rows-1;j>=0;j--){
    c.beginPath();
    for(let i=0;i<cols;i++){
      const x=(i/(cols-1)-.5)*2300;
      const z=(j/rows)*2050-150+e*90;
      const yy=Math.sin(x*.0039+z*.0032+e*2.6)*93+Math.cos(x*.0051-z*.0023-e*1.9)*56;
      const p=rotate([x,yy,z],-.31,Math.sin(e*.7)*.14,-.15);
      const k=camera/(camera+p[2]+570);
      const xx=1110+p[0]*k,sy=720+p[1]*k-p[2]*.135;
      if(i===0)c.moveTo(xx,sy);else c.lineTo(xx,sy);
      if(i%7===0&&j%3===0){c.save();c.fillStyle='#ffd3d5';c.fillRect(xx-1.7,sy-1.7,3.4,3.4);c.restore()}
    }
    c.lineWidth=j<6?2.5:1.25;c.strokeStyle=j%4===0?'#d21f23':`rgba(255,207,210,${.11+(1-j/rows)*.38})`;c.stroke();
  }
  for(let i=0;i<28;i++){const p=particles[i],x=(p.x*W+e*90)%W,y=180+p.y*690;c.fillStyle='#bd878c';c.globalAlpha=.3+p.s*.35;c.fillRect(x,y,2,2)}c.globalAlpha=1;
  reveal('FIND THE',96,362,158,C.white,e,0,850,-7);reveal('PATTERN.',96,538,170,C.white,e,.1,850,-7);
  c.save();c.globalAlpha=ease((e-.3)/.5);text('흩어진 데이터가 하나의 흐름이 될 때.',104,622,33,C.light,500);c.restore();
  label('SIGNAL PROCESSING',1785,855,C.light,'right',19);brand(true);footer(2,'ORDER FROM COMPLEXITY',true);
  if(e>1.7){const p=smooth(progress(e,1.7,S));c.fillStyle=C.paper;c.fillRect(0,0,W*p,H)}
}
const nodes=Array.from({length:430},(_,i)=>{const y=1-2*(i+.5)/430,r=Math.sqrt(1-y*y),a=i*2.399963229728653;return[r*Math.cos(a),y,r*Math.sin(a)]});
const edges=[];for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++)if(dot(nodes[i],nodes[j])>.979)edges.push([i,j]);
// 04 / Intelligence: a spherical network, with volumetric depth and a scanning plane.
function intelligence(e,t){
  fill(C.paper);glow(1360,501,580,'210,31,35',.12);
  reveal('MORE',96,349,166,C.ink,e,.02,860,-8);reveal('THAN',96,530,166,C.ink,e,.09,860,-8);reveal('NUMBERS.',96,711,159,C.red,e,.16,900,-7);
  const grow=.75+.25*elastic(e),r=326*grow;
  const ps=nodes.map(p=>rotate(mul(p,r),.16+e*.2,t*.48,-.24));
  const pr=p=>{const k=1200/(1200+p[2]);return[1370+p[0]*k,501+p[1]*k]};
  shadow(1370,875,330,70,.14);orbit(1370,501,440,t*.8,C.red);
  for(const [i,j]of edges){const a=ps[i],b=ps[j],z=(a[2]+b[2])*.5;const alpha=.12+clamp((-z+r)/(2*r))*.28;c.strokeStyle=`rgba(210,31,35,${alpha})`;c.lineWidth=.85;c.beginPath();c.moveTo(...pr(a));c.lineTo(...pr(b));c.stroke()}
  const ordered=ps.map((p,i)=>({p,i})).sort((a,b)=>b.p[2]-a.p[2]);
  for(const {p,i}of ordered){const[x,y]=pr(p);const near=clamp((-p[2]+r)/(2*r));circ(x,y,1.5+near*3.4,i===31?'#451318':`rgba(210,31,35,${.2+near*.8})`)}
  const scan=(e*430)%760;rule(996,162+scan,745,C.red,.27);label('AI + HUMAN INSIGHT',1362,909,C.deep,'center',19);
  brand();footer(3,'INTELLIGENCE WITH CONTEXT');
  if(e>1.68){const k=expo(progress(e,1.68,S));c.fillStyle=C.ink;c.beginPath();c.arc(1370,501,k*1850,0,TAU);c.fill()}
}
// 05 / Research in perspective: editorial documents, not arbitrary numbers.
function documentCard(x,y,w,h,angle,title,id,e,accent){
  c.save();c.translate(x,y);c.rotate(angle);c.scale(1,1);c.shadowColor='#00000070';c.shadowBlur=40;c.shadowOffsetY=22;round(-w/2,-h/2,w,h,5,C.paper);c.shadowColor='transparent';
  const left=-w/2+34,top=-h/2+42;label('EUGENE / RESEARCH',left,top,C.deep,'left',13);rule(left,top+20,w-68,C.ink,.2);text(id,left,top+114,89,accent,850);text(title,left,top+171,34,C.ink,800);
  label('INSIGHT LAB',left,top+207,C.muted,'left',12);
  const chartY=top+307;c.strokeStyle='#d7dbe2';c.lineWidth=1;for(let j=0;j<4;j++){c.beginPath();c.moveTo(left,chartY+j*42);c.lineTo(left+w-68,chartY+j*42);c.stroke()}
  c.strokeStyle=accent;c.lineWidth=4;c.beginPath();for(let k=0;k<32;k++){const xx=left+k/(31)*(w-68),yy=chartY+128-k*3+Math.sin(k*.64+e*.6)*19;k?c.lineTo(xx,yy):c.moveTo(xx,yy)}c.stroke();
  for(let j=0;j<3;j++){c.fillStyle=j===0?'#bbc1cc':'#d6dae1';c.fillRect(left,chartY+180+j*17,(w-68)*(j===2?.62:.95),3)}
  label('DEEPER. CLEARER. SMARTER.',left,h/2-35,C.deep,'left',11);c.restore();
}
function research(e,t){
  fill(C.ink);c.save();c.globalAlpha=.13;text('RESEARCH',72,630,337,C.red,900);c.restore();
  reveal('A NEW PERSPECTIVE.',97,270,104,C.white,e,.01,800,-3);
  const p=ease(e/.6),travel=expo(progress(e,1.57,S))*2300;
  const positions=[{x:610,y:603,w:380,h:560,a:-.20,title:'Global Macro',id:'01'},{x:1020,y:633,w:420,h:580,a:.08,title:'Sector Outlook',id:'02'},{x:1410,y:625,w:390,h:540,a:.22,title:'AI Research',id:'03'}];
  positions.forEach((v,i)=>{const pe=ease((e-i*.08)/.63);documentCard(v.x+(1-pe)*(1550+i*130)-travel,v.y+Math.sin(e*2+i)*14,v.w,v.h,v.a+(1-pe)*.45,v.title,v.id,e,i===1?C.red:C.deep)});
  brand(true);footer(4,'GO BEYOND THE HEADLINE',true);
  if(e>1.75){c.fillStyle=C.paper;c.fillRect(0,0,W,H*smooth(progress(e,1.75,S)))}
}
// 06 / Decision: data columns become a sculptural skyline.
function barMesh(e){
  const faces=[],cam=1700;
  const project=p=>{const a=rotate(p,.13,-.49,-.08),k=cam/(cam+a[2]);return[1400+a[0]*k,719+a[1]*k,a[2]]};
  const values=[.26,.53,.43,.71,.60,.95,.83];
  for(let i=0;i<7;i++){
    const rise=elastic(Math.max(0,e-i*.058));const h=(160+values[i]*470)*rise;const x=-385+i*112,z=-75+i*10,w=82,depth=130;
    const v=[[x,90,z],[x+w,90,z],[x+w,90,z+depth],[x,90,z+depth],[x,90-h,z],[x+w,90-h,z],[x+w,90-h,z+depth],[x,90-h,z+depth]].map(project);
    [[4,5,6,7,'#ffb5b8'],[0,1,5,4,i===5?'#d21f23':'#e14448'],[1,2,6,5,'#85171f']].forEach(([a,b,d,f,col])=>faces.push({p:[v[a],v[b],v[d],v[f]],z:(v[a][2]+v[b][2]+v[d][2]+v[f][2])/4,col}));
  }
  faces.sort((a,b)=>b.z-a.z);for(const f of faces){c.beginPath();c.moveTo(f.p[0][0],f.p[0][1]);for(let k=1;k<4;k++)c.lineTo(f.p[k][0],f.p[k][1]);c.closePath();c.fillStyle=f.col;c.fill();c.strokeStyle=f.col;c.lineWidth=1;c.stroke()}
}
function decision(e,t){
  fill(C.paper);glow(1340,570,600,'210,31,35',.07);
  c.save();c.translate(1390,810);c.rotate(-.08);c.scale(1,.35);for(let j=-4;j<5;j++){rule(-475,j*105,1090,C.deep,.15);c.strokeStyle='#45131820';c.beginPath();c.moveTo(j*120,-400);c.lineTo(j*120,400);c.stroke()}c.restore();
  shadow(1390,827,570,75,.18);barMesh(e);
  reveal('TURN',96,369,166,C.ink,e,.01,860,-8);reveal('INTO',96,549,166,C.ink,e,.09,860,-8);reveal('INSIGHT.',96,729,166,C.red,e,.17,900,-9);
  label('MARKET / SECTOR / QUANT',1340,884,C.deep,'center',19);brand();footer(5,'BETTER INFORMED DECISIONS');
  if(e>1.64){const p=smooth(progress(e,1.64,S));c.fillStyle=C.ink;c.fillRect(0,0,W*p,H)}
}
// 07 / Clarity: typographic contrast on a single decisive beat.
function clarity(e,t){
  const second=e>=.72,k=second?e-.72:e;fill(second?C.red:C.ink);
  c.save();c.globalAlpha=second?.1:.08;c.font=F(325,900);c.strokeStyle=C.white;c.lineWidth=2;c.textAlign='center';for(let i=0;i<5;i++)c.strokeText('CLARITY',960+(i%2?1:-1)*k*110,160+i*260-k*70);c.restore();
  if(!second){reveal('복잡함을',160,620,284,C.white,k,.015,880,-13);label('COMPLEXITY',1780,784,C.light,'right',22);arrow(1670,347,104,C.red)}
  else{reveal('명확함으로.',102,620,280,C.white,k,.015,880,-13);c.save();c.globalAlpha=ease((k-.2)/.45);text('데이터를 넘어, 인사이트로.',110,747,39,C.white,600);arrow(1628,732,89,C.white);c.restore()}
  brand(true);footer(6,'LESS NOISE. MORE INSIGHT.',true);
  if(e>1.64){const p=smooth(progress(e,1.64,S));c.fillStyle=C.paper;c.beginPath();c.arc(1635,775,p*1900,0,TAU);c.fill()}
}
// 08 / Brand resolve. The sculpture returns with the same material as the opener.
function resolve(e,t){
  fill(C.paper);glow(1450,506,610,'210,31,35',.1);shadow(1434,829,390,75,.17);
  const p=elastic(e+.05);sculpture(t,1415+(1-p)*430,510,121,'chrome',1);
  orbit(1434,511,475,t*.65,C.light);
  reveal('유진',104,298,79,C.deep,e,.04,750,-4);
  reveal('Insight',92,526,242,C.ink,e,.09,850,-13);
  reveal('Lab.',96,769,242,C.red,e,.17,900,-13);
  c.save();c.globalAlpha=ease((e-.42)/.55);text('데이터에서 인사이트까지.',108,877,38,C.deep,550);c.restore();
  brand();footer(7,'EUGENE INVESTMENT & SECURITIES');
}
const scenes=[signal,data,field,intelligence,research,decision,clarity,resolve];
function render(t){
  t=((t%D)+D)%D;const n=Math.min(7,Math.floor(t/S)),e=t-n*S;
  c.save();c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;scenes[n](e,t);c.restore();
}
function frame(t,samples=1,fps=60){
  for(let i=0;i<samples;i++){render(t+i/samples*.45/fps);out.globalAlpha=1/(i+1);out.drawImage(work,0,0)}out.globalAlpha=1;
}
window.renderFrame=(i,fps=60,samples=2)=>frame(i/fps,samples,fps);
window.renderTime=(t,samples=1)=>frame(t,samples);
window.reelInfo={duration:D,fps:60,width:W,height:H,sceneDuration:S,materialRenderer:gl?'WebGL smooth chrome':'Canvas fallback',scenes:['SIGNAL','DATA','PATTERN','INTELLIGENCE','RESEARCH','DECISION','CLARITY','INSIGHT LAB']};
window.ready=Promise.all([document.fonts.load(F(40,500)),document.fonts.load(F(40,850)),document.fonts.load(F(40,900))]).then(()=>{frame(0);return true});
if(/[?&]render/.test(location.search)){document.body.classList.add('render');return}
let start=performance.now(),paused=false,pausedTime=0;
const audio=document.getElementById('music'),toggle=document.getElementById('toggle'),sound=document.getElementById('sound');
toggle.addEventListener('click',()=>{paused=!paused;if(paused){pausedTime=(performance.now()-start)/1000;audio.pause()}else{start=performance.now()-pausedTime*1000;if(sound.dataset.enabled)audio.play()}toggle.textContent=paused?'재생':'일시정지'});
sound.addEventListener('click',async()=>{if(sound.dataset.enabled){audio.pause();delete sound.dataset.enabled;sound.textContent='사운드 켜기'}else{audio.currentTime=((performance.now()-start)/1000)%D;await audio.play();sound.dataset.enabled='true';sound.textContent='사운드 끄기'}});
window.ready.then(()=>{start=performance.now();const loop=now=>{if(!paused)frame((now-start)/1000,1);requestAnimationFrame(loop)};requestAnimationFrame(loop)});
})();
