
let firebase = require('firebase') ;
let admin = require('firebase-admin');

class firebaseSession {
    async enter(req, res) {
        let sessionCookie = req.cookies.sessionCookie ;
        const expiresIn = 60 * 60 * 24 * 14 * 1000;
        
        if (sessionCookie == undefined) {
            return false ;
        }

        let decodedClaims = null ;

        try {
            decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true) ;

            let user = decodedClaims ;

            if (user.firebase.identities["facebook.com"] == undefined &&
                user.firebase.identities["twitter.com"] == undefined) {
                if (!decodedClaims || !decodedClaims.email_verified) {
                    throw new Error(res.__("メールアドレスが確認されていません。"));
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

            return true ;
        } catch (error) {
            await firebase.auth().signOut() ;
            res.clearCookie('sessionCookie') ;
            delete req.session.user ;

            return false ;
        }
    }

    async signIn(req, res, completion) {
        let email = req.body.email ;
        let password = req.body.password ;
        
        try {
            let userRecord = await firebase.auth().signInWithEmailAndPassword(email, password) ;
            let user = userRecord.user ;

            if (!user.emailVerified) {
                throw new Error(res.__("メールアドレスが確認されていません。"));
            }

            let idToken = await user.getIdToken() ;
        
            const expiresIn = 60 * 60 * 24 * 14 * 1000;

            let sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn }) ;

            await firebase.auth().signOut() ;

            req.session.user = user ;
            res.cookie('sessionCookie', sessionCookie, {maxAge: expiresIn, httpOnly: false});

            completion(true, email, '') ;
        } catch(error) {
            await firebase.auth().signOut() ;
            res.clearCookie('sessionCookie') ;
            delete req.session.user ;

            completion(false, email, error.message) ;
        }
    }

    async signInFromUI(uid, res) {    
        let customToken = await admin.auth().createCustomToken(uid) ;

		let userRecord = await firebase.auth().signInWithCustomToken(customToken) ;
		let user = userRecord.user ;

		let idToken = await user.getIdToken() ;

        const expiresIn = 60 * 60 * 24 * 14 * 1000;
        
		let sessionCookie = await admin.auth().createSessionCookie(idToken, {expiresIn}) ;

		res.cookie('sessionCookie', sessionCookie, {maxAge: expiresIn, httpOnly: false});

		await firebase.auth().signOut() ;
    }

    async signUp(req, res, completion) {
        let email = req.body.email ;
        let password = req.body.password ;

        try {
            let userRecord = await firebase.auth().createUserWithEmailAndPassword(email, password) ;
            let user = userRecord.user ;

            await user.sendEmailVerification() ;

            await firebase.auth().signOut() ;

            completion(true, email, '') ;
        } catch (error) {
            await firebase.auth().signOut() ;
            res.clearCookie('sessionCookie') ;
            delete req.session.user ;

            completion(false, email, error.message) ;
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