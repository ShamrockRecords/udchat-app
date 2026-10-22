const { getAuth } = require('firebase-admin/auth');
const { authCookieOptions } = require('./config');
const { randomBytes } = require('node:crypto');
const expiresIn = 14 * 24 * 60 * 60 * 1000;

// REST requests have no shared currentUser, so concurrent logins cannot interfere.
async function authRequest(method, body) {
  const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:' + method +
    '?key=' + encodeURIComponent(process.env.FIREBASE_API_KEY || ''), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || 'Authentication failed.');
  return result;
}
function verifiedUser(claims, res) {
  const provider = claims.firebase?.sign_in_provider;
  if (!claims.email_verified && !['facebook.com', 'twitter.com'].includes(provider)) {
    throw new Error(res.__('メールアドレスが確認されていません。'));
  }
  return { uid: claims.uid || claims.sub, email: claims.email || '' };
}
function clearIdentity(req, res) {
  delete req.user;
  res.clearCookie('sessionCookie', authCookieOptions);
}
async function establishSession(idToken, req, res) {
  const claims = await getAuth().verifyIdToken(idToken, true);
  const user = verifiedUser(claims, res);
  const age = Date.now() / 1000 - claims.auth_time;
  if (!Number.isFinite(age) || age < -60 || age > 300) throw new Error('Please sign in again.');
  const cookie = await getAuth().createSessionCookie(idToken, { expiresIn });
  req.session = { locale: req.session.locale, csrfToken: randomBytes(32).toString('hex') };
  req.user = user;
  res.cookie('sessionCookie', cookie, { ...authCookieOptions, maxAge: expiresIn });
}
module.exports = {
  async enter(req, res) {
    if (!req.cookies.sessionCookie) { delete req.user; return false; }
    try {
      req.user = verifiedUser(await getAuth().verifySessionCookie(req.cookies.sessionCookie, true), res);
      return true;
    } catch {
      clearIdentity(req, res);
      return false;
    }
  },
  async signIn(req, res, completion) {
    const { email, password } = req.body;
    try {
      const result = await authRequest('signInWithPassword', { email, password, returnSecureToken: true });
      await establishSession(result.idToken, req, res);
    } catch (error) {
      clearIdentity(req, res);
      return completion(false, email, error.message);
    }
    return completion(true, email, '');
  },
  async signInFromUI(idToken, req, res) { await establishSession(idToken, req, res); },
  async signUp(req, res, completion) {
    const { email, password } = req.body;
    try {
      const result = await authRequest('signUp', { email, password, returnSecureToken: true });
      await authRequest('sendOobCode', { requestType: 'VERIFY_EMAIL', idToken: result.idToken });
    } catch (error) {
      return completion(false, email, error.message);
    }
    return completion(true, email, '');
  },
  async signOut(req, res, completion) {
    clearIdentity(req, res);
    req.session = null;
    return completion();
  },
  async resetPassword(email) { await authRequest('sendOobCode', { requestType: 'PASSWORD_RESET', email }); },
};
