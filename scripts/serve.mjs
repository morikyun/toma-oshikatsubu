import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const port = Number(process.env.PORT || 4178);
const worker=(await import('../dist/_worker.js')).default;
const kvValues=new Map();
const localKV={get:async key=>kvValues.get(key)||null,put:async(key,value)=>{kvValues.set(key,JSON.parse(value));}};
const types = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.txt':'text/plain; charset=utf-8','.xml':'application/xml' };
const headersFile = await fs.readFile(path.join(root, '_headers'), 'utf8');
const globalHeaders = Object.fromEntries(headersFile.split('\n\n')[0].split('\n').slice(1).filter(Boolean).map(line => {
 const i = line.indexOf(':'); return [line.slice(0,i).trim(),line.slice(i+1).trim()];
}));
const server = http.createServer(async (req,res) => {
 try {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405,{'Allow':'GET, HEAD'}); res.end(); return; }
  const url = new URL(req.url,'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const response=await worker.fetch(new Request('http://127.0.0.1:'+port+req.url,{method:req.method,headers:req.headers}),{YOUTUBE_CACHE:localKV,YOUTUBE_API_KEY:process.env.YOUTUBE_API_KEY});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
  }
  if (url.pathname==='/_worker.js' || url.pathname==='/_routes.json') {res.writeHead(404);res.end();return;}
  const decoded = decodeURIComponent(url.pathname);
  const file = path.resolve(root,'.'+decoded);
  if (file !== root && !file.startsWith(root+path.sep)) { res.writeHead(403); res.end(); return; }
  let stat;
  try { stat = await fs.stat(file); } catch {}
  if (stat?.isDirectory() && !url.pathname.endsWith('/')) { res.writeHead(301,{'Location':url.pathname+'/'+url.search}); res.end(); return; }
  const target = stat?.isDirectory() ? path.join(file,'index.html') : file;
  let body,code=200;
  try { body=await fs.readFile(target); } catch { body=await fs.readFile(path.join(root,'404.html'));code=404; }
  res.writeHead(code,{...globalHeaders,'Content-Type':code===404?'text/html; charset=utf-8':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});
  res.end(req.method==='HEAD'?undefined:body);
 } catch { res.writeHead(400);res.end('Bad request'); }
});
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
process.on('SIGTERM',()=>server.close());
process.on('SIGINT',()=>server.close());
