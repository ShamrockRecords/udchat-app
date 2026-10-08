if (process.env.NODE_ENV !== 'test') require('dotenv').config({ quiet: true, path: process.env.DOTENV_CONFIG_PATH || '.env' });
const { randomBytes } = require('node:crypto');

const production = process.env.NODE_ENV === 'production';
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || Buffer.byteLength(sessionSecret) < 32) {
  if (production) throw new Error('SESSION_SECRET must contain at least 32 bytes in production.');
  sessionSecret = randomBytes(32).toString('hex');
}
const rootURL = new URL(process.env.ROOT_URL || 'http://localhost:3000');
if (!['http:', 'https:'].includes(rootURL.protocol) || (production && rootURL.protocol !== 'https:')) {
  throw new Error('ROOT_URL must be an HTTPS URL in production.');
}
module.exports = {
  production, sessionSecret, rootURL: rootURL.origin,
  locales: ['ja', 'en', 'zh-TW', 'zh-CN'],
  authCookieOptions: { httpOnly: true, secure: production, sameSite: 'lax', path: '/' },
  firebaseConfig: {
    apiKey: process.env.OPENED_FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    appId: process.env.FIREBASE_APP_ID,
  },
};
