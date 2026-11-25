import {decodeXml} from './youtube-service.mjs';
import {eventExpiry,eventIsCurrent} from '../public/assets/event-dates.js';

export const LIVE_EVENT_URL = 'https://source-toma.earth/event/';
export const LIVE_EVENT_TTL = 4 * 60 * 60 * 1000;
const LIVE_PREFECTURES = '北海道 青森 岩手 宮城 秋田 山形 福島 茨城 栃木 群馬 埼玉 千葉 東京 神奈川 新潟 富山 石川 福井 山梨 長野 岐阜 静岡 愛知 三重 滋賀 京都 大阪 兵庫 奈良 和歌山 鳥取 島根 岡山 広島 山口 徳島 香川 愛媛 高知 福岡 佐賀 長崎 熊本 大分 宮崎 鹿児島 沖縄'.split(' ');
const LIVE_PREFECTURE_EN = 'HOKKAIDO AOMORI IWATE MIYAGI AKITA YAMAGATA FUKUSHIMA IBARAKI TOCHIGI GUNMA SAITAMA CHIBA TOKYO KANAGAWA NIIGATA TOYAMA ISHIKAWA FUKUI YAMANASHI NAGANO GIFU SHIZUOKA AICHI MIE SHIGA KYOTO OSAKA HYOGO NARA WAKAYAMA TOTTORI SHIMANE OKAYAMA HIROSHIMA YAMAGUCHI TOKUSHIMA KAGAWA EHIME KOCHI FUKUOKA SAGA NAGASAKI KUMAMOTO OITA MIYAZAKI KAGOSHIMA OKINAWA'.split(' ');
const LIVE_CITIES = {...Object.fromEntries(LIVE_PREFECTURE_EN.map((name,i)=>[name,LIVE_PREFECTURES[i]])),YOKOHAMA:'神奈川',NAGOYA:'愛知',KOBE:'兵庫',SAPPORO:'北海道',SENDAI:'宮城',横浜:'神奈川',名古屋:'愛知',神戸:'兵庫',札幌:'北海道',仙台:'宮城'};
const liveClean = text => decodeXml(text).replace(/&nbsp;|&#160;/g,' ').normalize('NFKC').replace(/[ \t\r]+/g,' ').trim();

// Read the published markup as data; no scripts, images or linked pages execute.
function liveTree(html) {
  const root={tag:'root',attrs:{},children:[]}, stack=[root];
  const clean=html.replace(/<!--[^]*?-->|<(script|style)\b[^>]*>[^]*?<\/\1\s*>/gi,'');
  const tokens=clean.match(/<[^>]*>|[^<]+/g)||[];
  for (const token of tokens) {
    if (!token.startsWith('<')) { stack.at(-1).children.push(token);continue; }
    const close=token.match(/^<\/([\w-]+)/);
    if (close) { const index=stack.map(node=>node.tag).lastIndexOf(close[1].toLowerCase());if(index>0)stack.length=index;continue; }
    const open=token.match(/^<([\w-]+)/);if(!open)continue;
    const node={tag:open[1].toLowerCase(),attrs:{},children:[]};
    for (const attr of token.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) node.attrs[attr[1].toLowerCase()]=decodeXml(attr[2]??attr[3]??attr[4]);
    stack.at(-1).children.push(node);
    if (!/^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(node.tag) && !/\/>$/.test(token)) stack.push(node);
  }
  return root;
}
function liveFind(node,predicate) {
  if(typeof node==='string')return [];
  return [...(predicate(node)?[node]:[]),...node.children.flatMap(child=>liveFind(child,predicate))];
}
const liveClass=(node,name)=>(node.attrs.class||'').split(/\s+/).includes(name);
function liveText(node) {
  if(typeof node==='string')return node;
  const body=node.children.map(liveText).join('');
  return /^(?:br|hr)$/.test(node.tag)?'\n':/^(?:p|div|li|h[1-6]|u)$/.test(node.tag)?'\n'+body+'\n':body;
}
const liveLines=node=>liveText(node).split('\n').map(liveClean).filter(Boolean);
function liveDates(text) {
  return [...liveClean(text).matchAll(/(20\d{2})[.\/年-](\d{1,2})[.\/月-](\d{1,2})(?:日)?/g)].map(match=>{
    const date=match[1]+'-'+match[2].padStart(2,'0')+'-'+match[3].padStart(2,'0');
    if(!Number.isFinite(eventExpiry(date)))throw Error('INVALID_EVENT_DATE');
    return date;
  });
}
const liveTitle=title=>liveClean(title).replace(/^[◆◇■\s]+|[◆◇■\s]+$/g,'').replace(/\s+/g,' ');
function liveSeries(title) {
  if(/white\s*burn/i.test(title))return 'whiteburn';
  if(/acoustic/i.test(title))return 'acoustic';
  if(/神言|kamigoto/i.test(title))return 'kamigoto';
  if(/emerald\s*tablet/i.test(title))return 'emerald-tablet';
  return liveTitle(title).toLowerCase().replace(/[\s「」『』"'◆◇・-]/g,'');
}
const liveKey=event=>event.date+':'+liveSeries(event.title);
function livePlace(text) {
  const value=liveClean(text).replace(/^[■◆・\s]+/,'');
  for (const prefix of [...Object.keys(LIVE_CITIES),...LIVE_PREFECTURES].sort((a,b)=>b.length-a.length)) {
    if(value.toUpperCase().startsWith(prefix))return {prefecture:LIVE_CITIES[prefix]||prefix,venue:value.slice(prefix.length).replace(/^(?:都|府|県)?[\s／/・:：-]*/,'').trim()};
  }
  return {prefecture:'',venue:value};
}
function liveField(lines,names) {
  const pattern=new RegExp('^(?:【|〖|\\[)?(?:'+names+')(?:】|〗|\\])?\\s*[:：]?\\s*');
  const index=lines.findIndex(line=>pattern.test(line));
  if(index<0)return '';
  return lines[index].replace(pattern,'') || lines[index+1] || '';
}
const liveStopped=text=>/(?:開催|公演)?中止|開催延期|公演延期|^延期|^終了/.test(text);

export function parseOfficialLiveEvents(html,now=Date.now()) {
  if(typeof html!=='string'||html.length>2_000_000)throw Error('INVALID_EVENT_PAGE');
  const tree=liveTree(html),list=liveFind(tree,node=>liveClass(node,'post-list'))[0];
  if(!list)throw Error('EVENT_LAYOUT_CHANGED');
  const posts=liveFind(list,node=>liveClass(node,'detail'));
  if(!posts.length) {
    if(/(?:予定|イベント|公演).*(?:ありません|未定|準備中)|coming soon/i.test(liveText(list)))return [];
    throw Error('EVENT_LAYOUT_CHANGED');
  }
  const overview=[],details=[];let recognized=0;
  for(const post of posts) {
    const titleNode=liveFind(post,node=>node.tag==='h3')[0];
    const content=liveFind(post,node=>liveClass(node,'content'))[0];
    const timeNode=liveFind(post,node=>liveClass(node,'time'))[0];
    if(!titleNode||!content||!timeNode)throw Error('EVENT_LAYOUT_CHANGED');
    const title=liveTitle(liveText(titleNode)),lines=liveLines(content),header=liveClean(liveText(timeNode));
    if(/TOMA\s+EVENT\s+20\d{2}/i.test(title)) {
      const titles=new Set(liveFind(content,node=>node.tag==='strong').map(node=>liveTitle(liveText(node))).filter(value=>/\p{Letter}/u.test(value)&&!liveDates(value).length&&!/終了|中止|延期|時点|^※/.test(value)));
      let series='';
      for(let i=0;i<lines.length;i++) {
        if(titles.has(liveTitle(lines[i]))) {series=liveTitle(lines[i]);continue;}
        if(!/^20\d{2}[.\/年-]/.test(lines[i]))continue;
        const dates=liveDates(lines[i]);if(dates.length!==1||!series)throw Error('EVENT_LAYOUT_CHANGED');
        recognized++;
        const place=livePlace(lines[i+1]||'');
        const venue=place.venue || lines[i+2] || '';
        if(!place.prefecture||!venue||liveDates(venue).length||/^[・◆]+$/.test(venue))throw Error('EVENT_PLACE_UNCLEAR');
        overview.push({date:dates[0],title:series,prefecture:place.prefecture,venue,stopped:/終了|中止|延期/.test(lines[i])});
      }
    } else {
      const headerDates=liveDates(header);
      const explicit=liveDates(liveField(lines,'開催日時|日程|開催日|日時'));
      const dates=explicit.length?explicit:headerDates;
      if(dates.length!==1 || (!explicit.length&&new Set(liveDates(liveText(content))).size>1))throw Error('EVENT_DATE_UNCLEAR');
      recognized++;
      const headerPlace=livePlace(header.replace(/^20\d{2}[.\/年-]\d{1,2}[.\/月-]\d{1,2}日?\s*(?:\([^)]*\))?\s*/,'').replace(/^[■\s]*(?:\d{1,2}\/\d{1,2}\s*)?/,''));
      const venueField=liveField(lines,'開催場所|開催地|会場');
      const place=livePlace(venueField || headerPlace.venue);
      const addressPrefecture=LIVE_PREFECTURES.find(pref=>lines.some(line=>line.startsWith(pref+(pref==='北海道'?'':pref==='東京'?'都':pref==='大阪'||pref==='京都'?'府':'県'))));
      const prefecture=addressPrefecture||place.prefecture||headerPlace.prefecture;
      const venue=place.venue;
      const stopped=liveStopped(title)||lines.some(line=>/^(?:【|〖)?(?:公演|開催)?(?:中止|延期)(?:】|〗|[のお:：]|$)/.test(line));
      details.push({date:dates[0],title,prefecture,venue,stopped,headerDate:headerDates[0]});
    }
  }
  if(!recognized)throw Error('EVENT_LAYOUT_CHANGED');
  const merged=new Map(overview.map(event=>[liveKey(event),event]));
  for(const detail of details) {
    // A date in the labeled body supersedes a stale date in the card header.
    if(detail.headerDate&&detail.headerDate!==detail.date)merged.delete(liveKey({...detail,date:detail.headerDate}));
    const previous=merged.get(liveKey(detail));
    const title=previous&&!/\d/.test(detail.title)?previous.title:detail.title;
    merged.set(liveKey(detail),{...detail,title,stopped:detail.stopped||previous?.stopped,prefecture:detail.prefecture||previous?.prefecture||'開催地未発表',venue:detail.venue||previous?.venue||'後日発表'});
  }
  return [...merged.values()].filter(event=>!event.stopped&&eventIsCurrent(event.date,now)).map(({date,title,prefecture,venue})=>({id:'live-'+date+'-'+encodeURIComponent(liveSeries(title)),date,title,prefecture,venue})).sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title,'ja'));
}

