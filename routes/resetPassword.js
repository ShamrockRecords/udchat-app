var express = require('express');
let firebaseSession = require('../models/firebase_session.js') ;
var router = express.Router() ;

router.get('/', async function(req, res, next) {
    res.render('resetPassword', {
        lang: res.locale,
        errorMessage: '',
    });
}) ;

router.post('/', async function(req, res, next) {
    firebaseSession.resetPassword(req.body.email) ;

    res.redirect('/') ;
}) ;

module.exports = router;