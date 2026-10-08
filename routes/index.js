var express = require('express');
let admin = require('firebase-admin');
let firebaseSession = require('../models/firebase_session.js') ;
var router = express.Router() ;
const createError = require('http-errors');
const { documentId } = require('../models/security');

const wrap = fn => (...args) => fn(...args).catch(args[2]) ;

router.get('/', wrap(async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (!result) {
        res.redirect('/signin');
        return ;
    }

    let currentUser = req.user ;

    let snapshot = await admin.firestore().collection("chats").where("ownerUid", "==", currentUser.uid).orderBy('name').get() ;

    let chats = {} ;

    for (let key in snapshot.docs) {
        let data = snapshot.docs[key].data() ;

        chats[data.chatId] = data ;
    }

    let userProfile = null ;

    {
        let doc = await admin.firestore().collection("users").doc(currentUser.uid).get() ;
        userProfile = doc.data() ;

        if (userProfile == null) {
            userProfile = {name: '', agreement: '0'} ;
            await admin.firestore().collection("users").doc(currentUser.uid).set(userProfile) ;
        }
    }

    if (userProfile.agreement == '1') {
        res.render('index', {
            lang: res.locale,
            name: userProfile.name || '',
            rootURL: require('../models/config').rootURL,
            chats: chats,
            errorMessage: !userProfile.name ? res.__("プロフィールに名前を入力してください。") : "",
        });
    } else {
        res.render('agreement', {
            lang: res.locale,
        });
    }
})) ;

router.post('/agreement', wrap(async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (!result) {
        res.redirect('/signin');
        return ;
    }

    let currentUser = req.user ;

    await admin.firestore().collection('users').doc(currentUser.uid).set({ agreement: '1' }, { merge: true });

    res.redirect('/');
})) ;

router.post('/delete', wrap(async function(req, res, next) {
    let result = await firebaseSession.enter(req, res) ;

    if (!result) {
        res.redirect('/signin');
        return ;
    }

    const chatId = documentId(req.body.chatId);
    const ref = admin.firestore().collection('chats').doc(chatId);
    await admin.firestore().runTransaction(async transaction => {
        const room = (await transaction.get(ref)).data();
        if (!room) throw createError(404);
        if (room.ownerUid !== req.user.uid) throw createError(403);
        transaction.delete(ref);
    });

    res.redirect('/') ;
})) ;

router.post('/signout', wrap(async function(req, res, next) {
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

    let currentUser = req.user ;
    let chatId = documentId(req.query.chatId);
    let data = {} ;

    if (chatId != undefined) {
        let doc = await admin.firestore().collection("chats").doc(chatId).get() ;
        data = doc.data() ;

        if (!data || data.ownerUid != currentUser.uid) {
            res.redirect('/');
            return ;
        }
    }
    
    let reqestedTimezoneOffset = Number(req.query.to || 0);
    if (!Number.isFinite(reqestedTimezoneOffset) || Math.abs(reqestedTimezoneOffset) > 840) throw createError(400);
    let targetDate = new Date() ;

    targetDate.setDate(targetDate.getDate() - 3) ;

    let snapshot = await admin.firestore().collection("chat").doc(chatId).collection("messages").where("timestamp", ">", targetDate).orderBy('timestamp').get() ;
 
    res.type('text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''" + encodeURIComponent(data.name) + '.csv');
    
    let line = '#timestamp,name,message\r\n' ;

    res.write(line) ;

    for (let key in snapshot.docs) {
        let doc = snapshot.docs[key] ;
        let command = doc.data() ;

        if (command.method == 'status') {
            continue ;
        }

        let date = new Date(command.timestamp.toDate().toUTCString()) ;

        date.setHours(date.getHours() + (date.getTimezoneOffset() - reqestedTimezoneOffset)/60) ;

        let line = [date.toLocaleString('ja-JP'), command.name, command.message].map(csvCell).join(',') + '\r\n';

        res.write(line) ;
    }
    
    res.end() ;
})) ;

function csvCell(value) {
    let text = String(value ?? '');
    if (/^[=+@\-\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
}

module.exports = router;