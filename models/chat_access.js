const { createHmac } = require('node:crypto');
const { sessionSecret } = require('./config');
const { equalSecret, documentId } = require('./security');

function signature(value) {
  return createHmac('sha256', sessionSecret).update('chat-access:' + value).digest('base64url');
}
function roomVersion(room) {
  // Do not disclose even a hash of a short passcode without a server-held key.
  return signature(JSON.stringify([room.ownerUid, room.passcode || '']));
}
function issueToken(room, uid) {
  const payload = Buffer.from(JSON.stringify({
    requestId: room.chatId, uid, version: roomVersion(room), expires: Date.now() + 14 * 60 * 60 * 1000,
  })).toString('base64url');
  return payload + '.' + signature(payload);
}
function verifyToken(token) {
  if (typeof token !== 'string' || token.length > 2048) throw new Error('Invalid chat access.');
  const parts = token.split('.');
  if (parts.length !== 2 || !equalSecret(signature(parts[0]), parts[1])) throw new Error('Invalid chat access.');
  const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  documentId(data.requestId);
  if (typeof data.uid !== 'string' || !Number.isFinite(data.expires) || data.expires <= Date.now()) {
    throw new Error('Chat access expired. Please reload the page.');
  }
  return data;
}
module.exports = { issueToken, verifyToken, roomVersion };
