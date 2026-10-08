const records = new Map();
const writes = [];
function seed() {
    records.clear();
    writes.length = 0;
    records.set('users/owner', { name: 'Owner', agreement: '1' });
    records.set('chats/room', { chatId: 'room', ownerUid: 'owner', name: 'Test room', passcode: '1234', displayName: '' });
    records.set('chats/open-room', { chatId: 'open-room', ownerUid: 'owner', name: 'Open room', passcode: '', displayName: '' });
}
function snapshot(key) {
    return { id: key.split('/').pop(), exists: records.has(key), data: () => records.has(key) ? { ...records.get(key) } : undefined };
}
function collection(path) {
    return {
        doc: id => reference(path + '/' + id),
        where() { return this; }, orderBy() { return this; }, limit() { return this; },
        async get() {
            return { docs: [...records.keys()].filter(key => key.startsWith(path + '/') && !key.slice(path.length + 1).includes('/')).map(snapshot) };
        },
    };
}
function reference(path) {
    return {
        path, collection: name => collection(path + '/' + name), async get() { return snapshot(path); },
        async set(value) { writes.push({ path, value }); records.set(path, { ...value }); },
        async update(value) { writes.push({ path, value }); records.set(path, { ...records.get(path), ...value }); },
        async delete() { writes.push({ path, deleted: true }); records.delete(path); },
    };
}
const db = {
    collection,
    async runTransaction(callback) {
        return callback({ get: ref => ref.get(), set: (ref, data) => ref.set(data), update: (ref, data) => ref.update(data), delete: ref => ref.delete() });
    },
    async terminate() {},
};
function claims(uid = 'owner') {
    return { uid, sub: uid, email: uid + '@example.test', email_verified: true, auth_time: Date.now() / 1000, firebase: { sign_in_provider: 'password' } };
}
const auth = {
    async verifySessionCookie(cookie) {
        if (cookie === 'valid-owner') return claims();
        if (cookie === 'valid-other') return claims('other');
        throw new Error('Invalid cookie');
    },
    async verifyIdToken(token) {
        if (token === 'valid-token') return claims();
        if (token === 'old-token') return { ...claims(), auth_time: Date.now() / 1000 - 600 };
        if (token === 'unverified-token') return { ...claims(), email_verified: false };
        if (token === 'facebook-token') return { ...claims(), email_verified: false, firebase: { sign_in_provider: 'facebook.com' } };
        throw new Error('Invalid token');
    },
    async createSessionCookie() { return 'valid-owner'; },
};
const admin = { apps: [], credential: { cert: value => value }, initializeApp() { this.apps.push({}); }, auth: () => auth, firestore: () => db };
function install() {
    process.env.NODE_ENV = 'test';
    process.env.SESSION_SECRET = 'test-secret-with-at-least-32-bytes-only-for-tests';
    process.env.ROOT_URL = 'http://localhost:3000';
    process.env.FIREBASE_API_KEY = 'fake-server-key';
    process.env.OPENED_FIREBASE_API_KEY = 'fake-browser-key';
    process.env.GOOGLE_CLOUD_TRANSLATION_API_KEY = '';
    require.cache[require.resolve('firebase-admin')] = { exports: admin };
    seed();
}
module.exports = { admin, auth, db, records, writes, claims, seed, install };
