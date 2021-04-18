let express = require('express');
let firebaseSession = require('../models/firebase_session.js') ;

let router = express.Router();

router.get('/', function(req, res, next) {
	let chatId = req.query.chatId ;

	res.render('signup', {
		lang: res.locale,
		title: 'サインアップ',
		email: '',
		chatId: chatId != undefined ? chatId : '',
		errorMessage: '',
	});
});

router.post('/', function(req, res, next) {
	let chatId = req.query.chatId ;

	firebaseSession.signUp(req, res, (result, email, errorMessage) => {
		if (result) {
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
