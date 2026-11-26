# Issueから確認・公開まで

公開サイト：https://toma-oshikatsubu.pages.dev/

ソースと修正依頼：https://github.com/morikyun/toma-oshikatsubu

一般の方への登録案内は [READMEの上部](../README.md) にあります。このページは、依頼を受けた運営者向けの手順です。

翻訳・自動更新・各ファイルの役割など、制作時の詳細は [サイトの制作・運営資料](SITE_MAINTENANCE.md) を参照してください。

## 普段の運用

1. **Issues → New issue** で、文章の修正・新しいページ・不具合・見やすさや使いやすさ・機能の追加・質問相談の6種類から選んで登録してもらいます。選んだフォームに合ったTypeとラベルが自動で付きます。迷っている方には「質問・相談したい」を案内します。
2. 運営者が依頼の内容を確認し、Codexに「このIssueに対応してPRを作って」とIssueのURLを渡します。依頼した一般の方がCodexを操作する必要はありません。Issue登録だけでAIが自動着手する設定ではありません。
3. 作業用ブランチからPRを作ると、4言語のページ生成、内部リンク、自動テストが実行されます。同じリポジトリのブランチの **Deploy preview** は、morikyunの承認を待ちます。
4. **Files changed** で変更内容を確認します。文章やリンクだけの依頼で、`.github/`・`scripts/`・`package*.json`・`AGENTS.md` に説明のない変更があれば、承認せず確認してください。その後Actionsの **Review deployments** で `preview` を選び、**Approve and deploy** を押します。これはプレビュー公開の承認で、本番公開の承認とは別です。Codexはこの承認を代行しません。
5. **Deploy preview** が成功したら、PRの **View deployment** またはActionsから確認用サイトを開きます。プレビューではYouTube APIのキーを設定しないため、公式動画・配信予定は保存済み情報の表示になります。RSSなどキー不要の機能は動作します。
6. 問題がなければmorikyunが **Squash and merge → Confirm squash and merge** を押します。この操作を本番公開の承認とします。
7. 再度チェックが成功すると、今のCloudflare Pagesへ自動公開されます。失敗した場合はActionsで原因を確認し、修正PRまたは該当ジョブの再実行で対応します。

PRの作成者と確認者が同じGitHubアカウントになる場合があるため、別人によるPRレビューの「Approve」は必須にはしていません。プレビュー環境の承認は必須とし、本人が承認できる設定にします。追加のコミットや再実行で新たに承認待ちになった場合も、対象の差分を確認してから承認してください。mainへの変更にはPRとチェック成功が必要です。公開処理でも、morikyunがマージしたPRと実行対象のコミットが一致することを確認します。

外部からのフォークPRには公開用トークンを渡さず、ビルドとテストのみ実行します。必要なら内容を確認したうえで、リポジトリ内の作業ブランチに取り込んでプレビューしてください。

## フォーム・Type・ラベル

- 文章・名前・リンクの修正 → Type `Task` ／ ラベル `説明文・案内`
- 新しいページ → Type `Feature` ／ ラベル `改善・追加`
- 表示や動作の不具合 → Type `Bug` ／ ラベル `不具合`
- 見やすさ・使いやすさの改善 → Type `Feature` ／ ラベル `見やすさ・使いやすさ` と `改善・追加`
- 機能の追加・改善 → Type `Feature` ／ ラベル `改善・追加`
- 質問・相談 → Type `Task` ／ ラベル `質問・相談`

各フォームのトップレベルの `type` に、リポジトリで有効なType名を一つ指定し、`labels` に登録済みの日本語ラベル名を指定しています。選んだフォームに応じて作成時に付きます。内容が分類に合わないときは、運営が確認して付け替えてください。

TypeはGitHubで既に有効な `Task`・`Bug`・`Feature` を使用し、フォームとREADMEに日本語の意味を添えています。アカウント共通のType名は変更していません。

`同じ依頼あり`・`内容の確認が必要`・`今回は対応しない` は、運営が確認したあとに付けます。`お手伝い募集`・`初めての作業向け` も、作業内容に合わせて運営が判断します。

フォームはmainへのマージ後に有効になります。既存のIssueのTypeやラベルは変わりません。Type名やラベル名を変更した場合は、各フォームの `type`・`labels` も同じ名前に揃えてください。[GitHubの公式説明](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms)

## 最初の接続設定

GitHubの **Settings → Environments** で、先に公開環境を保護します。

1. `preview` の **Required reviewers** に `morikyun` を登録します。本人が承認できるよう **Prevent self-review** はオフにします。
2. `production` の **Deployment branches and tags** は、種類 **Branch**・名前 `main` のみを許可します。全ブランチや同名のタグを許可しないでください。
3. `preview` と `production` のそれぞれの **Environment secrets** に、次の2項目を登録します。

- `CLOUDFLARE_ACCOUNT_ID`：現在のPagesプロジェクトが属するアカウントID。
- `CLOUDFLARE_API_TOKEN`：そのアカウントに対する **Account → Cloudflare Pages → Edit** のAPIトークン。

