const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { spawn } = require('node:child_process');
const path = require('node:path');

test('translation API failures and disabled translation still allow chat initialization', async () => {
    const source = fs.readFileSync('public/javascripts/language_support.js', 'utf8');
    for (const apiKey of ['', 'fake']) {
        const context = vm.createContext({
            fetch: async () => { throw new Error('offline'); }, AbortSignal, URLSearchParams,
            navigator: { language: 'ja' }, Intl,
        });
        vm.runInContext(source, context);
        assert.equal((await vm.runInContext(`supportedLanguages('${apiKey}')`, context)).length, 0);
        assert.equal(await vm.runInContext(`new Promise(resolve => detect('${apiKey}', 'こんにちは', resolve))`, context), '');
        assert.equal(await vm.runInContext(`new Promise(resolve => translate('${apiKey}', 'こんにちは', 'ja', 'en', resolve))`, context), '');
    }
});
test('modular Firebase SDK loads Firestore and rejects a malformed authentication token', async () => {
    const { initializeApp, deleteApp } = require('firebase-admin/app');
    const { getFirestore, Timestamp } = require('firebase-admin/firestore');
    const { getAuth } = require('firebase-admin/auth');
    const app = initializeApp({ projectId: 'demo-udchat' }, 'runtime-test');
    const db = getFirestore(app);
    assert.equal(db.collection('chats').doc('room').path, 'chats/room');
    assert.equal(Timestamp.fromDate(new Date(0)).toMillis(), 0);
    await assert.rejects(getAuth(app).verifyIdToken('invalid-token'));
    await db.terminate();
    await deleteApp(app);
});
test('Heroku SIGTERM shuts down the actual entry point within the deadline', async () => {
    const code = `
      require('./test/fixtures/firebase.cjs').install();
      process.env.PORT = '0'; process.env.DEBUG = 'udchat:server';
      require('./bin/www');
    `;
    const child = spawn(process.execPath, ['-e', code], { cwd: path.join(__dirname, '..'), stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    let sent = false;
    let timer;
    try {
        const result = await new Promise((resolve, reject) => {
            timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('Shutdown timed out: ' + output)); }, 5000);
            child.on('error', reject);
            child.stderr.on('data', chunk => {
                output += chunk;
                if (!sent && output.includes('Listening on')) { sent = true; child.kill('SIGTERM'); }
            });
            child.on('exit', (code, signal) => resolve({ code, signal }));
        });
        assert.equal(sent, true, output);
        assert.deepEqual(result, { code: 0, signal: null });
    } finally { clearTimeout(timer); if (child.exitCode === null) child.kill('SIGKILL'); }
});
