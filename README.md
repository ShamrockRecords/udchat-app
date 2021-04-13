# udchat-app

## 動かし方
1. npm install


2. .envを作成してプロジェクト直下に配置

以下の内容をコピーしてプロジェクトのルートフォルダに.envファイルを作成してください。

```
ROOT_URL = "http://localhost:3000"

FIREBAE_API_KEY = ""
FIREBASE_AUTH_DOMAIN = ""
FIREBASE_PROJECT_ID = ""
FIREBASE_STORAGE_BUCKET = ""
FIREBASE_MESSAGING_SENDER_ID = ""
FIREBASE_APP_ID = ""
MEASUREMENT_ID = ""

GOOGLE_CLOUD_TRANSLATION_API_KEY = ""

FIREBASE_ADMINSDK_type = ""
FIREBASE_ADMINSDK_project_id = ""
FIREBASE_ADMINSDK_private_key_id = ""
FIREBASE_ADMINSDK_private_key = ""
FIREBASE_ADMINSDK_client_email = ""
FIREBASE_ADMINSDK_client_id = ""
FIREBASE_ADMINSDK_auth_uri = ""
FIREBASE_ADMINSDK_token_uri = ""
FIREBASE_ADMINSDK_auth_provider_x509_cert_url = ""
FIREBASE_ADMINSDK_client_x509_cert_url = ""
```
### firestoreへのアクセス

firestoreへのアクセス用に発行されたコードを環境変数に移してください。

```
var firebaseConfig = {
    apiKey: "xxxxx,
    authDomain: "xxxxx",
    projectId: "xxxxx",
    storageBucket: "xxxxx",
    messagingSenderId: "xxxxx",
    appId: "xxxxx",
    measurementId: "xxxxx"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  firebase.analytics();
```

```
FIREBAE_API_KEY = "xxxxx"
FIREBASE_AUTH_DOMAIN = "xxxxx"
FIREBASE_PROJECT_ID = "xxxxx"
FIREBASE_STORAGE_BUCKET = "xxxxx"
FIREBASE_MESSAGING_SENDER_ID = "xxxxx"
FIREBASE_APP_ID = "xxxxx"
MEASUREMENT_ID = "xxxxx"
```
ローカルで動作させるとfirestoreのインデックスを作成するアラートがでるのでエラーメッセージのURLから作成してください。

### Google Translate APIへのアクセス

Google CloudコンソールでGoogle Translate APIのAPIキーを発行してください。""のままだと翻訳機能なしで動作します。

`GOOGLE_CLOUD_TRANSLATION_API_KEY = ""`

### firebase adminへのアクセス

firebase adminはサービス アカウントで発行した秘密鍵情報のjsonファイルをダウンロードして入力してください。
AuthenticationのSign-in methodで「メール／パスワード」を有効にしてください。

```
FIREBASE_ADMINSDK_type = ""
FIREBASE_ADMINSDK_project_id = ""
FIREBASE_ADMINSDK_private_key_id = ""
FIREBASE_ADMINSDK_private_key = ""
FIREBASE_ADMINSDK_client_email = ""
FIREBASE_ADMINSDK_client_id = ""
FIREBASE_ADMINSDK_auth_uri = ""
FIREBASE_ADMINSDK_token_uri = ""
FIREBASE_ADMINSDK_auth_provider_x509_cert_url = ""
FIREBASE_ADMINSDK_client_x509_cert_url = ""
```

### 動作させるドメイン

動作させるドメインを入力してください。

`ROOT_URL = "http://localhost:3000"`

Heroku等で動かす場合はこれらをインスタンスの環境編集に登録してください。認証情報になりますので、公開リポジトリには含めないように注意してください。




