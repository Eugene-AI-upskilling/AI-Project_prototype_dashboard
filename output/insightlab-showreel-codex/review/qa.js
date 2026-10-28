const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const {chromium}=require('../../insightlab-showreel/node_modules/playwright');
(async()=>{
const browser=await chromium.launch({args:['--allow-file-access-from-files']});
try {
const page=await browser.newPage({viewport:{width:1920,height:1080}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'||m.type()==='error') errors.push(m.text())});
await page.goto(pathToFileURL(path.join(__dirname,'../reel.html')).href+'?render=1');await page.evaluate(()=>window.ready);
const times=[0,.16,.85,1.7,1.858333,1.875,2.075,2.8,3.60833,3.733333,3.75,4.7,5.45,5.608333,5.625,6.65,7.375,7.483333,7.5,8.45,9.25,9.358333,9.375,10.3,11.01666,11.233333,11.25,11.45,11.85,11.966666,11.975,12.15,12.55,12.9,13.108333,13.125,13.3,14.2,14.983333,15];
const metrics=[];
await page.evaluate(()=>{window.qaCanvas=document.createElement('canvas');qaCanvas.width=480*5;qaCanvas.height=300*8;window.qaCtx=qaCanvas.getContext('2d');qaCtx.fillStyle='#252a34';qaCtx.fillRect(0,0,qaCanvas.width,qaCanvas.height)});
for (let i=0;i<times.length;i++) {const t=times[i];const metric=await page.evaluate(({t,i})=>{const start=performance.now();window.renderTime(t);const elapsed=performance.now()-start;const x=(i%5)*480,y=Math.floor(i/5)*300;qaCtx.drawImage(document.getElementById('reel'),x,y,480,270);qaCtx.fillStyle='#fff';qaCtx.font='15px sans-serif';qaCtx.fillText(t.toFixed(3)+' s',x+8,y+291);return elapsed},{t,i});metrics.push({t,ms:metric});if ([.85,12.55,14.2].includes(t)) fs.writeFileSync(path.join(__dirname,`frame-${t}.png`),Buffer.from((await page.evaluate(()=>document.getElementById('reel').toDataURL('image/png'))).split(',')[1],'base64'));}
fs.writeFileSync(path.join(__dirname,'transitions.jpg'),Buffer.from((await page.evaluate(()=>qaCanvas.toDataURL('image/jpeg',.94))).split(',')[1],'base64'));
fs.writeFileSync(path.join(__dirname,'metrics.json'),JSON.stringify({info:await page.evaluate(()=>window.reelInfo),errors,metrics},null,2));
console.log(JSON.stringify({info:await page.evaluate(()=>window.reelInfo),errors,metrics}));
} finally {await browser.close()}
})();
