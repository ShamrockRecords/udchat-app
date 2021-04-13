var express = require('express');
var router = express.Router() ;

router.get('/:locale', function(req, res, next){
    req.session.locale = req.params.locale;
    res.redirect(req.headers.referer);
});

module.exports = router;