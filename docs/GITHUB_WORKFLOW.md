# Issueから確認・公開まで

公開サイト：https://toma-oshikatsubu.pages.dev/

ソースと修正依頼：https://github.com/morikyun/toma-oshikatsubu

一般の方への登録案内は [READMEの上部](../README.md) にあります。このページは、依頼を受けた運営者向けの手順です。

翻訳・自動更新・各ファイルの役割など、制作時の詳細は [サイトの制作・運営資料](SITE_MAINTENANCE.md) を参照してください。

## 普段の運用

1. **Issues → New issue** で、文章の修正・新しいページ・不具合・見やすさや使いやすさ・機能の追加・質問相談の6種類から選んで登録してもらいます。選んだフォームに合ったTypeとラベルが自動で付きます。迷っている方には「質問・相談したい」を案内します。
2. 運営者が依頼の内容を確認し、Codexに「このIssueに対応してPRを作って」とIssueのURLを渡します。依頼した一般の方がCodexを操作する必要はありません。Issue登録だけでAIが自動着手する設定ではありません。
3. 作業用ブランチからPRを作ると、4言語のページ生成、内部リンク、自動テストが実行されます。同じリポジトリのブランチなら確認用サイトも作られます。
4. PRの **View deployment** またはActionsの **Deploy preview** から確認用サイトを開きます。プレビューではYouTube APIのキーを設定しないため、公式動画・配信予定は保存済み情報の表示になります。RSSなどキー不要の機能は動作します。
5. 問題がなければmorikyunが **Squash and merge → Confirm squash and merge** を押します。この操作を運営者の承認とします。
6. 再度チェックが成功すると、今のCloudflare Pagesへ自動公開されます。失敗した場合はActionsで原因を確認し、修正PRまたは該当ジョブの再実行で対応します。

PRの作成者と確認者が同じGitHubアカウントになる場合があるため、別人による「Approve」を必須にはしていません。mainへの変更にはPRとチェック成功が必要です。公開処理でも、morikyunがマージしたPRと実行対象のコミットが一致することを確認します。CodexはPRを作るところまでを担当します。

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

GitHubの **Settings → Secrets and variables → Actions** に次のRepository secretsを登録します。

- `CLOUDFLARE_ACCOUNT_ID`：現在のPagesプロジェクトが属するアカウントID。
- `CLOUDFLARE_API_TOKEN`：そのアカウントに対する **Account → Cloudflare Pages → Edit** のAPIトークン。

Cloudflareトークンは、対象アカウントだけに権限を限定します。YouTube APIキーとは別のものです。チャット、Issue、PR、ソースファイルには書かず、GitHubのSecret欄に直接登録してください。

Cloudflare側の `YOUTUBE_API_KEY` と `YOUTUBE_CACHE` は既存のProduction設定を使います。GitHubへの複製は不要です。Previewには本番のYouTubeキー・KVを追加せず、公式動画の検索回数を増やさない構成です。

Secret登録後、最初のPRのActionsで **Re-run failed jobs** を実行し、**Build and test** と **Deploy preview** が成功してからマージします。Secret未登録の間はプレビューが失敗し、マージできません。

## 公開先と保護設定

- Cloudflare Pagesプロジェクト：`toma-oshikatsubu`。新しいPagesプロジェクトは作成しません。
- GitHubの本番ブランチ：`main`。
- Pages側の本番ブランチ名は毎回APIから取得します。既存の設定を書き換えません。
- プレビューのブランチ名：`pr-<PR番号>`。本番と同じ名前になったら公開を止めます。
- 公開前に、既存プロジェクト・本番のYouTubeキー・KVの存在を確認します。
- mainはPR経由、**Build and test / Deploy preview** を必須とし、管理者にも適用します。直接push・強制push・削除を許可しません。
- マージ方法はSquash、マージ後に作業ブランチを自動削除します。
- GitHubのProduction environmentはmainのみを対象とします。

本番への反映後も、Cloudflare側の動画・ブログ・予定の自動取得とキャッシュ間隔は変わりません。

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
