import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchOfficialLatest,createHandler,OFFICIAL_VIDEO_TTL} from '../src/youtube-service.mjs';
import {officialLatestVideos} from '../public/assets/youtube-views.js';
const now=Date.parse('2026-11-18T08:00:00Z');
const a={channelId:'UCKQrY7ceEy_lbBSXXHtkMzQ',name:'總水とおま'},b={channelId:'UCJ1rq0BVCM0l90fjajRga6A',name:'TOMA☆トーク'};
const id=n=>String(n).padStart(11,'0');
const v=(n,day,channel=a,extra={})=>({id:id(n),format:'video',snippet:{title:'動画 '+n,channelId:channel.channelId,publishedAt:`2026-11-${String(day).padStart(2,'0')}T00:00:00Z`,liveBroadcastContent:'none'},status:{privacyStatus:'public',uploadStatus:'processed',embeddable:true},...extra});
const feed=(rows,channel)=>'<feed>'+rows.filter(r=>r.snippet.channelId===channel).map(r=>`<entry><yt:videoId>${r.id}</yt:videoId><yt:channelId>${channel}</yt:channelId><title>feed title</title><published>${r.snippet.publishedAt}</published><link rel="alternate" href="https://www.youtube.com/${r.format==='short'?'shorts/'+r.id:'watch?v='+r.id}"/></entry>`).join('')+'</feed>';
const mock=(rows,calls=[],failedChannel=null)=>async url=>{
 const u=new URL(url);calls.push(u);
 if(u.pathname==='/feeds/videos.xml') {const channel=u.searchParams.get('channel_id');if(channel===failedChannel) throw Error('feed failure');return new Response(feed(rows,channel));}
 assert.ok(u.pathname.endsWith('/videos'),'no search API requests');
 const ids=new Set(u.searchParams.get('id').split(','));return Response.json({items:rows.filter(r=>ids.has(r.id))});
};
const request=()=>new Request('https://site.test/api/official-latest');
const kv=()=>{const data=new Map();return {get:async key=>data.get(key),put:async(key,value)=>data.set(key,JSON.parse(value))};};

test('latest official videos exclude Shorts, upcoming/live, private and invalid broadcasts; both channels get one latest item',async()=>{
 const future=v(1,18);future.snippet.liveBroadcastContent='upcoming';
 const live=v(2,18);live.snippet.liveBroadcastContent='live';
 const privateVideo=v(3,17);privateVideo.status.privacyStatus='private';
 const pending=v(4,17,{...a},{liveStreamingDetails:{scheduledStartTime:'2026-11-18'}});
 const ended=v(5,16,a,{liveStreamingDetails:{actualEndTime:'2026-11-16T01:00:00Z'}});
 const rows=[v(0,18,a,{format:'short'}),future,live,privateVideo,pending,ended,v(6,15),v(7,17,b),v(8,16,b)];
 const calls=[];const data=await fetchOfficialLatest([a,b],{},'fake-key',mock(rows,calls),now);
 assert.deepEqual(data.items.map(item=>item.latest.id),[id(5),id(7)]);
 assert.equal(data.stale,false);assert.equal(data.mode,'api');
 const details=calls.filter(u=>u.pathname.endsWith('/videos'));assert.equal(details.length,1);assert.ok(!details[0].searchParams.get('id').includes(id(0)));
 assert.equal(data.items[0].latest.embeddable,true);assert.ok(!JSON.stringify(data).includes('fake-key'));
});

test('feed failure preserves only a revalidated public normal video, while the other channel updates',async()=>{
 const oldVideo=v(10,10);const previous={items:[{channelId:a.channelId,checkedAt:'2026-11-10T01:00:00Z',latest:{id:oldVideo.id,format:'video'}}]};
 const data=await fetchOfficialLatest([a,b],previous,'key',mock([oldVideo,v(11,17,b)],[],a.channelId),now);
 assert.equal(data.items[0].status,'unavailable');assert.equal(data.items[0].checkedAt,previous.items[0].checkedAt);assert.equal(data.items[0].latest.id,oldVideo.id);assert.equal(data.items[1].latest.id,id(11));assert.equal(data.stale,true);
 oldVideo.status.privacyStatus='private';
 const removed=await fetchOfficialLatest([a,b],previous,'key',mock([oldVideo],[],a.channelId),now);
 assert.equal(removed.items[0].latest,null);assert.equal(removed.items[1].status,'empty');
});

