var express = require('express');
let admin = require('firebase-admin');
let firebaseSession = require('../models/firebase_session.js') ;
var router = express.Router() ;
const i18n = require('i18n') ;
const { response } = require('express');

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

router.get('/download', wrap(async function(req, res, next) {
	let result = await firebaseSession.enter(req, res) ;

    if (!result) {
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
    
    let targetDate = new Date() ;

    targetDate.setDate(targetDate.getDate() - 3) ;

    let snapshot = await admin.firestore().collection("chat").doc(chatId).collection("messages").where("timestamp", ">", targetDate).orderBy('timestamp').get() ;
 
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(data.name) + '.csv');
    
    let line = '#timestamp,name,message\r\n' ;

    res.write(line) ;

    for (let key in snapshot.docs) {
        let doc = snapshot.docs[key] ;
        let command = doc.data() ;

        try {
            command.timestamp = command.timestamp.toDate().toUTCString() ;
        } catch(e) {

        }

        let line = '"' + command.timestamp + '"' + ',' + command.name + ',' + command.message + "\r\n" ;

        res.write(line) ;
    }
    
    res.end() ;
})) ;



module.exports = router;