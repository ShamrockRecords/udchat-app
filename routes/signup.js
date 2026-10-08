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
	
	res.render('signup', {
		lang: res.locale,
		email: '',
		chatId: chatId != undefined ? chatId : '',
		config: config,
		errorMessage: '',
	});
});

router.post('/', async function(req, res, next) {
	let chatId = req.body.chatId ;

	return firebaseSession.signUp(req, res, (result, email, errorMessage) => {
		if (result) {
			if (chatId != undefined) {
				res.redirect("/signin?chatId=" + encodeURIComponent(chatId)) ;
			} else {
				res.redirect("/signin") ;
			}
		} else {
			res.status(400).render('signup', {
				lang: res.locale,
				title: 'サインアップ',
                config: require('../models/config').firebaseConfig,
				email: email,
				chatId: chatId != undefined ? chatId : '',
				errorMessage: errorMessage,
			});
		}
	}) ;
}) ;

module.exports = router;
