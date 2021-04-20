let admin = require('firebase-admin');
const uuid = require('node-uuid');

class socketWrapper {
    socketsGroup ;
    socketsInstances ;

    constructor() {
        this.socketsGroup = {} ;
        this.socketsInstances = {} ;
    }

    init(server) {
        const io = require('socket.io')(server);

        io.on('connection', (socket) => {
            socket.on("message", async (msg) => {
                let commands = JSON.parse(msg) ;

                if (commands.length == undefined) {
                    commands = [] ;
                    commands.push(JSON.parse(msg)) ;
                }

                for (let key in commands) {
                    let command = commands[key] ;
                
                    if (command.method == 'requestConnecting') {
                        if (this.socketsInstances[socket.id] == null) {
                            let commands = [] ;

                            let snapshot = await admin.firestore().collection("chat").doc(command.requestId).collection("messages").orderBy('timestamp', 'desc').limit(10).get() ;

                            for (let key in snapshot.docs) {
                                let doc = snapshot.docs[key] ;
                                let command = doc.data() ;

                                try {
                                    command.timestamp = command.timestamp.toDate().toUTCString() ;
                                } catch(e) {

                                }

                                command.needsTranslating = false ;
                                
                                commands.push(command) ;
                            }

                            commands = commands.reverse() ;

                            commands.push(command) ;

                            let ids = await io.in(command.requestId).allSockets() ;

                            for (let socketId of ids) {
                                let command = this.socketsInstances[socketId] ;
                                commands.push(this.createStatusCommand('joined', command)) ;
                            }

                            io.to(socket.id).emit('message', JSON.stringify(commands));
                        }
                    } else {
                        this.socketsInstances[socket.id] = command ;
                        socket.join(command.requestId);

                        command["messageId"] = uuid.v4() ;
                        command["timestamp"] = new Date() ;

                        if (command.method != 'status') {
                            await admin.firestore().collection("chat").doc(command.requestId).collection("messages").doc(command.messageId).set(command) ;
                        }
                        
                        try {
                            command.timestamp = command.timestamp.toDate().toUTCString() ;
                        } catch(e) {

                        }

                        command.needsTranslating = true ;

                        io.to(command.requestId).emit("message", JSON.stringify([command]));
                    }
                }
            }) ;

            socket.on("disconnect", async () => {
                let lastCommand = this.socketsInstances[socket.id] ;

                if (lastCommand != null) {
                    let commands = [] ;

                    {
                        let command = {
                            requestId: lastCommand.requestId,
                            uid: lastCommand.uid,
                            name: lastCommand.name,
                            language: lastCommand.language,
                            message: lastCommand.name + 'が退出しました。',
                            method: 'information',
                        } ;

                        command["messageId"] = uuid.v4() ;
                        command["timestamp"] = new Date() ;
    
                        await admin.firestore().collection("chat").doc(command.requestId).collection("messages").doc(command.messageId).set(command) ;

                        try {
                            command.timestamp = command.timestamp.toDate().toUTCString() ;
                        } catch(e) {

                        }

                        commands.push(command) ;
                    }
    
                    {
                        let command = this.createStatusCommand('left', lastCommand) ;

                        command["messageId"] = uuid.v4() ;
                        command["timestamp"] = new Date() ;

                        commands.push(command) ;
                    }

                    await io.to(lastCommand.requestId).emit("message", JSON.stringify(commands)); 

                    delete  this.socketsInstances[socket.id] ;
                }
            });
        });
    }

    createStatusCommand(status, copiedCommand) {
        return {
            requestId: copiedCommand.requestId,
            uid: copiedCommand.uid,
            name: copiedCommand.name,
            language: '',
            message: '',
            method: 'status',
            param: status
        } ;
    }
};

module.exports = new socketWrapper() ;