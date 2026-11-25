import {japaneseLocale} from './support/locales.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {renderPages} from '../src/pages.mjs';
import {parseBlogFeed,fetchBlogUpdates,createBlogHandler,BLOG_TTL} from '../src/blog-service.mjs';
import {blogArticles,blogStatus} from '../public/assets/blog-views.js';

const sources=JSON.parse(await readFile(new URL('../content/blogs.json',import.meta.url),'utf8'));
const now=Date.parse('2026-11-17T05:00:00Z');
const url=(account,id)=>`https://ameblo.jp/${account}/entry-${id}.html`;
const item=(title,link,date='Tue, 17 Nov 2026 12:00:00 +0900')=>`<item><title><![CDATA[${title}]]></title><link>${link}</link><pubDate>${date}</pubDate><description><![CDATA[<script>not a title</script>]]></description></item>`;
const rss=(items='')=>`<?xml version="1.0"?><rss version="2.0"><channel><title>Blog</title>${items}</channel></rss>`;
const sample=(account)=>rss(item('新しい記事',url(account,100)));
const feedSample=feed=>sample(new URL(feed).pathname.split('/')[1]);
const snapshot={checkedAt:'2026-11-16T00:00:00Z',stale:false,items:sources.map(source=>({id:source.id,status:'ok',checkedAt:'2026-11-16T00:00:00Z',articles:[{title:'前回の記事',url:url(source.id,99),publishedAt:'2026-11-16T00:00:00Z'}]}))};

test('RSS keeps the three newest distinct posts from the requested account',()=>{
  const xml=rss([
    item('古い記事',url('tomasource',1),'Mon, 16 Nov 2026 12:00:00 +0900'),
    item('A &amp; B',url('tomasource',2),'Tue, 17 Nov 2026 11:00:00 +0900'),
    item('最新',url('tomasource',3)),
    item('重複',url('tomasource',3)+'?ref=rss'),
    item('さらに前',url('tomasource',4),'Sun, 15 Nov 2026 12:00:00 +0900'),
    item('未来',url('tomasource',5),'Wed, 18 Nov 2026 12:00:00 +0900'),
    item('別のブログ',url('tomastaff',6)),
    item('広告','https://example.com/ad'),
    item('unsafe','javascript:alert(1)'),
    item('日付なし',url('tomasource',7),'unknown')
  ].join(''));
  const entries=parseBlogFeed(xml,'tomasource',now);
  assert.deepEqual(entries.map(e=>e.url),[3,2,1].map(id=>url('tomasource',id)));
  assert.equal(entries[1].title,'A & B');
  assert.equal(entries[0].publishedAt,'2026-11-17T03:00:00.000Z');
  assert.ok(entries.every(e=>!('description' in e)));
});

test('a valid empty feed clears old articles; invalid RSS retains the last successful feed',async()=>{
  assert.throws(()=>parseBlogFeed('<html>unavailable</html>','tomasource',now),/INVALID_RSS/);
  const empty=await fetchBlogUpdates(sources,snapshot,async()=>new Response(rss()),now);
  assert.ok(empty.items.every(i=>i.status==='empty' && i.articles.length===0));
  assert.equal(empty.stale,false);
  const failed=await fetchBlogUpdates(sources,snapshot,async()=>new Response('<html>error</html>'),now);
  assert.equal(failed.stale,true);
  assert.ok(failed.items.every(i=>i.status==='unavailable' && i.articles[0].title==='前回の記事' && i.checkedAt===snapshot.checkedAt));
});

test('one unavailable blog does not prevent the other blog from updating',async()=>{
  const result=await fetchBlogUpdates(sources,snapshot,async feed=>{
    if (feed.includes('/tomastaff/')) return new Response('Unavailable',{status:503});
    return new Response(feedSample(feed));
  },now);
  assert.equal(result.items[0].status,'ok');
  assert.equal(result.items[0].articles[0].title,'新しい記事');
  assert.equal(result.items[1].status,'unavailable');
  assert.equal(result.items[1].articles[0].title,'前回の記事');
  assert.equal(result.items[1].checkedAt,snapshot.checkedAt);
  const community=result.items.find(item=>item.id==='osikatutoma');
  assert.equal(community.status,'ok');
  assert.equal(community.articles[0].url,url('osikatutoma',100));
});

