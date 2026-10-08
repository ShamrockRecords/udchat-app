# UDChat - 自動翻訳機能付きグループチャット

公式サイト: https://chat.udtalk.jp

Express / EJS / Socket.IO と Firebase Authentication / Firestore を使ったアプリです。画面のビルド工程はありません。

## ローカルで動かす

Node.js **24.x**、npm **11.x** を使用します。nvm を使う場合は `nvm use` で `.nvmrc` の指定に切り替えられます。

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
| `ROOT_URL` | 公開 URL。本番は HTTPS 必須。共有リンクと QR コードに使用 |
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
3. `npm ci`、`npm run check`、`npm test`、`npm audit` を実行してからデプロイします。
4. `/healthz` の 200 応答、メールログイン・新規登録・確認メール・パスワード再設定、SNS ログイン、チャット作成・編集・削除を確認します。
5. ゲストのパスコード参加、2画面間の送受信、翻訳あり / なし、CSV 保存、再起動後の再接続を確認してから本番に反映します。

`/healthz` はプロセスの生存確認です。Firebase の疎通を保証するものではありません。

### セッションとプロセス数

認証は Firebase の署名付きセッション Cookie（HttpOnly / Secure / SameSite=Lax、有効期限14日）で検証します。言語と CSRF トークンは小さな署名付き Cookie に保存し、認証情報やパスコードは保存しません。従来の MemoryStore を使わないため、安定した `SESSION_SECRET` があれば dyno 再起動後も設定を維持できます。Cookie の内容は暗号化されないため、機密情報を追加しないでください。

現在の Socket.IO のルーム・在室情報と試行回数制限は1プロセス内で管理します。**web dyno 1台・Node.js 1プロセス**で運用してください。複数 dyno / cluster に増やす場合は Socket.IO の共有アダプタ、HTTP long-polling 用のセッション固定、共有の試行回数ストアが必要です。追加サービスを導入せずにプロセス数だけ増やすと参加者間の配信が分断されます。

チャット接続用トークンはパスコード確認後に発行し、14時間有効です。失効時はチャットを開き直します。パスコード変更・削除は次の接続時に反映します。デプロイ前から開いていた画面は再読み込みしてください。

Heroku からの `SIGTERM` では新規のチャット処理を止め、進行中の処理を待って接続を閉じます。25秒を超えた場合は終了します。

## データと更新方針

既存の `users`、`chats`、`chat/{chatId}/messages` の保存形式を引き継ぎます。チャット削除は従来どおり `chats` のメタデータのみを削除し、メッセージ履歴の一括削除や保存期限の変更は行いません。保存容量の削減には別途、履歴の保持方針を決めてください。

Firestore のインデックス・ルールはこのリポジトリに含まれていません。クエリのインデックス不足が出た場合はステージングで確認し、Firebase コンソールの案内に従って作成してください。

2026-10 の保守更新では Express 5 / Firebase Admin 13 / Socket.IO 4 に更新しました。EJS は既存テンプレートと互換性のある修正済み3系、Bootstrap は既存画面に合わせた4.6.2を使用します。jQuery UI、旧 FirebaseUI、サーバー側 Firebase クライアント、node-fetch、node-uuid、未使用の js-base64 を除去しました。Google SDK 内の `uuid` は v4 の呼び出し互換性を確認して修正版11系を `overrides` で指定しています。上流が対応したらこの指定を見直してください。

GitHub Actions でも Node.js 24 で構文確認・回帰テスト・本番依存の監査を実行します。

参考: [Heroku の Node.js サポート](https://devcenter.heroku.com/articles/nodejs-support)、[Heroku の終了処理](https://devcenter.heroku.com/articles/dyno-shutdown-behavior)、[Firebase のセッション Cookie](https://firebase.google.com/docs/auth/admin/manage-cookies)、[Firebase Authentication REST API](https://firebase.google.com/docs/reference/rest/auth)。
