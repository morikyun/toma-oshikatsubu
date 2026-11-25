import {japaneseLocale} from './support/locales.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {eventExpiry,eventIsCurrent} from '../public/assets/event-dates.js';
import {liveEventSection,fanEventFeature} from '../src/live-events.mjs';
import {liveEventRows,liveEventStatus} from '../public/assets/live-event-views.js';

const data=JSON.parse(await fs.readFile(new URL('../content/live-events.json',import.meta.url),'utf8'));

test('events expire at the next midnight in Japan, including month/year/leap-day boundaries',()=>{
  for (const [day,expiry] of [['2026-11-21','2026-11-21T15:00:00Z'],['2026-12-22','2026-12-22T15:00:00Z'],['2026-12-31','2026-12-31T15:00:00Z'],['2028-02-29','2028-02-29T15:00:00Z']]) {
    const end=Date.parse(expiry);
    assert.equal(eventExpiry(day),end);
    assert.equal(eventIsCurrent(day,end-1),true);
    assert.equal(eventIsCurrent(day,end),false);
    assert.equal(eventIsCurrent(day,end+1),false);
  }
  for (const day of [null,'','invalid','2026-2-2','2027-02-29','2026-13-01','2026-04-31','2026-12-22T00:00:00Z']) assert.equal(eventIsCurrent(day,0),false,day);
});

