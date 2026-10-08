let express = require('express');
let firebaseSession = require('../models/firebase_session.js') ;

let router = express.Router();

router.get('/', async function(req, res, next) {
	let result = await firebaseSession.enter(req, res) ;

    if (result) {
        res.redirect('/');
        return ;
    }

	let chatId = req.query.chatId ;

	var config = require('../models/config').firebaseConfig;

	res.render('signin', {
		lang: res.locale,
		email: '',
		chatId: chatId != undefined ? chatId : '',
		config: config,
		errorMessage: '',
	});
});
	
router.post('/', async function(req, res, next) {
	let chatId = req.body.chatId ;

	return firebaseSession.signIn(req, res, (result, email, errorMessage) => {
		if (result) {
			if (chatId != undefined && chatId != '') {
				res.redirect('/chat?chatId=' + encodeURIComponent(chatId)) ;
			} else {
				res.redirect('/') ;
			}
		} else {
			var config = require('../models/config').firebaseConfig;

			res.status(401).render('signin', {
				lang: res.locale,
				email: email,
				chatId: chatId != undefined ? chatId : '',
				config: config,
				errorMessage: errorMessage,
			});
		}
	}) ;
}) ;

module.exports = router;
