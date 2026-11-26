import test from 'node:test';
import assert from 'node:assert/strict';
import {createChannelUpdater,mergeChannelUpdates,CHANNEL_RETRY_DELAYS} from '../public/assets/channel-updates.js';

const a='UCaaaaaaaaaaaaaaaaaaaaaa', b='UCbbbbbbbbbbbbbbbbbbbbbb';
const earlier='2026-11-17T04:00:00Z', later='2026-11-26T13:00:00Z';
const video=(id='aaaaaaaaaaa')=>({id,title:'通常動画・ライブ配信',format:'video',publishedAt:'2026-11-16T00:00:00Z'});
const item=(channelId=a,checkedAt=earlier,latest=video(),status='ok')=>({channelId,checkedAt,latest,status});
const data=(items=[item()],checkedAt=earlier)=>({items,checkedAt,stale:items.some(i=>['limited','unavailable'].includes(i.status))});
function harness(load,initialData=data()) {
  const scheduled=new Map(),renders=[],failures=[];let serial=0;
  const updater=createChannelUpdater({load,initialData,render:d=>renders.push(d),onFailure:d=>failures.push(d),
    setTimer:(callback,delay)=>{const id=++serial;scheduled.set(id,{callback,delay});return id;},clearTimer:id=>scheduled.delete(id)});
  return {updater,scheduled,renders,failures,async next(){const [id,{callback,delay}]=scheduled.entries().next().value;scheduled.delete(id);await callback();return delay;}};
}
test('a failed request retries automatically and stops after recovery',async()=>{
  let calls=0;
  const h=harness(async()=>{if(++calls===1)throw new Error('network timeout');return data([item(a,later,video('bbbbbbbbbbb'))],later);});
  await h.updater.start();
  assert.equal(h.renders.length,0);assert.deepEqual(h.failures,[{retryIn:60_000}]);
  assert.equal(await h.next(),60_000);
  assert.equal(h.renders.at(-1).items[0].latest.id,'bbbbbbbbbbb');assert.equal(h.scheduled.size,0);assert.equal(calls,2);
});
test('partial failure preserves known videos, updates successful channels, then recovers',async()=>{
  const initial=data([item(a,later,video('bbbbbbbbbbb')),item(b)] ,later);
  let calls=0;
  const h=harness(async()=>++calls===1
    ? data([item(a,earlier,video(),'unavailable'),item(b,later,video('ccccccccccc'))],later)
    : data([item(a,later,video('ddddddddddd')),item(b,later,video('ccccccccccc'))],later),initial);
  await h.updater.start();
  assert.deepEqual(h.renders[0].items.map(i=>i.latest.id),['bbbbbbbbbbb','ccccccccccc']);
  assert.equal(h.renders[0].items[0].checkedAt,later);assert.equal(h.renders[0].items[0].status,'unavailable');
  await h.next();
  assert.equal(h.renders[1].items[0].latest.id,'ddddddddddd');assert.equal(h.scheduled.size,0);
});
test('HTTP-200 fallback never rolls back a successful refresh and also triggers retry',async()=>{
  let calls=0;
  const h=harness(async()=>++calls===1 ? data([item(a,later,video('bbbbbbbbbbb'))],later) : {...data(),mode:'unavailable'});
  await h.updater.start();await h.updater.start();
  assert.equal(h.renders.at(-1).items[0].latest.id,'bbbbbbbbbbb');
  assert.equal(h.renders.at(-1).items[0].checkedAt,later);
  assert.equal(h.renders.at(-1).checkedAt,later);assert.equal(h.scheduled.size,1);
});
test('persistent failure has only three retries and leaves the previous display untouched',async()=>{
  let calls=0;
  const h=harness(async()=>{calls++;throw new Error('HTTP 503');});
  await h.updater.start();
  const delays=[];while(h.scheduled.size)delays.push(await h.next());
  assert.deepEqual(delays,CHANNEL_RETRY_DELAYS);assert.equal(calls,4);
  assert.equal(h.renders.length,0);assert.equal(h.failures.at(-1).retryIn,null);
});
test('Shorts-only results retain regular videos without repeatedly treating them as network failures',async()=>{
  const h=harness(async()=>data([item(a,later,null,'limited')],later));
  await h.updater.start();
  assert.equal(h.renders[0].items[0].latest.id,'aaaaaaaaaaa');assert.equal(h.scheduled.size,0);
});
test('fresh empty results clear removed videos; older successful cache data cannot roll results back',()=>{
  const recent=data([item(a,later,video('bbbbbbbbbbb'))],later);
  assert.equal(mergeChannelUpdates(recent,data()).items[0].latest.id,'bbbbbbbbbbb');
  const empty=mergeChannelUpdates(data(),data([item(a,later,null,'empty')],later));
  assert.equal(empty.items[0].latest,null);assert.equal(empty.stale,false);
});
test('invalid and incomplete responses retain the display and schedule a retry',async()=>{
  for(const response of [null,{},data([]),data([item(a,earlier,video('invalid'))]),data([item(),item()]),data([item(b)])]){
    const h=harness(async()=>response);await h.updater.start();
    assert.equal(h.renders.length,0);assert.equal(h.scheduled.size,1);h.updater.stop();
  }
});
test('leaving the page aborts requests, cancels retries and ignores late responses',async()=>{
  let resolve,signal;
  const h=harness(s=>{signal=s;return new Promise(r=>{resolve=r;});});
  const pending=h.updater.start();h.updater.stop();resolve(data());await pending;
  assert.equal(signal.aborted,true);assert.equal(h.renders.length,0);assert.equal(h.scheduled.size,0);
  const failed=harness(async()=>{throw new Error('offline');});await failed.updater.start();failed.updater.stop();
  assert.equal(failed.scheduled.size,0);
});
