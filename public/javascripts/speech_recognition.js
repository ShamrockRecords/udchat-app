// Keep the user's start/stop choice separate from each browser recognition session.
function createContinuousSpeechRecognition({ SpeechRecognition, getLanguage, onTranscript, onStateChange, onError }) {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;

    let enabled = false;
    let phase = 'idle';
    let restartTimer = null;
    let restartDelay = 250;
    let submissions = Promise.resolve();
    const submittedIndexes = new Set();

    function cancelRestart() {
        if (restartTimer !== null) clearTimeout(restartTimer);
        restartTimer = null;
    }

    function startSession() {
        if (!enabled || phase !== 'idle') return;
        phase = 'starting';
        submittedIndexes.clear();
        try {
            recognition.lang = getLanguage();
            recognition.start();
        } catch (error) {
            phase = 'idle';
            stop();
            onError(error);
        }
    }

    function start() {
        if (enabled) return;
        enabled = true;
        restartDelay = 250;
        onStateChange(true);
        startSession();
    }

    function stop() {
        enabled = false;
        cancelRestart();
        onStateChange(false);
        if (phase === 'starting' || phase === 'listening') {
            phase = 'stopping';
            recognition.abort();
        }
    }

    recognition.onstart = () => {
        if (phase !== 'stopping') phase = 'listening';
    };
    recognition.onresult = event => {
        if (!enabled || phase === 'stopping') return;
        for (let index = event.resultIndex; index < event.results.length; index++) {
            const result = event.results[index];
            if (!result.isFinal || submittedIndexes.has(index)) continue;
            submittedIndexes.add(index);
            const text = result[0].transcript.trim();
            if (!text) continue;
            restartDelay = 250;
            // Translation is asynchronous. Preserve utterance order without pausing the microphone.
            submissions = submissions.then(() => onTranscript(text)).catch(onError);
        }
    };
    recognition.onerror = event => {
        if (event.error === 'aborted' && phase === 'stopping') return;
        if (event.error === 'no-speech') return;
        if (event.error === 'network') {
            restartDelay = Math.min(Math.max(1000, restartDelay * 2), 8000);
            return;
        }
        // Permission/device errors and browser cancellation require another user action.
        stop();
        onError(event);
    };
    recognition.onend = () => {
        phase = 'idle';
        cancelRestart();
        if (!enabled) return;
        restartTimer = setTimeout(() => {
            restartTimer = null;
            startSession();
        }, restartDelay);
    };

    return { start, stop, toggle: () => enabled ? stop() : start() };
}
