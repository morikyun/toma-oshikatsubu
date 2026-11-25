import {eventIsCurrent} from './event-dates.js';

const liveEscape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function liveEventRows(data={},now=Date.now()) {
  const seen=new Set();
  return (data.items||[]).filter(event=>eventIsCurrent(event.date,now)&&typeof event.title==='string'&&typeof event.venue==='string')
    .sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title,'ja'))
    .filter(event=>{const key=event.id||event.date+event.title;if(seen.has(key))return false;seen.add(key);return true;})
    .map(event=>`<li class="live-event-row" data-live-event-row data-event-id="${liveEscape(event.id)}" data-event-date="${event.date}" hidden>
    <time class="live-event-date" datetime="${event.date}"><span>${event.date.slice(0,4)}</span><strong>${event.date.slice(5).replace('-','.')}</strong><small>${new Intl.DateTimeFormat('ja-JP',{weekday:'short',timeZone:'Asia/Tokyo'}).format(new Date(event.date+'T12:00:00+09:00'))}曜日</small></time>
    <div class="live-event-detail"><h3 translate="no">${liveEscape(event.title)}</h3><p><span class="live-event-prefecture">${liveEscape(event.prefecture)}</span><span translate="no">${liveEscape(event.venue)}</span></p></div>
    <a class="text-link live-event-link" href="https://source-toma.earth/event/" target="_blank" rel="noopener noreferrer">公式の案内 <span aria-hidden="true">↗</span><span class="sr-only">（外部サイト・新しいタブ）</span></a>
  </li>`).join('');
}
export function liveEventStatus(data={}) {
  const state=data.mode==='official'&&!data.stale?'公式サイトから自動取得':data.mode==='snapshot'?'確認済みの予定を表示しています':'更新を確認できないため、前回確認した予定を表示しています';
  const date=Date.parse(data.checkedAt);
  const checked=Number.isFinite(date)?new Intl.DateTimeFormat('ja-JP',{year:'numeric',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'}).format(new Date(date)):'未確認';
  return `${state} ／ 確認：${checked}（日本時間）`;
}
