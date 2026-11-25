import {translate,localizeFragment,localPath} from './i18n.js?v=i18n-zh-20261125';
import {latestVideo,channelStatus,scheduleEvents,scheduleStatus,officialVideos,officialVideoStatus,officialLatestVideos,officialLatestStatus,latestDigestUrl} from './youtube-views.js?v=i18n-zh-20261125';

const cards=[...document.querySelectorAll('[data-channel-id]')];
const scheduleAreas=[...document.querySelectorAll('[data-youtube-schedule]')];
const officialAreas=[...document.querySelectorAll('[data-official-videos]')];
const latestAreas=[...document.querySelectorAll('[data-official-latest]')];
const digestLinks=[...document.querySelectorAll('[data-latest-digest-link]')];
let scheduleData=null, controller=null, generation=0, timer=null;

function paint(area, html) {
  const localized=localizeFragment(html);
  if (area.innerHTML!==localized) area.innerHTML=localized;
}
function paintSchedule(data) {
  for (const area of scheduleAreas) paint(area,scheduleEvents(data,area.dataset.youtubeSchedule==='compact'));
  document.querySelectorAll('[data-schedule-status]').forEach(el=>{el.textContent=translate(scheduleStatus(data));});
}
async function refresh() {
  const current=++generation;
  controller?.abort();
  clearInterval(timer); timer=null; scheduleData=null;
  controller=new AbortController();
  const signal=controller.signal;
  const active=()=>current===generation && !signal.aborted;
  async function get(path) {
    const response=await fetch(path,{signal:AbortSignal.any([signal,AbortSignal.timeout(45000)]),cache:'no-cache'});
    if (!response.ok) throw new Error('UPDATE_UNAVAILABLE');
    return response.json();
  }
  const requests=[];
  if (cards.length) requests.push(get('/api/channels').then(data=>{
    if (!active()) return;
    if (!Array.isArray(data.items)) throw new Error('INVALID_RESPONSE');
    const index=new Map(data.items.map(item=>[item.channelId,item]));
    for (const card of cards) {
      const item=index.get(card.dataset.channelId);
      if (!item) continue;
      paint(card.querySelector('[data-channel-latest]'),latestVideo(item));
      card.dataset.published=item.latest?.publishedAt || '';
      card.dataset.search=card.dataset.baseSearch+' '+(item.latest?.title || '');
    }
    const sorted=[...cards].sort((a,b)=>(Date.parse(b.dataset.published)||0)-(Date.parse(a.dataset.published)||0)||Number(a.dataset.order)-Number(b.dataset.order));
    const grid=document.querySelector('.channel-grid');
    for (const card of sorted) grid.append(card);
    document.querySelector('[data-channel-status]').textContent=translate(channelStatus(data));
    document.querySelector('[data-search-input]')?.dispatchEvent(new Event('input'));
  }).catch(()=>{
    if (!active()) return;
    const status=document.querySelector('[data-channel-status]');
    if (status) status.textContent=translate('更新を確認できないため、ページ作成時の情報を表示しています。最新の動画は各チャンネルでも確認できます。');
  }));
  if (scheduleAreas.length) {
    requests.push(get('/api/schedule').then(data=>{
      if (!active()) return;
      if (!Array.isArray(data.events)) throw new Error('INVALID_RESPONSE');
      scheduleData=data;paintSchedule(data);
    }).catch(()=>{
      if (active()) document.querySelectorAll('[data-schedule-status]').forEach(el=>{el.textContent=translate('更新を確認できないため、確認済みの予定を表示しています。最新の情報は公式チャンネルをご覧ください。');});
    }));
    timer=setInterval(()=>{if(active() && scheduleData)paintSchedule(scheduleData);},60000);
  }
  if (officialAreas.length || digestLinks.length) requests.push(get('/api/official-videos').then(data=>{
    if (!active()) return;
    if (!Array.isArray(data.items)) throw new Error('INVALID_RESPONSE');
    for (const area of officialAreas) paint(area,officialVideos(data,area.dataset.officialVideos));
    for (const link of digestLinks) link.href=localPath(latestDigestUrl(data));
    document.querySelectorAll('[data-official-status]').forEach(el=>{el.textContent=translate(officialVideoStatus(data));});
  }).catch(()=>{
    if (active()) document.querySelectorAll('[data-official-status]').forEach(el=>{el.textContent=translate('更新を確認できないため、ページ作成時に確認した動画を表示しています。最新の動画は公式YouTubeでご確認ください。');});
  }));
  if (latestAreas.length) requests.push(get('/api/official-latest').then(data=>{
    if (!active()) return;
    if (!Array.isArray(data.items)) throw new Error('INVALID_RESPONSE');
    for (const area of latestAreas) {
      const channels=JSON.parse(area.dataset.officialChannels);
      paint(area,officialLatestVideos(data,channels));
    }
    document.querySelectorAll('[data-official-latest-status]').forEach(el=>{el.textContent=translate(officialLatestStatus(data));});
  }).catch(()=>{
    if (active()) document.querySelectorAll('[data-official-latest-status]').forEach(el=>{el.textContent=translate('更新を確認できないため、確認済みの動画を表示しています。最新の動画は公式YouTubeでご確認ください。');});
  }));
  await Promise.allSettled(requests);
}
refresh();
