const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { io } = require('socket.io-client');
const request = require('supertest');
const fixture = require('./fixtures/firebase.cjs');
fixture.install();
const wrapper = require('../models/socket');
const { issueToken } = require('../models/chat_access');
const app = require('../app');
const server = http.createServer(app);
const clients = [];
let url;
function event(socket, name) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for ' + name)), 3000);
        socket.once(name, value => { clearTimeout(timer); resolve(value); });
    });
}
function connect(token, options = {}) {
    const socket = io(url, { auth: { token }, transports: ['websocket'], reconnection: false, autoConnect: false, ...options });
    clients.push(socket);
    return socket;
}
async function join(token = issueToken(fixture.records.get('chats/room'), 'guest')) {
    const socket = connect(token);
    const connected = event(socket, 'connect'); socket.connect(); await connected;
    const history = event(socket, 'message');
    socket.send(JSON.stringify({ requestId: 'room', method: 'requestConnecting' }));
    await history;
    return socket;
}
before(async () => {
    wrapper.init(server);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    url = 'http://127.0.0.1:' + server.address().port;
});
after(async () => {
    for (const socket of clients) socket.disconnect();
    await new Promise(resolve => wrapper.close(resolve));
});
beforeEach(() => fixture.seed());
afterEach(async () => {
    const disconnected = [...wrapper.io.sockets.sockets.values()].map(socket => event(socket, 'disconnect'));
    for (const socket of clients.splice(0)) socket.disconnect();
    await Promise.all(disconnected);
    await Promise.allSettled([...wrapper.pending]);
});
async function ownerPost(path, body) {
    const agent = request.agent(app);
    const page = await agent.get('/signin').expect(200);
    const csrf = page.text.match(/name="csrf-token" content="([^"]+)"/)[1];
    return agent.post(path).set('Cookie', 'sessionCookie=valid-owner').type('form').send({ _csrf: csrf, ...body });
}
test('unauthenticated and changed-passcode connections are refused', async () => {
    for (const token of [undefined, 'forged', issueToken({ ...fixture.records.get('chats/room'), passcode: 'old' }, 'guest')]) {
        const socket = connect(token);
        const rejected = event(socket, 'connect_error'); socket.connect();
        assert.match((await rejected).message, /passcode/);
    }
    assert.equal(fixture.writes.length, 0);
});
test('bad JSON and another room are rejected without crashing the connection', async () => {
    const socket = await join();
    for (const input of ['{bad', 'null', JSON.stringify({ method: 'message', requestId: 'other-room' })]) {
        const error = event(socket, 'chatError'); socket.send(input); await error;
    }
    assert.equal(fixture.writes.length, 0);
    assert.equal(socket.connected, true);
});
test('sender identity comes from the grant; bursts stay ordered', async () => {
    const socket = await join();
    const messages = [];
    socket.on('message', message => messages.push(...JSON.parse(message)));
    const input = { requestId: 'room', uid: 'forged-owner', name: 'Guest', message: 'first', method: 'message' };
    const first = event(socket, 'message'); socket.send(JSON.stringify(input)); await first;
    assert.equal(fixture.writes[0].value.uid, 'guest');
    const received = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Missing ordered messages')), 3000);
        socket.on('message', () => { if (messages.length === 3) { clearTimeout(timer); resolve(); } });
    });
    socket.send(JSON.stringify({ ...input, message: 'second' }));
    socket.send(JSON.stringify({ ...input, message: 'third' }));
    await received;
    assert.deepEqual(messages.map(item => item.message), ['first', 'second', 'third']);
});
test('reconnecting retrieves history and can join again', async () => {
    const socket = await join();
    socket.disconnect();
    const connected = event(socket, 'connect'); socket.connect(); await connected;
    const history = event(socket, 'message');
    socket.send(JSON.stringify({ requestId: 'room', method: 'requestConnecting' }));
    assert.ok(JSON.parse(await history).some(item => item.method === 'requestConnecting'));
});
test('cross-origin WebSocket and polling handshakes are rejected', async () => {
    const token = issueToken(fixture.records.get('chats/room'), 'guest');
    for (const transport of ['websocket', 'polling']) {
        const socket = connect(token, { transports: [transport], extraHeaders: { Origin: 'https://untrusted.example' } });
        const rejected = event(socket, 'connect_error'); socket.connect(); await rejected;
        assert.equal(socket.connected, false);
    }
    const socket = connect(token, { extraHeaders: { Origin: 'http://localhost:3000' } });
    const connected = event(socket, 'connect'); socket.connect(); await connected;
});
test('an idle connection is disconnected when its grant expires', async t => {
    const now = Date.now();
    t.mock.method(Date, 'now', () => now - 14 * 60 * 60 * 1000 + 1500);
    const token = issueToken(fixture.records.get('chats/room'), 'guest');
    t.mock.restoreAll();
    const socket = await join(token);
    await event(socket, 'disconnect');
    assert.equal(wrapper.io.sockets.sockets.size, 0);
    assert.equal(fixture.writes.length, 0);
});
test('editing the name keeps access; a passcode change immediately revokes connected guests', async () => {
    const token = issueToken(fixture.records.get('chats/room'), 'guest');
    const socket = await join(token);
    assert.equal((await ownerPost('/create', { chatId: 'room', name: 'Renamed', passcode: '1234' })).status, 302);
    assert.equal(socket.connected, true);
    const disconnected = event(socket, 'disconnect');
    assert.equal((await ownerPost('/create', { chatId: 'room', name: 'Renamed', passcode: '5678' })).status, 302);
    await disconnected;
    const stale = connect(token);
    const rejected = event(stale, 'connect_error'); stale.connect(); await rejected;
    const current = await join();
    assert.equal(current.connected, true);
    const currentDisconnected = event(current, 'disconnect');
    assert.equal((await ownerPost('/create', { chatId: 'room', name: 'Renamed', passcode: '1234' })).status, 302);
    await currentDisconnected;
    const restored = connect(token);
    const stillRejected = event(restored, 'connect_error'); restored.connect(); await stillRejected;
});
test('deleting a room disconnects guests and does not write a departure to the deleted room', async () => {
    const socket = await join();
    const received = event(socket, 'message');
    socket.send(JSON.stringify({ requestId: 'room', method: 'status', name: 'Guest', param: 'joined' }));
    await received;
    const disconnected = event(socket, 'disconnect');
    assert.equal((await ownerPost('/delete', { chatId: 'room' })).status, 302);
    await disconnected;
    await Promise.allSettled([...wrapper.pending]);
    assert.ok(fixture.writes.every(write => write.path === 'chats/room'));
});
test('a room deleted after handshake cannot be joined with a stale grant', async () => {
    const socket = connect(issueToken(fixture.records.get('chats/room'), 'guest'));
    const connected = event(socket, 'connect'); socket.connect(); await connected;
    fixture.records.delete('chats/room');
    const disconnected = event(socket, 'disconnect');
    socket.send(JSON.stringify({ requestId: 'room', method: 'requestConnecting' }));
    await disconnected;
    assert.equal(fixture.writes.length, 0);
});
test('history already loading is not delivered after the owner deletes the room', async t => {
    let releaseHistory, historyStarted;
    const started = new Promise(resolve => { historyStarted = resolve; });
    const history = new Promise(resolve => { releaseHistory = resolve; });
    t.mock.method(wrapper, 'messages', () => ({
        orderBy() { return this; }, limit() { return this; },
        get() { historyStarted(); return history; },
    }));
    const socket = connect(issueToken(fixture.records.get('chats/room'), 'guest'));
    const connected = event(socket, 'connect'); socket.connect(); await connected;
    const messages = [];
    socket.on('message', message => messages.push(message));
    socket.send(JSON.stringify({ requestId: 'room', method: 'requestConnecting' }));
    try {
        await started;
        const disconnected = event(socket, 'disconnect');
        assert.equal((await ownerPost('/delete', { chatId: 'room' })).status, 302);
        await disconnected;
    } finally {
        releaseHistory({ docs: [] });
    }
    await Promise.allSettled([...wrapper.pending]);
    assert.deepEqual(messages, []);
});
