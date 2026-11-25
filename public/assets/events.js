import {translate,localizeFragment,localPath} from './i18n.js?v=i18n-zh-20261125';
import {eventExpiry,eventIsCurrent} from './event-dates.js';
import {liveEventRows,liveEventStatus} from './live-event-views.js';

let timer,lastRefresh=-Infinity,refreshing=false;

function update() {
  clearTimeout(timer);
  const now = Date.now();
  const entries = [...document.querySelectorAll('[data-event-date]')];
  const rows = entries.filter(element => element.hasAttribute('data-live-event-row'));
  for (const element of entries) element.hidden = !eventIsCurrent(element.dataset.eventDate,now);
  const count = rows.filter(element => !element.hidden).length;
  document.querySelectorAll('[data-live-event-count]').forEach(element => {
    element.textContent = translate(count + '件のライブ');
    element.hidden = false;
  });
  document.querySelectorAll('[data-live-events-empty]').forEach(element => { element.hidden = count > 0; });
  const upcomingExpiry = Math.min(...entries.map(element => eventExpiry(element.dataset.eventDate)).filter(time => time > now));
  // Check at midnight, and at least daily to stay within browser timer limits.
  if (Number.isFinite(upcomingExpiry)) timer = setTimeout(update,Math.min(upcomingExpiry - now,24 * 60 * 60 * 1000));
}

async function refreshLiveEvents() {
  const area=document.querySelectorAll('[data-live-event-list]')[0];
  if(!area||refreshing||Date.now()-lastRefresh<4*60*60*1000)return;
  refreshing=true;lastRefresh=Date.now();
  try {
    const response=await fetch('/api/live-events',{signal:AbortSignal.timeout(15000),cache:'no-cache'});
    if(!response.ok)throw Error('UPDATE_UNAVAILABLE');
    const data=await response.json();
    if(!Array.isArray(data.items))throw Error('INVALID_RESPONSE');
    const html=localizeFragment(liveEventRows(data));
    if(area.innerHTML!==html)area.innerHTML=html;
    document.querySelectorAll('[data-live-event-status]').forEach(element=>{element.textContent=translate(liveEventStatus(data));});
    update();
  } catch {
    document.querySelectorAll('[data-live-event-status]').forEach(element=>{element.textContent=translate('更新を確認できないため、表示中の予定を残しています。最新の案内は公式サイトをご確認ください。');});
  } finally {refreshing=false;}
}

update();
refreshLiveEvents();
window.addEventListener('pageshow',()=>{update();refreshLiveEvents();});
document.addEventListener('visibilitychange',() => { if (!document.hidden) {update();refreshLiveEvents();} });
setInterval(()=>{if(!document.hidden)refreshLiveEvents();},4*60*60*1000);
