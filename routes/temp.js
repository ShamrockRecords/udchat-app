var express = require('express');
let firebaseSession = require('../models/firebase_session.js') ;
var router = express.Router() ;

router.get('/', async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (!result) {
        res.redirect('/signin');
        return ;
    }

    res.render('temp', {});		 
}) ;

module.exports = router;