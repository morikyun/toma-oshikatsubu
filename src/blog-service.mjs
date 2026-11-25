import {decodeXml} from './youtube-service.mjs';

export const BLOG_TTL = 30 * 60 * 1000;
const BLOG_RETRY_TTL = 5 * 60 * 1000;
const BLOG_ACCOUNTS = new Set(['tomasource','tomastaff','osikatutoma']);

export function parseBlogFeed(xml, account, now = Date.now()) {
  if (!BLOG_ACCOUNTS.has(account)) throw new Error('INVALID_BLOG');
  if (!/<rss(?:\s|>)/.test(xml) || !/<channel(?:\s|>)/.test(xml) || !/<\/channel>/.test(xml) || !/<\/rss>/.test(xml)) throw new Error('INVALID_RSS');
  const tag = (body, name) => decodeXml(body.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`))?.[1] || '').trim();
  const articles = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/g)].flatMap(([, body]) => {
    const title = tag(body,'title');
    const published = Date.parse(tag(body,'pubDate'));
    if (!title || !Number.isFinite(published) || published > now) return [];
    try {
      const url = new URL(tag(body,'link'));
      if (!['https:','http:'].includes(url.protocol) || url.hostname !== 'ameblo.jp' || url.username || url.password || url.port || !new RegExp(`^/${account}/entry-\\d+\\.html$`).test(url.pathname)) return [];
      return [{title,url:'https://ameblo.jp'+url.pathname,publishedAt:new Date(published).toISOString()}];
    } catch { return []; }
  }).sort((a,b) => Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
  const seen = new Set();
  return articles.filter(article => {
    if (seen.has(article.url)) return false;
    seen.add(article.url); return true;
  }).slice(0,3);
}

export async function fetchBlogUpdates(sources, previous = {}, fetcher = fetch, now = Date.now()) {
  const old = new Map((previous.items || []).map(item => [item.id,item]));
  const checkedAt = new Date(now).toISOString();
  const items = await Promise.all(sources.map(async source => {
    if (!BLOG_ACCOUNTS.has(source.id) || source.feedUrl !== `https://rssblog.ameba.jp/${source.id}/rss20.xml`) throw new Error('INVALID_BLOG');
    try {
      const response = await fetcher(source.feedUrl,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/rss+xml, application/xml, text/xml'}});
      if (!response.ok) throw new Error('RSS_UNAVAILABLE');
      const xml = await response.text();
      if (xml.length > 2_000_000) throw new Error('RSS_TOO_LARGE');
      const articles = parseBlogFeed(xml,source.id,now);
      return {id:source.id,articles,checkedAt,status:articles.length?'ok':'empty'};
    } catch {
      const cached = old.get(source.id);
      return {id:source.id,articles:cached?.articles || [],checkedAt:cached?.checkedAt || null,status:'unavailable'};
    }
  }));
  return {checkedAt,items,stale:items.some(item => item.status === 'unavailable')};
}

export function createBlogHandler(config, dependencies = {}) {
  const fetcher = dependencies.fetcher || fetch;
  const now = dependencies.now || Date.now;
  const key = `blogs-v1:${config.revision}`;
  let memory = null;
  let inflight = null;
  async function refresh(env) {
    let cached = memory;
    if (!cached || cached.retryAt <= now()) {
      try { cached = await env.YOUTUBE_CACHE?.get(key,'json') || cached; } catch {}
    }
    if (cached?.retryAt > now()) { memory = cached; return cached.data; }
    const data = await fetchBlogUpdates(config.sources,cached?.data || config.snapshot,fetcher,now());
    memory = {data,retryAt:now()+(data.stale?BLOG_RETRY_TTL:BLOG_TTL)};
    try { await env.YOUTUBE_CACHE?.put(key,JSON.stringify(memory),{expirationTtl:86400*7}); } catch {}
    return data;
  }
  return {
    async fetch(request, env = {}) {
      if (request.method !== 'GET') return new Response(null,{status:405,headers:{Allow:'GET'}});
      if (!inflight) inflight = refresh(env).finally(() => { inflight = null; });
      let data;
      try { data = await inflight; }
      catch { data = {...config.snapshot,stale:true,items:(config.snapshot.items || []).map(item=>({...item,status:'unavailable'}))}; }
      return new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff'}});
    }
  };
}
