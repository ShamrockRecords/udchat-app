var express = require('express');
let admin = require('firebase-admin');
let firebaseSession = require('../models/firebase_session.js') ;
var router = express.Router() ;
const i18n = require('i18n') ;

const wrap = fn => (...args) => fn(...args).catch(args[2]) ;

router.get('/', wrap(async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (!result) {
        res.redirect('/signin');
        return ;
    }

    let currentUser = req.session.user ;

    let snapshot = await admin.firestore().collection("chats").where("ownerUid", "==", currentUser.uid).orderBy('name').get() ;

    let chats = {} ;

    for (let key in snapshot.docs) {
        let data = snapshot.docs[key].data() ;

        chats[data.chatId] = data ;
    }

    let name = null ;

    {
        let doc = await admin.firestore().collection("users").doc(currentUser.uid).get() ;
        let userProfile = doc.data() ;

        if (userProfile != null) {
            name = userProfile.name ;
        }
    }

    res.render('index', {
        lang: res.locale,
        name: name == null ? "" : name,
        rootURL: process.env.ROOT_URL,
        chats: chats,
        errorMessage: name == null ? res.__("まず最初にプロフィールで名前を入力してください。") : "",
    });		 
})) ;

router.get('/delete', wrap(async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (!result) {
        res.redirect('/signin');
        return ;
    }

    let chatId = req.query.chatId ;

    await admin.firestore().collection("chats").doc(chatId).delete() ;
    //await admin.firestore().collection("chat").doc(chatId).delete() ;

    res.redirect('/') ;
})) ;

router.get('/signout', wrap(async function(req, res, next) {
	delete req.session.errorMessage;

	await firebaseSession.signOut(req, res, () => {
		res.redirect('/') ;
	}) ;
})) ;

module.exports = router;