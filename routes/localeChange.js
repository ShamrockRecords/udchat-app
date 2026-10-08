const router = require('express').Router();
const { locales, rootURL } = require('../models/config');
router.get('/:locale', (req, res) => {
    if (locales.includes(req.params.locale)) req.session.locale = req.params.locale;
    let target = '/';
    try {
        const referer = new URL(req.get('referer'));
        if (referer.origin === rootURL && !referer.pathname.startsWith('//')) target = referer.pathname + referer.search;
    } catch {}
    res.redirect(target);
});
module.exports = router;
