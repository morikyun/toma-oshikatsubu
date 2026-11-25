import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parse,parseFragment,serialize} from 'parse5';
import {createTranslator,localizedPath,localizedDate,hasJapanese} from '../public/assets/locale-core.js';
import {locales} from '../public/assets/locales.js';
import {localizePage,collectMessages,walk} from '../src/localization.mjs';
import * as video from '../public/assets/youtube-views.js';
import {blogArticles,blogStatus} from '../public/assets/blog-views.js';
import {liveEventRows,liveEventStatus} from '../public/assets/live-event-views.js';
const read=async name=>JSON.parse(await fs.readFile(new URL('../content/'+name+'.json',import.meta.url),'utf8'));
const [ja,en,terms,snapshot,blogSnapshot,liveEvents]=await Promise.all(['i18n/ja','i18n/en','terms','youtube-snapshot','blog-snapshot','live-events'].map(read));
const catalogs=Object.fromEntries(await Promise.all(locales.map(async locale=>[locale.code,await read('i18n/'+locale.code)])));
const full=createTranslator(ja,en),ui=createTranslator({runtime:ja.runtime},{runtime:en.runtime});
const get=(node,key)=>node.attrs?.find(a=>a.name===key)?.value;

test('every source message has a translation, with matching interpolation fields',()=>{
  for(const locale of locales)for(const group of ['messages','runtime'])for(const [key,source] of Object.entries(ja[group])){
    const target=catalogs[locale.code][group][key];assert.ok(typeof target==='string'&&target.trim(),locale.code+' '+key);
    const fields=s=>[...s.matchAll(/\{([a-zA-Z]+)\}/g)].map(m=>m[1]).sort();
    assert.deepEqual(fields(source),fields(target),key);
  }
});

test('changing a Japanese source requires review instead of silently reusing stale translations',()=>{
  const pages={'index.html':'<html><head><title>新しく追加した案内</title></head><body><p>変更された入部条件</p></body></html>'};
  const pending=collectMessages(pages,ja,en);
  assert.equal(pending.size,2);
  for(const locale of locales.filter(locale=>locale.code!=='ja'))assert.throws(()=>localizePage(pages['index.html'],'index.html',locale.code,ja,catalogs[locale.code],'https://example.com'),/Missing .* translations/);
});

test('English pages retain all glossary anchors and translated search text',async()=>{
  const html=await fs.readFile(new URL('../dist/en/words/index.html',import.meta.url),'utf8');
  const cards=[];walk(parse(html),node=>{if(get(node,'class')==='term-card')cards.push(node);});
  assert.deepEqual(cards.map(n=>get(n,'id')),terms.map(t=>t.id));
  const magnetic=cards.find(n=>get(n,'id')==='magnetic-pole-program');
  assert.match(get(magnetic,'data-search'),/Magnetic Pole Adjustment Program/);
  assert.match(get(magnetic,'data-search'),/磁極調整プログラム/);
  assert.ok(html.includes('61 glossary entries'));
  let heading='';walk(parse(html),node=>{if(node.tagName==='h1')walk(node,n=>{if(n.nodeName==='#text')heading+=n.value;});});
  assert.equal(heading,'A little glossary.');
});

test('language routes preserve anchors and leave assets, APIs and external destinations unchanged',()=>{
  assert.equal(localizedPath('/words/#emerald'),'/en/words/#emerald');
  for(const url of ['/assets/site.js','/api/blogs','/en/live/','#emerald','https://www.youtube.com/watch?v=wtxo_t21t7w'])assert.equal(localizedPath(url),url);
  assert.equal(localizedPath('/en/words/?q=music#emerald','zh-Hans'),'/zh-hans/words/?q=music#emerald');
  assert.equal(localizedPath('/zh-hans/words/#emerald','zh-Hant'),'/zh-hant/words/#emerald');
  assert.equal(localizedPath('/zh-hant/words/#emerald','ja'),'/words/#emerald');
  assert.equal(localizedPath('/zh-hans','zh-Hant'),'/zh-hant/');
});

