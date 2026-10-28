// Local design review only. Bind loopback; no hosting or deployment.
const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname,port=Number(process.argv[2]||4192);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.mp4':'video/mp4'};
// A single byte range is enough for browser video seeking. HEAD describes the
// full representation without opening a stream; Range applies to GET only.
function byteRange(value,size){
 const match=/^bytes=(\d*)-(\d*)$/.exec(value.trim());
 if(!match||(!match[1]&&!match[2])||size===0)return null;
 let start,end;
 if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return null;start=Math.max(0,size-suffix);end=size-1;}
 else{start=Number(match[1]);end=match[2]?Number(match[2]):size-1;if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=size||end<start)return null;end=Math.min(end,size-1);}
 return {start,end};
}
http.createServer((req,res)=>{
 try{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 const uri=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);let file=path.resolve(root,'.'+uri);
 if(file!==root&&!file.toLowerCase().startsWith((root+path.sep).toLowerCase())){res.writeHead(403);res.end();return;}
 let stat=fs.statSync(file);if(stat.isDirectory()){file=path.join(file,'index.html');stat=fs.statSync(file);}
 if(!stat.isFile()||!mime[path.extname(file).toLowerCase()]){res.writeHead(404);res.end();return;}
 const headers={'Content-Type':mime[path.extname(file).toLowerCase()],'Content-Length':stat.size,'Cache-Control':'no-store','Accept-Ranges':'bytes'};
 let range;
 if(req.method==='GET'&&req.headers.range){range=byteRange(req.headers.range,stat.size);if(!range){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`,'Content-Length':0,'Accept-Ranges':'bytes'});res.end();return;}headers['Content-Length']=range.end-range.start+1;headers['Content-Range']=`bytes ${range.start}-${range.end}/${stat.size}`;}
 res.writeHead(range?206:200,headers);
 if(req.method==='HEAD'){res.end();return;}
 const stream=fs.createReadStream(file,range||{});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Hero design review: http://127.0.0.1:${port}/`));
