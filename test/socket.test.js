const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { io } = require('socket.io-client');
const fixture = require('./fixtures/firebase.cjs');
fixture.install();
const wrapper = require('../models/socket');
const { issueToken } = require('../models/chat_access');
const server = http.createServer();
const clients = [];
let url;
function event(socket, name) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Timeout waiting for ' + name)), 3000);
        socket.once(name, value => { clearTimeout(timer); resolve(value); });
    });
}
function connect(token) {
    const socket = io(url, { auth: { token }, transports: ['websocket'], reconnection: false, autoConnect: false });
    clients.push(socket);
    return socket;
}
async function join() {
    const socket = connect(issueToken(fixture.records.get('chats/room'), 'guest'));
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
