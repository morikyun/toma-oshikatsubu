import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseOfficialLiveEvents,createLiveEventsHandler,LIVE_EVENT_TTL,LIVE_EVENT_URL} from '../src/live-events-service.mjs';

const now=Date.parse('2026-11-18T10:00:00Z');
const post=(title,time,body)=>`<div class="detail"><div class="title-group"><h3>${title}</h3><p class="time">${time}</p></div><div class="content">${body}</div></div>`;
const page=content=>`<div class="post-list">${content}</div>`;
const overview=body=>post('◆ TOMA EVENT 2026 ◆','2026.01.01',body);
const row=(date,place='TOKYO',venue='会場A')=>`<p><strong>${date}</strong></p><p><u>${place}</u></p><p>${venue}</p>`;
const annual=overview('<p><strong>TOMA LIVE 2026「WHITEBURN」</strong></p>'+row('2026.12.22'));
const detail=(date='2026年12月22日',venue='会場B',extra='')=>post('TOMA LIVE 2026 WHITEBURN 5','2026.12.22 東京 会場A',`<p>【開催日時】<br>${date}</p><p>【会場】<br>${venue}<br>東京都千代田区</p>${extra}`);
const request=()=>new Request('https://site.test/api/live-events');
const seed={items:parseOfficialLiveEvents(page(annual),now),checkedAt:'2026-11-17T00:00:00Z',mode:'snapshot',stale:true};
const kv=()=>{const values=new Map();return {get:async key=>values.get(key)||null,put:async(key,value)=>values.set(key,JSON.parse(value))};};

test('current official HTML yields six chronological concerts and prefers the labeled date over the stale 2025 header',async()=>{
  const html=await fs.readFile(new URL('./fixtures/official-events-20261118.html',import.meta.url),'utf8');
  const items=parseOfficialLiveEvents(html,now);
  assert.deepEqual(items.map(item=>item.date),['2026-11-21','2026-12-12','2026-12-22','2027-01-11','2027-02-02','2027-02-12']);
  assert.equal(items[0].venue,'銀座タクト');assert.equal(items[2].venue,'神田明神ホール');
  assert.equal(items[3].prefecture,'沖縄');assert.equal(items[4].prefecture,'大阪');
  assert.equal(items[5].venue,'後日発表');
});

test('new dates, corrected venues and rescheduled dates replace prior source data without duplicate cards',()=>{
  const initial=parseOfficialLiveEvents(page(annual+detail()),now);
  assert.equal(initial.length,1);assert.equal(initial[0].venue,'会場B');
  const added=overview('<p><strong>新しいライブ</strong></p>'+row('2027.03.03','SAITAMA','埼玉のホール'));
  const updated=parseOfficialLiveEvents(page(annual+detail('2026年12月23日','変更後の会場')+added),now);
  assert.deepEqual(updated.map(item=>item.date),['2026-12-23','2027-03-03']);
  assert.equal(updated[0].venue,'変更後の会場');assert.equal(updated[1].title,'新しいライブ');assert.equal(updated[1].prefecture,'埼玉');
  const removed=parseOfficialLiveEvents(page(added),now);
  assert.deepEqual(removed.map(item=>item.date),['2027-03-03']);
});

test('explicit cancellations in either overview or detail remove a concert; ticket sales being closed does not',()=>{
  assert.deepEqual(parseOfficialLiveEvents(page(annual.replace('2026.12.22','2026.12.22 中止')+detail()),now),[]);
  assert.deepEqual(parseOfficialLiveEvents(page(annual+detail(undefined,undefined,'<p>【公演中止】</p>')),now),[]);
  assert.equal(parseOfficialLiveEvents(page(annual+detail(undefined,undefined,'<p>チケット販売終了</p>')),now).length,1);
  assert.deepEqual(parseOfficialLiveEvents(page(annual),Date.parse('2026-12-22T15:00:00Z')),[]);
});

