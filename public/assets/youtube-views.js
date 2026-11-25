import {liveEnjoymentTitle} from './youtube-rules.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const validId = id => /^[\w-]{11}$/.test(id || '');
const link = (url,text,cls='text-link')=>`<a class="${cls}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${text} <span aria-hidden="true">↗</span><span class="sr-only">（YouTube・新しいタブ）</span></a>`;
export const youtubeDate = value => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'}).format(new Date(value)) : '未確認';
export function latestVideo(item) {
  const v=item?.latest;
  if (!v || !validId(v.id)) return '<div class="latest-missing">通常動画・配信はチャンネルからご覧いただけます。</div>';
  const href='https://www.youtube.com/watch?v='+v.id;
  return `<div class="channel-latest"><a class="video-image" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${escape(v.title)}をYouTubeで見る（新しいタブ）"><img translate="no" src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="${escape(v.title)}" width="480" height="360" loading="lazy"><span class="play" aria-hidden="true">▶</span></a><p class="latest-meta"><span>${['unavailable','limited'].includes(item.status)?'前回取得した動画':'新着動画'}</span><time datetime="${escape(v.publishedAt)}">${youtubeDate(v.publishedAt)} 公開</time></p><h4 translate="no">${escape(v.title)}</h4>${link(href,'この動画を見る','button latest-button')}</div>`;
}
export function channelStatus(data) {
  const prefix=data.stale?'一部は前回の情報、またはチャンネルへのリンクを表示しています。':'公開日時が新しいチャンネルから表示。';
  return `${prefix} 確認：${youtubeDate(data.checkedAt)}（日本時間）`;
}
export function officialVideoStatus(data = {}) {
  const state=data.mode==='api' && !data.stale?'公開済みの動画から自動取得':data.mode==='snapshot'?'確認済みの動画を表示しています':'更新を確認できないため、前回確認した動画を表示しています';
  return `${state}。${data.checkedAt?` 確認：${youtubeDate(data.checkedAt)}（日本時間）`:''}`;
}
function officialVideoItems(data = {}, variant = 'highlights', now = Date.now()) {
  const limits={highlights:3,digests:2,homeDigests:3,enjoyment:3};
  const match=title=>['digests','homeDigests'].includes(variant)?/digest/i.test(title):variant==='enjoyment'?liveEnjoymentTitle(title):/digest|楽しみ方/i.test(title);
  const unique=new Map((data.items || []).filter(v=>validId(v.id) && typeof v.title==='string' && match(v.title.normalize('NFKC')) && Number.isFinite(Date.parse(v.publishedAt)) && Date.parse(v.publishedAt)<=now).map(v=>[v.id,v]));
  return [...unique.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.id.localeCompare(b.id)).slice(0,limits[variant] || 3);
}
export function latestDigestUrl(data = {}, now = Date.now()) {
  const latest=officialVideoItems(data,'homeDigests',now)[0];
  return latest?'https://www.youtube.com/watch?v='+latest.id:'/start/#first-videos';
}
export function officialVideos(data = {}, variant = 'highlights', now = Date.now()) {
  const rows=officialVideoItems(data,variant,now);
  if (!rows.length) return `<p class="official-video-empty">${data.mode==='api' && !data.stale?'条件に合う公開済みの動画は、現在見つかりません。':'確認できる動画は、公式YouTubeの一覧からご覧ください。'}</p>`;
  return rows.map(v=>{
    const href='https://www.youtube.com/watch?v='+v.id;
    const date=new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'numeric',day:'numeric',timeZone:'Asia/Tokyo'}).format(new Date(v.publishedAt));
    const kind=/digest/i.test(v.title.normalize('NFKC'))?'Digest':'楽しみ方';
    return `<article class="video-card" data-official-video="${v.id}" data-published="${escape(v.publishedAt)}"><a class="video-image" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${escape(v.title)}をYouTubeで見る（新しいタブ）"><img translate="no" src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="${escape(v.title)}のサムネイル" width="480" height="360" loading="lazy"><span class="play" aria-hidden="true">▶</span></a><div class="video-body"><div class="meta"><span>${kind}</span><time datetime="${escape(v.publishedAt)}">${date} 公開</time></div><h3 translate="no">${escape(v.title)}</h3><p class="official-video-channel" translate="no">${escape(v.channelName)}</p>${link(href,'YouTubeで見る')}</div></article>`;
  }).join('');
}
export function scheduleStatus(data) {
  const state=data.mode==='api' && !data.stale?'YouTubeから自動取得':data.mode==='snapshot'?'確認済みの情報を表示': '更新を確認できないため、前回の情報を表示';
  return `${state} ／ 確認：${youtubeDate(data.checkedAt)}（日本時間）。最新の公開状況はYouTubeでご確認ください。`;
}
export function scheduleEvents(data, compact=false, now=Date.now()) {
  const rows=(data.events || []).filter(e=>validId(e.id) && ['live','upcoming'].includes(e.status))
    .filter(e=>e.status==='live'?now-Date.parse(data.checkedAt)<=6*3600000:!e.startsAt || Date.parse(e.startsAt)>=now-6*3600000);
  if (!rows.length) return `<p class="schedule-empty">${data.mode==='api' && !data.stale?'現在、確認できる公開予定はありません。':'最新の配信予定は、公式チャンネルでご確認ください。'}${compact?' <a href="/schedule/">配信の案内へ →</a>':''}</p>`;
  return (compact?rows.slice(0,1):rows).map(e=>{
    const starts=Date.parse(e.startsAt);
    const known=Number.isFinite(starts);
    const label=e.status==='live'?'配信中（確認時点）':known && starts<now?'開始時刻を過ぎています':'公開予定';
    const day=known?new Intl.DateTimeFormat('en',{day:'numeric',timeZone:'Asia/Tokyo'}).format(new Date(starts)):'—';
    const month=known?new Intl.DateTimeFormat('en',{month:'short',timeZone:'Asia/Tokyo'}).format(new Date(starts)).toUpperCase():'SOON';
    return `<article class="event-card" data-auto-event data-start="${escape(e.startsAt || '')}"><div class="event-date"><span>${month}</span><strong>${day}</strong><small>日本時間</small></div><div class="event-info"><p class="meta"><span translate="no">${escape(e.channelName)}</span> <span class="event-state">${label}</span></p><p class="event-time">${known?`<time datetime="${escape(e.startsAt)}">${youtubeDate(e.startsAt)}</time>`:'開始時刻未定'}</p><h3>${link('https://www.youtube.com/watch?v='+e.id,'<span translate="no">'+escape(e.title)+'</span>','event-title-link')}</h3>${compact?'':'<p class="fine">ライブ配信・プレミア公開など、YouTubeに登録された公開予定です。</p>'}</div>${compact?'':`<a class="event-image" href="https://www.youtube.com/watch?v=${e.id}" target="_blank" rel="noopener noreferrer" aria-label="${escape(e.title)}をYouTubeで見る（新しいタブ）"><img translate="no" src="https://i.ytimg.com/vi/${e.id}/hqdefault.jpg" alt="" width="480" height="360" loading="lazy"></a>`}</article>`;
  }).join('');
}
export function interviewFeature(interview) {
  const href=`https://www.youtube.com/watch?v=${interview.id}&list=${interview.playlistId}`;
  return `<section class="section container" id="tomoko-hour"><div class="interview-feature"><a class="interview-picture video-image" href="${escape(href)}" target="_blank" rel="noopener noreferrer" aria-label="斎名智子アワーの總水とおまさん出演回を見る（YouTube・新しいタブ）"><img src="https://i.ytimg.com/vi/${interview.id}/hqdefault.jpg" alt="斎名智子アワー 總水とおまさん出演回" width="480" height="360" loading="lazy"><span class="play" aria-hidden="true">▶</span></a><div><p class="eyebrow">MEET TOMA THROUGH CONVERSATION</p><p class="interview-series">${escape(interview.name)} · 總水とおまさん出演シリーズ</p><h2>${escape(interview.title)}</h2><p>${escape(interview.description)}</p><div class="interview-actions">${link(href,'出演シリーズを見る','button')}${link('https://www.youtube.com/playlist?list='+interview.playlistId,'再生リストをひらく')}</div><small>紹介動画：2025年4月18日公開 ／ 斎名智子アワー</small></div></div></section>`;
}

