import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parse} from 'parse5';
import {relayPage,relayEntrance,RELAY_PATH,RELAY_START,RELAY_GROUP} from '../src/relay.mjs';
import {eventIsCurrent} from '../public/assets/event-dates.js';

test('relay examples are labeled, copy targets are unique, and the confirmed group is linked',()=>{
 const html=relayPage(Date.parse('2026-11-28T00:00:00+09:00'));
 assert.equal(RELAY_START,'2026-11-28');assert.ok(!html.includes('12/6'));
 assert.match(html,/実際の参加者の投稿ではありません/);assert.match(html,/AI生成/);
 assert.ok(html.includes(RELAY_GROUP));assert.match(html,/ファンによる自主企画/);
 const ids=new Set(),targets=[];let cards=0;
 function visit(node){
  const attrs=Object.fromEntries((node.attrs||[]).map(a=>[a.name,a.value]));
  if(attrs.id){assert.ok(!ids.has(attrs.id),'duplicate ID');ids.add(attrs.id);}
  if(attrs['data-relay-copy'])targets.push(attrs['data-relay-copy']);
  if((attrs.class||'').split(' ').includes('relay-example'))cards++;
  for(const c of node.childNodes||[])visit(c);
 }
 visit(parse(html));assert.equal(cards,6);assert.equal(targets.length,10);
 for(const id of targets)assert.ok(ids.has(id),id);
});
test('schedule feature expires at Japanese midnight after the concert; the page remains as an archive',()=>{
 const during=Date.parse('2026-12-22T23:59:59+09:00'),after=during+1000;
 assert.ok(relayEntrance(during).includes(RELAY_PATH));assert.equal(relayEntrance(after),'');
 assert.match(relayPage(after),/data-relay-closed >このリレーの募集期間は終了/);
 assert.match(relayPage(during),/data-relay-closed hidden/);
});
test('copy buttons copy only on a user click and preserve the post text and shared hashtags',async()=>{
 const source=(await readFile(new URL('../public/assets/relay.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
 const text='バトン受け取った！🙌\n12/22、私はこれが楽しみ\n#TOMA楽しみリレー #WHITEBURN5';
 for(const blocked of [false,true]){
  let handler,copied=null,selected=false;
  const status={textContent:''},target={innerText:text},button={dataset:{relayCopy:'post'},hidden:true,addEventListener:(name,fn)=>{handler=fn;}};
  vm.runInNewContext(source,{translate:x=>x,eventIsCurrent,
   navigator:{clipboard:{writeText:async value=>{if(blocked)throw Error('unavailable');copied=value;}}},
   document:{querySelector:selector=>selector==='[data-relay-copy-status]'?status:null,querySelectorAll:()=>[button],getElementById:()=>target,addEventListener:()=>{},createRange:()=>({selectNodeContents:node=>{assert.equal(node,target);selected=true;}})},
   window:{addEventListener:()=>{},getSelection:()=>({removeAllRanges:()=>{},addRange:()=>{}})}
  });
  assert.equal(button.hidden,false);assert.equal(copied,null);
  await handler();
  if(blocked){assert.equal(selected,true);assert.match(status.textContent,/手動でコピー/);}
  else{assert.equal(copied,text);assert.match(button.textContent,/コピーしました/);}
 }
});
