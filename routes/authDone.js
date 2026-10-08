const router = require('express').Router();
const firebaseSession = require('../models/firebase_session');
const { firebaseConfig } = require('../models/config');
router.get('/', (req, res) => res.render('authDone', { lang: res.locale, config: firebaseConfig }));
router.post('/verify', async (req, res) => {
    if (typeof req.body.idToken !== 'string' || !req.body.idToken || req.body.idToken.length > 10000) {
        return res.status(400).json({ result: false });
    }
    try {
        await firebaseSession.signInFromUI(req.body.idToken, req, res);
        res.json({ result: true });
    } catch {
        res.status(401).json({ result: false });
    }
});
module.exports = router;