test('every translated page has a self canonical, reciprocal language links and localized internal navigation',async()=>{
  for(const file of ['index.html','start/index.html','live/index.html','words/index.html','videos/index.html','schedule/index.html','club/index.html','tomabox/index.html','about/index.html','feedback/index.html','privacy/index.html','404.html']){
    const path='/'+file.replace(/index\.html$/,'');
    for(const {code:lang,prefix} of locales){
      const html=await fs.readFile(new URL('../dist/'+(prefix?prefix.slice(1)+'/':'')+file,import.meta.url),'utf8');
      assert.match(html,new RegExp(`<html lang="${lang}">`));
      assert.ok(html.includes(`rel="canonical" href="https://toma-oshikatsubu.pages.dev${localizedPath(path,lang)}"`));
      for(const alternate of locales)assert.ok(html.includes(`hreflang="${alternate.code}" href="https://toma-oshikatsubu.pages.dev${localizedPath(path,alternate.code)}"`));
      const languageLinks=[],pickers=[];
      walk(parse(html,{scriptingEnabled:false}),node=>{
        if(node.tagName==='select'&&get(node,'data-language-select')!==undefined)pickers.push(node);
        if(get(node,'data-language-link')!==undefined)languageLinks.push(node);
        else if(node.tagName==='a'&&get(node,'href')?.startsWith('/'))assert.ok(get(node,'href').startsWith(prefix+'/'));
      });
      assert.equal(languageLinks.length,4);
      assert.deepEqual(languageLinks.map(n=>get(n,'href')),locales.map(locale=>localizedPath(path,locale.code)));
      assert.equal(languageLinks.filter(n=>get(n,'aria-current')==='true').length,1);
      assert.equal(pickers.length,1);
      const options=pickers[0].childNodes.filter(n=>n.tagName==='option');
      assert.deepEqual(options.map(n=>get(n,'value')),locales.map(locale=>locale.code));
      assert.deepEqual(options.filter(n=>get(n,'selected')!==undefined).map(n=>get(n,'value')),[lang]);
    }
  }
});

test('Chinese pages retain all terms, Japanese search aliases, forms and original media titles',async()=>{
  for(const locale of locales.filter(locale=>locale.code.startsWith('zh-'))){
    const tr=createTranslator(ja,catalogs[locale.code],locale.code);
    const html=await fs.readFile(new URL('../dist'+locale.prefix+'/words/index.html',import.meta.url),'utf8');
    const cards=[];walk(parse(html),node=>{if(get(node,'class')==='term-card')cards.push(node);});
    assert.deepEqual(cards.map(n=>get(n,'id')),terms.map(t=>t.id));
    for(const term of terms){
      const card=cards.find(n=>get(n,'id')===term.id);
      assert.ok(get(card,'data-search').includes(term.name),term.name);
      assert.ok(get(card,'data-search').includes(tr.text(term.summary)),term.name);
    }
    const club=await fs.readFile(new URL('../dist'+locale.prefix+'/club/index.html',import.meta.url),'utf8');
    assert.ok(club.includes('https://ws.formzu.net/sfgen/S488493374/'));
    const schedule=await fs.readFile(new URL('../dist'+locale.prefix+'/schedule/index.html',import.meta.url),'utf8');
    assert.equal((schedule.match(/<iframe\b/g)||[]).length,2);
    assert.ok(schedule.includes('youtube-nocookie.com/embed/'));
    assert.ok(schedule.includes('さそり座新月🌑の楽しみ方'));
    assert.ok(!schedule.includes('autoplay=1'));
    const policy=await fs.readFile(new URL('../dist'+locale.prefix+'/privacy/index.html',import.meta.url),'utf8');
    assert.ok(policy.includes('もり かずひろ(もりきゅん)'));
  }
});

test('Chinese dynamic dates, counts and prefectures use the selected script',()=>{
  assert.equal(localizedDate('2026/11/25 14:03','zh-Hans'),'2026年11月25日 14:03');
  assert.equal(localizedDate('2026.11.25','zh-Hant'),'2026年11月25日');
  for(const locale of locales.filter(locale=>locale.code.startsWith('zh-'))){
    const tr=createTranslator({runtime:ja.runtime},{runtime:catalogs[locale.code].runtime},locale.code);
    for(const source of ['0件のことば','17件のチャンネル','2 / 6 確認できました','東京','2026/11/25 14:03 公開'])assert.ok(tr.lookup(source).known,source);
    assert.ok(tr.text('2026/11/25 14:03 公開').includes('2026年11月25日 14:03'));
  }
});

test('dynamic counts, dates and failure states remain English without changing Japanese output',()=>{
  for(const [source,expected] of [['1件のことば','1 glossary entry'],['17件のチャンネル','17 channels'],['0件のライブ','0 live events'],['2 / 6 確認できました','2 / 6 checked'],['2026/11/25 14:03 公開','Published 25 Nov 2026, 14:03 JST']])assert.equal(ui.text(source),expected);
  const source='更新を確認できないため、保存済みの記事を表示しています。最新の記事はブログからご覧ください。';
  assert.match(ui.text(source),/update is unavailable/);
  assert.equal(createTranslator(ja,en,'ja').text(source),source);
});