test('unrecognized layouts and ambiguous or invalid dates fail safely, while an explicitly empty schedule is accepted',()=>{
  for(const html of ['<h1>Maintenance</h1>',page(''),page(annual.replace('2026.12.22','2026.13.22')),page(annual.replace('TOKYO','unknown')),page(post('LIVE','日程未定','<p>【会場】会場A</p>'))]) {
    assert.throws(()=>parseOfficialLiveEvents(html,now));
  }
  assert.deepEqual(parseOfficialLiveEvents(page('<p>今後のイベント予定はありません</p>'),now),[]);
});

test('shared KV and concurrent requests reuse one fetch for four hours, then reflect additions and removals without redeploying',async()=>{
  let time=now,calls=0,html=page(annual);
  const env={YOUTUBE_CACHE:kv()};
  const deps={now:()=>time,fetcher:async(url,options)=>{calls++;assert.equal(url,LIVE_EVENT_URL);assert.equal(options.redirect,'error');return new Response(html);}};
  const handler=createLiveEventsHandler(seed,deps);
  const initial=await Promise.all(Array.from({length:5},()=>handler.fetch(request(),env).then(r=>r.json())));
  assert.equal(calls,1);assert.equal(initial[0].mode,'official');assert.equal(initial[0].stale,false);
  const cold=createLiveEventsHandler(seed,deps);
  await cold.fetch(new Request('https://site.test/api/live-events?refresh=1'),env);assert.equal(calls,1);
  time+=LIVE_EVENT_TTL-1;await handler.fetch(request(),env);assert.equal(calls,1);
  html=page(overview('<p><strong>追加ライブ</strong></p>'+row('2027.01.20')));time++;
  const changed=await (await handler.fetch(request(),env)).json();
  assert.equal(calls,2);assert.deepEqual(changed.items.map(item=>item.date),['2027-01-20']);
  assert.equal(changed.checkedAt,new Date(time).toISOString());
});

test('failed refresh preserves the last successful data and timestamp, retries at four hours, and verified empty data clears old events',async()=>{
  let time=now,calls=0,html=page(annual);
  const handler=createLiveEventsHandler(seed,{now:()=>time,fetcher:async()=>{calls++;return new Response(html);}});
  const env={YOUTUBE_CACHE:kv()};
  const initial=await (await handler.fetch(request(),env)).json();
  time+=LIVE_EVENT_TTL;html='<h1>Site maintenance</h1>';
  const failed=await (await handler.fetch(request(),env)).json();
  assert.deepEqual(failed.items,initial.items);assert.equal(failed.checkedAt,initial.checkedAt);
  assert.equal(failed.stale,true);assert.equal(failed.mode,'unavailable');
  await handler.fetch(request(),env);assert.equal(calls,2);
  time+=LIVE_EVENT_TTL;html=page('<p>今後のライブ予定はありません</p>');
  const cleared=await (await handler.fetch(request(),env)).json();
  assert.deepEqual(cleared.items,[]);assert.equal(cleared.stale,false);assert.equal(calls,3);
});

test('cached events expire at Japanese midnight even before cache expiry, and failures can fall back without API credentials',async()=>{
  let time=Date.parse('2026-12-22T14:59:59Z'),calls=0;
  const handler=createLiveEventsHandler(seed,{now:()=>time,fetcher:async()=>{calls++;return new Response(page(annual));}});
  assert.equal((await (await handler.fetch(request())).json()).items.length,1);
  time+=1000;assert.deepEqual((await (await handler.fetch(request())).json()).items,[]);assert.equal(calls,1);
  const offline=createLiveEventsHandler(seed,{now:()=>now,fetcher:async()=>{throw Error('private internal details');}});
  const fallback=await (await offline.fetch(request())).json();
  assert.equal(fallback.checkedAt,seed.checkedAt);assert.deepEqual(fallback.items,seed.items);assert.equal(fallback.stale,true);
  assert.ok(!JSON.stringify(fallback).includes('private internal'));
  assert.equal((await handler.fetch(new Request('https://site.test/api/live-events',{method:'POST'}))).status,405);
});
