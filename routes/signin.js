let express = require('express');
let firebaseSession = require('../models/firebase_session.js') ;

let router = express.Router();

router.get('/', function(req, res, next) {

	if (req.query.uid != undefined && req.query.uid != '') {
		firebaseSession.signInFromUI(req.query.uid, res) ;

		res.redirect("/") ;

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

	res.render('signin', { 
		email: '',
		chatId: chatId != undefined ? chatId : '',
		config: config,
		errorMessage: '',
	});
});
	
router.post('/', function(req, res, next) {
	let chatId = req.body.chatId ;

	firebaseSession.signIn(req, res, (result, email, errorMessage) => {
		if (result) {
			if (chatId != undefined && chatId != '') {
				res.redirect('/chat?chatId=' + chatId) ;
			} else {
				res.redirect('/') ;
			}
		} else {
			var config = {
				apiKey: process.env.OPENED_FIREBASE_API_KEY,
				authDomain: process.env.FIREBASE_AUTH_DOMAIN,
				projectId: process.env.FIREBASE_PROJECT_ID,
				storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
				messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
				appId: process.env.FIREBASE_APP_ID,
				measurementId: process.env.MEASUREMENT_ID
			};

			res.render('signin', { 
				email: email,
				chatId: chatId != undefined ? chatId : '',
				config: config,
				errorMessage: errorMessage,
			});
		}
	}) ;
}) ;

module.exports = router;