test('RSS fetches only the configured blog feeds',async()=>{
  let calls=0;
  await assert.rejects(()=>fetchBlogUpdates([{id:'tomasource',feedUrl:'https://example.com/feed'}],{},async()=>{calls++;},now),/INVALID_BLOG/);
  assert.equal(calls,0);
});

test('cached blog updates work without an API key and deduplicate simultaneous refreshes',async()=>{
  let time=now,calls=0;
  const handler=createBlogHandler({sources,snapshot,revision:'test'}, {now:()=>time,fetcher:async feed=>{calls++;return new Response(feedSample(feed));}});
  const request=()=>handler.fetch(new Request('https://site.test/api/blogs'),{});
  const [a,b]=await Promise.all([request(),request()]);
  const updated=await a.json();
  assert.equal(updated.stale,false);
  assert.deepEqual(updated.items.map(item=>item.id),['tomasource','tomastaff','osikatutoma']);
  assert.ok(updated.items.every(item=>item.status==='ok' && item.articles[0].url===url(item.id,100)));
  assert.equal((await b.json()).items.length,sources.length);
  assert.equal(calls,sources.length);
  time+=BLOG_TTL-1; await request(); assert.equal(calls,sources.length);
  time+=2; await request(); assert.equal(calls,sources.length*2);
  assert.equal((await handler.fetch(new Request('https://site.test/api/blogs',{method:'POST'}),{})).status,405);
});

test('KV shares the RSS cache across Worker instances',async()=>{
  let calls=0;
  const stored=new Map();
  const env={YOUTUBE_CACHE:{get:async key=>stored.get(key),put:async(key,value)=>stored.set(key,JSON.parse(value))}};
  const deps={now:()=>now,fetcher:async feed=>{calls++;return new Response(feedSample(feed));}};
  const config={sources,snapshot,revision:'shared'};
  await createBlogHandler(config,deps).fetch(new Request('https://site.test/api/blogs'),env);
  await createBlogHandler(config,deps).fetch(new Request('https://site.test/api/blogs'),env);
  assert.equal(calls,sources.length);
});

test('failed fetches keep article dates and retry after five minutes',async()=>{
  let time=now,calls=0;
  const handler=createBlogHandler({sources,snapshot,revision:'failure'},{now:()=>time,fetcher:async()=>{calls++;throw new Error('offline');}});
  const request=()=>handler.fetch(new Request('https://site.test/api/blogs'),{});
  const first=await (await request()).json();
  assert.equal(first.items[0].checkedAt,snapshot.checkedAt);
  assert.equal(first.stale,true);
  time+=299000;await request();assert.equal(calls,sources.length);
  time+=2000;await request();assert.equal(calls,sources.length*2);
});

test('rendered titles are escaped, unsafe links are excluded, and stale information is labeled',()=>{
  const article={title:'<img src=x onerror="alert(1)"> & 新着',url:url('tomasource',1),publishedAt:'2026-11-17T03:00:00Z'};
  const html=blogArticles({articles:[article,{...article,url:'javascript:alert(1)'},{...article,url:url('tomastaff',2)}]},'tomasource');
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('href="javascript:'));
  assert.equal((html.match(/<li>/g)||[]).length,1);
  assert.ok(html.includes('2026/11/17 公開'));
  assert.ok(blogStatus({...snapshot.items[0],status:'unavailable'}).includes('前回取得'));
});

