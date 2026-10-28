const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{spawn}=require('child_process');
let chromium;try{({chromium}=require('playwright'))}catch{({chromium}=require('../insightlab-showreel/node_modules/playwright'))}
const mode=process.argv[2]||'stills';
const dir=__dirname;
const run=(args)=>new Promise((resolve,reject)=>{const p=spawn('ffmpeg',args,{cwd:dir,stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>{err=(err+d).slice(-5000)});p.on('error',reject);p.on('close',code=>code===0?resolve():reject(new Error(err)))});
(async()=>{
 const browser=await chromium.launch({args:['--allow-file-access-from-files']});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(dir,'reel.html')).href+'?render=1');await page.evaluate(()=>window.ready);
  const grab=async()=>Buffer.from((await page.evaluate(()=>document.getElementById('reel').toDataURL('image/png'))).split(',')[1],'base64');
  if(mode==='stills'){
   fs.mkdirSync(path.join(dir,'stills'),{recursive:true});
   const times=(process.argv[3]||'.85,2.8,4.7,6.65,8.45,10.3,12.15,14.2').split(',').map(Number);
   for(const t of times){await page.evaluate(t=>window.renderTime(t),t);fs.writeFileSync(path.join(dir,'stills',`t${t.toFixed(2)}.png`),await grab())}
   console.log(JSON.stringify({errors,info:await page.evaluate(()=>window.reelInfo),stills:times}));
  }else if(mode==='video'){
   const fps=60,count=fps*15,filename='insightlab-master-silent.mp4';
   const ff=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-c:v','png','-i','-','-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',filename],{cwd:dir,stdio:['pipe','ignore','pipe']});
   let err='',failure;ff.stderr.on('data',d=>{err+=d});ff.stdin.on('error',e=>{failure=e});const finished=new Promise((resolve,reject)=>{ff.on('error',reject);ff.on('close',code=>code===0?resolve():reject(new Error(err||`ffmpeg exit ${code}`)))});
   const started=Date.now();for(let i=0;i<count;i++){if(failure)throw failure;await page.evaluate(i=>window.renderFrame(i,60,2),i);if(!ff.stdin.write(await grab()))await new Promise(resolve=>ff.stdin.once('drain',resolve));if(i%60===0)console.log(`frame ${i}/${count} · ${((Date.now()-started)/1000).toFixed(1)}s`)}
   ff.stdin.end();await finished;if(errors.length)throw new Error(errors.join('\n'));
   console.log('Master rendered.');
   await run(['-y','-hide_banner','-loglevel','error','-i',filename,'-i','showreel.wav','-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-t','15','-movflags','+faststart','insightlab-showreel-15s.mp4']);
   await run(['-y','-hide_banner','-loglevel','error','-i',filename,'-vf','scale=1280:720','-r','30','-an','-c:v','libx264','-preset','slow','-crf','23','-movflags','+faststart','insightlab-hero-loop.mp4']);
   // The hero loop crossfades its final 0.25 s into the opening to avoid a jump.
   await run(['-y','-hide_banner','-loglevel','error','-i','insightlab-hero-loop.mp4','-filter_complex','[0:v]split=2[main][head];[head]trim=0:0.033333,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.3,format=yuva420p,fade=t=in:st=0:d=0.166667:alpha=1,setpts=PTS+14.75/TB[fade];[main][fade]overlay=eof_action=pass:format=auto,format=yuv420p[v]','-map','[v]','-t','15','-an','-c:v','libx264','-preset','slow','-crf','22','-movflags','+faststart','insightlab-hero-loop-seamless.mp4']);
   fs.renameSync(path.join(dir,'insightlab-hero-loop-seamless.mp4'),path.join(dir,'insightlab-hero-loop.mp4'));
   await run(['-y','-hide_banner','-loglevel','error','-ss','14.20','-i',filename,'-frames:v','1','-q:v','2','insightlab-poster.jpg']);
   console.log('Sound master, web loop and poster exported.');
  }else throw new Error('Use stills or video');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
