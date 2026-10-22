# UDChat - 自動翻訳機能付きグループチャット

公式サイト: https://chat.udtalk.jp

Express / EJS / Socket.IO と Firebase Authentication / Firestore を使ったアプリです。画面のビルド工程はありません。

## ローカルで動かす

Node.js **24.22.1 以降の24系**、npm **11.x** を使用します。nvm を使う場合は `nvm install` / `nvm use` で `.nvmrc` の修正版に切り替えます。`.npmrc` の `engine-strict` により、条件を満たさない Node.js での依存インストールを拒否します。

[2026年10月の Node.js セキュリティ告知](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)に合わせ、`package.json` の最低バージョン、`.nvmrc`、CI を更新しています。今回の検証環境は Node.js **24.22.1** / npm **11.21.1** です。

```sh
npm ci
cp .env.example .env
# .env に Firebase の設定を入力
npm start
```

`http://localhost:3000` を開きます。既存の `.env` がある場合はコピーで上書きせず、必要な設定だけ追加してください。

```sh
npm run check  # JavaScript と EJS の構文確認
npm test       # テスト用 Firebase データで HTTP / Socket.IO / 終了処理を検証
npm audit      # 間接依存を含む脆弱性の確認
```

テストは本番の Firebase、翻訳 API、Heroku にアクセスしません。実際のメール配信、SNS 認証、Firestore の権限・インデックス、翻訳はステージングで確認してください。

## 環境変数

設定例は [.env.example](.env.example) にあります。秘密鍵と `.env` はリポジトリへ追加しないでください。

| 変数 | 用途 |
| --- | --- |
| `NODE_ENV` | Heroku では `production`、ローカルでは `development` |
| `ROOT_URL` | 公開 URL。本番は HTTPS 必須。共有リンク・QR コード・ブラウザのチャット接続元検証に使用 |
| `PORT` | ローカルの既定値は 3000。Heroku ではプラットフォームが設定 |
| `SESSION_SECRET` | 32 バイト以上の固定のランダムな文字列。本番では必須 |
| `FIREBASE_API_KEY` | サーバーから Firebase Authentication REST API を呼ぶキー |
| `FIREBASE_AUTH_DOMAIN` | Firebase の認証ドメイン |
| `FIREBASE_PROJECT_ID` / `FIREBASE_APP_ID` | ブラウザ側 Firebase のプロジェクト設定 |
| `FIREBASE_ADMINSDK_project_id` | サービスアカウントのプロジェクト ID |
| `FIREBASE_ADMINSDK_client_email` | サービスアカウントのメールアドレス |
| `FIREBASE_ADMINSDK_private_key` | サービスアカウントの秘密鍵。実改行と文字列 `\n` の両方に対応 |
| `OPENED_FIREBASE_API_KEY` | 任意。Facebook / X (Twitter) ログイン用のブラウザ公開キー |
| `GOOGLE_CLOUD_TRANSLATION_API_KEY` | 任意。空欄なら翻訳なしで動作 |

`SESSION_SECRET` はパスワード管理ツール等で生成したランダム値を保存してください。開発環境で省略すると起動ごとに一時値を生成します。本番では省略・短すぎる値を検出して起動を止めます。

Firebase Authentication の「メール / パスワード」を有効にします。SNS ログインを使う場合は Facebook / Twitter のプロバイダ設定と Firebase の承認済みドメインも確認してください。SNS 認証は Firebase のポップアップ認証を使用します。

ブラウザに公開する2つのキーは HTTP リファラーと必要な API に制限してください。`FIREBASE_API_KEY` はサーバー用なので、ブラウザの HTTP リファラー制限付きキーと兼用しないでください。サービスアカウントには既存の Authentication / Firestore 操作に必要な権限が必要です。

以前の `FIREBASE_STORAGE_BUCKET`、`FIREBASE_MESSAGING_SENDER_ID`、`MEASUREMENT_ID`、サービスアカウントのその他メタデータは現在のコードでは参照しません。既存設定に残っていても動作に影響しません。

## Heroku へ反映するとき

1. ステージングで既存の Firebase 設定と、`NODE_ENV=production`、HTTPS の `ROOT_URL`、固定の `SESSION_SECRET` を Config Vars に設定します。`PORT` は手動設定しません。
2. Node.js buildpack と、この Node.js に対応するサポート中の Heroku stack を確認します。起動は `Procfile` の `web: node ./bin/www` です。
3. `npm ci`、`npm run check`、`npm test`、`npm audit` を実行してから再ビルド・デプロイします。**dyno の再起動だけでは Node.js は更新されません。** ビルドログと `heroku run --no-tty --app <app-name> 'node --version'` で 24.22.1 以降の24系になったことを確認します。
4. `/healthz` の 200 応答、メールログイン・新規登録・確認メール・パスワード再設定、SNS ログイン、チャット作成・編集・削除を確認します。
5. ゲストのパスコード参加、2画面間の送受信、翻訳あり / なし、CSV 保存、再起動後の再接続を確認してから本番に反映します。

