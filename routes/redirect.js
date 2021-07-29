var express = require('express');
let admin = require('firebase-admin');
let firebaseSession = require('../models/firebase_session.js') ;
var router = express.Router() ;
var fetch = require('node-fetch') ;
let Base64 = require('js-base64');

const wrap = fn => (...args) => fn(...args).catch(args[2]) ;

router.get('/', wrap(async function(req, res, next) {
    res.redirect('/signin');
    
    /*
    let result = await firebaseSession.enter(req, res) ;

    if (result != 0) {
        res.redirect('/signin');
        return ;
    }

    let token = Base64.encode('RjVhuFOlQ5C5TBe_eraM_A' + ':' + process.env.CLIENT_SECRET);
    
    let URL = "https://zoom.us/oauth/token?grant_type=authorization_code&code=" + req.query.code + "&redirect_uri=" + "https%3A%2F%2Fudchat-staging.herokuapp.com%2Fredirect" ;

    let data = await fetch(URL, {
        method: "POST",
        headers: {'authorization': 'Basic ' + token}}).then(response => response.json()) ;

    res.write(JSON.stringify(data)) ;
    res.end() ;	 
    */
})) ;

module.exports = router;