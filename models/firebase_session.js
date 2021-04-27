
let firebase = require('firebase') ;
let admin = require('firebase-admin');

class firebaseSession {

    async enter(req, res) {
        let sessionCookie = req.cookies.sessionCookie ;
        const expiresIn = 60 * 60 * 24 * 14 * 1000;
        
        if (sessionCookie == undefined) {
            return 1 ;
        }

        let decodedClaims = null ;

        try {
            decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true) ;

            let user = decodedClaims ;

            if (user.firebase.identities["facebook.com"] == undefined &&
                user.firebase.identities["twitter.com"] == undefined) {

                let _user = await admin.auth().getUser(user.uid) ;
                
                if (!_user.emailVerified) {
                    let customToken = await admin.auth().createCustomToken(decodedClaims.uid) ;

                    let userRecord = await firebase.auth().signInWithCustomToken(customToken) ;

                    try {
                        await userRecord.user.sendEmailVerification() ;
                    } catch (error) {

                    }
                    
                    await firebase.auth().signOut() ;

                    return 2 ;
                }
            }
            
            /*
            let customToken = await admin.auth().createCustomToken(decodedClaims.uid) ;

            let userRecord = await firebase.auth().signInWithCustomToken(customToken) ;
            let user = userRecord.user ;

            let idToken = await user.getIdToken() ;

            sessionCookie = await admin.auth().createSessionCookie(idToken, {expiresIn}) ;

            res.cookie('sessionCookie', sessionCookie, {maxAge: expiresIn, httpOnly: false});
        
            await firebase.auth().signOut() ;
            */
           
            req.session.user = user ;

            return 0 ;
        } catch (error) {
            await firebase.auth().signOut() ;
            res.clearCookie('sessionCookie') ;
            delete req.session.user ;

            return -1 ;
        }
    }

    async updateEmail(req, res, email) {
        let sessionCookie = req.cookies.sessionCookie ;

        if (sessionCookie == undefined) {
            return 1 ;
        }

        let decodedClaims = null ;

        try {
            decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true) ;

            let customToken = await admin.auth().createCustomToken(decodedClaims.uid) ;

            let userRecord = await firebase.auth().signInWithCustomToken(customToken) ;
            
            await userRecord.user.updateEmail(email) ;

            await firebase.auth().signOut() ;
            
            return 0 ;
        } catch(e) {
            return -1 ;
        }
    }

    async signIn(req, res, completion) {
        let email = req.body.email ;
        let password = req.body.password ;
        
        try {
            let userRecord = await firebase.auth().signInWithEmailAndPassword(email, password) ;
            let user = userRecord.user ;

            if (!user.emailVerified) {
                await user.sendEmailVerification() ;
                throw new Error(res.__("メールアドレスが確認されていません。"));
            }

            let idToken = await user.getIdToken() ;
        
            const expiresIn = 60 * 60 * 24 * 14 * 1000;

            let sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn }) ;

            await firebase.auth().signOut() ;

            req.session.user = user ;
            res.cookie('sessionCookie', sessionCookie, {maxAge: expiresIn, httpOnly: false});

            completion(0, email, '') ;
        } catch(error) {
            await firebase.auth().signOut() ;
            res.clearCookie('sessionCookie') ;
            delete req.session.user ;

            completion(-1, email, error.message) ;
        }
    }

    async signInFromUI(uid, res) {    
        try {
            let customToken = await admin.auth().createCustomToken(uid) ;

            let userRecord = await firebase.auth().signInWithCustomToken(customToken) ;
            let user = userRecord.user ;

            let idToken = await user.getIdToken() ;

            const expiresIn = 60 * 60 * 24 * 14 * 1000;
            
            let sessionCookie = await admin.auth().createSessionCookie(idToken, {expiresIn}) ;

            res.cookie('sessionCookie', sessionCookie, {maxAge: expiresIn, httpOnly: false});

            await firebase.auth().signOut() ;

            return 0 ;
        } catch (e) {
            console.log(e) ;
            return -1 ;
        }
    }

    async signUp(req, res, completion) {
        let email = req.body.email ;
        let password = req.body.password ;

        try {
            let userRecord = await firebase.auth().createUserWithEmailAndPassword(email, password) ;
            let user = userRecord.user ;

            await user.sendEmailVerification() ;

            await firebase.auth().signOut() ;

            completion(0, email, '') ;
        } catch (error) {
            await firebase.auth().signOut() ;
            res.clearCookie('sessionCookie') ;
            delete req.session.user ;

            completion(-1, email, error.message) ;
        }
    }

    async signOut(req, res, completion) {
        res.clearCookie('sessionCookie') ;
        delete req.session.user ;

        completion() ;
    }

    async resetPassword(email) {
        await firebase.auth().sendPasswordResetEmail(email) ;
    }
}

module.exports =  new firebaseSession;