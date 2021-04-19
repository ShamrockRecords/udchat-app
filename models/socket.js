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
                let command = JSON.parse(msg) ;

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

                        io.to(socket.id).emit('message', JSON.stringify(commands));
                    } 

                    return ;
                }

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
            }) ;

            socket.on("disconnect", async () => {
                let command = this.socketsInstances[socket.id] ;

                if (command != null) {
                    command.message = command.name + 'が退出しました。' ;

                    command["messageId"] = uuid.v4() ;
                    command["timestamp"] = new Date() ;
                    command["method"] = 'information' ;
                    command["param"] = 'left' ;
   
                    await admin.firestore().collection("chat").doc(command.requestId).collection("messages").doc(command.messageId).set(command) ;

                    try {
                        command.timestamp = command.timestamp.toDate().toUTCString() ;
                    } catch(e) {

                    }
        
                    await io.to(command.requestId).emit("message", JSON.stringify([command])); 

                    delete  this.socketsInstances[socket.id] ;
                }
            });
        });
    }
};

module.exports = new socketWrapper() ;