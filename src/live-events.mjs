import {eventIsCurrent} from '../public/assets/event-dates.js';
import {liveEventRows,liveEventStatus} from '../public/assets/live-event-views.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external = (url,label,cls='text-link') => `<a class="${cls}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">↗</span><span class="sr-only">（外部サイト・新しいタブ）</span></a>`;
const weekday = date => new Intl.DateTimeFormat('ja-JP',{weekday:'short',timeZone:'Asia/Tokyo'}).format(new Date(date+'T12:00:00+09:00'));

export function liveEventSection(data, now=Date.now()) {
  const rows=(data.items || []).filter(event=>eventIsCurrent(event.date,now)).sort((a,b)=>a.date.localeCompare(b.date));
  const source=data.sourceUrl || 'https://source-toma.earth/event/';
  return `<section class="container live-events-section" id="live-events" aria-labelledby="live-events-title">
  <div class="section-heading"><div><p class="eyebrow">ON STAGE</p><h2 id="live-events-title">今後のライブ予定</h2></div><span class="live-event-count" data-live-event-count hidden>${rows.length}件のライブ</span></div>
  <p class="section-lead">公式サイトの案内を、日付順に。気になる公演から、次の楽しみを見つけてください。</p>
  <ol class="live-event-list" data-live-event-list aria-label="今後のライブ予定">${liveEventRows(data,now)}</ol>
  <p class="schedule-empty" data-live-events-empty hidden>現在掲載している今後のライブ予定はありません。新しい予定は公式サイトでご確認ください。</p>
  <noscript><p class="fine">ライブ予定の一覧にはJavaScriptを使用しています。最新の予定は下の公式サイトからご覧いただけます。</p></noscript>
  <div class="live-event-source"><div><p class="fine" data-live-event-status aria-live="polite">${liveEventStatus(data)}</p><p class="fine">4時間を目安に更新。日程・会場・チケットの最新情報は公式の案内をご確認ください。</p></div>${external(source,'公式イベント一覧を見る')}</div>
  </section>`;
}

export function fanEventFeature(feature, now=Date.now()) {
  if (!feature || !eventIsCurrent(feature.date,now)) return '';
  return `<aside class="container fan-event-feature" id="${escape(feature.id)}" data-event-date="${feature.date}" hidden aria-labelledby="fan-event-title">
  <div class="fan-event-copy"><p class="eyebrow">SPECIAL FEATURE <span>特集・ファン主催</span></p><p class="fan-event-kicker">${escape(feature.relatedLive)}へ行く前に</p><h2 id="fan-event-title">${escape(feature.title)}</h2><p>${escape(feature.description)}</p><p class="fan-event-organizer">主催：${escape(feature.organizer)}</p></div>
  <div class="fan-event-information"><dl>
  <div><dt>日時</dt><dd><time datetime="${feature.date}">${feature.date.replaceAll('-','.')}（${weekday(feature.date)}）</time><br>${escape(feature.time)}<small>${escape(feature.reception)}</small></dd></div>
  <div><dt>会場</dt><dd>${escape(feature.venue)}<small>${escape(feature.venueNote)}</small></dd></div>
  <div><dt>会費</dt><dd>${escape(feature.fee)}<small>${escape(feature.participation)}</small></dd></div>
  </dl>${external(feature.sourceUrl,'詳細・お申し込み案内を見る','button')}<p class="fine">内容・時間は予定です。最新の案内は主催者の記事をご確認ください。</p></div>
  </aside>`;
}