export function officialLatestStatus(data = {}) {
  if (data.mode==='api' && !data.stale) return `各チャンネルの公開済み動画から自動取得。確認：${youtubeDate(data.checkedAt)}（日本時間）`;
  if (data.mode==='snapshot') return '確認済みの動画を表示しています。最新情報は各公式チャンネルでも確認できます。';
  return '一部の更新を確認できないため、前回確認した動画やチャンネルへのリンクを表示しています。';
}
export function officialLatestVideos(data = {}, channels = [], now = Date.now()) {
  const index=new Map((data.items || []).map(item=>[item.channelId,item]));
  return channels.map(channel=>{
    if (!/^UC[\w-]{22}$/.test(channel.channelId)) return '';
    const item=index.get(channel.channelId),v=item?.latest;
    const href='https://www.youtube.com/channel/'+channel.channelId;
    const valid=v && validId(v.id) && v.format==='video' && v.channelId===channel.channelId && typeof v.title==='string' && Number.isFinite(Date.parse(v.publishedAt)) && Date.parse(v.publishedAt)<=now;
    if (!valid) return `<article class="official-latest-card"><h3 translate="no">${escape(channel.name)}</h3><p class="latest-missing">公開済みの通常動画・配信を確認できませんでした。</p>${link(href,'チャンネルを見る')}</article>`;
    const watch='https://www.youtube.com/watch?v='+v.id;
    const player=v.embeddable===true?`<div class="youtube-player"><iframe translate="no" src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=0&amp;playsinline=1" title="${escape(channel.name)}：${escape(v.title)}" width="560" height="315" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`:`<p class="latest-missing">この動画はYouTubeでご覧ください。</p>`;
    const label=['limited','unavailable'].includes(item.status)?'前回確認した動画':'公開済みの動画';
    return `<article class="official-latest-card" data-latest-official-video="${v.id}"><p class="eyebrow" translate="no">${escape(channel.name)}</p>${player}<div class="video-body"><p class="latest-meta"><span>${label}</span><time datetime="${escape(v.publishedAt)}">${youtubeDate(v.publishedAt)} 公開</time></p><h3 translate="no">${escape(v.title)}</h3>${link(watch,'YouTubeで見る')}${item.checkedAt?`<p class="fine">動画の確認：${youtubeDate(item.checkedAt)}（日本時間）</p>`:''}</div></article>`;
  }).join('');
}