export function createLiveEventsHandler(snapshot,dependencies={}) {
  const fetcher=dependencies.fetcher||fetch, now=dependencies.now||Date.now;
  const key='official-live-events-v1';let memory=null,inflight=null;
  async function refresh(env) {
    let cached=memory;
    if(!cached||cached.retryAt<=now()) {try {cached=await env.YOUTUBE_CACHE?.get(key,'json')||cached;}catch{}}
    if(cached?.retryAt>now()) {memory=cached;return cached.data;}
    const previous=cached?.data||snapshot;
    let data;
    try {
      const response=await fetcher(LIVE_EVENT_URL,{signal:AbortSignal.timeout(12000),redirect:'error',headers:{Accept:'text/html'}});
      if(!response.ok)throw Error('EVENT_SOURCE_UNAVAILABLE');
      const items=parseOfficialLiveEvents(await response.text(),now());
      data={items,sourceUrl:LIVE_EVENT_URL,checkedAt:new Date(now()).toISOString(),mode:'official',stale:false};
    } catch {
      data={items:previous.items||[],sourceUrl:LIVE_EVENT_URL,checkedAt:previous.checkedAt||null,mode:'unavailable',stale:true};
    }
    memory={data,retryAt:now()+LIVE_EVENT_TTL};
    try {await env.YOUTUBE_CACHE?.put(key,JSON.stringify(memory),{expirationTtl:86400*7});}catch{}
    return data;
  }
  return {async fetch(request,env={}) {
    if(request.method!=='GET')return new Response(null,{status:405,headers:{Allow:'GET'}});
    if(!inflight)inflight=refresh(env).finally(()=>{inflight=null;});
    const data=await inflight;
    return Response.json({...data,items:data.items.filter(item=>eventIsCurrent(item.date,now()))},{headers:{'Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff'}});
  }};
}
