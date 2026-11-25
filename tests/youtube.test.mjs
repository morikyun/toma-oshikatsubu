import test from 'node:test';
import assert from 'node:assert/strict';
import {parseFeed,sortChannels,fetchChannelUpdates,fetchSchedule,createHandler,SCHEDULE_TTL,visibleEvents} from '../src/youtube-service.mjs';
import {latestVideo,scheduleEvents} from '../public/assets/youtube-views.js';
const now=Date.parse('2026-11-17T00:00:00+09:00');
const cid='UCKQrY7ceEy_lbBSXXHtkMzQ';
const channel={channelId:cid,name:'總水とおま'};
const event={id:'bjLgr27flR8',channelId:cid,channelName:'總水とおま',title:'予約の動画',startsAt:'2026-11-18T21:00:00+09:00',status:'upcoming'};
const seed={channels:{checkedAt:new Date(now).toISOString(),items:[],stale:false},schedule:{checkedAt:new Date(now).toISOString(),events:[event],stale:true,mode:'snapshot'}};
const config={revision:'test',channels:[channel],official:[channel],snapshot:seed};
const response=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
const entry=(id,published,title='A &amp; B',updated='2030-01-01T00:00:00Z',channelId=cid)=>`<entry><yt:channelId>${channelId}</yt:channelId><yt:videoId>${id}</yt:videoId><title>${title}</title><link rel="alternate" href="https://www.youtube.com/watch?v=${id}"/><published>${published}</published><updated>${updated}</updated></entry>`;
const kv=()=>{const values=new Map();return {get:async key=>values.get(key)||null,put:async(key,value)=>values.set(key,JSON.parse(value))};};
test('RSS uses publication date, decodes titles, rejects future or foreign entries',()=>{
 const xml='<feed xmlns="atom">'+entry('aaaaaaaaaaa','2026-10-01T12:00:00Z')+entry('bbbbbbbbbbb','2026-11-01T12:00:00Z','&lt;img onerror=&quot;bad&quot;&gt;')+entry('ccccccccccc','2027-01-01T12:00:00Z')+entry('ddddddddddd','2026-11-02T12:00:00Z','x','', 'UCother')+'</feed>';
 const rows=parseFeed(xml,cid,now);
 assert.deepEqual(rows.map(v=>v.id),['bbbbbbbbbbb','aaaaaaaaaaa']);
 assert.equal(rows[0].title,'<img onerror="bad">');
 assert.equal(rows[1].title,'A & B');
 assert.throws(()=>parseFeed('<html>Unavailable</html>',cid,now));
});
test('sort keeps every channel, puts missing dates last and preserves stable IDs',()=>{
 const rows=sortChannels([{channelId:'a',id:'channel-1'},{channelId:'b',id:'channel-2'},{channelId:'c',id:'channel-3'}],[{channelId:'b',latest:{publishedAt:'2026-11-01'}},{channelId:'a',latest:{publishedAt:'2026-10-01'}}]);
 assert.deepEqual(rows.map(c=>c.id),['channel-2','channel-1','channel-3']);
});
test('Shorts URLs are excluded while regular videos and streams remain, regardless of title or duration',async()=>{
 const short=entry('aaaaaaaaaaa','2026-11-15T12:00:00Z','縦型の短い動画').replace('https://www.youtube.com/watch?v=aaaaaaaaaaa','https://www.youtube.com/shorts/aaaaaaaaaaa');
 const regular=entry('bbbbbbbbbbb','2026-11-14T12:00:00Z','30秒の通常動画 #shorts');
 const stream=entry('ccccccccccc','2026-11-13T12:00:00Z','ライブ配信アーカイブ');
 const xml='<feed>'+short+regular+stream+'</feed>';
 assert.deepEqual(parseFeed(xml,cid,now).map(v=>v.format),['short','video','video']);
 const data=await fetchChannelUpdates([channel],{},async()=>new Response(xml),now);
 assert.equal(data.items[0].latest.id,'bbbbbbbbbbb');
 const live=await fetchChannelUpdates([channel],{},async()=>new Response('<feed>'+short+stream+'</feed>'),now);
 assert.equal(live.items[0].latest.id,'ccccccccccc');
});
test('a Shorts-only feed retains only a previously verified regular video and labels it as limited',async()=>{
 const xml='<feed>'+entry('aaaaaaaaaaa','2026-11-15T12:00:00Z').replace('https://www.youtube.com/watch?v=aaaaaaaaaaa','https://www.youtube.com/shorts/aaaaaaaaaaa')+'</feed>';
 const old={items:[{channelId:cid,latest:{id:'bbbbbbbbbbb',format:'video'},checkedAt:'2026-11-01T00:00:00Z'}]};
 const result=await fetchChannelUpdates([channel],old,async()=>new Response(xml),now);
 assert.equal(result.items[0].latest.id,'bbbbbbbbbbb');assert.equal(result.items[0].status,'limited');assert.equal(result.stale,true);
 old.items[0].latest.format='short';
 const unknown=await fetchChannelUpdates([channel],old,async()=>new Response(xml),now);
 assert.equal(unknown.items[0].latest,null);
 const invalid=entry('ccccccccccc','2026-11-14T12:00:00Z').replace('www.youtube.com','invalid.test');
 assert.equal(parseFeed('<feed>'+invalid+'</feed>',cid,now)[0].format,'unknown');
});
test('a failed RSS fetch preserves its last good video; a valid empty feed clears it',async()=>{
 const previous={items:[{channelId:cid,latest:{id:'aaaaaaaaaaa',format:'video'},checkedAt:'2026-11-01T00:00:00Z'}]};
 const failed=await fetchChannelUpdates([channel],previous,async()=>new Response('No',{status:503}),now);
 assert.equal(failed.items[0].latest.id,'aaaaaaaaaaa');assert.equal(failed.items[0].status,'unavailable');assert.equal(failed.stale,true);
 const empty=await fetchChannelUpdates([channel],previous,async()=>new Response('<feed></feed>'),now);
 assert.equal(empty.items[0].latest,null);assert.equal(empty.items[0].status,'empty');
});
test('API combines upcoming and live candidates; finished/private videos are removed',async()=>{
 const requests=[];
 const fetcher=async url=>{
  const u=new URL(url);requests.push(u);
  if(u.pathname.endsWith('/search')) return response({items:[{id:{videoId:'aaaaaaaaaaa'}},{id:{videoId:'bbbbbbbbbbb'}},{id:{videoId:'ccccccccccc'}},{id:{videoId:'ddddddddddd'}}]});
  const v=(id,status,extra={},privacy='public')=>({id,snippet:{title:'<対談>',channelId:cid,liveBroadcastContent:status},status:{privacyStatus:privacy},liveStreamingDetails:{scheduledStartTime:event.startsAt,...extra}});
  return response({items:[v('aaaaaaaaaaa','upcoming'),v('bbbbbbbbbbb','live'),v('ccccccccccc','live',{actualEndTime:'2026-11-16T10:00:00Z'}),v('ddddddddddd','upcoming',{},'private')]});
 };
 const data=await fetchSchedule([channel],'fake-test-key',fetcher,now);
 assert.deepEqual(data.events.map(e=>e.id),['bbbbbbbbbbb','aaaaaaaaaaa']);
 assert.equal(data.events[1].startsAt,event.startsAt);
 assert.deepEqual(requests.slice(0,2).map(u=>u.searchParams.get('eventType')),['upcoming','live']);
 assert.ok(requests.every(u=>!u.searchParams.has('mine')));
 assert.ok(!JSON.stringify(data).includes('fake-test-key'));
});
test('missing credentials or global cache never initiates schedule API requests',async()=>{
 let calls=0;const handler=createHandler(config,{fetcher:async()=>{calls++;throw Error('unexpected');},now:()=>now});
 for(const env of [{},{YOUTUBE_API_KEY:'fake-test-key'},{YOUTUBE_CACHE:kv()}]){
  const data=await (await handler.fetch(new Request('https://site.test/api/schedule'),env)).json();assert.equal(data.mode,'snapshot');
 }
 assert.equal(calls,0);
});
test('fresh empty results clear old events, and shared KV limits discovery across instances and queries',async()=>{
 const cache=kv();let calls=0;let time=now;
 const deps={fetcher:async()=>{calls++;return response({items:[]});},now:()=>time};
 const env={YOUTUBE_API_KEY:'fake-test-key',YOUTUBE_CACHE:cache};
 const first=await (await createHandler(config,deps).fetch(new Request('https://site.test/api/schedule'),env)).json();
 assert.deepEqual(first.events,[]);assert.equal(first.stale,false);assert.equal(calls,2);
 await createHandler(config,deps).fetch(new Request('https://site.test/api/schedule?force=1'),env);assert.equal(calls,2);
 time+=SCHEDULE_TTL+1;
 await createHandler(config,deps).fetch(new Request('https://site.test/api/schedule'),env);assert.equal(calls,4);
});
test('schedule failure retains a labeled fallback and does not leak errors or key',async()=>{
 const handler=createHandler(config,{fetcher:async()=>{throw new Error('secret=fake-test-key');},now:()=>now});
 const result=await (await handler.fetch(new Request('https://site.test/api/schedule'),{YOUTUBE_API_KEY:'fake-test-key',YOUTUBE_CACHE:kv()})).json();
 assert.equal(result.events[0].id,event.id);assert.equal(result.stale,true);assert.equal(result.mode,'unavailable');assert.ok(!JSON.stringify(result).includes('fake-test-key'));
});
test('simultaneous requests coalesce and non-API routes still serve static files',async()=>{
 let calls=0;const handler=createHandler(config,{fetcher:async()=>{calls++;return response({items:[]});},now:()=>now});
 const env={YOUTUBE_API_KEY:'fake-test-key',YOUTUBE_CACHE:kv(),ASSETS:{fetch:async()=>new Response('static')}};
 await Promise.all([handler.fetch(new Request('https://site.test/api/schedule'),env),handler.fetch(new Request('https://site.test/api/schedule'),env)]);assert.equal(calls,2);
 assert.equal(await (await handler.fetch(new Request('https://site.test/club/'),env)).text(),'static');
 assert.equal((await handler.fetch(new Request('https://site.test/api/unknown'),env)).status,404);
 assert.equal((await handler.fetch(new Request('https://site.test/api/schedule',{method:'POST'}),env)).status,405);
});
test('rendering escapes titles, uses direct watch URLs, and expires historical schedules',()=>{
 const html=latestVideo({latest:{id:'aaaaaaaaaaa',title:'<script>alert(1)</script>',publishedAt:'2026-11-01'}});
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('https://www.youtube.com/watch?v=aaaaaaaaaaa'));
 const old={...event,startsAt:'2020-01-01T00:00:00Z'};
 assert.deepEqual(visibleEvents([old],now,seed.schedule.checkedAt),[]);
 assert.ok(scheduleEvents({...seed.schedule,events:[old]},false,now).includes('公式チャンネル'));
 assert.ok(scheduleEvents({checkedAt:new Date(now).toISOString(),events:[{...event,startsAt:null}],mode:'api',stale:false},false,now).includes('開始時刻未定'));
});
