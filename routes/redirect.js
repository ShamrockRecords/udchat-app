var express = require('express');
let admin = require('firebase-admin');
let firebaseSession = require('../models/firebase_session.js') ;
var router = express.Router() ;
var fetch = require('node-fetch') ;
let Base64 = require('js-base64');

router.get('/', async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (!result) {
        res.redirect('/signin');
        return ;
    }

    let token = Base64.encode('RjVhuFOlQ5C5TBe_eraM_A' + ':' + process.env.ZOOM_CLIENT_SECRET);
    
    let URL = "https://zoom.us/oauth/token?grant_type=authorization_code&code={" + req.query.code + "}&redirect_uri=$Redirect_URL" ;

    let data = await fetch(URL, {
        method: "POST",
        headers: {'authorization': 'Bearer: ' + token}}).then(response => response.json()) ;

    res.write(JSON.stringify(data)) ;
    res.end() ;	 
}) ;

module.exports = router;