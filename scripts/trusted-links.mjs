import assert from 'node:assert/strict';

// Changes to these destinations require confirmation from the site operator.
const approvedLinks = {
  github: 'https://github.com/morikyun/toma-oshikatsubu',
  youtube: 'https://www.youtube.com/@TomaSource',
  blog: 'https://ameblo.jp/tomasource/',
  staff: 'https://ameblo.jp/tomastaff/',
  tickets: 'https://pienipisara2.thebase.in/',
  fanclub: 'https://tomasource.hp.peraichi.com/tomabox',
  music: 'https://www.tunecore.co.jp/artists/tomasource?lang=ja',
  streams: 'https://www.youtube.com/@TomaSource/streams',
  otoMikuji: 'https://toma-oto-mikuji.pages.dev/',
  events: 'https://source-toma.earth/event/'
};

export function checkTrustedLinks({site, privacy, channels}) {
  assert.equal(site.membership.url, 'https://ws.formzu.net/sfgen/S488493374/', '入部フォームの変更には運営者の確認が必要です。');
  assert.equal(privacy.contactUrl, 'https://docs.google.com/forms/d/e/1FAIpQLSfi6SIv2tVnA1U96C4AMG6Mz17oWC8sXa6QZzpjLv-e3pErBw/viewform?usp=dialog', 'お問い合わせフォームの変更には運営者の確認が必要です。');
  assert.deepEqual(site.links, approvedLinks, '公式・運営リンクの追加や変更には運営者の確認が必要です。');
  for (const channel of channels) {
    const url = new URL(channel.url);
    assert.equal(url.origin, 'https://www.youtube.com', 'チャンネルのリンク先は https://www.youtube.com に限ります。');
    assert.ok(!url.username && !url.password && !url.search && !url.hash, 'チャンネルURLに認証情報・クエリ・フラグメントは指定できません。');
    assert.ok(['/channel/' + channel.channelId, '/@' + channel.handle].includes(decodeURIComponent(url.pathname)), 'チャンネルURLは登録されたIDまたはハンドルと一致させてください。');
  }
}
