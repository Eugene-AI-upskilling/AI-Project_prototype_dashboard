const fs=require('fs'),path=require('path');
const {chromium}=require('../../insightlab-showreel/node_modules/playwright');
const dir=path.join(__dirname,'qa'),base='http://127.0.0.1:4192/directions/';
fs.mkdirSync(dir,{recursive:true});
(async()=>{const browser=await chromium.launch();const report={pages:[],errors:[]};try{
  for(const slug of ['05-research-studio','06-soft-mono']){
    const number=slug.slice(0,2),result={direction:number};
    const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push({direction:number,message:e.message}));
    await page.goto(base+slug+'.html');await page.waitForFunction(()=>document.body.dataset.ready==='true');await page.waitForTimeout(600);
    result.desktop=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,renderer:document.querySelector('.wave-host').dataset.effectRenderer,status:document.querySelector('.wave-host').dataset.effectStatus}));
    await page.screenshot({path:path.join(dir,number+'-desktop.png')});
    await page.evaluate(()=>{const h=document.querySelector('.experience'),s=document.querySelector('.experience-stage'),n=document.querySelector('.site-nav');scrollTo({top:h.offsetTop-n.offsetHeight+(h.offsetHeight-s.offsetHeight)*.9,behavior:'instant'});});await page.waitForTimeout(450);await page.screenshot({path:path.join(dir,number+'-settled.png')});
    result.settled=await page.evaluate(()=>{const t=document.querySelector('.experience-world').getBoundingClientRect(),p=document.querySelector('.experience-panel').getBoundingClientRect();return {phase:document.querySelector('.experience').dataset.phase,card:{x:t.x,y:t.y,width:t.width,height:t.height},panel:{x:p.x,y:p.y,width:p.width,height:p.height},panelInert:document.querySelector('.experience-panel').inert};});
    await page.locator('.panel-motion').click();await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(100);await page.screenshot({path:path.join(dir,number+'-full.png'),fullPage:true});await page.close();
    const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});mobile.on('pageerror',e=>report.errors.push({direction:number,mobile:true,message:e.message}));await mobile.goto(base+slug+'.html');await mobile.waitForFunction(()=>document.body.dataset.ready==='true');await mobile.waitForTimeout(450);
    result.mobile=await mobile.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,h1:getComputedStyle(document.querySelector('h1')).fontSize}));await mobile.screenshot({path:path.join(dir,number+'-mobile.png')});
    await mobile.evaluate(()=>{const h=document.querySelector('.experience'),s=document.querySelector('.experience-stage'),n=document.querySelector('.site-nav');scrollTo({top:h.offsetTop-n.offsetHeight+(h.offsetHeight-s.offsetHeight)*.9,behavior:'instant'});});await mobile.waitForTimeout(300);await mobile.screenshot({path:path.join(dir,number+'-mobile-settled.png')});
    result.mobileSettled=await mobile.evaluate(()=>{const t=document.querySelector('.experience-world').getBoundingClientRect(),p=document.querySelector('.experience-panel').getBoundingClientRect();return {phase:document.querySelector('.experience').dataset.phase,card:{x:t.x,y:t.y,width:t.width,height:t.height},panel:{x:p.x,y:p.y,width:p.width,height:p.height},panelInert:document.querySelector('.experience-panel').inert};});
    await mobile.locator('.panel-motion').click();await mobile.screenshot({path:path.join(dir,number+'-mobile-full.png'),fullPage:true});await mobile.close();
    report.pages.push(result);
  }
  report.passed=report.errors.length===0&&report.pages.every(p=>p.desktop.width>=p.desktop.scrollWidth&&p.mobile.width>=p.mobile.scrollWidth&&!p.settled.panelInert&&!p.mobileSettled.panelInert);
  fs.writeFileSync(path.join(dir,'studio-qa.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
