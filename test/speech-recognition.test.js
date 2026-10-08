const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(onTranscript) {
    let recognition;
    const timers = new Map();
    const posts = [];
    const states = [];
    const errors = [];
    let language = 'ja-JP';
    let timerId = 0;
    class FakeRecognition {
        constructor() { recognition = this; this.starts = 0; this.aborts = 0; }
        start() { this.starts++; }
        abort() { this.aborts++; }
    }
    const create = vm.runInNewContext(
        fs.readFileSync('public/javascripts/speech_recognition.js', 'utf8') + '\ncreateContinuousSpeechRecognition;', {
            setTimeout(callback, delay) { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
            clearTimeout(id) { timers.delete(id); },
        });
    const controller = create({
        SpeechRecognition: FakeRecognition,
        getLanguage: () => language,
        onTranscript: onTranscript || (text => posts.push(text)),
        onStateChange: enabled => states.push(enabled),
        onError: error => errors.push(error),
    });
    return {
        controller, recognition, timers, posts, states, errors,
        setLanguage(value) { language = value; },
        runRestart() {
            assert.equal(timers.size, 1);
            const [id, timer] = [...timers][0];
            timers.delete(id);
            timer.callback();
        },
    };
}
function result(text, isFinal = true) {
    return Object.assign([{ transcript: text }], { isFinal });
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('continuous recognition posts each final utterance once and keeps listening', async () => {
    const { controller, recognition, posts, states } = setup();
    controller.start(); recognition.onstart();
    assert.equal(recognition.continuous, true);
    assert.equal(recognition.interimResults, false);
    assert.equal(recognition.lang, 'ja-JP');
    // Intermediate hypotheses are never published.
    recognition.onresult({ resultIndex: 0, results: [result('途中', false)] });
    recognition.onresult({ resultIndex: 0, results: [result(' 一つ目 ')] });
    // An event can include several new final results along with old history.
    recognition.onresult({ resultIndex: 1, results: [result('一つ目'), result('二つ目'), result('三つ目')] });
    recognition.onresult({ resultIndex: 0, results: [result('一つ目'), result('二つ目'), result('三つ目')] });
    await settle();
    assert.deepEqual(posts, ['一つ目', '二つ目', '三つ目']);
    assert.equal(recognition.aborts, 0);
    assert.equal(recognition.onspeechend, undefined);
    assert.deepEqual(states, [true]);
});

test('browser session endings restart recognition and reset result indexes', async () => {
    const fixture = setup();
    fixture.controller.start(); fixture.recognition.onstart();
    fixture.recognition.onresult({ resultIndex: 0, results: [result('同じ発話')] });
    fixture.recognition.onend();
    fixture.setLanguage('en-US');
    fixture.runRestart(); fixture.recognition.onstart();
    fixture.recognition.onresult({ resultIndex: 0, results: [result('同じ発話')] });
    await settle();
    assert.equal(fixture.recognition.starts, 2);
    assert.equal(fixture.recognition.lang, 'en-US');
    assert.deepEqual(fixture.posts, ['同じ発話', '同じ発話']);
    assert.deepEqual(fixture.states, [true]);
});

test('stop aborts the microphone, ignores late results and cancels pending restarts', async () => {
    const fixture = setup();
    fixture.controller.toggle(); fixture.recognition.onstart();
    fixture.controller.toggle();
    fixture.recognition.onresult({ resultIndex: 0, results: [result('送信しない')] });
    fixture.recognition.onerror({ error: 'aborted' });
    fixture.recognition.onend();
    await settle();
    assert.equal(fixture.recognition.aborts, 1);
    assert.equal(fixture.timers.size, 0);
    assert.deepEqual(fixture.posts, []);
    assert.deepEqual(fixture.states, [true, false]);
    fixture.controller.start(); fixture.recognition.onend();
    assert.equal(fixture.timers.size, 1);
    fixture.controller.stop();
    assert.equal(fixture.timers.size, 0);
});

test('rapid start/stop/start waits for the aborted session to end', () => {
    const fixture = setup();
    fixture.controller.toggle();
    fixture.controller.toggle();
    fixture.controller.toggle();
    assert.equal(fixture.recognition.starts, 1);
    fixture.recognition.onstart();
    fixture.recognition.onerror({ error: 'aborted' });
    fixture.recognition.onend(); fixture.runRestart();
    assert.equal(fixture.recognition.starts, 2);
    assert.deepEqual(fixture.states, [true, false, true]);
});

test('silence resumes automatically; transient network errors back off', () => {
    const fixture = setup();
    fixture.controller.start(); fixture.recognition.onstart();
    fixture.recognition.onerror({ error: 'no-speech' });
    fixture.recognition.onend(); fixture.runRestart();
    for (const delay of [1000, 2000, 4000, 8000, 8000]) {
        fixture.recognition.onstart();
        fixture.recognition.onerror({ error: 'network' });
        fixture.recognition.onend();
        assert.equal([...fixture.timers.values()][0].delay, delay);
        fixture.runRestart();
    }
    assert.deepEqual(fixture.states, [true]);
});

test('permission and device errors stop rather than repeatedly asking for access', () => {
    for (const error of ['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported', 'aborted']) {
        const fixture = setup();
        fixture.controller.start(); fixture.recognition.onstart();
        fixture.recognition.onerror({ error }); fixture.recognition.onend();
        assert.equal(fixture.timers.size, 0);
        assert.equal(fixture.states.at(-1), false);
        assert.equal(fixture.errors.length, 1);
    }
});

test('asynchronous posting preserves utterance order without stopping recognition', async () => {
    const posts = [];
    let finishFirst;
    const gate = new Promise(resolve => { finishFirst = resolve; });
    const fixture = setup(async text => {
        if (text === 'first') await gate;
        posts.push(text);
    });
    fixture.controller.start(); fixture.recognition.onstart();
    fixture.recognition.onresult({ resultIndex: 0, results: [result('first'), result('second'), result('third')] });
    await settle();
    assert.deepEqual(posts, []);
    assert.equal(fixture.recognition.aborts, 0);
    finishFirst(); await settle();
    assert.deepEqual(posts, ['first', 'second', 'third']);
});

test('empty results and a failed submission do not block later utterances', async () => {
    const posts = [];
    const fixture = setup(text => {
        if (text === 'failed') throw new Error('Failed');
        posts.push(text);
    });
    fixture.controller.start(); fixture.recognition.onstart();
    fixture.recognition.onresult({ resultIndex: 0, results: [result(' '), result('failed'), result('next')] });
    await settle();
    assert.deepEqual(posts, ['next']);
    assert.equal(fixture.errors.length, 1);
});

test('a rejected start resets the button and does not spin on retries', () => {
    const fixture = setup();
    fixture.recognition.start = () => { throw new Error('Unavailable'); };
    fixture.controller.start();
    assert.deepEqual(fixture.states, [true, false]);
    assert.equal(fixture.timers.size, 0);
    assert.equal(fixture.errors.length, 1);
});
