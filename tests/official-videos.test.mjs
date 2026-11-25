import {japaneseLocale} from './support/locales.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {fetchOfficialVideos,createHandler,OFFICIAL_VIDEO_TTL} from '../src/youtube-service.mjs';
import {officialVideos,officialVideoStatus,latestDigestUrl} from '../public/assets/youtube-views.js';
const now=Date.parse('2026-11-17T12:00:00Z');
const a={channelId:'UCKQrY7ceEy_lbBSXXHtkMzQ',name:'總水とおま'};
const b={channelId:'UCJ1rq0BVCM0l90fjajRga6A',name:'TOMA☆トーク'};
const id=n=>String(n).padStart(11,'0');
const video=(n,title,day,channel=a)=>({id:id(n),snippet:{channelId:channel.channelId,title,publishedAt:`2026-11-${String(day).padStart(2,'0')}T00:00:00Z`,liveBroadcastContent:'none'},status:{privacyStatus:'public',uploadStatus:'processed'}});
const good=[video(1,'LIVE Digest',16),video(2,'ライブの楽しみ方',15),video(3,'ＬＩＶＥ　楽しみ方',14),video(4,'ＤＩＧＥＳＴ',13),video(5,'楽しみ方・ライブ',12),video(6,'Digest C',11)];
const json=data=>new Response(JSON.stringify(data));
const searchItems=rows=>rows.map(v=>({id:{videoId:v.id},snippet:v.snippet}));
const kv=()=>{const values=new Map();return {get:async key=>values.get(key)||null,put:async(key,value)=>values.set(key,JSON.parse(value))};};
function fakeApi(rows,requests=[]) {
  return async url=>{
    const u=new URL(url);requests.push(u);
    if (u.pathname.endsWith('/search')) return json({items:searchItems(rows.filter(v=>v.snippet.channelId===u.searchParams.get('channelId')))});
    const ids=new Set(u.searchParams.get('id').split(','));
    return json({items:rows.filter(v=>ids.has(v.id))});
  };
}
const normalized=v=>({id:v.id,title:v.snippet.title,publishedAt:v.snippet.publishedAt,channelId:v.snippet.channelId,channelName:a.name});
const seed={checkedAt:'2026-11-01T00:00:00Z',items:[normalized(good[0])],mode:'snapshot',stale:true};
const config={revision:'official-test',channels:[],official:[a],snapshot:{officialVideos:seed}};

test('the hero link uses the newest valid published Digest, matching the first Digest card',()=>{
  const rows=[video(81,'楽しみ方',17),video(82,'ＤＩＧＥＳＴ',16),video(83,'digest',14),video(84,'Digest future',18)].map(normalized);
  const data={items:[rows[2],rows[0],{...rows[1],id:'not-a-video'},rows[3],rows[1]]};
  assert.equal(latestDigestUrl(data,now),'https://www.youtube.com/watch?v='+id(82));
  assert.equal(officialVideos(data,'homeDigests',now).match(/data-official-video="([^"]+)"/)[1],id(82));
  assert.equal(latestDigestUrl({items:[rows[0],rows[3]]},now),'/start/#first-videos');
});

