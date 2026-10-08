const router = require('express').Router();
router.get('/', (req, res) => res.redirect('/signin'));
module.exports = router;
