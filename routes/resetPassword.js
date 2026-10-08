var express = require('express');
let firebaseSession = require('../models/firebase_session.js') ;
var router = express.Router() ;

router.get('/', async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (result) {
        res.redirect('/');
        return ;
    }
    
    res.render('resetPassword', {
        lang: res.locale,
        errorMessage: '',
    });
}) ;

router.post('/', async function(req, res, next) {
    try {
        await firebaseSession.resetPassword(req.body.email);
    } catch {
        return res.status(400).render('resetPassword', { lang: res.locale, errorMessage: 'Please check your email address and try again.' });
    }

    res.redirect('/') ;
}) ;

module.exports = router;