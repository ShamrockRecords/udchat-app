const express = require('express');
const { getFirestore } = require('firebase-admin/firestore');
const firebaseSession = require('../models/firebase_session');
const { randomUUID } = require('node:crypto');
const { documentId, textField, equalSecret } = require('../models/security');
const { issueToken } = require('../models/chat_access');
const { rootURL } = require('../models/config');
const router = express.Router();
const QRCode = require('qrcode');

async function showChat(req, res) {
    const chatId = documentId(req.method === 'POST' ? req.body.chatId : req.query.chatId);
    const data = (await getFirestore().collection('chats').doc(chatId).get()).data();
    if (!data) return res.redirect('/');
    await firebaseSession.enter(req, res);
    const currentUser = req.user;
    const uid = currentUser?.uid || randomUUID();
    let name = null;
    if (currentUser) {
        const profile = (await getFirestore().collection('users').doc(uid).get()).data();
        name = profile?.name || null;
    }
    const owner = data.ownerUid === uid;
    if (owner && data.displayName) name = data.displayName;
    if (req.method === 'POST') name = textField(req.body.displayName, 100, true);
    const needsPasscode = Boolean(data.passcode) && !owner;
    const passcodeAccepted = req.method === 'POST' && equalSecret(req.body.passcode || '', data.passcode || '');
    if (!name || (needsPasscode && !passcodeAccepted)) {
        if (req.method === 'POST') res.status(401);
        return res.render('passcode', {
            lang: res.locale, title: data.name, displayName: name || '',
            isAlreadySignIn: Boolean(currentUser), isNeedPasscode: needsPasscode, chatId,
        });
    }
    res.render('chat', {
        lang: res.locale, title: data.name, name, requestId: chatId, uid, rootURL,
        isAlreadySignIn: Boolean(currentUser), apiKey: process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY || '',
        chatToken: issueToken({ ...data, chatId }, uid),
        qrCode: await QRCode.toDataURL(rootURL + '/chat?chatId=' + encodeURIComponent(chatId), { width: 300, margin: 2 }),
    });
}
router.get('/', showChat);
router.post('/passcode', showChat);
router.get('/verify', async (req, res) => {
    const chatId = documentId(req.query.chatId);
    const doc = await getFirestore().collection('chats').doc(chatId).get();
    res.json({ result: doc.exists });
});
module.exports = router;
