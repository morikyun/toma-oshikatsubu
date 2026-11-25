const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const external = (url,label) => `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label}<span class="sr-only">（外部サイト・新しいタブ）</span> ↗</a>`;

export function privacyPage(privacy, membershipUrl) {
  const contact = external(privacy.contactUrl,'お問い合わせフォーム');
  return `<section class="page-intro container"><p class="eyebrow">PRIVACY POLICY</p><h1>プライバシーポリシー</h1><p class="page-lead">情報の取り扱いと、外部サービスについて。</p></section>
  <div class="container privacy-layout">
  <nav class="privacy-nav" aria-label="プライバシーポリシーの目次"><a href="#operator">運営者・窓口</a><a href="#information">受け取る情報</a><a href="#fan-profiles">ファン紹介</a><a href="#external-services">外部サービス</a><a href="#cookies">Cookie・ブラウザの保存</a><a href="#retention">保管・削除の相談</a></nav>
  <div class="prose privacy-copy">
  <p>当サイトは、非公式ファンコミュニティの案内サイトとして、次の方針で情報を取り扱います。とおまさんご本人の公式サイトおよび公式ファンクラブ「TOMA BOX」とは運営が異なります。</p>
  <section id="operator"><h2>1. 運営者とお問い合わせ</h2><p>サイト運営者：${escape(privacy.operator)}<br>入部フォームの回答・申請の管理：${escape(privacy.manager)}</p><p>個人情報の取り扱い、掲載情報の訂正・掲載終了、その他のご相談は、${contact}からご連絡ください。Googleフォームが別のタブで開きます。</p></section>
  <section id="information"><h2>2. 受け取る情報と利用目的</h2>
  <h3>入部のお申し込み</h3><p>${external(membershipUrl,'入部フォーム（Formzu）')}では、希望する部、氏名、フリガナ、Facebook名、Messengerの利用可否、メールアドレス、備考欄に記入された内容を受け取ります。入部手続き、参加先の確認、連絡、グループ活動への案内に利用します。必須・任意の区分はフォームに表示します。</p>
  <h3>お問い合わせ</h3><p>Googleフォームでは、メールアドレス、お問い合わせ種別、お問い合わせ内容を受け取り、回答や必要な確認・連絡に利用します。フォームの設定によりGoogleへのログインが求められる場合があります。回答は、対応に必要な運営担当者が取り扱います。</p>
  <h3>YouTube掲載の申請・推薦</h3><p>掲載希望、会員であることの確認、紹介するプロフィールやチャンネル情報、推薦内容などを、掲載の検討と本人への連絡に利用します。申請は${escape(privacy.manager)}が管理し、推薦を受けた掲載の可否は部長会で判断します。審議に必要な範囲の情報を、関係する部長・部長会と共有します。</p>
  <p>フォームの入力内容をサイトの公開ページへ自動掲載することはありません。</p></section>
  <section id="fan-profiles"><h2>3. ファン紹介で公開する情報</h2><p>本人の掲載希望・同意を確認した範囲で、活動名や氏名、都道府県、役職、紹介文、YouTubeチャンネル名・URL、TOMA BOX会員であることを紹介します。掲載されたチャンネルの公開動画のタイトル・公開日時・サムネイルなどを自動表示します。とおまさんに関する内容以外の動画も表示されることがあります。</p><p>入部やお問い合わせで受け取ったメールアドレス、非公開の連絡内容、部長会での審議内容は、ファン紹介には掲載しません。紹介内容の変更や掲載終了は、下記の窓口へお申し出ください。</p></section>
  <section id="external-services"><h2>4. 外部サービスと情報の送信</h2><p>このサイトでは、次のサービスを利用しています。外部サイトのリンクは、クリックしたときに別のタブで開きます。</p>
  <h3>Cloudflare：サイトの配信・保護</h3><p>ページや画像の配信、動画・ブログ情報の取得、サイトの保護にCloudflareを利用します。アクセス時にIPアドレス、アクセス日時、要求したURL、ブラウザや通信に関する情報などがCloudflareに送信・処理されます。適用される設定や機能に応じて、セキュリティ用Cookieやログが利用される場合があります。${external('https://www.cloudflare.com/privacypolicy/','Cloudflareのプライバシーポリシー')}・${external('https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/','Cookieの説明')}</p>
  <h3>YouTube / Google：動画・配信情報とサムネイル</h3><p>このサイトはYouTube API ServicesとYouTubeの公開RSSを利用します。ページの閲覧に合わせて、サーバーを通じて公開動画の情報を取得し、Googleの画像配信元（i.ytimg.com）からサムネイルを読み込みます。表示のための同意ボタンは設けていません。直近の動画欄では、プライバシー強化モードの埋め込みプレーヤー（youtube-nocookie.com）を読み込みます。自動再生は行いません。画像・プレーヤーの読み込みや再生時には、IPアドレス、ブラウザの情報、参照元などがGoogleに送信されます。埋め込み動画の再生・操作に関する情報もGoogle / YouTubeで処理される場合があります。プライバシー強化モードでも、情報の送信がなくなるわけではありません。Google側のCookie等の取り扱いは、サービスの設定やブラウザの制限によって異なります。</p><p>サイトの検索語や都道府県の絞り込みはブラウザ内で処理し、YouTube APIへ送信しません。閲覧者のGoogleアカウントへのアクセス許可は求めず、非公開動画や視聴履歴も取得しません。${external('https://policies.google.com/privacy','Googleのプライバシーポリシー')}</p>
  <p id="youtube-terms">当サイトのYouTube関連機能には、${external('https://www.youtube.com/t/terms','YouTube利用規約')}が適用されます。情報の取り扱いは、このページと${external('https://policies.google.com/privacy','Googleのプライバシーポリシー')}をご確認ください。外部のYouTubeページを開いた後も、YouTubeの規約・ポリシーが適用されます。</p>
  <h3>Formzu・Googleフォーム・Facebook Messenger</h3><p>入部フォームはFormzu、お問い合わせフォームはGoogleフォームを利用します。フォームを開いて入力・送信すると、入力した情報や接続に関する情報がそれぞれのサービスで処理されます。連絡やグループ活動ではFacebook Messengerを利用します。各サービスには、それぞれのCookieや保存機能、利用規約・ポリシーが適用されます。${external('https://www.formzu.com/privacy_policy','Formzuの個人情報保護方針')}・${external('https://www.formzu.com/use_of_personal_information','Formzuの情報の取り扱い')}・${external('https://policies.google.com/privacy','Googleのプライバシーポリシー')}・${external('https://www.facebook.com/privacy/policy/','Metaのプライバシーポリシー')}</p>
  <h3>GitHub：公開のご要望受付</h3><p>サイトの修正や提案は、GitHubの公開Issueでも受け付けます。投稿者のアカウント名・依頼文・添付画像・コメントはGitHub上で公開され、運営は内容の確認、連絡、サイト改善のために利用します。個人情報や公開したくない内容は、${contact}をご利用ください。</p><p>GitHubへのリンクを開いた後の通信やCookie等の取り扱いは、${external('https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement','GitHubのプライバシーポリシー')}をご確認ください。</p>
  <h3>總水とおま公式サイト：ライブ予定</h3><p>公式イベントページの公開情報をサイトのサーバーから取得し、公演名・開催日・会場を表示します。この一覧の表示だけで、閲覧者のブラウザから公式サイトへアクセスすることはありません。公式の案内へのリンクを開いた後は、移動先の取り扱いをご確認ください。</p>
  <h3>アメブロ：ブログの新着情報</h3><p>ご本人・スタッフ・推し活部のブログの公開RSSをサイトのサーバーから取得し、記事タイトル・公開日・リンクを表示します。ブログの新着欄を表示するだけで、閲覧者のブラウザからアメブロへアクセスすることはありません。記事のリンクを開いた後の取り扱いは、移動先でご確認ください。</p>
  <p>外部サービスの情報は、提供元の方針に従い、日本国外で処理される場合があります。</p></section>
  <section id="cookies"><h2>5. Cookieとブラウザへの保存</h2><p>当サイト独自の広告配信・アクセス解析・閲覧履歴の保存は行いません。YouTubeの表示に関する選択をブラウザに保存する機能は廃止しました。以前の設定がブラウザに残っている場合も、現在の表示には使用しません。</p><p>言語の指定がないURLでは、ブラウザの優先言語を参考に表示言語を選び、対応する言語がなければ英語で表示します。手動で選んだ言語は、同じタブでの閲覧中に維持するためsessionStorageに保存します。保存できない場合はURLの言語指定を利用します。この設定にCookieは使用しません。</p><p>画像や埋め込みプレーヤーの読み込み・再生時、またはリンク先の外部サービスを利用した際には、各サービスがCookieやブラウザの保存機能を利用する場合があります。目的や取り扱いについては、上記の各サービスのポリシーをご確認ください。</p><p>Cookieやサイトデータはブラウザの設定から管理・削除できます。外部コンテンツやCookieを制限すると、埋め込み動画などが利用できない場合があります。その際は「YouTubeで見る」のリンクもご利用ください。</p></section>
  <section id="retention"><h2>6. 保管と、訂正・削除・利用停止のご相談</h2><p>入部フォームの回答・YouTube掲載申請は${escape(privacy.manager)}が閲覧・管理します。運営や対応に必要な範囲で取り扱い、公開情報と非公開の連絡情報を区別します。受け取った情報を広告目的で販売することはありません。委託先での処理や法令に基づく場合等を除き、目的外の第三者提供は本人の同意なく行いません。</p><p>退部・不掲載時の情報の取り扱いについては、Facebook Messengerで${escape(privacy.manager)}へご連絡ください。連絡方法が分からない場合や、情報の開示・訂正・削除・利用停止をご希望の場合は、${contact}をご利用ください。必要に応じて本人確認を行い、対応内容をご案内します。一律の保存日数や、退部・不掲載に伴う自動削除期限は定めていません。</p><p>動画・ブログの公開情報は、新着案内のためにサーバーで一時保存し、更新時に確認します。閲覧者の入部・問い合わせの回答を、この動画用キャッシュに保存することはありません。</p></section>
  <section id="policy-changes"><h2>7. 方針の見直し</h2><p>利用するサービスや運用の変更に合わせて、このページを更新します。</p><p class="fine">制定：${escape(privacy.effectiveDate.replaceAll('-','/'))} ／ 最終更新：${escape((privacy.updatedDate || privacy.effectiveDate).replaceAll('-','/'))}</p></section>
  </div></div>`;
}
