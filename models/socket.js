const admin = require('firebase-admin');
const { randomUUID } = require('node:crypto');
const { Server } = require('socket.io');
const { verifyToken, roomVersion } = require('./chat_access');
const { textField } = require('./security');

class SocketWrapper {
    init(server) {
        const io = new Server(server, { maxHttpBufferSize: 32 * 1024 });
        this.io = io;
        this.closing = false;
        this.pending = new Set();
        io.use(async (socket, next) => {
            try {
                const access = verifyToken(socket.handshake.auth.token);
                const room = (await admin.firestore().collection('chats').doc(access.requestId).get()).data();
                if (!room || roomVersion(room) !== access.version) throw new Error('Chat access changed.');
                socket.data.access = access;
                next();
            } catch {
                next(new Error('Please reopen the chat and enter its passcode.'));
            }
        });
        io.on('connection', socket => {
            let pending = 0;
            let chain = Promise.resolve();
            const fail = error => {
                console.error('Chat operation failed:', error.code || error.name);
                if (socket.connected) socket.emit('chatError', { message: 'Unable to process the message. Please try again.' });
            };
            socket.on('message', msg => {
                if (this.closing || pending >= 20) return;
                pending++;
                chain = chain.then(() => this.receive(io, socket, msg)).catch(fail).finally(() => pending--);
                this.track(chain);
            });
            socket.on('disconnect', () => {
                chain = chain.then(async () => {
                    const previous = socket.data.lastCommand;
                    if (!previous || this.closing) return;
                    const command = {
                        requestId: previous.requestId, uid: previous.uid, name: previous.name,
                        language: previous.language, message: previous.name + 'が退出しました。', method: 'information',
                        messageId: randomUUID(), timestamp: new Date(),
                    };
                    await this.messages(command.requestId).doc(command.messageId).set(command);
                    io.to(command.requestId).emit('message', JSON.stringify([
                        command, { ...command, method: 'status', param: 'left', message: '', messageId: randomUUID() },
                    ]));
                }).catch(fail);
                this.track(chain);
            });
        });
        return io;
    }
    messages(id) { return admin.firestore().collection('chat').doc(id).collection('messages'); }
    async receive(io, socket, msg) {
        const access = socket.data.access;
        if (!socket.connected) return;
        if (access.expires <= Date.now()) { socket.disconnect(true); return; }
        if (typeof msg !== 'string') throw new Error('Invalid message.');
        const parsed = JSON.parse(msg);
        const commands = Array.isArray(parsed) ? parsed : [parsed];
        if (commands.length === 0 || commands.length > 10) throw new Error('Invalid command count.');
        // Bound write rate per connection without dropping an ordinary typing/focus burst.
        const now = Date.now();
        if (!socket.data.window || now - socket.data.window > 10000) {
            socket.data.window = now;
            socket.data.count = 0;
        }
        socket.data.count += commands.length;
        if (socket.data.count > 100) throw new Error('Too many messages.');
        for (const input of commands) {
            if (!input || input.requestId !== access.requestId ||
                !['requestConnecting', 'message', 'information', 'status'].includes(input.method)) {
                throw new Error('Invalid command.');
            }
            if (input.method === 'requestConnecting') {
                if (socket.data.ready) continue;
                const snapshot = await this.messages(access.requestId).orderBy('timestamp', 'desc').limit(10).get();
                if (!socket.connected) return;
                const history = snapshot.docs.map(doc => {
                    const command = doc.data();
                    if (command.timestamp?.toDate) command.timestamp = command.timestamp.toDate();
                    return { ...command, needsTranslating: false };
                }).reverse();
                await socket.join(access.requestId);
                socket.data.ready = true;
                history.push({ method: 'requestConnecting', requestId: access.requestId });
                for (const id of await io.in(access.requestId).allSockets()) {
                    const status = io.sockets.sockets.get(id)?.data.lastStatus;
                    if (status) history.push(status);
                }
                socket.emit('message', JSON.stringify(history));
                continue;
            }
            if (!socket.data.ready) throw new Error('Join the chat first.');
            const command = {
                requestId: access.requestId, uid: access.uid,
                name: textField(input.name, 100, true), language: textField(input.language, 35),
                message: textField(input.message, 10000), method: input.method,
                messageId: randomUUID(), timestamp: new Date(),
            };
            for (const field of ['translation', 'reverseTranslation']) {
                if (input[field] !== undefined) command[field] = textField(input[field], 10000);
            }
            if (command.method === 'status') {
                if (!['joined', 'focused', 'unfocused', 'left'].includes(input.param)) throw new Error('Invalid status.');
                command.param = input.param;
                socket.data.lastStatus = command;
            } else {
                await this.messages(access.requestId).doc(command.messageId).set(command);
            }
            socket.data.lastCommand = command;
            io.to(access.requestId).emit('message', JSON.stringify([{ ...command, needsTranslating: true }]));
        }
    }
    track(operation) {
        this.pending.add(operation);
        operation.finally(() => this.pending.delete(operation));
    }
    close(callback) {
        this.closing = true;
        this.io.close(async () => {
            await Promise.allSettled([...this.pending]);
            callback();
        });
    }
}
module.exports = new SocketWrapper();
