import {eventIsCurrent} from '../public/assets/event-dates.js';

export const RELAY_START = '2026-11-28';
export const RELAY_DAY = '2026-12-22';
export const RELAY_PATH = '/schedule/toma-relay/';
export const RELAY_GROUP = 'https://www.facebook.com/groups/535284548917832';
const official = 'https://ameblo.jp/tomastaff/entry-12982479438.html';
const tags = '<p class="relay-tags" translate="no">#TOMA楽しみリレー #WHITEBURN5</p>';
const external = (href,label,cls='button') => `<a class="${cls}" href="${href}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only">（外部サイト・新しいタブ）</span></a>`;
const copy = id => `<button type="button" class="relay-copy" data-relay-copy="${id}" hidden>この文をコピー</button>`;
const post = (id,paragraphs) => `<div class="relay-post-text" id="${id}">${paragraphs.map(p=>`<p>${p}</p>`).join('')}${tags}</div>`;
const baton = '次のバトン、どうぞ！ 12/22、あなたは何が楽しみ？';

export function relayEntrance(now=Date.now()) {
  if (!eventIsCurrent(RELAY_DAY,now)) return '';
  return `<section class="container relay-entrance" id="fan-projects" data-event-date="${RELAY_DAY}" aria-labelledby="relay-entrance-title">
    <div><p class="relay-kicker">TOMA推し活部・ファン主催企画</p><p class="relay-entrance-name">TOMA楽しみリレー</p><h2 id="relay-entrance-title">12/22、あなたは<br>何が楽しみ？</h2><p>会場へ行く人も、おうちで観る人も、気になっている人も。<br>あなたの「楽しみ」を、ひとことからつなぎませんか。</p><a href="${RELAY_PATH}" class="button relay-button">特設ページ・投稿例を見る</a></div>
    <div class="relay-entrance-note"><span class="relay-note-mark" aria-hidden="true">“</span><p>最初の一音が楽しみ！</p><span class="relay-note-divider" aria-hidden="true">✦</span><p>つないでくれて、<br>ありがとう。</p><small><time datetime="${RELAY_START}">2026.11.28</time> START<br>WHITEBURN 5 · 12.22</small></div>
  </section>`;
}

