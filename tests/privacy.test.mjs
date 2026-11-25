import {japaneseLocale} from './support/locales.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createHandler} from '../src/youtube-service.mjs';
import {renderPages} from '../src/pages.mjs';

// These are public content endpoints; API credentials remain server-side.
test('all YouTube endpoints accept ordinary GETs and ignore legacy consent headers',async()=>{
  const config={channels:[],official:[],revision:'test',snapshot:{}};
  const handler=createHandler(config,{fetcher:async()=>{throw Error('no channels to fetch');}});
  const env={YOUTUBE_API_KEY:'fake-key',YOUTUBE_CACHE:{get:async()=>null,put:async()=>{}}};
  for (const route of ['channels','schedule','official-videos','official-latest']) for (const headers of [{},{'X-YouTube-Consent':'old'}]) {
    const response=await handler.fetch(new Request('https://site.test/api/'+route,{headers}),env);
    assert.equal(response.status,200,route);
    const data=await response.json();
    assert.ok(Array.isArray(route==='schedule'?data.events:data.items),route);
    assert.ok(!JSON.stringify(data).includes('fake-key'));
    assert.equal(response.headers.get('vary'),null);
  }
});

test('ordinary requests reuse a warmed KV cache across handlers without additional API calls',async()=>{
  let calls=0;
  const config={channels:[],official:[{channelId:'UC'+'a'.repeat(22),name:'test'}],revision:'test',snapshot:{}};
  const values=new Map();
  const env={YOUTUBE_API_KEY:'fake-key',YOUTUBE_CACHE:{get:async key=>values.get(key),put:async(key,value)=>values.set(key,JSON.parse(value))}};
  const deps={fetcher:async()=>{calls++;return Response.json({items:[]});}};
  const url='https://site.test/api/official-videos';
  const first=await createHandler(config,deps).fetch(new Request(url),env);
  assert.equal(first.status,200);assert.equal((await first.json()).mode,'api');assert.equal(calls,1);
  const next=await createHandler(config,deps).fetch(new Request(url),env);
  assert.equal(next.status,200);assert.equal((await next.json()).mode,'api');assert.equal(calls,1);
});

test('every page retains privacy links, while initial HTML shows YouTube content without consent UI or JavaScript',async()=>{
  const read=async name=>JSON.parse(await fs.readFile(new URL('../content/'+name+'.json',import.meta.url),'utf8'));
  const [site,terms,videos,channels,official,snapshot,interview,blogs,blogSnapshot,privacy]=await Promise.all(['site','terms','videos','channels','official-channels','youtube-snapshot','interview','blogs','blog-snapshot','privacy'].map(read));
  const pages=renderPages({site,terms,videos,channels,official,snapshot,interview,blogs,blogSnapshot,privacy});
  const policy=pages['privacy/index.html'];
  for (const text of [privacy.operator,privacy.contactUrl.replaceAll('&','&amp;'),'Facebook Messenger','https://www.youtube.com/t/terms','https://policies.google.com/privacy','Cookie','youtube-nocookie.com','ページの閲覧に合わせて']) assert.ok(policy.includes(text),text);
  for (const [path,html] of Object.entries(pages)) {
    assert.ok(html.includes('href="/privacy/"'),path);
    assert.ok(!/data-youtube-(choice|prompt|locked|slot|template)|youtube-settings|youtube-consent|表示への同意後/.test(html),path+': no display gate');
    assert.ok(!/<(?:img|iframe)\b[^>]*\sdata-youtube-(src|embed)=/.test(html),path+': direct media sources');
  }
  assert.equal((pages['start/index.html'].match(/data-official-video=/g)||[]).length,2,'Digest cards are present immediately');
  assert.equal((pages['live/index.html'].match(/data-official-video=/g)||[]).length,3,'live enjoyment cards are present immediately');
  assert.equal((pages['schedule/index.html'].match(/<iframe\b[^>]*\bsrc="https:\/\/www.youtube-nocookie.com\/embed\//g)||[]).length,2,'both players are present immediately');
  assert.ok(!pages['schedule/index.html'].includes('autoplay=1'));
  assert.ok(/<img\b[^>]*\bsrc="https:\/\/i.ytimg.com\//.test(pages['videos/index.html']),'thumbnails have active URLs');
  assert.ok(!/data-(?:schedule|official-latest|official|channel)-status hidden/.test(Object.values(pages).join('')),'fetch status is visible');
  const headers=await fs.readFile(new URL('../public/_headers',import.meta.url),'utf8');
  assert.match(headers,/frame-src https:\/\/www.youtube-nocookie.com;/,'deployed CSP permits the embedded players');
  assert.match(headers,/Referrer-Policy: strict-origin-when-cross-origin/);
});

test('frontend refresh starts on load even with old denied preferences or unavailable browser storage',async()=>{
  const source=(await fs.readFile(new URL('../public/assets/youtube.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
  for (const storage of [null,JSON.stringify({choice:'denied',version:'2026-11-18-v2'}),'unavailable']) {
    const areas={schedule:{dataset:{youtubeSchedule:'full'},innerHTML:'snapshot'},latest:{dataset:{officialChannels:'[]'},innerHTML:'snapshot'}};
    const calls=[];let reads=0;
    const context=vm.createContext({...japaneseLocale,
      document:{querySelectorAll:selector=>({'[data-youtube-schedule]':[areas.schedule],'[data-official-latest]':[areas.latest]})[selector]||[]},
      localStorage:{getItem:()=>{reads++;if(storage==='unavailable')throw Error('blocked');return storage;}},
      fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({events:[],items:[]})};},
      AbortController,AbortSignal,clearInterval:()=>{},setInterval:()=>1,
      scheduleEvents:()=>'<p>updated schedule</p>',scheduleStatus:()=>'',officialLatestVideos:()=>'<p>updated latest videos</p>',officialLatestStatus:()=>''
    });
    vm.runInContext(source,context);
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(calls.map(call=>call.url),['/api/schedule','/api/official-latest']);
    assert.ok(calls.every(call=>!call.options.headers),'no consent header is fabricated');
    assert.equal(reads,0,'old display preferences are never consulted');
    assert.equal(areas.schedule.innerHTML,'<p>updated schedule</p>');
    assert.equal(areas.latest.innerHTML,'<p>updated latest videos</p>');
  }
});
