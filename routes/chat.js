var express = require('express');
let admin = require('firebase-admin');
let firebaseSession = require('../models/firebase_session.js') ;
var router = express.Router() ;
const uuid = require('node-uuid');

const wrap = fn => (...args) => fn(...args).catch(args[2]) ;

router.get('/', wrap(async function(req, res, next) {
    let chatId = req.query.chatId ;   
    let currentUser = req.session.user ;
    let uid = currentUser != undefined ? currentUser.uid : null ;
    let data = null ;

    {
        let doc = await admin.firestore().collection("chats").doc(chatId).get() ;
        data = doc.data() ;
    }

    if (data == null) {
        res.redirect('/');
        return ;
    }

    let name = null ;
    let isAlreadySignIn = false ;

    if (currentUser != undefined) {
        let doc = await admin.firestore().collection("users").doc(currentUser.uid).get() ;
        let userProfile = doc.data() ;

        if (userProfile != null) {
            name = userProfile.name ;
            isAlreadySignIn = true ;
        }
    }

    // If chat has unique displayed name, it's used.
    if (data.ownerUid == uid && (data.displayName != undefined && data.displayName != '')) {
        name = data.displayName ;
    }

    if (req.session.displayName != undefined) {
        name = req.session.displayName ;
        delete req.session.displayName ;
    }

    if ((data.passcode != '' && data.ownerUid != uid) || name == null) {
        if (req.session.passcode != data.passcode) {
            res.render('passcode', {
                lang: res.locale,
                title: data.name,
                displayName: name != null ? name : '',
                isAlreadySignIn: isAlreadySignIn,
                isNeedPasscode: (data.passcode != ''),
                chatId: chatId,
            });		 

            return ;
        }
    }

    delete req.session.passcode ;

    if (uid == null) {
        uid = uuid.v4() ;
    }

    res.render('chat', {
        lang: res.locale,
        title: data.name,
        name: name,
        requestId: chatId,
        uid: uid,
        rootURL: process.env.ROOT_URL,
        isAlreadySignIn: isAlreadySignIn,
        apiKey: process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY,
    });		 
})) ;

router.post('/passcode', wrap(async function(req, res, next) {
    let chatId = req.body.chatId ;

    /*
    let result = await firebaseSession.enter(req, res) ;
    
    if (result != 0) {
        if (chatId != undefined) {
            res.redirect('/signin?chatId=' + chatId);
        } else {
            res.redirect('/signin');
        }
        return ;
    }
    */

    let passcode = req.body.passcode ;
    let displayName = req.body.displayName ;

    req.session.passcode = passcode ;
    req.session.displayName = displayName ;

    res.redirect("/chat?chatId=" + chatId) ;
})) ;

router.get('/verify', wrap(async function(req, res, next) {
    let chatId = req.query.chatId ; 
    
    {
        let doc = await admin.firestore().collection("chats").doc(chatId).get() ;
        data = doc.data() ;
    }

    let result = false ;

    if (data != null) {
        result = true ;
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({result: result}));
})) ;

module.exports = router;