`/healthz` はプロセスの生存確認です。Firebase の疎通を保証するものではありません。

### セッションとプロセス数

認証は Firebase の署名付きセッション Cookie（HttpOnly / Secure / SameSite=Lax、有効期限14日）で検証します。言語と CSRF トークンは小さな署名付き Cookie に保存し、認証情報やパスコードは保存しません。従来の MemoryStore を使わないため、安定した `SESSION_SECRET` があれば dyno 再起動後も設定を維持できます。Cookie の内容は暗号化されないため、機密情報を追加しないでください。

現在の Socket.IO のルーム・在室情報と試行回数制限は1プロセス内で管理します。**web dyno 1台・Node.js 1プロセス**で運用してください。複数 dyno / cluster に増やす場合は Socket.IO の共有アダプタ、HTTP long-polling 用のセッション固定、共有の試行回数ストアが必要です。追加サービスを導入せずにプロセス数だけ増やすと参加者間の配信が分断されます。

チャット接続用トークンはパスコード確認後に発行し、14時間有効です。送信していない接続も期限で切断します。アプリからのパスコード変更・削除は、接続済みの参加者にも直ちに反映します。パスコードを変更前の値に戻しても古いトークンは復活しません。名前だけの編集では切断しません。失効時はチャットを開き直してください。トークン署名の更新に伴い、デプロイ前から開いていた画面は再読み込みが必要です。

ブラウザからの Socket.IO 接続は `ROOT_URL` と同じ Origin のみ許可します。Origin のない非ブラウザ接続にも署名付きトークンが必要です。別の公開ドメインや `localhost` と `127.0.0.1` の混在では接続できないため、実際に開く URL に `ROOT_URL` を合わせてください。新規登録・パスワード再設定のメール送信は、成功を含め IP ごとに合計30回 / 15分に制限します。

Heroku からの `SIGTERM` では新規のチャット処理を止め、進行中の処理を待って接続を閉じます。25秒を超えた場合は終了します。

## データと更新方針

既存の `users`、`chats`、`chat/{chatId}/messages` を引き継ぎます。パスコード変更時は `chats` に失効管理用の `accessRevision` を保存します。既存データの事前移行は不要です。チャット削除は従来どおり `chats` のメタデータのみを削除し、メッセージ履歴の一括削除や保存期限の変更は行いません。保存容量の削減には別途、履歴の保持方針を決めてください。

Firestore のインデックス・ルールはこのリポジトリに含まれていません。クエリのインデックス不足が出た場合はステージングで確認し、Firebase コンソールの案内に従って作成してください。

2026-10-22 の読み取り確認では、本番 `udchat-4ae66` の Firestore ルールは全ドキュメントについてクライアントの読み書きを禁止していました。管理 SDK はルールではなく IAM でアクセスするため、サーバーの所有者・パスコード検証も維持する必要があります。Firebase コンソールで直接パスコードを変更・削除する場合はアプリの即時切断処理を通らないため、既存接続を切るにはアプリの再起動も必要です。

2026-10-22 の更新では Express **5.3.0** / EJS **7.0.2** / dotenv **18.0.8** / Firebase Admin **14.5.0** と間接依存を更新しました。Firebase Admin は廃止された名前空間 API から `firebase-admin/app` / `auth` / `firestore` へ移行し、不要になった旧 SDK 用の `uuid` 上書き指定を削除しています。

画面側はサポート終了済みの Bootstrap 4 から **5.3.8**、jQuery **4.0.0**、Firebase JS **13.1.0** へ更新しました。CDN のスクリプト・スタイルはバージョンと SRI ハッシュを固定しています。Bootstrap の属性・クラスと jQuery のイベント登録を新 API に合わせています。音声入力の連続投稿や既存のデザインは維持します。

GitHub Actions でも `.nvmrc` の Node.js で構文確認・回帰テスト・開発依存を含む監査を実行し、low 以上の既知の脆弱性を検出すると失敗します。監査の0件は、アプリやクラウド設定を含めた安全性の保証ではありません。

参考: [Heroku の Node.js サポート](https://devcenter.heroku.com/articles/nodejs-support)、[Heroku の終了処理](https://devcenter.heroku.com/articles/dyno-shutdown-behavior)、[Firebase のセッション Cookie](https://firebase.google.com/docs/auth/admin/manage-cookies)、[Firebase Authentication REST API](https://firebase.google.com/docs/reference/rest/auth)。
