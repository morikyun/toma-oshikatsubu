import {liveEnjoymentTitle} from '../public/assets/youtube-rules.js';
// Runs in Cloudflare Pages and in the local preview. No credentials are built into this file.
export const CHANNEL_TTL = 30 * 60 * 1000;
export const SCHEDULE_TTL = 4 * 60 * 60 * 1000;
export const OFFICIAL_VIDEO_TTL = 4 * 60 * 60 * 1000;
const RETRY_TTL = 5 * 60 * 1000;
const VIDEO_ID = /^[\w-]{11}$/;
const CHANNEL_ID = /^UC[\w-]{22}$/;

export function decodeXml(text = '') {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
    const entities = {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
    if (entities[entity]) return entities[entity];
    const code = entity.startsWith('#x') ? parseInt(entity.slice(2),16) : parseInt(entity.slice(1),10);
    return Number.isInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  });
}
export function parseFeed(xml, channelId, now = Date.now()) {
  if (!/<feed(?:\s|>)/.test(xml) || !/<\/feed>/.test(xml)) throw new Error('INVALID_FEED');
  const tag = (s, name) => decodeXml(s.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`))?.[1] || '').trim();
  const entries = [...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/g)].map(([,body]) => {
    const id=tag(body,'yt:videoId');
    const attribute=(s,name)=>decodeXml(s.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`))?.[1] || '');
    const link=[...body.matchAll(/<link\b[^>]*>/g)].map(m=>m[0]).find(link=>attribute(link,'rel')==='alternate');
    let format='unknown';
    try {
      const url=new URL(attribute(link || '','href'));
      if (url.protocol==='https:' && ['youtube.com','www.youtube.com'].includes(url.hostname)) {
        if (url.pathname==='/shorts/'+id) format='short';
        if (url.pathname==='/watch' && url.searchParams.get('v')===id) format='video';
      }
    } catch {}
    return {id,channelId:tag(body,'yt:channelId'),title:tag(body,'title'),publishedAt:tag(body,'published'),format};
  }).filter(v => VIDEO_ID.test(v.id) && v.channelId === channelId && v.title && Number.isFinite(Date.parse(v.publishedAt)) && Date.parse(v.publishedAt) <= now);
  return entries.sort((a,b) => Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).map(({channelId,...v})=>v);
}
export function sortChannels(channels, items = []) {
  const index = new Map(items.map(item=>[item.channelId,item]));
  return channels.map((channel,order)=>({...channel,latest:index.get(channel.channelId)?.latest || null,feedStatus:index.get(channel.channelId)?.status || 'unavailable',checkedAt:index.get(channel.channelId)?.checkedAt || null,order}))
    .sort((a,b)=>(Date.parse(b.latest?.publishedAt)||0)-(Date.parse(a.latest?.publishedAt)||0)||a.order-b.order);
}
export function visibleEvents(events = [], now = Date.now(), checkedAt = '') {
  return events.filter(e => VIDEO_ID.test(e.id) && ['live','upcoming'].includes(e.status))
    .filter(e => e.status === 'live' ? now-Date.parse(checkedAt) <= 6*3600000 : !e.startsAt || Date.parse(e.startsAt) >= now-6*3600000)
    .sort((a,b) => (a.status === 'live' ? 0 : 1)-(b.status === 'live' ? 0 : 1) || (Date.parse(a.startsAt)||Infinity)-(Date.parse(b.startsAt)||Infinity));
}
async function getText(url, fetcher) {
  const response = await fetcher(url,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/atom+xml, application/json, text/xml'}});
  if (!response.ok) throw new Error('UPSTREAM_UNAVAILABLE');
  const text = await response.text();
  if (text.length > 2_000_000) throw new Error('UPSTREAM_TOO_LARGE');
  return text;
}
export async function fetchChannelUpdates(channels, previous = {}, fetcher = fetch, now = Date.now()) {
  const old = new Map((previous.items || []).map(item=>[item.channelId,item]));
  const checkedAt = new Date(now).toISOString();
  const items = [];
  // Keep below Cloudflare's simultaneous outgoing-connection limit.
  for (let offset=0; offset<channels.length; offset+=4) {
    items.push(...await Promise.all(channels.slice(offset,offset+4).map(async channel => {
      if (!CHANNEL_ID.test(channel.channelId)) throw new Error('INVALID_CHANNEL');
      try {
        const xml = await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`,fetcher);
        const entries = parseFeed(xml,channel.channelId,now);
        // YouTube's alternate URL identifies Shorts; duration and title are not used.
        const latest = entries.find(v=>v.format==='video') || null;
        if (!latest && entries.length) {
          const previous=old.get(channel.channelId);
          return {channelId:channel.channelId,latest:previous?.latest?.format==='video'?previous.latest:null,checkedAt:previous?.checkedAt || checkedAt,status:'limited'};
        }
        return {channelId:channel.channelId,latest,checkedAt,status:latest?'ok':'empty'};
      } catch {
        const previous=old.get(channel.channelId);
        return {channelId:channel.channelId,latest:previous?.latest?.format==='video'?previous.latest:null,checkedAt:previous?.checkedAt || null,status:'unavailable'};
      }
    })));
  }
  return {checkedAt,items,stale:items.some(item=>['unavailable','limited'].includes(item.status))};
}
async function youtubeApi(resource, params, apiKey, fetcher) {
  if (!apiKey) throw new Error('NOT_CONFIGURED');
  const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
  url.search = new URLSearchParams({...params,key:apiKey}).toString();
  const data = JSON.parse(await getText(url.toString(),fetcher));
  if (!Array.isArray(data.items)) throw new Error('INVALID_API_RESPONSE');
  return data;
}
const digestTitle = title => /digest/i.test(String(title || '').normalize('NFKC'));
const enjoymentTitle = title => String(title || '').normalize('NFKC').includes('楽しみ方');
function officialSelections(items) {
  const sorted=[...items].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.id.localeCompare(b.id));
  return [sorted.slice(0,3),sorted.filter(v=>digestTitle(v.title)).slice(0,3),sorted.filter(v=>liveEnjoymentTitle(v.title)).slice(0,3)];
}
export async function fetchOfficialVideos(channels, apiKey, fetcher = fetch, now = Date.now()) {
  if (!apiKey) throw new Error('NOT_CONFIGURED');
  const api=(resource,params)=>youtubeApi(resource,params,apiKey,fetcher);
  const states=channels.map(channel=>{
    if (!CHANNEL_ID.test(channel.channelId)) throw new Error('INVALID_CHANNEL');
    return {channel,pageToken:'',nextPageToken:null,boundary:Infinity,seen:new Set()};
  });
  const found=new Map();
  let pending=states;
  // At most two search pages per official channel; reuse one result pool on all four video sections.
  for (let round=0; round<2 && pending.length; round++) {
    await Promise.all(pending.map(async state=>{
      const page=await api('search',{part:'snippet',channelId:state.channel.channelId,type:'video',q:'Digest|楽しみ方',order:'date',maxResults:'50',...(state.pageToken?{pageToken:state.pageToken}:{})});
      const ids=[...new Set(page.items.map(item=>item.id?.videoId).filter(id=>VIDEO_ID.test(id || '') && !state.seen.has(id)))];
      ids.forEach(id=>state.seen.add(id));
      for (let offset=0; offset<ids.length; offset+=50) {
        const candidates=new Set(ids.slice(offset,offset+50));
        const details=await api('videos',{part:'snippet,status,liveStreamingDetails',id:[...candidates].join(',')});
        for (const item of details.items) {
          const s=item.snippet || {}, live=item.liveStreamingDetails;
          const published=Date.parse(s.publishedAt);
          if (!candidates.has(item.id) || s.channelId!==state.channel.channelId || typeof s.title!=='string') continue;
          // Search also matches descriptions: verify the title and current publication state.
          if (!digestTitle(s.title) && !enjoymentTitle(s.title)) continue;
          if (item.status?.privacyStatus!=='public' || item.status?.uploadStatus!=='processed' || s.liveBroadcastContent!=='none') continue;
          if (!Number.isFinite(published) || published>now) continue;
          if (live && (!Number.isFinite(Date.parse(live.actualEndTime)) || Date.parse(live.actualEndTime)>now)) continue;
          found.set(item.id,{id:item.id,channelId:s.channelId,channelName:state.channel.name,title:s.title,publishedAt:s.publishedAt});
        }
      }
      const dates=page.items.map(item=>Date.parse(item.snippet?.publishedAt));
      state.boundary=dates.length && dates.every(Number.isFinite)?Math.min(...dates):Infinity;
      state.nextPageToken=typeof page.nextPageToken==='string' && page.nextPageToken? page.nextPageToken:null;
      state.pageToken=state.nextPageToken;
    }));
    const selections=officialSelections([...found.values()]);
    const complete=selections.every((rows,i)=>rows.length===[3,3,3][i]);
    const cutoff=complete?Math.min(...selections.map(rows=>Date.parse(rows.at(-1).publishedAt))):-Infinity;
    // An exhausted channel needs no more requests. A newer frontier must be followed,
    // even when another channel already supplied enough matches for the visible cards.
    pending=states.filter(state=>state.nextPageToken && state.boundary>=cutoff);
  }
  if (pending.length) throw new Error('OFFICIAL_VIDEOS_INCOMPLETE');
  const selected=new Map(officialSelections([...found.values()]).flat().map(v=>[v.id,v]));
  return {checkedAt:new Date(now).toISOString(),items:[...selected.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.id.localeCompare(b.id)),mode:'api',stale:false};
}

export async function fetchSchedule(channels, apiKey, fetcher = fetch, now = Date.now()) {
  if (!apiKey) throw new Error('NOT_CONFIGURED');
  const api=(resource,params)=>youtubeApi(resource,params,apiKey,fetcher);
  const candidates = new Set();
  for (const channel of channels) {
    if (!CHANNEL_ID.test(channel.channelId)) throw new Error('INVALID_CHANNEL');
    for (const eventType of ['upcoming','live']) {
      // Public schedules, not the owner-only liveBroadcasts API.
      const data = await api('search',{part:'snippet',channelId:channel.channelId,type:'video',eventType,maxResults:'50',order:'date'});
      if (data.nextPageToken) throw new Error('SCHEDULE_TOO_LARGE'); // Do not claim an incomplete list is complete.
      for (const item of data.items) if (VIDEO_ID.test(item.id?.videoId)) candidates.add(item.id.videoId);
    }
  }
  const allow = new Map(channels.map(c=>[c.channelId,c.name]));
  const events=[];
  const ids=[...candidates];
  for (let offset=0; offset<ids.length; offset+=50) {
    const data = await api('videos',{part:'snippet,liveStreamingDetails,status',id:ids.slice(offset,offset+50).join(',')});
    for (const item of data.items) {
      const s=item.snippet || {}, live=item.liveStreamingDetails || {};
      if (!VIDEO_ID.test(item.id) || !allow.has(s.channelId) || item.status?.privacyStatus !== 'public' || live.actualEndTime) continue;
      if (!['live','upcoming'].includes(s.liveBroadcastContent)) continue;
      events.push({id:item.id,channelId:s.channelId,channelName:allow.get(s.channelId),title:s.title,startsAt:live.scheduledStartTime || null,status:s.liveBroadcastContent});
    }
  }
  const checkedAt=new Date(now).toISOString();
  return {checkedAt,events:visibleEvents(events,now,checkedAt),mode:'api',stale:false};
}

export async function fetchOfficialLatest(channels, previous = {}, apiKey, fetcher = fetch, now = Date.now()) {
  if (!apiKey) throw new Error('NOT_CONFIGURED');
  const checkedAt=new Date(now).toISOString();
  const old=new Map((previous.items || []).map(item=>[item.channelId,item]));
  const feeds=await Promise.all(channels.map(async channel=>{
    if (!CHANNEL_ID.test(channel.channelId)) throw new Error('INVALID_CHANNEL');
    try {
      const entries=parseFeed(await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`,fetcher),channel.channelId,now);
      return {channel,entries,status:'ok'};
    } catch { return {channel,entries:[],status:'unavailable'}; }
  }));
  const candidates=new Set();
  for (const feed of feeds) {
    feed.entries.filter(v=>v.format==='video').forEach(v=>candidates.add(v.id));
    const last=old.get(feed.channel.channelId)?.latest;
    // Revalidate an older normal video when the feed contains only Shorts / unavailable entries.
    if ((feed.entries.length || feed.status!=='ok') && last?.format==='video' && VIDEO_ID.test(last.id) && !feed.entries.some(v=>v.id===last.id && v.format!=='video')) candidates.add(last.id);
  }
  const verified=new Map();
  const ids=[...candidates];
  for (let offset=0;offset<ids.length;offset+=50) {
    const batch=new Set(ids.slice(offset,offset+50));
    const details=await youtubeApi('videos',{part:'snippet,status,liveStreamingDetails',id:[...batch].join(',')},apiKey,fetcher);
    for (const item of details.items) {
      const s=item.snippet || {},live=item.liveStreamingDetails;
      if (!batch.has(item.id) || item.status?.privacyStatus!=='public' || item.status?.uploadStatus!=='processed' || s.liveBroadcastContent!=='none') continue;
      if (typeof s.title!=='string' || !s.title || !Number.isFinite(Date.parse(s.publishedAt)) || Date.parse(s.publishedAt)>now) continue;
      if (live && (!Number.isFinite(Date.parse(live.actualEndTime)) || Date.parse(live.actualEndTime)>now)) continue;
      verified.set(item.id,{id:item.id,channelId:s.channelId,title:s.title,publishedAt:s.publishedAt,format:'video',embeddable:item.status.embeddable===true});
    }
  }
  const items=feeds.map(({channel,entries,status})=>{
    const rows=entries.filter(v=>v.format==='video').map(v=>verified.get(v.id)).filter(v=>v?.channelId===channel.channelId).sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.id.localeCompare(b.id));
    const last=old.get(channel.channelId);
    const fallback=last?.latest?.format==='video'?verified.get(last.latest.id):null;
    if (rows.length) return {channelId:channel.channelId,channelName:channel.name,latest:rows[0],checkedAt,status:'ok'};
    const limited=status==='unavailable' || entries.length>0;
    return {channelId:channel.channelId,channelName:channel.name,latest:limited && fallback?.channelId===channel.channelId?fallback:null,checkedAt:limited?last?.checkedAt || null:checkedAt,status:status==='unavailable'?'unavailable':limited?'limited':'empty'};
  });
  return {checkedAt,items,mode:'api',stale:items.some(item=>['limited','unavailable'].includes(item.status))};
}

