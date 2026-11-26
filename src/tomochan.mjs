const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photo = (name, alt, width, height, eager = false) => `<img src="/assets/tomochan/${name}.jpg" alt="${alt}" width="${width}" height="${height}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}>`;

export const tomochanEntrance = () => `<aside class="tomochan-entrance container narrow" aria-label="ともちゃんの思い出">
  <p>この場所を、つないでくれた人。</p>
  <a href="/club/tomochan/">ともちゃんのこと</a>
</aside>`;

const memories = [
  {image:'sunflower', width:1145, height:900, alt:'ひまわりの飾りと花束を囲んで、笑顔で写るともちゃんと仲間', caption:'思いきり楽しむ、その笑顔。'},
  {image:'at-the-table', width:836, height:628, alt:'食卓で大きな料理の盛り合わせを囲む、笑顔の二人', caption:'一緒に食べて、一緒に笑って。'},
  {image:'behind-the-scenes', width:1349, height:900, alt:'スタッフのTシャツを着て、会場のテーブルで仲間と過ごすともちゃんの後ろ姿', caption:'みんなの時間を、支える背中。'},
  {image:'side-by-side', width:888, height:590, alt:'明るい会場で、仲間と肩を並べて笑顔を見せるともちゃん', caption:'ふとしたひとときも、大切な思い出。'},
  {image:'on-stage', width:899, height:900, alt:'銀座TACTのステージに、花束とともに並ぶ三人', caption:'音楽がつないでくれた、ご縁。'},
  {image:'with-friends', width:1199, height:900, alt:'酒部の札を囲んで、ポーズをとるともちゃんと仲間たちの集合写真', caption:'集まれば、こんなにいい顔。'},
];

// A small, editorial selection of public recordings; deliberately independent of latest-video feeds.
const recordings = [
  {id:'3c48NKMjvWQ', date:'2025.03.14', channel:'TOMANIA LIVE', title:'TOMANIA LIVE 初回スペシャル', heading:'ここから始まった、TOMANIA LIVE。', description:'初回のゲストは、よっしー。とおまさんへの想いや、推し活の楽しさを語り合う、はじまりの配信です。', start:0, embeddable:false},
  {id:'qZkFyZ8p-SY', date:'2026.01.09', channel:'神山真希', title:'【響新共命⑦】“總水とおまLIVE”楽しみ方を｢伊藤友隆さん｣にインタビュー！', heading:'「好き」を語る、ともちゃん。', description:'とおまさんとの出会い、ライブで心が動いたこと。神山真希さんとの対談で、ともちゃん自身の言葉に触れられます。', start:0},
  {id:'dNHacuPbXS0', date:'2026.07.18', channel:'TOMANIA LIVE', title:'第２弾！WHITEBURN２アフタートーク メンズスペシャル！', heading:'人類のために、何かしたい。', description:'ライブで心に芽生えた、人類のために何かしたいという想い。2026年7月18日のTOMANIA LIVEで、その気持ちを仲間に話している場面です。', start:1778, cue:'想いを語る場面から再生（29:38〜）'},
];

const recording = video => `<article class="tomochan-recording">
  <div class="tomochan-player">${video.embeddable===false ? `<a class="tomochan-video-cover" href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noopener noreferrer"><img src="https://i.ytimg.com/vi/${video.id}/hqdefault.jpg" width="480" height="360" loading="lazy" alt=""><span class="tomochan-play-icon" aria-hidden="true">▶</span><span class="tomochan-watch-label">YouTubeで見る<span class="sr-only">（新しいタブ）</span></span></a>` : `<iframe translate="no" src="https://www.youtube-nocookie.com/embed/${video.id}?autoplay=0&amp;playsinline=1${video.start ? `&amp;start=${video.start}` : ''}" title="${esc(video.title)}" width="560" height="315" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`}</div>
  <div class="tomochan-recording-copy"><p class="tomochan-recording-meta"><span translate="no">${video.channel}</span><time datetime="${video.date.replaceAll('.','-')}">${video.date}</time></p>
  <h3>${video.heading}</h3><p>${video.description}</p>${video.cue ? `<p class="tomochan-cue">${video.cue}</p>` : ''}
  <a class="tomochan-text-link" href="https://www.youtube.com/watch?v=${video.id}${video.start ? `&amp;t=${video.start}s` : ''}" target="_blank" rel="noopener noreferrer">YouTubeで見る<span class="sr-only">（新しいタブ）</span></a></div>
