const fs=require('fs'),path=require('path');
const {chromium}=require('../insightlab-showreel/node_modules/playwright');
const base=process.argv[2];if(!base)throw new Error('Pass preview URL');
(async()=>{
 const b=await chromium.launch();const result={url:base,checks:[],errors:[]};
 try{
  const p=await b.newPage({viewport:{width:1440,height:1000}});p.on('pageerror',e=>result.errors.push(e.message));
  await p.goto(base,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>document.getElementById('heroShowreel').currentTime>.2);
  const meta=await p.locator('#heroShowreel').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,muted:v.muted,paused:v.paused,error:v.error?.message||null}));
  if(meta.width!==1280||meta.height!==720||Math.abs(meta.duration-15)>.01||!meta.muted||meta.paused||meta.error)throw new Error('Hero video failed '+JSON.stringify(meta));result.checks.push({hero:meta});
  await p.locator('#heroReelToggle').click();await p.waitForFunction(()=>document.getElementById('heroShowreel').paused);
  await p.locator('#heroShowreel').evaluate(v=>new Promise(resolve=>{v.addEventListener('seeked',()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)),{once:true});v.currentTime=.85}));
  await p.screenshot({path:path.join(__dirname,'red-hero-desktop.png')});
  await p.locator('#heroReelWatch').click();await p.waitForFunction(()=>{const v=document.getElementById('fullShowreel');return document.getElementById('showreelModal').open&&!v.paused&&v.currentTime>.15});
  const full=await p.locator('#fullShowreel').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration,muted:v.muted,audioBytes:v.webkitAudioDecodedByteCount||0,error:v.error?.message||null}));
  if(full.width!==1920||full.muted||full.error)throw new Error('Sound master failed');result.checks.push({full});
  await p.keyboard.press('Escape');if(await p.locator('#showreelModal').evaluate(v=>v.open))throw new Error('Dialog did not close');if(await p.locator('#fullShowreel').evaluate(v=>!v.paused))throw new Error('Audio continues on close');result.checks.push({modalEscape:true,focusRestored:await p.evaluate(()=>document.activeElement.id==='heroReelWatch')});
  await p.setViewportSize({width:390,height:844});await p.locator('#heroReelToggle').scrollIntoViewIfNeeded();
  const dims=await p.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth,hero:document.querySelector('.hero').getBoundingClientRect().width}));if(dims.document>dims.viewport)throw new Error('Mobile overflow '+JSON.stringify(dims));result.checks.push({mobile:dims});
  await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:path.join(__dirname,'red-hero-mobile.png'),fullPage:false});
  const reduced=await b.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await reduced.goto(base,{waitUntil:'domcontentloaded'});await reduced.waitForFunction(()=>getComputedStyle(document.getElementById('heroShowreel')).visibility==='hidden');const rm=await reduced.locator('#heroShowreel').evaluate(v=>({paused:v.paused,visibility:getComputedStyle(v).visibility}));if(!rm.paused)throw new Error('Reduced motion autoplay');result.checks.push({reducedMotion:rm});await reduced.close();
  await p.setViewportSize({width:1440,height:1000});await p.goto(base+'/showreel/',{waitUntil:'domcontentloaded'});await p.locator('#play').click();await p.waitForFunction(()=>document.getElementById('video').currentTime>.15);result.checks.push({gallery:true});await p.screenshot({path:path.join(__dirname,'red-gallery.png')});
  for(const endpoint of ['/assets/showreel/insightlab-hero-loop.mp4','/assets/showreel/insightlab-showreel-15s.mp4','/assets/showreel/insightlab-poster.jpg']){const r=await p.request.get(base+endpoint);if(r.status()!==200)throw new Error('Asset unavailable '+endpoint);result.checks.push({asset:endpoint,status:r.status(),contentType:r.headers()['content-type']})}
  if(result.errors.length)throw new Error(result.errors.join('; '));result.passed=true;
 }finally{await b.close();fs.writeFileSync(path.join(__dirname,'local-review-qa.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result))}
})().catch(e=>{console.error(e);process.exit(1)});
