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

firebase adminとfirestoreの初期化で使用する値を環境変数にいれます。

firebase adminはjsonファイルでダウンロードしたもの開いて

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
に入力。

firestoreは発行されたコードの中身を

```
FIREBAE_API_KEY = ""
FIREBASE_AUTH_DOMAIN = ""
FIREBASE_PROJECT_ID = ""
FIREBASE_STORAGE_BUCKET = ""
FIREBASE_MESSAGING_SENDER_ID = ""
FIREBASE_APP_ID = ""
MEASUREMENT_ID = ""
```
に入力。

`ROOT_URL = "http://localhost:3000"`

ここには動作させるドメインを入力してください。Heroku等で動かす場合はこれらをインスタンスの環境編集に登録してください。認証情報になりますので、公開リポジトリには含めないように注意してください。