</article>`;

export const tomochanPage = () => `<article class="tomochan-page">
  <div class="container tomochan-breadcrumb"><a href="/club/">推し活部について</a><span aria-hidden="true">/</span><span>ともちゃんのこと</span></div>
  <section class="container tomochan-hero" aria-labelledby="tomochan-title">
    <div class="tomochan-hero-copy"><p class="tomochan-kicker" lang="en">OUR LITTLE ALBUM</p>
      <h1 id="tomochan-title"><span>我らが永遠の</span><span>TOMA推し活部の統括リーダー</span><strong>ともちゃん</strong></h1>
      <div class="tomochan-hero-rule" aria-hidden="true"></div>
      <p class="tomochan-opening">たくさん笑って、<br>人と人をつないでくれた、ともちゃん。</p>
      <p class="tomochan-hero-note">一緒に過ごした時間と、<br>今もつながるご縁を、ここに。</p>
      <a class="tomochan-text-link" href="#memories">思い出のアルバムをひらく</a>
    </div>
    <figure class="tomochan-hero-photo">${photo('welcome','明るい会場で、笑顔で手を上げるともちゃん',1349,900,true)}<figcaption>あの笑顔に、また会える場所。</figcaption></figure>
  </section>

  <section class="container tomochan-story" aria-labelledby="tomochan-story-title">
    <div class="tomochan-section-heading"><p class="tomochan-kicker" lang="en">THE CONNECTIONS YOU MADE</p><h2 id="tomochan-story-title">ともちゃんが、<br class="mobile-br">つないでくれたもの。</h2></div>
    <p class="tomochan-intro">TOMA推し活部の統括リーダー、ともちゃんこと伊藤友隆さん。<br>とおまさんが好き。その気持ちを、みんなで楽しむ時間に変えてくれた人です。</p>
    <div class="tomochan-stories">
      <section><h3>人と人を、つないで。</h3><p>推し活部の統括リーダーとして、蓮ちゃんとともに仲間の輪を広げてきたともちゃん。会場でも配信でも、一緒に楽しむ時間をつくってくれました。</p></section>
      <section><h3>画面の向こうにも、仲間。</h3><p>2025年3月に始まったTOMANIA LIVE。よっしーやさまざまなゲストとのおしゃべりを通して、とおまさんの魅力やライブの楽しさを届けてくれました。</p></section>
      <section><h3>夢を語る、その笑顔。</h3><p>麹や発酵への想いを、日本から世界へ。仲間と未来の話をして、好きなことに踏み出していく姿も、ともちゃんの大切な一面です。</p></section>
    </div>
    <p class="tomochan-dedication">このページは、2026年10月7日に旅立ったともちゃんを偲び、仲間との思い出を残す小さなアルバムです。</p>
  </section>

  <section class="tomochan-memories" id="memories" aria-labelledby="tomochan-memories-title"><div class="container">
    <div class="tomochan-section-heading"><p class="tomochan-kicker" lang="en">MOMENTS TO KEEP</p><h2 id="tomochan-memories-title">みんなと笑った時間。</h2><p>ライブの日も、その前後の何気ないひとときも。</p></div>
    <div class="tomochan-photo-grid">${memories.map(memory=>`<figure>${photo(memory.image,memory.alt,memory.width,memory.height)}<figcaption>${memory.caption}</figcaption></figure>`).join('')}</div>
  </div></section>

  <section class="container tomochan-voices" aria-labelledby="tomochan-voices-title">
    <div class="tomochan-section-heading"><p class="tomochan-kicker" lang="en">HIS VOICE, HIS LAUGHTER</p><h2 id="tomochan-voices-title">ともちゃんの声に、<br class="mobile-br">会いにいく。</h2><p>笑い合う時間も、想いを語る時間も。<br>ともちゃんらしさに触れる、3つの動画を選びました。</p></div>
    <div class="tomochan-recordings">${recordings.map(recording).join('')}</div>
    <p class="tomochan-more"><a class="tomochan-text-link" href="https://www.youtube.com/@TOMANIALIVE" target="_blank" rel="noopener noreferrer">TOMANIA LIVEをもっと見る<span class="sr-only">（新しいタブ）</span></a></p>
  </section>

  <section class="tomochan-thanks" aria-labelledby="tomochan-thanks-title"><div class="container">
    <div class="tomochan-thanks-copy"><p class="tomochan-kicker" lang="en">WITH LOVE &amp; GRATITUDE</p><h2 id="tomochan-thanks-title">ありがとう、<br class="mobile-br">ともちゃん。</h2><p>一緒に笑った時間。<br>好きなことを語り合った時間。</p><p>ともちゃんがつないでくれたご縁は、<br>これからも私たちの中に。</p><p class="tomochan-signature">TOMA推し活部</p></div>
    <figure>${photo('one-more-photo','スタッフのTシャツを着た仲間たちと、階段で思い思いのポーズをとる集合写真',1348,900)}<figcaption>これからも、大切な仲間。</figcaption></figure>
    <a class="tomochan-text-link" href="/club/">推し活部についてに戻る</a>
  </div></section>
</article>`;
