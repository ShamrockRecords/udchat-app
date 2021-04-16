# UDChat - Group text chat with automatic translation

## How to run
1. Install Node.js

2. npm install

After "git clone" to repository, run command "npm install".

3. Make ".env" file and put at project root

Put ".env fime" at project root after copying below.

```
ROOT_URL = "http://localhost:3000"

FIREBASE_API_KEY = ""
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
### Accessing to firestore

Copy values to enviroment values from code in order to accessing firestore.

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
"xxxxx" is value, copy to here.
```
FIREBASE_API_KEY = "xxxxx"
FIREBASE_AUTH_DOMAIN = "xxxxx"
FIREBASE_PROJECT_ID = "xxxxx"
FIREBASE_STORAGE_BUCKET = "xxxxx"
FIREBASE_MESSAGING_SENDER_ID = "xxxxx"
FIREBASE_APP_ID = "xxxxx"
MEASUREMENT_ID = "xxxxx"
```

Like this.

You might have some error messages in local running form firebase. In this case, make index in firestore console. You might see the URL for making index from the error message.

### Accessing to Google Translate API

Publish API key from Google Cloud console. If this key is empty, UD Chat can run without translation feature.
You must attach HTTP Referrer limitations to API key.

`GOOGLE_CLOUD_TRANSLATION_API_KEY = ""`

### Accessing to firebase admin

Download service account secret key from firebase console,  and copy values to each keys in ".env" file.

In the firebase console, set enalbe "Email / Password" at Authentication > Sign-in method.

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

### Running domain

Set your running domain.

`ROOT_URL = "http://localhost:3000"`

If you want to run UD Chat such as "Heroku" or other hosting services, set them to environment values. ".env" is authentication infomation. You should not add to repository.

Notes: If you set environment key "FIREBASE_ADMINSDK_private_key" at Heroku, you have to replace "\n" letters to "\n" control letters.