test('one official refresh updates both the hero link and cards; failure keeps the prior link and verified empty data clears it',async()=>{
  const source=(await fs.readFile(new URL('../public/assets/youtube.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
  for(const outcome of ['success','empty','failure']) {
    const hero={href:'https://www.youtube.com/watch?v='+id(83)},area={dataset:{officialVideos:'homeDigests'},innerHTML:'previous'};
    const calls=[];
    vm.runInNewContext(source,{...japaneseLocale,
      document:{querySelectorAll:selector=>({'[data-official-videos]':[area],'[data-latest-digest-link]':[hero]})[selector]||[]},
      AbortController,AbortSignal,clearInterval:()=>{},
      officialVideos,officialVideoStatus,latestDigestUrl,
      fetch:async url=>{calls.push(url);if(outcome==='failure')throw Error('offline');return Response.json({items:outcome==='empty'?[]:[normalized(video(82,'Digest new',16))],mode:'api',stale:false});}
    });
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(calls,['/api/official-videos']);
    assert.equal(hero.href,outcome==='success'?'https://www.youtube.com/watch?v='+id(82):outcome==='empty'?'/start/#first-videos':'https://www.youtube.com/watch?v='+id(83));
    if(outcome==='success')assert.ok(area.innerHTML.includes(id(82)));
    if(outcome==='failure')assert.equal(area.innerHTML,'previous');
  }
});

test('official selection requires title match and an actually published public video',async()=>{
  const rejected=[
    {...video(10,'Digest premiere',17),snippet:{...video(10,'Digest premiere',17).snippet,liveBroadcastContent:'upcoming'}},
    {...video(11,'楽しみ方 live',17),snippet:{...video(11,'楽しみ方 live',17).snippet,liveBroadcastContent:'live'}},
    {...video(12,'Digest private',17),status:{privacyStatus:'private',uploadStatus:'processed'}},
    {...video(13,'Digest unlisted',17),status:{privacyStatus:'unlisted',uploadStatus:'processed'}},
    video(14,'別のお話',17),
    {...video(15,'Digest future',18)},
    {...video(16,'Digest pending',17),liveStreamingDetails:{scheduledStartTime:'2026-11-18T00:00:00Z'}},
    {...video(17,'Digest failed',17),status:{privacyStatus:'public',uploadStatus:'failed'}},
  ];
  rejected[4].snippet.description='Digest 楽しみ方';
  const archive={...good[1],liveStreamingDetails:{actualStartTime:'2026-11-14T23:00:00Z',actualEndTime:'2026-11-15T00:00:00Z'}};
  const requests=[];
  const data=await fetchOfficialVideos([a],'fake-secret',fakeApi([good[0],archive,...good.slice(2),...rejected],requests),now);
  assert.deepEqual(data.items.map(v=>v.id),good.map(v=>v.id));
  assert.equal(data.stale,false);assert.equal(data.mode,'api');
  const query=requests.find(u=>u.pathname.endsWith('/search')).searchParams;
  assert.equal(query.get('q'),'Digest|楽しみ方');assert.equal(query.get('order'),'date');assert.equal(query.get('type'),'video');
  assert.ok(!JSON.stringify(data).includes('fake-secret'));
});
test('global result pool preserves older Digests and merges both official channels',async()=>{
  const rows=[video(21,'ライブの楽しみ方 A',16,b),video(22,'LIVE 楽しみ方 B',15,a),video(23,'楽しみ方：live C',14,b),video(24,'digest A',6,a),video(25,'DIGEST B',5,b),video(26,'Digest C',4,a)];
  const data=await fetchOfficialVideos([a,b],'key',fakeApi(rows),now);
  assert.deepEqual(data.items.map(v=>v.id),rows.map(v=>v.id));
  assert.equal(data.items[0].channelName,b.name);
  const readIds=html=>[...html.matchAll(/data-official-video="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(readIds(officialVideos(data,'highlights',now)),[id(21),id(22),id(23)]);
  assert.deepEqual(readIds(officialVideos(data,'digests',now)),[id(24),id(25)]);
  assert.deepEqual(readIds(officialVideos({...data,items:[...data.items].reverse()},'homeDigests',now)),[id(24),id(25),id(26)]);
  assert.deepEqual(readIds(officialVideos(data,'enjoyment',now)),[id(21),id(22),id(23)]);
});
test('pagination follows newer unverified results and rejects unrelated details',async()=>{
  const requests=[];
  const first=video(30,'説明欄だけにキーワード',17);
  const fetcher=async url=>{
    const u=new URL(url);requests.push(u);
    if (u.pathname.endsWith('/search')) return json(u.searchParams.has('pageToken')?{items:searchItems(good)}:{items:searchItems([first]),nextPageToken:'next'});
    const ids=u.searchParams.get('id').split(',');
    const foreign={...video(31,'Digest foreign',17,b)};
    return json({items:[first,...good,foreign].filter(v=>ids.includes(v.id)||v.id===foreign.id)});
  };
  const data=await fetchOfficialVideos([a],'key',fetcher,now);
  assert.deepEqual(data.items.map(v=>v.id),good.map(v=>v.id));
  assert.deepEqual(requests.filter(u=>u.pathname.endsWith('/search')).map(u=>u.searchParams.get('pageToken')),[null,'next']);
});
test('older page frontiers stop discovery once every display has enough videos',async()=>{
  let searchCalls=0;
  const older=video(40,'説明だけ',1);
  const fetcher=async url=>{
    const u=new URL(url);
    if (u.pathname.endsWith('/search')) {searchCalls++;return json({items:searchItems([...good,older]),nextPageToken:'older'});}
    return json({items:good});
  };
  const data=await fetchOfficialVideos([a],'key',fetcher,now);
  assert.equal(searchCalls,1);assert.equal(data.items.length,6);
});
test('home Digest selection continues to the next page when only two Digests have been found',async()=>{
  let searches=0;
  const fetcher=async url=>{
    const u=new URL(url);
    if(u.pathname.endsWith('/search')) {
      searches++;
      return json(u.searchParams.has('pageToken')?{items:searchItems(good.slice(-1))}:{items:searchItems(good.slice(0,-1)),nextPageToken:'third-digest'});
    }
    const ids=u.searchParams.get('id').split(',');
    return json({items:good.filter(v=>ids.includes(v.id))});
  };
  const data=await fetchOfficialVideos([a],'key',fetcher,now);
  assert.equal(searches,2);
  assert.deepEqual([...officialVideos(data,'homeDigests',now).matchAll(/data-official-video="([^"]+)"/g)].map(m=>m[1]),[id(1),id(4),id(6)]);
});
test('bounded pagination does not label an incomplete search as current',async()=>{
  let searches=0;
  const row=video(41,'楽しみ方',16);
  const fetcher=async url=>{
    if (new URL(url).pathname.endsWith('/search')) {searches++;return json({items:searchItems([row]),nextPageToken:'more'});}
    return json({items:[row]});
  };
  await assert.rejects(fetchOfficialVideos([a],'key',fetcher,now),/OFFICIAL_VIDEOS_INCOMPLETE/);
  assert.equal(searches,2);
});
test('official endpoint requires a key and shared cache; concurrent requests and queries reuse results',async()=>{
  let calls=0,time=now;
  const fetcher=async url=>{calls++;return fakeApi(good)(url);};
  for (const env of [{},{YOUTUBE_API_KEY:'fake-key'},{YOUTUBE_CACHE:kv()}]) {
    const handler=createHandler(config,{fetcher,now:()=>time});
    const data=await (await handler.fetch(new Request('https://site.test/api/official-videos'),env)).json();
    assert.equal(data.mode,'snapshot');assert.equal(data.items[0].id,seed.items[0].id);
  }
  assert.equal(calls,0);
  const env={YOUTUBE_API_KEY:'fake-key',YOUTUBE_CACHE:kv()};
  const handler=createHandler(config,{fetcher,now:()=>time});
  const responses=await Promise.all([handler.fetch(new Request('https://site.test/api/official-videos'),env),handler.fetch(new Request('https://site.test/api/official-videos?force=1'),env)]);
  assert.equal((await responses[0].json()).items.length,6);assert.equal(calls,2);
  await createHandler(config,{fetcher,now:()=>time}).fetch(new Request('https://site.test/api/official-videos'),env);assert.equal(calls,2);
  time+=OFFICIAL_VIDEO_TTL+1;
  await handler.fetch(new Request('https://site.test/api/official-videos'),env);assert.equal(calls,4);
  assert.equal((await handler.fetch(new Request('https://site.test/api/official-videos',{method:'POST'}),env)).status,405);
});
test('API failures retain the previous check time; fresh empty results clear old videos',async()=>{
  let calls=0;
  const env={YOUTUBE_API_KEY:'fake-secret',YOUTUBE_CACHE:kv()};
  const handler=createHandler(config,{fetcher:async()=>{calls++;throw Error('fake-secret');},now:()=>now});
  const failed=await (await handler.fetch(new Request('https://site.test/api/official-videos'),env)).json();
  assert.deepEqual(failed.items,seed.items);assert.equal(failed.checkedAt,seed.checkedAt);assert.equal(failed.mode,'unavailable');assert.equal(failed.stale,true);
  assert.ok(!JSON.stringify(failed).includes('fake-secret'));
  await handler.fetch(new Request('https://site.test/api/official-videos?retry=1'),env);assert.equal(calls,1);
  const empty=await (await createHandler(config,{fetcher:fakeApi([]),now:()=>now}).fetch(new Request('https://site.test/api/official-videos'),{YOUTUBE_API_KEY:'key',YOUTUBE_CACHE:kv()})).json();
  assert.deepEqual(empty.items,[]);assert.equal(empty.stale,false);
  assert.match(officialVideos(empty,'digests',now),/現在見つかりません/);
});
test('all views escape titles, reject future or invalid videos, and deduplicate cards',()=>{
  const safe=normalized(video(51,'Digest <script>alert(1)</script>',16));
  const data={items:[safe,safe,{...safe,id:'bad'},{...safe,id:id(52),publishedAt:'2027-01-01'},{...safe,id:id(53),title:'別の動画'}]};
  const html=officialVideos(data,'digests',now);
  assert.equal((html.match(/data-official-video=/g)||[]).length,1);
  assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('https://www.youtube.com/watch?v='+safe.id));
  assert.match(officialVideoStatus(seed),/確認済み/);
});

test('enjoyment requires a live-related word and 楽しみ方 in the title, keeps the three newest and excludes moon-only titles',async()=>{
 const rows=[video(61,'新月の楽しみ方',17),video(62,'満月の楽しみ方',16),video(63,'カミムスヒＬＩＶＥ の楽しみ方',15),video(64,'アコースティックライブの楽しみ方',14),video(65,'楽しみ方 / live',13),video(66,'LIVEの楽しみ方',12),video(67,'Aliveの楽しみ方',11)];
 const data=await fetchOfficialVideos([a],'key',fakeApi(rows),now);
 const html=officialVideos(data,'enjoyment',now);
 assert.deepEqual([...html.matchAll(/data-official-video="([^"]+)"/g)].map(m=>m[1]),[id(63),id(64),id(65)]);
 assert.ok(!html.includes('新月'));assert.ok(!html.includes('満月'));assert.ok(!html.includes('Alive'));
 assert.ok(officialVideos(data,'highlights',now).includes('新月の楽しみ方'));
});
