async function detect(apiKey, message, completion) {	

    if (apiKey == '') {
        completion("", "") ;
        return ;
    }

    let URL = "https://translation.googleapis.com/language/translate/v2/detect?key=" + apiKey ;
    
    URL += "&q=" + escape(message);;

    let data = await fetch(URL).then(response => response.json()) ;

    try {
        completion(data.data.detections[0][0].language) ;
    } catch (e) {
        completion("", "") ;
    }
}

async function translate(apiKey, message, from, to, completion) {

    if (apiKey == '') {
        completion("", "") ;
        return ;
    }

    if (from != to) {
        let URL = "https://translation.googleapis.com/language/translate/v2?key=" + apiKey ;
        
        if (from != '') {
            URL += "&source=" + from ;
        }
        
        URL += "&target=" + to + "&q=" + escape(message);
    
        let data = await fetch(URL).then(response => response.json()) ;
       
        try {
            completion(data.data.translations[0].translatedText, data.data.translations[0].detectedSourceLanguage) ;
        } catch (e) {
            completion("", "") ;
        }
    } else {
        return "" ;
    }
}

async function supportedLanguages(apiKey) {

    if (apiKey == '') {
        return ;
    }

    let URL = "https://translation.googleapis.com/language/translate/v2/languages?key=" + apiKey ;

    let body = {"target": getDefaultLanguage()} ;

    let data = await fetch(URL, {method: "POST", body: JSON.stringify(body)}).then(response => response.json()) ;
    
    return data.data.languages ;
}

function getDefaultLanguage() {
    let defaultLanguage = ((navigator.languages && navigator.languages[0]) || navigator.language || navigator.userLanguage || navigator.browserLanguage) ;

    if (!defaultLanguage.startsWith("zh-")) {
        return defaultLanguage.split('-')[0] ;
    } else {
        return defaultLanguage ;
    }
}
