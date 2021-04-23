var express = require('express');
let admin = require('firebase-admin');
let firebaseSession = require('../models/firebase_session.js') ;
var router = express.Router() ;

router.post('/', async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (!result) {
        res.redirect('/signin');
        return ;
    }

    res.write(JSON.stringify(req.body)) ;
    res.write(JSON.stringify(req.query)) ;
    res.end() ;	 
}) ;

module.exports = router;