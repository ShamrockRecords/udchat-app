let express = require('express');
let firebaseSession = require('../models/firebase_session.js') ;

let router = express.Router();

router.get('/', function(req, res, next) {
	let chatId = req.query.chatId ;

	res.render('signin', { 
		email: '',
		chatId: chatId != undefined ? chatId : '',
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
			res.render('signin', { 
				email: email,
				chatId: chatId != undefined ? chatId : '',
				errorMessage: errorMessage,
			});
		}
	}) ;
}) ;

module.exports = router;