test('the six concerts are chronological and expired rows or the fan feature are omitted on rebuild',()=>{
  const before=liveEventSection({...data,items:[...data.items].reverse()},Date.parse('2026-11-18T00:00:00Z'));
  assert.deepEqual([...before.matchAll(/data-event-date="([^"]+)"/g)].map(m=>m[1]),data.items.map(item=>item.date));
  assert.equal((before.match(/data-live-event-row/g)||[]).length,6);
  assert.equal((liveEventSection(data,Date.parse('2026-12-22T14:59:59Z')).match(/data-live-event-row/g)||[]).length,4);
  assert.equal((liveEventSection(data,Date.parse('2026-12-22T15:00:00Z')).match(/data-live-event-row/g)||[]).length,3);
  assert.ok(fanEventFeature(data.feature,Date.parse('2026-12-22T14:59:59Z')).includes('プレへそ'));
  assert.equal(fanEventFeature(data.feature,Date.parse('2026-12-22T15:00:00Z')),'');
  assert.ok(!liveEventSection(data,Date.parse('2027-02-12T15:00:00Z')).includes('data-live-event-row'));
});

test('date-dependent content stays hidden until checked and external text is escaped',()=>{
  const now=Date.parse('2026-11-18T00:00:00Z');
  const html=liveEventSection({...data,items:[{...data.items[0],title:'<script>bad</script>',venue:'<img onerror="bad()">'}]},now);
  assert.match(html,/data-event-date="2026-11-21" hidden/);
  assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<img onerror'));
  assert.ok(html.includes(data.sourceUrl));
  const feature=fanEventFeature(data.feature,now);
  assert.match(feature,/data-event-date="2026-12-22" hidden/);
  assert.ok(feature.includes(data.feature.sourceUrl));
  assert.ok(feature.includes('500円'));assert.ok(feature.includes('13:30受付'));
});

test('an open page hides past rows and the December feature at midnight and on restored/visible pages',async()=>{
  const source=(await fs.readFile(new URL('../public/assets/events.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
  let now=Date.parse('2026-12-22T14:59:59Z'),scheduled;
  const make=(date,row=true)=>({dataset:{eventDate:date},hidden:true,hasAttribute:()=>row});
  const rows=data.items.map(item=>make(item.date)),feature=make(data.feature.date,false),count={hidden:true,textContent:''},empty={hidden:true};
  const handlers={};
  const document={hidden:false,querySelectorAll:selector=>({'[data-event-date]':[...rows,feature],'[data-live-event-count]':[count],'[data-live-events-empty]':[empty]})[selector]||[],addEventListener:(event,fn)=>{handlers[event]=fn;}};
  vm.runInNewContext(source,{...japaneseLocale,document,window:{addEventListener:(event,fn)=>{handlers[event]=fn;}},Date:{now:()=>now},eventExpiry,eventIsCurrent,setInterval:()=>1,clearTimeout:()=>{},setTimeout:(fn,delay)=>{scheduled={fn,delay};return 1;}});
  assert.equal(count.textContent,'4件のライブ');assert.equal(feature.hidden,false);assert.equal(scheduled.delay,1000);
  now+=1000;scheduled.fn();
  assert.equal(count.textContent,'3件のライブ');assert.equal(feature.hidden,true);assert.equal(rows[2].hidden,true);assert.equal(empty.hidden,true);
  assert.ok(scheduled.delay<=86400000,'far-future events must not exceed browser timer limits');
  now=Date.parse('2027-01-11T15:00:00Z');handlers.pageshow();assert.equal(count.textContent,'2件のライブ');
  now=Date.parse('2027-02-12T15:00:00Z');handlers.visibilitychange();
  assert.equal(count.textContent,'0件のライブ');assert.equal(empty.hidden,false);assert.ok(rows.every(row=>row.hidden));
});

test('browser refresh replaces the list and count, retains the fan feature, and keeps visible events on a network failure',async()=>{
  const source=(await fs.readFile(new URL('../public/assets/events.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
  let now=Date.parse('2026-11-18T10:00:00Z'),rows=[],interval,html='',calls=0,fail=false;
  let incoming={items:[{date:'2027-02-20',title:'追加のライブ',venue:'新会場',prefecture:'埼玉'}],checkedAt:new Date(now).toISOString(),mode:'official',stale:false};
  const make=(date,row=true)=>({dataset:{eventDate:date},hidden:true,hasAttribute:()=>row});
  const feature=make('2026-12-22',false),count={},empty={},status={};
  const area={get innerHTML(){return html;},set innerHTML(value){html=value;rows=[...value.matchAll(/data-event-date="([^"]+)"/g)].map(match=>make(match[1]));}};
  const handlers={};
  const document={hidden:false,querySelectorAll:selector=>({'[data-event-date]':[...rows,feature],'[data-live-event-list]':[area],'[data-live-event-count]':[count],'[data-live-events-empty]':[empty],'[data-live-event-status]':[status]})[selector]||[],addEventListener:(event,fn)=>{handlers[event]=fn;}};
  vm.runInNewContext(source,{...japaneseLocale,document,window:{addEventListener:(event,fn)=>{handlers[event]=fn;}},Date:{now:()=>now},AbortSignal,eventExpiry,eventIsCurrent,liveEventRows:data=>liveEventRows(data,now),liveEventStatus,clearTimeout:()=>{},setTimeout:()=>1,setInterval:(fn,delay)=>{assert.equal(delay,4*60*60*1000);interval=fn;},fetch:async url=>{calls++;assert.equal(url,'/api/live-events');if(fail)throw Error('offline');return Response.json(incoming);}});
  const settled=()=>new Promise(resolve=>setImmediate(resolve));
  await settled();
  assert.equal(count.textContent,'1件のライブ');assert.equal(rows[0].hidden,false);assert.equal(feature.hidden,false);
  assert.match(html,/追加のライブ/);assert.match(status.textContent,/公式サイトから自動取得/);
  handlers.pageshow();await settled();assert.equal(calls,1);
  now+=4*60*60*1000;fail=true;interval();await settled();
  assert.equal(count.textContent,'1件のライブ');assert.match(status.textContent,/表示中の予定を残しています/);
  now+=4*60*60*1000;fail=false;incoming={...incoming,items:[]};interval();await settled();
  assert.equal(count.textContent,'0件のライブ');assert.equal(empty.hidden,false);assert.equal(feature.hidden,false);
});
