const {chromium}=require('../insightlab-showreel/node_modules/playwright');
const fs=require('fs');
(async()=>{
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const result=[];fs.mkdirSync(__dirname+'/qa',{recursive:true});
for(const [name,width,height,reducedMotion] of [['desktop',1440,900,'no-preference'],['mobile',390,844,'no-preference'],['reduced',1440,900,'reduce']]){
const page=await browser.newPage({viewport:{width,height},reducedMotion});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:4191/a-signal.html');await page.locator('#signal-wave[data-effect-ready="true"]').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(650);
await page.screenshot({path:__dirname+'/qa/a-'+name+'.png'});
const initial=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,status:document.querySelector('#signal-wave').dataset,heading:document.querySelector('h1').getBoundingClientRect().toJSON()}));
if(name==='desktop'){await page.mouse.move(1150,730);await page.mouse.down();await page.waitForTimeout(400);await page.mouse.up();await page.locator('.signal-motion').click();await page.waitForTimeout(80);initial.paused=await page.locator('#signal-wave').getAttribute('data-effect-status');await page.locator('.signal-motion').click();await page.waitForTimeout(80);initial.resumed=await page.locator('#signal-wave').getAttribute('data-effect-status');}
result.push({name,errors,...initial});await page.close();
}
await browser.close();fs.writeFileSync(__dirname+'/qa/a-qa.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})();
