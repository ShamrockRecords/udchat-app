var express = require('express');
let admin = require('firebase-admin');
let firebaseSession = require('../models/firebase_session.js') ;
var router = express.Router() ;

router.get('/', async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (result != 0) {
        res.render('about', {
            lang: res.locale,
            isAlreadySignIn: false
        });
    } else {
        res.render('about', {
            lang: res.locale,
            isAlreadySignIn: true
        });	
    }	 
}) ;

module.exports = router;