test('a Shorts-only feed keeps a verified previous video as limited; empty feeds clear old entries',async()=>{
 const oldVideo=v(20,10);const previous={items:[{channelId:a.channelId,checkedAt:'2026-11-10',latest:{id:oldVideo.id,format:'video'}}]};
 const fetcher=async url=>new URL(url).pathname==='/feeds/videos.xml'?new Response(feed([v(21,17,a,{format:'short'})],a.channelId)):Response.json({items:[oldVideo]});
 const result=await fetchOfficialLatest([a],previous,'key',fetcher,now);
 assert.equal(result.items[0].latest.id,oldVideo.id);assert.equal(result.items[0].status,'limited');
 const converted=await fetchOfficialLatest([a],previous,'key',mock([{...oldVideo,format:'short'}]),now);assert.equal(converted.items[0].latest,null,'a previous video now identified as a Short must not be retained');
 const cleared=await fetchOfficialLatest([a],previous,'key',mock([]),now);assert.equal(cleared.items[0].latest,null);assert.equal(cleared.stale,false);
});

test('latest endpoint shares its four-hour cache, coalesces requests and preserves data on API failure',async()=>{
 let time=now,calls=[],fail=false;
 const base=mock([v(30,17),v(31,16,b)],calls);
 const fetcher=url=>fail && new URL(url).pathname.endsWith('/videos')?Promise.reject(Error('private-key')):base(url);
 const config={revision:'latest-test',channels:[],official:[a,b],snapshot:{officialLatest:{items:[],checkedAt:null}}};
 for(const env of [{},{YOUTUBE_API_KEY:'key'},{YOUTUBE_CACHE:kv()}]) assert.equal((await (await createHandler(config,{fetcher}).fetch(request(),env)).json()).mode,'snapshot');
 assert.equal(calls.length,0);
 const env={YOUTUBE_API_KEY:'key',YOUTUBE_CACHE:kv()},handler=createHandler(config,{fetcher,now:()=>time});
 const responses=await Promise.all([handler.fetch(request(),env),handler.fetch(request(),env)]);
 const first=await responses[0].json();assert.equal(first.items.length,2);assert.equal(calls.length,3);
 await createHandler(config,{fetcher,now:()=>time}).fetch(request(),env);assert.equal(calls.length,3);
 time+=OFFICIAL_VIDEO_TTL-1;await handler.fetch(request(),env);assert.equal(calls.length,3);
 time+=2;fail=true;const failed=await(await handler.fetch(request(),env)).json();assert.deepEqual(failed.items,first.items);assert.equal(failed.checkedAt,first.checkedAt);assert.equal(failed.stale,true);assert.ok(!JSON.stringify(failed).includes('private-key'));
 const count=calls.length;await handler.fetch(request(),env);assert.equal(calls.length,count);
});

test('embed markup loads the privacy-enhanced player without autoplay, rejects invalid data and keeps a watch link if embedding is disabled',()=>{
 const data={items:[{channelId:a.channelId,latest:{id:id(40),format:'video',channelId:a.channelId,title:'<script>bad</script>',publishedAt:'2026-11-17',embeddable:true}},{channelId:b.channelId,latest:{id:id(41),format:'video',channelId:b.channelId,title:'other',publishedAt:'2026-11-16',embeddable:false}}]};
 const html=officialLatestVideos(data,[a,b],now);
 assert.equal((html.match(/<iframe /g)||[]).length,1);assert.ok(html.includes('src="https://www.youtube-nocookie.com/embed/'+id(40)+'?autoplay=0&amp;playsinline=1"'));assert.ok(!html.includes('autoplay=1'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('watch?v='+id(41)));assert.ok(html.includes('referrerpolicy="strict-origin-when-cross-origin"'));
 data.items[0].latest.format='short';data.items[1].latest.publishedAt='2027-01-01';assert.ok(!officialLatestVideos(data,[a,b],now).includes('data-latest-official-video'));
});
