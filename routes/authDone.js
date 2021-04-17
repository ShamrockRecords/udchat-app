var express = require('express');
var router = express.Router() ;

router.get('/', async function(req, res, next) {
    var config = {
        apiKey: process.env.OPENED_FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.MEASUREMENT_ID
    };

    res.render('authDone', {config: config});		 
}) ;

module.exports = router;