Cloudflareトークンは、対象アカウントだけに権限を限定します。YouTube APIキーとは別のものです。チャット、Issue、PR、ソースファイルには書かず、GitHubのSecret欄に直接登録してください。

既存設定から移す場合は、両環境への登録を確認してから、**Settings → Secrets and variables → Actions** の同名の **Repository secrets** を削除します。Repository secretsが残っていると、環境の指定を外したワークフローからも参照できるため、承認待ちだけでは対策になりません。GitHubに保存済みの値は読み戻せません。保管している元の値を使用するか、同じ権限のトークンを再発行して登録し、切り替え後に旧トークンを無効にします。

Secretを使用できるのは、環境の保護条件を満たしたジョブだけです。プレビュー承認後はPRの処理がトークンを使用するため、承認前の差分確認を省略しないでください。[GitHubの環境・Secretの説明](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)

Cloudflare側の `YOUTUBE_API_KEY` と `YOUTUBE_CACHE` は既存のProduction設定を使います。GitHubへの複製は不要です。Previewには本番のYouTubeキー・KVを追加せず、公式動画の検索回数を増やさない構成です。

Secret登録後、必要なら最初のPRのActionsで **Re-run failed jobs** を実行します。プレビューの承認後に **Build and test** と **Deploy preview** が成功してからマージします。承認待ちはエラーではありません。Secret未登録で失敗した場合は、保護設定を外さず、Environment secretsを確認してください。

## 公開先と保護設定

- Cloudflare Pagesプロジェクト：`toma-oshikatsubu`。新しいPagesプロジェクトは作成しません。
- GitHubの本番ブランチ：`main`。
- Pages側の本番ブランチ名は毎回APIから取得します。既存の設定を書き換えません。
- プレビューのブランチ名：`pr-<PR番号>`。本番と同じ名前になったら公開を止めます。
- 公開前に、既存プロジェクト・本番のYouTubeキー・KVの存在を確認します。
- mainはPR経由、**Build and test / Deploy preview** を必須とし、管理者にも適用します。直接push・強制push・削除を許可しません。
- マージ方法はSquash、マージ後に作業ブランチを自動削除します。
- GitHubのProduction environmentはmainのみを対象とします。
- 公開用のSecretは環境ごとに保存し、Repository secretsには置きません。Preview environmentにはmorikyunの承認を必須にします。

本番への反映後も、Cloudflare側の動画・ブログ・予定の自動取得とキャッシュ間隔は変わりません。

## リンク変更の確認

投稿者のGitHubアカウント名だけでは本人確認になりません。紹介文やリンクの変更は、Messengerなど既知の連絡先、または確認済みの公式情報で確かめてから承認します。公開Issueに個人の連絡先を書いてもらう必要はありません。

`npm run check` は、入部・お問い合わせフォームと `content/site.json` の案内先を承認済みURLと照合します。同じGoogleフォームやFormzu内の別フォームへの差し替えも止めます。ファンのチャンネルは `https://www.youtube.com` の登録ID・ハンドルに一致するURLだけを許可します。正規の移転の場合は、運営者の明示的な確認のもとで `scripts/trusted-links.mjs` の承認済みURLも更新してください。この検査は差分確認を補助するもので、検査ファイルまで変更できる人へのアクセス制御ではありません。

## 個人情報を公開Issueに書かれたとき

本文の編集だけでは過去の内容が編集履歴に残ります。運営者が **edited → Options → Delete revision from history** で該当する版を削除するか、必要に応じてIssue自体を削除してください。画像やキャッシュにも残っている場合は、GitHub Supportに削除を相談します。GitHub外に保存されたコピーまでは削除できません。相談の続きは既存のお問い合わせフォームなど、非公開の窓口へ案内します。[GitHubの編集履歴の説明](https://docs.github.com/ja/enterprise-cloud%40latest/communities/moderating-comments-and-conversations/tracking-changes-in-a-comment)

## コミットのメールアドレス

GitHubの **Settings → Emails** で **Keep my email addresses private** と **Block command line pushes that expose my email** を有効にします。手元のGitにも、GitHubが表示する `users.noreply.github.com` のアドレスを設定してください。今後のコミットに適用され、過去の公開履歴は変わりません。メールを消す目的だけの履歴の書き換えや強制pushは行いません。

## 手元で直す

Node.js 24（GitHub Actionsと同じバージョン）を推奨します。

```sh
npm ci
npm run build
npm run check
npm test
```

日本語本文を変えた場合は `npm run i18n:sync` の後に英語・簡体字・繁体字を揃えてください。`research/i18n-pending.json` はローカルで自動作成されます。

`dist/`、ZIP、`research/`、`.env*`、認証情報、Wranglerの設定はGit管理対象外です。緊急時のZIPは `npm run package` で作成できますが、通常の修正はPRから公開します。

## 戻したいとき

通常は対象PRを打ち消すRevert PRを作り、確認してマージします。緊急時はCloudflareのDeploymentsから以前の成功した本番デプロイへ戻せます。その場合も、あとでGitHub側に修正PRを作り、本番とソースを揃えてください。

参照：[CloudflareのGitHub Actions連携](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)、[Direct Uploadの仕様](https://developers.cloudflare.com/pages/get-started/direct-upload/)。
