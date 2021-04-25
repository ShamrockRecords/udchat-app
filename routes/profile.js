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

    let currentUser = req.session.user ;

    let doc = await admin.firestore().collection("users").doc(currentUser.uid).get() ;

    let data = {
        genderType: -1,
        userType: -1,
    } ;

    if (doc.data() != null) {
        data = doc.data() ;
    }

    errorMessage = req.session.errorMessage ;

    delete req.session.errorMessage ;
    
    res.render('profile', {
        lang: res.locale,
        email: currentUser.email,
        data: data,
        errorMessage: errorMessage,
    });	 
})) ;

router.post('/update', wrap(async function(req, res, next) {
    let user = req.session.user ;
    let data = {} ;

    for (let key in req.body) {
        data[key] = req.body[key] ;
    }

    try {
        await admin.firestore().collection("users").doc(user.uid).update(data) ;
    } catch (error) {
        req.session.errorMessage = error.message ;
    }

    res.redirect('/') ;
})) ;

router.post('/picture', wrap(async function(req, res, next) {

})) ;

module.exports = router;