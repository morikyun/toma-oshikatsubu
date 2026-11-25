const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external = (url, label, className = 'text-link') => `<a class="${className}" href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only">（外部サイト・新しいタブ）</span></a>`;

const requests = [
  ['01-change.yml', '文章・名前・リンクの修正', '紹介文の変更、名前の訂正、リンク先の差し替えなど。どのページの何を変えたいか、教えてください。'],
  ['02-new-page.yml', '新しいページのアイデア', '「こんなページがあったら嬉しい」というご提案。文章や見た目が決まっていなくても大丈夫です。'],
  ['03-problem.yml', '表示や動作のお困りごと', 'リンクが開かない、文字が重なる、ボタンが反応しないなど。気づいたことをお知らせください。'],
  ['04-usability.yml', '見やすさ・使いやすさの改善', '文字を大きくしたい、情報を探しやすくしたいなど。使ってみて感じたことを教えてください。'],
  ['05-feature.yml', '便利な機能のご提案', '検索や絞り込み、予定の保存など。「こんなことができたら」というアイデアをお待ちしています。'],
  ['06-question.yml', '質問・相談', 'どれを選ぶか迷ったときは、こちらへ。まだまとまっていない相談も、いつもの言葉でどうぞ。']
];

export function feedbackPage(repositoryUrl, contactUrl) {
  const repository = repositoryUrl.replace(/\/$/, '');
  return `<nav class="container feedback-jumps" aria-label="ご要望ページの目次"><a class="button" href="#feedback-options-title">フォームを選ぶ</a><a class="text-link" href="#feedback-how-title">送り方を見る</a></nav>
  <section class="container feedback-overview" aria-labelledby="feedback-welcome">
    <div class="feedback-copy"><h2 id="feedback-welcome">小さな気づきが、<br>次の使いやすさに。</h2><p>「ここを直してほしい」「こんなページも見てみたい」。この案内所をより良くする声を、GitHub（ギットハブ）で受け付けています。</p><p>GitHubは、サイトづくりの相談や作業をまとめる場所です。要望を一件ずつ書く「Issue（イシュー）」を、運営への連絡票として使います。ITの知識は必要ありません。</p></div>
    <aside class="feedback-before" aria-labelledby="feedback-before-title"><h3 id="feedback-before-title">送る前に、知っておきたいこと</h3><ul><li>投稿にはGitHubのアカウントが必要です。</li><li>アカウント名・依頼文・画像・コメントは公開されます。住所や電話番号などは書かないでください。</li><li>リンク先の依頼フォームと操作ガイドは、日本語でご案内しています。</li></ul><a class="text-link" href="#private-contact">公開したくない内容のご相談はこちら</a></aside>
  </section>
  <section class="container section feedback-options" aria-labelledby="feedback-options-title"><p class="eyebrow">SHARE YOUR IDEA</p><h2 id="feedback-options-title">お願いしたいことを選ぶ</h2><p class="section-lead">近いものを選ぶと、GitHubの入力フォームが開きます。<br>迷ったときは「質問・相談」から始めてください。</p><div class="feedback-grid">${requests.map(([file, title, description]) => external(`${repository}/issues/new?template=${file}`, `<h3>${title}</h3><p>${description}</p><span class="feedback-card-action">フォームを開く</span>`, 'feedback-card')).join('')}</div></section>
  <section class="container section-bottom feedback-how" aria-labelledby="feedback-how-title"><p class="eyebrow">HOW TO SEND</p><h2 id="feedback-how-title">登録は、3ステップで。</h2><ol class="feedback-steps"><li><h3>GitHubにログインする</h3><p>「Sign in」からログインします。アカウントがない方は「Sign up」で作成し、もう一度このページからフォームを開いてください。</p></li><li><h3>質問に沿って書く</h3><p>ページの名前や気になった箇所、どうしたいかなどを入力します。必須の項目だけでも送れます。文章がまとまっていなくても大丈夫です。</p></li><li><h3>送信して、返事を確認する</h3><p>「Create」または「Submit new issue」で送信します。登録されたページのコメント欄で、補足や運営とのやり取りができます。</p></li></ol><p class="feedback-followup">運営が内容を確認し、必要に応じて相談しながら対応します。修正や追加は、内容を確認してからサイトに反映します。</p>
    <div class="feedback-guide"><div><h3>GitHubが初めての方へ</h3><p>詳しい登録手順や記入例、Issueなどの言葉の意味をまとめています。</p></div>${external(`${repository}/blob/main/README.md`, '登録ガイドを読む', 'button button-outline')}</div><p class="feedback-existing">${external(`${repository}/issues`, 'これまでのご相談を見る')}</p>
  </section>
  <section class="container section-bottom" id="private-contact" aria-labelledby="feedback-private-title"><div class="feedback-private"><div><h2 id="feedback-private-title">個人情報を含むご連絡は</h2><p>個人情報など、公開したくない内容は、既存のお問い合わせフォームからご連絡ください。</p><a class="text-link" href="/privacy/">情報の取り扱いについて</a></div>${external(contactUrl, 'お問い合わせフォームへ', 'button')}</div></section>`;
}
