let admin = require('firebase-admin');
//const sgMail = require('@sendgrid/mail');

class commonFunctions {
    convertFromDate(date) {
        let year = date.getFullYear() ;
        let month = date.getMonth() + 1 ;
        let day = date.getDate() ;

        month = '00' + month ;
        month = month.substr(month.length - 2, 2) ;

        day = '00' + day ;
        day = day.substr(day.length - 2, 2) ;

        return year + '-' + month + '-' + day ;
    }

    /*
    sendEmail(uid, email, subject, text) {
        let replyTo = "https://matching4udtalk.herokuapp.com/access?uid=" + uid ;
        let message = '返信はこちらのURLからできます。\n' + replyTo + '\n\n[本文]\n' + text ;

        sgMail.setApiKey(process.env.SENDGRID_API_KEY);

        const msg = {
            to: email,
            from: 'noreply@udtalk.jp',
            subject: subject,
            text: message,
            html: message.replace(/\n/g, '<br />'),
        };
    
        sgMail.send(msg);
    }
    */
}

module.exports =  new commonFunctions;