export function relayPage(now=Date.now()) {
  return `<div class="relay-page">
  <nav class="container relay-breadcrumb" aria-label="パンくず"><a href="/schedule/">これからの予定</a><span aria-hidden="true">/</span><span>TOMA楽しみリレー</span></nav>
  <section class="container relay-hero" aria-labelledby="relay-title">
    <div class="relay-hero-copy"><p class="relay-kicker">TOMA推し活部・ファン主催企画</p><p class="relay-name">TOMA楽しみリレー</p><h1 id="relay-title">12/22、<br>あなたは<br><em>何が楽しみ？</em></h1><p class="relay-lead">そのひとことが、<br>誰かの「私も！」につながっていく。</p><p>会場で聴く人も、おうちから観る人も。<br>とおまさんのライブが、ちょっと気になっている人も。<br>あなたの「楽しみ」を、いつもの場所から。</p><div class="relay-actions"><a class="button relay-button" href="#examples">投稿のヒントを見つける</a><a class="relay-text-link" href="#how-to">参加のしかた</a></div></div>
    <div class="relay-hero-art" aria-label="楽しみとありがとうがつながる投稿の見本"><p class="relay-art-label">こんなふうに、つながっていく。</p><div class="relay-paper relay-paper-one"><span>投稿の見本</span><p>歌を生で聴けるのが<br><strong>楽しみ！</strong></p><small translate="no">#TOMA楽しみリレー</small></div><div class="relay-thread" aria-hidden="true"></div><div class="relay-paper relay-paper-two"><span>返信の見本</span><p>つないでくれて<br><strong>ありがとう！</strong></p><small>私も、その瞬間が楽しみ。</small></div><div class="relay-spark" aria-hidden="true">✳</div><p class="relay-art-footer">あなたの言葉で、次の人へ。</p></div>
  </section>
  <div class="relay-dateband"><div class="container"><p><b>2026.11.28 SAT</b><span>スタート</span><i aria-hidden="true">—</i><b>12.22 TUE</b><span>開演前まで</span></p><p>WHITEBURN 5 · 神田明神ホールへ、楽しみをつなごう。</p></div></div>
  <section class="container relay-section relay-intro"><p class="relay-kicker">会う前から、もう楽しい。</p><h2>「好き」をひとこと。<br>それだけで、バトンになる。</h2><p>12月22日、總水とおまさんのライブ「WHITEBURN 5」。<br>みんなの楽しみな気持ちを持ち寄って、当日を一緒に迎える企画です。</p><p>好きな一曲。初めて会場に入る瞬間。配信をつなぐ時間。<br>うまく書こうとしなくて大丈夫。見かけたときが、あなたのスタートです。</p><p class="relay-closed" data-relay-closed ${eventIsCurrent(RELAY_DAY,now)?'hidden':''}>このリレーの募集期間は終了しました。つないでくれた皆さん、ありがとう！ 投稿例と思い出のページとして残しています。</p></section>
  <section class="container relay-section" id="how-to"><div class="relay-heading"><p class="relay-kicker">HOW TO JOIN</p><h2>バトンは、誰でも受け取れます。</h2><p>指名や、次の人へのお願いは必要ありません。自分のペースでどうぞ。</p></div><ol class="relay-steps">
    <li><span class="relay-step-icon" aria-hidden="true">♡</span><h3>楽しみを、ひとつ。</h3><p>「12/22、私はこれが楽しみ」を考えてみよう。ひとことでも、じっくり書いても。</p></li>
    <li><span class="relay-step-icon" aria-hidden="true">✎</span><h3>いつもの場所に投稿。</h3><p>Facebook、アメブロ、X、Instagram、TikTokなどで、問いかけと共通タグを添えて。</p></li>
    <li><span class="relay-step-icon" aria-hidden="true">✦</span><h3>「ありがとう」で、つなぐ。</h3><p>見かけた投稿に返信したり、引用したり。「私も楽しみ！」だけでも、うれしいバトンです。</p></li>
  </ol></section>
  <section class="container relay-template" aria-labelledby="template-title"><div><p class="relay-kicker">まずは、この形から。</p><h2 id="template-title">ひとことを入れるだけ。</h2><p>コピーして、角かっこの部分をあなたの言葉に。<br>文章の長さも、語り口も自由です。</p></div><div class="relay-template-paper">${post('relay-template',['バトン受け取った！🙌','12/22、私はこれが楽しみ → ［あなたのひとこと］',baton])}${copy('relay-template')}</div></section>
  <section class="container relay-section" id="examples"><div class="relay-heading"><p class="relay-kicker">FIND YOUR WORDS</p><h2>あなたらしい、つなぎ方。</h2><p>短くても、長くても。写真があっても、なくても。</p><p class="relay-example-note">以下はすべて投稿・返信の見本です。実際の参加者の投稿ではありません。気に入った表現を、あなたの気持ちに合わせて変えてください。</p></div>
  <div class="relay-example-grid">
    <article class="relay-example"><p class="relay-example-kind">短文で、気軽に</p><h3>最初の一音が、楽しみ。</h3>${post('relay-short',['バトン受け取った！🙌','12/22、私はこれが楽しみ → 最初の一音で、会場の空気が変わる瞬間！',baton])}${copy('relay-short')}</article>
    <article class="relay-example relay-example-lilac"><p class="relay-example-kind">初めての参加なら</p><h3>ドキドキも、そのまま。</h3>${post('relay-first',['バトン受け取った！🙌','12/22、私はこれが楽しみ → とおまさんの歌を、初めて生で聴けること。ひとりで参加するので少しドキドキ。でも、会場で同じ「好き」の人に会えたらうれしいな。',baton])}${copy('relay-first')}</article>
    <article class="relay-example relay-example-photo"><figure><img src="/assets/relay/home-stream.jpg" alt="温かい飲みものとおやつ、パソコンを用意して配信を待つ部屋のイメージ" width="1200" height="800" loading="lazy"><figcaption>写真付き投稿のイメージ（AI生成）</figcaption></figure><div class="relay-example-photo-body"><p class="relay-example-kind">写真＋ひとこと</p><h3>おうち組も、一緒に。</h3>${post('relay-home',['バトン受け取った！🙌','12/22、私はこれが楽しみ → 好きな飲みものとおやつを用意して、配信の最初の音を待つ時間。場所は離れていても、みんなと同じライブを楽しめるのがうれしい！',baton])}${copy('relay-home')}<p class="relay-photo-tip">写真のヒント：マグカップ、お出かけの支度、好きな景色。自分で撮った日常の1枚で十分です。</p></div></article>
    <article class="relay-example relay-example-long"><p class="relay-example-kind">長文で、じっくり</p><h3>楽しみにしている理由も、<br>ひとつのバトン。</h3>${post('relay-long',['バトン受け取った！🙌','12/22、私はこれが楽しみ。','予定にライブの日を書き込んでから、いつもの毎日にも少し楽しみが増えました。「あと少しであの音を聴けるんだ」と思うと、なんだか足取りまで軽くなる。','当日は、歌をじっくり聴く時間も、思わず体が動く瞬間も、一緒に行く人と顔を見合わせる時間も、まるごと味わいたいです。帰り道にどんな話をしているのかな。それも、今から楽しみ。','皆さんの「これが楽しみ」も読んでみたいです。会場からも、おうちからも、一緒に12/22を迎えましょう。',baton])}${copy('relay-long')}</article>
    <article class="relay-example relay-example-sage"><p class="relay-example-kind">気になっている人も</p><h3>「ちょっと気になる」から。</h3>${post('relay-curious',['バトン受け取った！🙌','12/22、私はこれが楽しみ → みんなの投稿から、ライブのわくわくを分けてもらうこと。まだ参加は考え中だけど、とおまさんの音楽をもう少し聴いてみたい！',baton])}${copy('relay-curious')}</article>
    <article class="relay-example"><p class="relay-example-kind">写真や短い動画と一緒に</p><h3>いつもの風景に、楽しみを。</h3>${post('relay-scenery',['バトン受け取った！🙌','12/22、私はこれが楽しみ → ライブの日のお出かけ。何を着て行こうかな、と考える時間からもう楽しい。今日は帰り道の空を1枚。皆さんは、どんなふうに当日を待っていますか？',baton])}${copy('relay-scenery')}</article>
  </div><p class="relay-care">写真は、ご自身で撮ったものや掲載してよいものを。チケットのQRコード・住所などが写り込まないよう、投稿前にひと目確認してください。</p></section>
  <section class="relay-thanks"><div class="container relay-thanks-grid"><div><p class="relay-kicker">PASS IT WITH THANKS</p><h2>「つないでくれて、<br>ありがとう。」</h2><p>投稿を見つけたら、ひとこと返してみませんか。<br>お礼も、共感も、次の楽しみにつながります。</p><p class="relay-example-note">返信の見本です。コメントは、それぞれのSNSで。</p></div><div class="relay-conversation"><div class="relay-conversation-post"><small>投稿の見本</small><p>ひとりで初参加。<br>歌を生で聴けるのが楽しみ！</p></div><div class="relay-reply"><span aria-hidden="true">♡</span><div><p id="relay-thanks-one">つないでくれてありがとう🙌<br>そのドキドキも、楽しみも、バトン受け取りました！</p>${copy('relay-thanks-one')}</div></div><div class="relay-reply"><span aria-hidden="true">✦</span><div><p id="relay-thanks-two">私も、最初の一音が楽しみ！<br>投稿を読んで、ますます待ち遠しくなりました。ありがとう！</p>${copy('relay-thanks-two')}</div></div><div class="relay-reply"><span aria-hidden="true">♫</span><div><p id="relay-thanks-three">おうち組からも、バトン受け取った！<br>一緒に楽しもうね。つないでくれてありがとう。</p>${copy('relay-thanks-three')}</div></div></div></div></section>
  <section class="container relay-section relay-gather" id="gather"><div><p class="relay-kicker">「つないだよ！」が集まる場所。</p><h2>Facebookにも、<br>バトンを持ち寄ろう。</h2><p>集合先は「TOMA推し活project」グループ。企画の固定投稿を見つけて、ひとことコメントで参加できます。</p><p>アメブロやほかのSNSで書いた方は、「アメブロでつないだよ🙌」と記事のリンクを添えて。見つけた人も「見たよ！」「私も！」を気軽にどうぞ。</p>${external(RELAY_GROUP,'Facebookの集合場所へ','button relay-button')}<p class="relay-small">Facebookのログインや、グループへの参加が必要な場合があります。企画の固定投稿は、グループ内でご確認ください。</p></div><aside class="relay-platform-note"><h3>いつもの場所で、大丈夫。</h3><dl><div><dt>Facebook</dt><dd>企画の投稿にコメント。自分のタイムラインへの投稿でも。</dd></div><div><dt>アメブロ</dt><dd>記事にひとこと。共通タグは投稿画面のハッシュタグ設定へ。</dd></div><div><dt>X</dt><dd>ひとことポスト。見かけた投稿を引用してつないでも。</dd></div><div><dt>Instagram / TikTok</dt><dd>写真や短い動画に、自分の言葉と共通タグを添えて。</dd></div></dl></aside></section>
  <section class="container relay-live"><div><p class="relay-kicker">楽しみがふくらんだら。</p><h2>12月22日、WHITEBURN 5。</h2><p>東京・神田明神ホール。会場での参加、オンライン配信など、<br>公演とチケットの最新情報は公式の案内をご確認ください。</p>${external(official,'公式の公演・チケット案内へ','button button-outline')}</div><div class="relay-live-date" aria-hidden="true"><span>DECEMBER</span><strong>22</strong><small>2026 · TUESDAY</small></div></section>
  <section class="container relay-finish"><p>ひとことから、ひとりから。</p><h2>次のバトン、どうぞ！</h2><p>12/22、あなたは何が楽しみ？</p><a class="button relay-button" href="#relay-template">投稿文のひな形に戻る</a><p class="relay-small">主催：TOMA推し活部<br>ファンによる自主企画です。公演・アーティスト公式の企画とは運営が異なります。</p><a class="relay-text-link" href="/schedule/">これからの予定に戻る</a></section>
  <p class="sr-only" role="status" aria-live="polite" data-relay-copy-status></p>
  </div>`;
}
