// Local review only. Serves the public-file staging directory on loopback.
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'preview-site'),port=Number(process.argv[2]||4183);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.mp4':'video/mp4','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
http.createServer((req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
  let pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  let file=path.resolve(root,'.'+pathname);if(file!==root&&!file.toLowerCase().startsWith((root+path.sep).toLowerCase())){res.writeHead(403);res.end();return}
  let stat=fs.statSync(file);if(stat.isDirectory()){file=path.join(file,'index.html');stat=fs.statSync(file)}
  let start=0,end=stat.size-1,status=200;
  const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-store'};
  if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return}
   if(!match[1]){const length=Number(match[2]);start=Math.max(0,stat.size-length)}else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]))}
   if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return}status=206;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
  }
  headers['Content-Length']=end-start+1;res.writeHead(status,headers);if(req.method==='HEAD'){res.end();return}
  const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 }catch{res.writeHead(404);res.end('Not found')}
}).listen(port,'127.0.0.1',()=>console.log(`Local design review: http://127.0.0.1:${port}/`));
