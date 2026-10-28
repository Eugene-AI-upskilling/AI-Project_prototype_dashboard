const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../../yujin-research-center'),dest=path.join(__dirname,'preview-site');
fs.mkdirSync(dest,{recursive:true});
const copy=(src,out)=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.copyFileSync(src,out)};
for(const name of ['index.html','reports.html','market.html','events.html','global.html','quant.html','league.html'])copy(path.join(root,name),path.join(dest,name));
copy(path.join(root,'trading/index.html'),path.join(dest,'trading/index.html'));
const immersive='hero-options/showreel-immersive.html';
if(fs.existsSync(path.join(root,immersive)))copy(path.join(root,immersive),path.join(dest,immersive));
const claudeHero='hero-options/showreel-claude-upgraded.html';
if(fs.existsSync(path.join(root,claudeHero)))copy(path.join(root,claudeHero),path.join(dest,claudeHero));
function assets(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,e.name),rel=path.relative(root,full);if(e.isDirectory()){if(e.name!=='voice-samples')assets(full)}else if(/\.(css|js|png|jpe?g|woff2?|mp4|mp3|svg)$/i.test(e.name))copy(full,path.join(dest,rel))}}
assets(path.join(root,'assets'));
const gallery=path.join(dest,'showreel');fs.mkdirSync(gallery,{recursive:true});
for(const name of ['insightlab-showreel-15s.mp4','insightlab-hero-loop.mp4','insightlab-poster.jpg','PretendardVariable.woff2'])copy(path.join(__dirname,name),path.join(gallery,name));
fs.writeFileSync(path.join(gallery,'index.html'),fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replaceAll('../../yujin-research-center/index.html','/').replaceAll('../../yujin-research-center/hero-options/showreel-immersive.html','/hero-options/showreel-immersive.html'));
for(const e of fs.readdirSync(path.join(__dirname,'stills')))if(/\.png$/.test(e))copy(path.join(__dirname,'stills',e),path.join(gallery,'stills',e));
const claudeSource=path.resolve(__dirname,'../insightlab-showreel'),claudeGallery=path.join(dest,'claude-showreel');
if(fs.existsSync(path.join(claudeSource,'EugeneInsightLab_Showreel_15s_Upgraded.mp4'))){
 fs.mkdirSync(claudeGallery,{recursive:true});
 for(const name of ['index.html','README.md','reel-upgraded.html','EugeneInsightLab_Showreel_15s.mp4','EugeneInsightLab_Showreel_15s_Upgraded.mp4','EugeneInsightLab_Hero_Upgraded.mp4','poster-upgraded.jpg','PretendardVariable.woff2'])copy(path.join(claudeSource,name),path.join(claudeGallery,name));
 for(const name of ['gallery-upgraded-check.json','gallery-desktop-upgraded.png','gallery-mobile-upgraded.png','hero-upgraded-qa.json']){
  const qaFile=path.join(claudeSource,'qa',name);
  if(fs.existsSync(qaFile))copy(qaFile,path.join(claudeGallery,'qa',name));
 }
 const claudeReview=path.join(claudeSource,'hero-upgraded-review.jpg');
 if(fs.existsSync(claudeReview))copy(claudeReview,path.join(claudeGallery,'hero-upgraded-review.jpg'));
}
const manifest=[];function inventory(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,e.name);if(e.isDirectory())inventory(full);else manifest.push({path:path.relative(dest,full).replaceAll('\\','/'),size:fs.statSync(full).size})}}inventory(dest);
fs.writeFileSync(path.join(__dirname,'preview-manifest.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({files:manifest.length,bytes:manifest.reduce((a,b)=>a+b.size,0),directory:dest}));
