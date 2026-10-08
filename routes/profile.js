var express = require('express');
let admin = require('firebase-admin');
let firebaseSession = require('../models/firebase_session.js') ;
var router = express.Router() ;

const wrap = fn => (...args) => fn(...args).catch(args[2]) ;

router.get('/', wrap(async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (!result) {
        res.redirect('/signin');
        return ;
    }

    let currentUser = req.user ;

    let doc = await admin.firestore().collection("users").doc(currentUser.uid).get() ;

    let data = {
        genderType: -1,
        userType: -1,
    } ;

    if (doc.data() != null) {
        data = doc.data() ;
    }

    let errorMessage = req.session.errorMessage ;

    delete req.session.errorMessage ;
    
    res.render('profile', {
        lang: res.locale,
        email: currentUser.email,
        data: data,
        errorMessage: errorMessage,
    });	 
})) ;

router.post('/update', wrap(async function(req, res, next) {
    if (!await firebaseSession.enter(req, res)) return res.redirect('/signin');
    let user = req.user;
    let data = { name: require('../models/security').textField(req.body.name, 100, true) };

    try {
        await admin.firestore().collection("users").doc(user.uid).update(data) ;
    } catch (error) {
        req.session.errorMessage = error.message ;
    }

    res.redirect('/') ;
})) ;



module.exports = router;