export function createHandler(config, dependencies = {}) {
  const fetcher=dependencies.fetcher || fetch;
  const now=dependencies.now || Date.now;
  const memory=new Map();
  const inflight=new Map();
  const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':status===200?'private, max-age=60':'no-store','X-Content-Type-Options':'nosniff'}});
  async function read(key, env, kind) {
    if (memory.get(key)?.retryAt > now()) return memory.get(key);
    if (env.YOUTUBE_CACHE) {
      try {
        const value=await env.YOUTUBE_CACHE.get(key,'json');
        if (value) {
          if (kind==='channels') {
            // KV may briefly return an older version. Keep the newest known result.
            if (Date.parse(memory.get(key)?.data?.checkedAt)>=Date.parse(value.data?.checkedAt)) return memory.get(key);
            memory.set(key,value);
          }
          return value;
        }
      } catch {}
    }
    return memory.get(key);
  }
  async function save(key,value,env) {
    memory.set(key,value);
    if (env.YOUTUBE_CACHE) { try { await env.YOUTUBE_CACHE.put(key,JSON.stringify(value),{expirationTtl:86400*7}); } catch {} }
  }
  async function refresh(kind,env) {
    const key=`youtube-v4:${config.revision}:${kind}`;
    if (inflight.has(key)) return inflight.get(key);
    const task=(async()=>{
      const cached=await read(key,env,kind);
      const previous=cached?.data || config.snapshot[kind] || {items:[],checkedAt:null};
      const ttl=kind==='channels'?CHANNEL_TTL:kind==='schedule'?SCHEDULE_TTL:OFFICIAL_VIDEO_TTL;
      if (cached && now()<cached.retryAt) return cached.data;
      let data;
      let retry=ttl;
      if (kind!=='channels' && (!env.YOUTUBE_API_KEY || !env.YOUTUBE_CACHE)) {
        // Global cache is required for the quota-limited API; never call once per visitor/edge.
        return {...previous,...(kind==='schedule'?{events:visibleEvents(previous.events,now(),previous.checkedAt)}:{}),mode:'snapshot',stale:true};
      }
      try {
        data=kind==='channels' ? await fetchChannelUpdates(config.channels,previous,fetcher,now()) : kind==='officialVideos' ? await fetchOfficialVideos(config.official,env.YOUTUBE_API_KEY,fetcher,now()) : kind==='officialLatest' ? await fetchOfficialLatest(config.official,previous,env.YOUTUBE_API_KEY,fetcher,now()) : await fetchSchedule(config.official,env.YOUTUBE_API_KEY,fetcher,now());
        if (data.stale) retry=RETRY_TTL;
      } catch {
        data={...previous,stale:true,mode:'unavailable'};
        retry=RETRY_TTL;
      }
      // Limit discovery requests even when the upstream rejects the key/quota.
      if (kind!=='channels' && data.stale) retry=ttl;
      await save(key,{data,retryAt:now()+retry},env);
      return data;
    })();
    inflight.set(key,task);
    try { return await task; } finally { inflight.delete(key); }
  }
  return {
    async fetch(request,env) {
      const pathname=new URL(request.url).pathname;
      const kind=pathname==='/api/channels'?'channels':pathname==='/api/schedule'?'schedule':pathname==='/api/official-videos'?'officialVideos':pathname==='/api/official-latest'?'officialLatest':null;
      if (!kind) return pathname.startsWith('/api/') ? json({error:'NOT_FOUND'},404) : env.ASSETS.fetch(request);
      if (request.method!=='GET') return new Response(null,{status:405,headers:{Allow:'GET'}});
      try {
        const data=await refresh(kind,env);
        return json(kind==='schedule'?{...data,events:visibleEvents(data.events,now(),data.checkedAt)}:data);
      } catch {
        // Unexpected failures must not roll fan videos back to the build-time snapshot.
        const previous=kind==='channels'?memory.get(`youtube-v4:${config.revision}:${kind}`)?.data:null;
        return json({... (previous || config.snapshot[kind]),stale:true,mode:'unavailable'});
      }
    }
  };
}