for(const locale of locales.filter(locale=>locale.code!=='ja'))test(`${locale.code}: fresh, stale, empty and fallback API views preserve source titles and translate controls`,()=>{
  const ui=createTranslator({runtime:ja.runtime},{runtime:catalogs[locale.code].runtime},locale.code);
  const now=Date.parse('2026-11-25T03:00:00Z'),date='2026-11-24T10:00:00Z',title='原題のまま & <安全な動画>';
  const channel={channelId:'UC'+'a'.repeat(22),name:'總水とおま'};
  const latest={id:'a'.repeat(11),title,channelId:channel.channelId,publishedAt:date,format:'video',embeddable:true};
  const fragments=[];
  for(const mode of ['api','snapshot'])for(const stale of [true,false]){
    const data={mode,stale,checkedAt:date,items:[{...latest,title:'Digest '+title}],events:[]};
    for(const status of [video.channelStatus,video.officialVideoStatus,video.scheduleStatus,video.officialLatestStatus,liveEventStatus])assert.ok(ui.lookup(status(data)).known,status(data));
    fragments.push(video.officialVideos(data,'homeDigests',now),video.officialVideos({...data,items:[]},'enjoyment',now),video.scheduleEvents(data,true,now));
    fragments.push(video.officialLatestVideos({...data,items:[{channelId:channel.channelId,latest,status:'limited',checkedAt:date}]},[channel],now));
  }
  for(const status of ['ok','limited','unavailable'])fragments.push(video.latestVideo({latest,status}));
  fragments.push(video.latestVideo({}),video.officialLatestVideos({},[channel],now));
  for(const status of ['ok','empty','unavailable']){
    const item={status,checkedAt:date,articles:[{title,publishedAt:date,url:'https://ameblo.jp/osikatutoma/entry-123456.html'}]};
    assert.ok(ui.lookup(blogStatus(item)).known);assert.ok(ui.lookup(blogStatus(item,true)).known);
    fragments.push(blogArticles(item,'osikatutoma'),blogArticles({...item,articles:[]},'osikatutoma'));
  }
  fragments.push(video.scheduleEvents({mode:'api',checkedAt:date,events:[{...latest,channelName:channel.name,startsAt:date,status:'live'}]},false,now));
  fragments.push(liveEventRows({items:[{id:'future',date:'2026-12-22',title,venue:'原語の会場',prefecture:'東京'}]},now));
  let preserved=0;
  for(const fragment of fragments)walk(parseFragment(fragment),(node,skip)=>{
    if(skip){if(node.nodeName==='#text'&&node.value.includes('原題'))preserved++;return;}
    if(node.nodeName==='#text')assert.ok(ui.lookup(node.value).known,node.value);
    for(const attr of node.attrs||[])if(['aria-label','alt','title'].includes(attr.name))assert.ok(ui.lookup(attr.value).known,attr.value);
  });
  assert.ok(preserved>5,'public titles stay in their original language');
});

test('translation values stay text and cannot inject markup or change external destinations',()=>{
  const source='<html><head><title>説明</title></head><body><p>説明</p><a href="https://example.com/">説明</a></body></html>';
  const result=localizePage(source,'index.html','en',{messages:{example:'説明'}},{messages:{example:'<img src=x onerror=alert(1)>'}},'https://site.example');
  assert.ok(result.includes('&lt;img'));assert.ok(!result.includes('<img'));
  assert.ok(result.includes('href="https://example.com/"'));
});

test('English pages preserve required membership, privacy, media and cache settings',async()=>{
  const policy=await fs.readFile(new URL('../dist/en/privacy/index.html',import.meta.url),'utf8');
  assert.match(policy,/Kazuhiro Mori \(Morikyun\)/);assert.match(policy,/Ren, the club’s founder/);
  const club=await fs.readFile(new URL('../dist/en/club/index.html',import.meta.url),'utf8');
  assert.match(club,/whether in person or through an online stream/);
  const schedule=await fs.readFile(new URL('../dist/en/schedule/index.html',import.meta.url),'utf8');
  assert.equal((schedule.match(/<iframe\b/g)||[]).length,2);assert.ok(schedule.includes('youtube-nocookie.com/embed/'));
  assert.ok(!schedule.includes('autoplay=1'));
  const routes=JSON.parse(await fs.readFile(new URL('../dist/_routes.json',import.meta.url),'utf8'));
  assert.deepEqual(routes.include,['/api/*']);
});
