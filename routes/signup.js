let express = require('express');
let firebaseSession = require('../models/firebase_session.js') ;

let router = express.Router();

router.get('/', async function(req, res, next) {
	let result = await firebaseSession.enter(req, res) ;

    if (result == 0) {
        res.redirect('/');
        return ;
    }

	let chatId = req.query.chatId ;

	var config = {
		apiKey: process.env.OPENED_FIREBASE_API_KEY,
		authDomain: process.env.FIREBASE_AUTH_DOMAIN,
		projectId: process.env.FIREBASE_PROJECT_ID,
		storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
		messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
		appId: process.env.FIREBASE_APP_ID,
		measurementId: process.env.MEASUREMENT_ID
	};
	
	res.render('signup', {
		lang: res.locale,
		email: '',
		chatId: chatId != undefined ? chatId : '',
		config: config,
		errorMessage: '',
	});
});

router.post('/', function(req, res, next) {
	let chatId = req.query.chatId ;

	firebaseSession.signUp(req, res, (result, email, errorMessage) => {
		if (result == 0) {
			if (chatId != undefined) {
				res.redirect("/signin?chatId=" + chatId) ;
			} else {
				res.redirect("/signin") ;
			}
		} else {
			res.render('signup', {
				lang: res.locale,
				title: 'サインアップ',
				email: email,
				chatId: chatId != undefined ? chatId : '',
				errorMessage: errorMessage,
			});
		}
	}) ;
}) ;

module.exports = router;
