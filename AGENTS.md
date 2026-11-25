# このサイトを修正する際のルール

- Issueに沿って作業用ブランチで修正し、PRを作成する。mainへの直接push、本番公開、PRのマージは行わない。最終確認・マージは運営者のmorikyunが行う。
- 本番は https://toma-oshikatsubu.pages.dev/ 。公開先を変更せず、既存のCloudflare Pages設定・YOUTUBE_API_KEY・YOUTUBE_CACHEを維持する。wrangler設定ファイルを追加してダッシュボード設定を上書きしない。
- `npm ci` → `npm run build` → `npm run check` → `npm test` で確認する。生成物のdistは編集・コミットしない。
- 日本語本文を修正したら `npm run i18n:sync` で対照表を更新し、英語・簡体字・繁体字の訳も揃える。未訳のまま公開しない。
- 人名・作品名、公開動画・記事の原題は既存方針を維持する。動画・ブログ・予定の自動更新間隔、ショート除外、日付の日本時間判定を保持する。
- 元資料・個人の連絡先・認証情報・research・ZIP・ローカルの絶対パスをGitHubに追加しない。
- PRでは修正の目的、変更後の動作、検証結果を日本語で簡潔に説明し、Issueと関連付ける。APIキーやトークンを本文に書かない。
