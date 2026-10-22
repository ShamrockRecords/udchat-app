const express = require('express');
const { getFirestore } = require('firebase-admin/firestore');
const firebaseSession = require('../models/firebase_session');
const { randomUUID } = require('node:crypto');
const createError = require('http-errors');
const { documentId, textField } = require('../models/security');
const { roomVersion } = require('../models/chat_access');
const sockets = require('../models/socket');
const router = express.Router();

router.get('/', async (req, res) => {
    if (!await firebaseSession.enter(req, res)) return res.redirect('/signin');
    let data = {};
    if (req.query.chatId !== undefined) {
        data = (await getFirestore().collection('chats').doc(documentId(req.query.chatId)).get()).data();
        if (!data) throw createError(404);
        if (data.ownerUid !== req.user.uid) throw createError(403);
    }
    res.render('create', { lang: res.locale, data });
});
router.post('/', async (req, res) => {
    if (!await firebaseSession.enter(req, res)) return res.redirect('/signin');
    const existing = req.body.chatId !== undefined;
    const chatId = existing ? documentId(req.body.chatId) : req.user.uid + '-' + randomUUID();
    const ref = getFirestore().collection('chats').doc(chatId);
    const data = {
        chatId, ownerUid: req.user.uid, name: textField(req.body.name, 30, true),
        displayName: textField(req.body.displayName, 30), passcode: textField(req.body.passcode, 30),
    };
    const version = await getFirestore().runTransaction(async transaction => {
        if (existing) {
            const previous = (await transaction.get(ref)).data();
            if (!previous) throw createError(404);
            if (previous.ownerUid !== req.user.uid) throw createError(403);
            // Restoring an old passcode must not revive a previously revoked grant.
            data.accessRevision = (previous.passcode || '') === data.passcode ? previous.accessRevision || '' : randomUUID();
            transaction.update(ref, data);
        } else {
            transaction.set(ref, { ...data, timestamp: new Date() });
        }
        return roomVersion(data);
    });
    if (existing) sockets.revokeRoom(chatId, version);
    res.redirect('/');
});
module.exports = router;