const communityUpdate={id:'osikatutoma',status:'ok',checkedAt:new Date(now).toISOString(),articles:[1,4,3,2].map(id=>({title:`活動だより ${id}`,url:url('osikatutoma',id),publishedAt:`2026-11-${13+id}T03:00:00Z`}))};
const articleLinks=html=>[...html.matchAll(/href="(https:\/\/ameblo.jp\/osikatutoma\/entry-\d+\.html)"/g)].map(match=>match[1]);

test('home and club show two and three community posts before joining, separately from official blogs',async()=>{
  const names=['site','terms','videos','channels','official-channels','youtube-snapshot','interview','privacy'];
  const [site,terms,videos,channels,official,snapshot,interview,privacy]=await Promise.all(names.map(async name=>JSON.parse(await readFile(new URL(`../content/${name}.json`,import.meta.url),'utf8'))));
  const pages=renderPages({site,terms,videos,channels,official,snapshot,interview,privacy,blogs:sources,blogSnapshot:{items:[communityUpdate]}});
  for (const [page,count] of [['index.html',2],['club/index.html',3]]) {
    const html=pages[page];
    const section=html.match(/<section[^>]+id="club-journal"[\s\S]*?<\/section>/)?.[0];
    assert.ok(section,page);
    assert.ok(section.includes(`data-blog-limit="${count}"`));
    assert.ok(section.includes('推し活部の活動だより'));
    assert.deepEqual(articleLinks(section),[4,3,2].slice(0,count).map(id=>url('osikatutoma',id)));
    assert.ok(!section.includes('blog-post-arrow'));
    const joinMarker=page==='index.html'?'class="section join-section"':'id="join"';
    assert.ok(html.indexOf('id="club-journal"')<html.indexOf(joinMarker));
    if (page==='club/index.html') assert.ok(html.indexOf('TOMA推し活部って？')<html.indexOf('id="club-journal"'));
  }
  for (const page of ['index.html','schedule/index.html']) {
    const section=pages[page].match(/<section[^>]+id="blogs"[\s\S]*?<\/section>/)?.[0];
    assert.deepEqual([...section.matchAll(/data-blog-id="([^"]+)"/g)].map(match=>match[1]),['tomasource','tomastaff']);
  }
  assert.ok(!pages['schedule/index.html'].includes('id="club-journal"'));
});

test('browser RSS refresh keeps each community list at its page limit and preserves posts when offline',async()=>{
  const source=(await readFile(new URL('../public/assets/blogs.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'');
  for (const offline of [false,true]) {
    const cards=[2,3].map(limit=>{
      const articles={innerHTML:blogArticles(snapshot.items.find(item=>item.id==='osikatutoma'),'osikatutoma',{limit,compact:true})};
      const status={textContent:''};
      return {dataset:{blogId:'osikatutoma',blogLimit:String(limit),blogLayout:'compact'},articles,status,querySelector:selector=>selector==='[data-blog-articles]'?articles:status};
    });
    const saved=cards.map(card=>card.articles.innerHTML);
    const calls=[];
    const context=vm.createContext({...japaneseLocale,document:{querySelectorAll:()=>cards},AbortSignal,blogArticles,blogStatus,fetch:async url=>{
      calls.push(url);
      if (offline) throw new Error('offline');
      return {ok:true,json:async()=>({items:[communityUpdate]})};
    }});
    vm.runInContext(source,context);
    await new Promise(resolve=>setImmediate(resolve));
    assert.deepEqual(calls,['/api/blogs']);
    for (const [index,card] of cards.entries()) {
      if (offline) {
        assert.equal(card.articles.innerHTML,saved[index]);
        assert.ok(card.status.textContent.includes('保存済みの記事'));
      } else {
        assert.deepEqual(articleLinks(card.articles.innerHTML),[4,3,2].slice(0,index+2).map(id=>url('osikatutoma',id)));
        assert.ok(!card.articles.innerHTML.includes('blog-post-arrow'));
        assert.ok(card.status.textContent.includes('RSSから取得'));
      }
    }
  }
});
