var express = require('express');
let admin = require('firebase-admin');
let firebaseSession = require('../models/firebase_session.js') ;
const uuid = require('node-uuid');
var router = express.Router() ;

const wrap = fn => (...args) => fn(...args).catch(args[2]) ;

router.get('/', wrap(async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (result != 0) {
        res.redirect('/signin');
        return ;
    }

    let currentUser = req.session.user ;
    let chatId = req.query.chatId ;
    let data = {} ;

    if (chatId != undefined) {
        let doc = await admin.firestore().collection("chats").doc(chatId).get() ;
        data = doc.data() ;

        if (data.ownerUid != currentUser.uid) {
            res.redirect('/');
            return ;
        }
    }

    res.render('create', {
        lang: res.locale,
        data: data
    });		 
})) ;

router.post('/', wrap(async (req, res, next) => {
    let result = await firebaseSession.enter(req, res) ;

    if (result != 0) {
        res.redirect('/signin');
        return ;
    }
    
    let user = req.session.user ;

    let chatId = req.body.chatId ;
    let data = {} ;

    for (let key in req.body) {
        data[key] = req.body[key] ;
    }

    data.ownerUid = user.uid ;

    if (chatId != undefined) {
        data.chatId = chatId ;
    } else {
        data.chatId = data.ownerUid + '-' + uuid.v4() ;
        data.timestamp = new Date() ;
    }

    try {
        await admin.firestore().collection("chats").doc(data.chatId).set(data) ;
    } catch (error) {
        req.session.errorMessage = error.message ;
    }

    res.redirect('/') ;
})) ;

module.exports = router;