const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { Script } = require('node:vm');
const { execFileSync } = require('node:child_process');
const fixture = require('./fixtures/firebase.cjs');
fixture.install();
const app = require('../app');
const session = require('../models/firebase_session');
const { issueToken, verifyToken, roomVersion } = require('../models/chat_access');
const { jsonForScript } = require('../models/security');
beforeEach(() => fixture.seed());

async function client(cookie) {
    const agent = request.agent(app);
    const page = await agent.get('/signin').expect(200);
    const csrf = page.text.match(/name="csrf-token" content="([^"]+)"/)[1];
    const post = (url, body) => {
        const req = agent.post(url).type('form').send({ _csrf: csrf, ...body });
        return cookie ? req.set('Cookie', 'sessionCookie=' + cookie) : req;
    };
    return { agent, csrf, post };
}
function checkScripts(html) {
    for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) new Script(match[1]);
}

test('public pages render and inline JavaScript parses in every locale', async () => {
    for (const lang of ['ja', 'en', 'zh-TW', 'zh-CN']) {
        for (const url of ['/signin', '/signup', '/reset_password', '/about', '/auth_done']) {
            const result = await request(app).get(url).set('Accept-Language', lang).expect(200);
            assert.equal(result.headers['cache-control'], 'no-store');
            assert.equal(result.headers['x-powered-by'], undefined);
            checkScripts(result.text);
        }
    }
});
test('static assets and health do not allocate a session', async () => {
    for (const path of ['/healthz', '/javascripts/common_functions.js']) {
        const result = await request(app).get(path).expect(200);
        assert.equal(result.headers['set-cookie'], undefined);
    }
});
test('invalid CSRF tokens are rejected before authentication or writes', async () => {
    await request(app).post('/create').send({ name: 'bad' }).expect(403);
    const { agent } = await client();
    await agent.post('/auth_done/verify').send({ idToken: 'valid-token', _csrf: 'bad' }).expect(403);
    assert.equal(fixture.writes.length, 0);
});
test('UID-only social login is no longer accepted', async () => {
    await request(app).get('/auth_done/verify?uid=owner').expect(404);
    const { post } = await client();
    await post('/auth_done/verify', { uid: 'owner' }).expect(400);
    await post('/auth_done/verify', { idToken: 'forged-token' }).expect(401);
});
test('social sign-in requires a recent verified token and returns HttpOnly cookies', async () => {
    const { post } = await client();
    await post('/auth_done/verify', { idToken: 'old-token' }).expect(401);
    await post('/auth_done/verify', { idToken: 'unverified-token' }).expect(401);
    const response = await post('/auth_done/verify', { idToken: 'facebook-token' }).expect(200);
    const cookie = response.headers['set-cookie'].find(value => value.startsWith('sessionCookie='));
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
});
test('email sign-in exchanges an ID token without shared client auth state', async t => {
    let body;
    t.mock.method(global, 'fetch', async (url, options) => {
        assert.match(url, /accounts:signInWithPassword\?key=fake-server-key/);
        body = JSON.parse(options.body);
        return { ok: true, json: async () => ({ idToken: 'valid-token' }) };
    });
    const { post } = await client();
    const response = await post('/signin', { email: 'owner@example.test', password: 'test-password', chatId: 'room' }).expect(302);
    assert.equal(response.headers.location, '/chat?chatId=room');
    assert.equal(body.password, 'test-password');
    assert.ok(response.headers['set-cookie'].some(value => value.startsWith('sessionCookie=')));
});
test('signup sends a verification email and preserves the destination room', async t => {
    const calls = [];
    t.mock.method(global, 'fetch', async (url, options) => {
        calls.push({ url, body: JSON.parse(options.body) });
        return { ok: true, json: async () => ({ idToken: 'valid-token' }) };
    });
    const { post } = await client();
    const result = await post('/signup', { email: 'new@example.test', password: 'test-password', chatId: 'room' }).expect(302);
    assert.equal(result.headers.location, '/signin?chatId=room');
    assert.equal(calls[1].body.requestType, 'VERIFY_EMAIL');
});
test('signup and password reset API errors render a page without crashing', async t => {
    t.mock.method(global, 'fetch', async () => { throw new Error('Network unavailable'); });
    const { post } = await client();
    const signup = await post('/signup', { email: 'new@example.test', password: 'test-password' }).expect(400);
    checkScripts(signup.text);
    await post('/reset_password', { email: 'new@example.test' }).expect(400);
});
test('verified identity is recovered solely from the Firebase cookie', async () => {
    await request(app).get('/').set('Cookie', 'sessionCookie=valid-owner').expect(200);
    await request(app).get('/profile').set('Cookie', 'sessionCookie=valid-owner').expect(200);
    await request(app).get('/profile').set('Cookie', 'sessionCookie=revoked').expect(302).expect('Location', '/signin');
});
test('profile updates require authentication and accept only the name', async () => {
    const guest = await client();
    await guest.post('/profile/update', { name: 'Forged' }).expect(302).expect('Location', '/signin');
    const owner = await client('valid-owner');
    await owner.post('/profile/update', { name: 'Updated', agreement: '0', ownerUid: 'other' }).expect(302);
    assert.deepEqual(fixture.records.get('users/owner'), { name: 'Updated', agreement: '1' });
});
test('other users cannot edit or delete a room', async () => {
    const other = await client('valid-other');
    await request(app).get('/create?chatId=room').set('Cookie', 'sessionCookie=valid-other').expect(403);
    await other.post('/create', { chatId: 'room', name: 'Hijacked' }).expect(403);
    await other.post('/delete', { chatId: 'room' }).expect(403);
    assert.equal(fixture.writes.length, 0);
});
test('owner may create, edit and delete rooms; GET cannot delete', async () => {
    const owner = await client('valid-owner');
    await owner.post('/create', { name: 'New', passcode: '', ownerUid: 'other' }).expect(302);
    assert.equal(fixture.writes[0].value.ownerUid, 'owner');
    await owner.post('/create', { chatId: 'room', name: 'Updated', passcode: '5678' }).expect(302);
    assert.equal(fixture.records.get('chats/room').name, 'Updated');
    await request(app).get('/delete?chatId=room').set('Cookie', 'sessionCookie=valid-owner').expect(404);
    await owner.post('/delete', { chatId: 'room' }).expect(302);
    assert.equal(fixture.records.has('chats/room'), false);
});
test('guest needs a name and passcode before receiving socket credentials', async () => {
    const { agent, post } = await client();
    const first = await agent.get('/chat?chatId=room').expect(200);
    assert.ok(!first.text.includes('auth: { token:'));
    const wrong = await post('/chat/passcode', { chatId: 'room', displayName: 'Guest', passcode: 'wrong' }).expect(401);
    assert.ok(!wrong.text.includes('auth: { token:'));
    const entered = await post('/chat/passcode', { chatId: 'room', displayName: 'Guest " </script> 日本語', passcode: '1234' }).expect(200);
    checkScripts(entered.text);
    assert.match(entered.text, /value="Guest &#34; &lt;\/script&gt; 日本語"/);
    assert.match(entered.text, /data:image\/png;base64/);
    const token = entered.text.match(/auth: \{ token: "([^"]+)"/)[1];
    assert.equal(verifyToken(token).requestId, 'room');
    const cookieHeaders = entered.headers['set-cookie'] || [];
    assert.ok(cookieHeaders.every(value => !value.includes('1234')));
});
test('open rooms still request a guest display name; owners bypass passcodes', async () => {
    const { agent, post } = await client();
    const page = await agent.get('/chat?chatId=open-room').expect(200);
    assert.match(page.text, /name="displayName"/);
    const entered = await post('/chat/passcode', { chatId: 'open-room', displayName: 'Guest' }).expect(200);
    checkScripts(entered.text);
    assert.match(entered.text, /auth: \{ token:/);
    await request(app).get('/chat?chatId=room').set('Cookie', 'sessionCookie=valid-owner').expect(200);
});
test('bad and missing chat IDs are controlled errors', async () => {
    await request(app).get('/chat').expect(400);
    await request(app).get('/chat?chatId=a/b').expect(400);
    await request(app).get('/chat?chatId=missing').expect(302);
    await request(app).get('/create?chatId=missing').set('Cookie', 'sessionCookie=valid-owner').expect(404);
});
test('CSV download checks ownership and escapes quotes, newlines and formulas', async () => {
    fixture.records.set('chat/room/messages/one', { method: 'message', timestamp: { toDate: () => new Date() }, name: '=1+1', message: 'a,"b"\nc' });
    const result = await request(app).get('/download?chatId=room&to=-540').set('Cookie', 'sessionCookie=valid-owner').expect(200);
    assert.match(result.headers['content-type'], /text\/csv/);
    assert.ok(result.text.includes('"\'=1+1","a,""b""\nc"'));
    await request(app).get('/download?chatId=room').set('Cookie', 'sessionCookie=valid-other').expect(302);
});
test('locale return links cannot redirect off-site', async () => {
    await request(app).get('/locale_change/ja').set('Referer', 'https://attacker.invalid/path').expect(302).expect('Location', '/');
    await request(app).get('/locale_change/en').set('Referer', 'http://localhost:3000/signin').expect(302).expect('Location', '/signin');
});
test('chat grants reject tampering and expiry, and change with passcode', () => {
    const room = fixture.records.get('chats/room');
    const token = issueToken(room, 'guest');
    assert.throws(() => verifyToken(token + 'x'));
    assert.notEqual(roomVersion(room), roomVersion({ ...room, passcode: 'other' }));
    const now = Date.now;
    Date.now = () => now() + 15 * 60 * 60 * 1000;
    try { assert.throws(() => verifyToken(token)); } finally { Date.now = now; }
});
test('script JSON escapes script closing tags without altering the value', () => {
    const text = '</script> "\\ 日本語\u2028';
    assert.ok(!jsonForScript(text).includes('</script>'));
    assert.equal(JSON.parse(jsonForScript(text)), text);
});
test('production rejects missing secrets and issues secure cookies behind the proxy', () => {
    const env = { ...process.env, NODE_ENV: 'production', DOTENV_CONFIG_PATH: '/dev/null', ROOT_URL: 'https://chat.example.test', SESSION_SECRET: '' };
    assert.throws(() => execFileSync(process.execPath, ['-e', "require('./models/config')"], { env, stdio: 'pipe' }));
    const code = `
      require('./test/fixtures/firebase.cjs').install();
      process.env.NODE_ENV = 'production'; process.env.ROOT_URL = 'https://chat.example.test';
      const request = require('supertest');
      const app = require('./app');
      request(app).get('/signin').expect(308).expect('Location', 'https://chat.example.test/signin').catch(e => { console.error(e); process.exitCode = 1; });
      request(app).get('/signin').set('X-Forwarded-Proto', 'https').expect(200).then(r => {
        require('node:assert/strict').ok(r.headers['set-cookie'].every(c => /Secure/i.test(c) && /HttpOnly/i.test(c)));
      }).catch(e => { console.error(e); process.exitCode = 1; });
    `;
    execFileSync(process.execPath, ['-e', code], { env, stdio: 'pipe' });
});
