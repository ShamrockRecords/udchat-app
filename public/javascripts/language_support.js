async function detect(apiKey, message, completion) {	
    if (apiKey == '') {
        completion("", "") ;
        return ;
    }

    let URL = "https://translation.googleapis.com/language/translate/v2/detect?key=" + apiKey ;
    
    URL += "&q=" + encodeURIComponent(message) ;

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
        
        URL += "&target=" + to + "&q=" + encodeURIComponent(message) ;
    
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

function getSupportedSpeechRecognitionLocales() {
    let localeIdentifiers = ["af-ZA",
                            "sq-AL",
                            "am-ET",
                            "ar-DZ",
                            "ar-BH",
                            "ar-EG",
                            "ar-IQ",
                            "ar-IL",
                            "ar-JO",
                            "ar-KW",
                            "ar-LB",
                            "ar-MA",
                            "ar-OM",
                            "ar-QA",
                            "ar-SA",
                            "ar-PS",
                            "ar-TN",
                            "ar-AE",
                            "ar-YE",
                            "hy-AM",
                            "az-AZ",
                            "eu-ES",
                            "bn-BD",
                            "bn-IN",
                            "bs-BA",
                            "bg-BG",
                            "my-MM",
                            "ca-ES",
                            "yue-Hant-HK",
                            "cmn-Hans-CN",
                            "cmn-Hant-TW",
                            "hr-HR",
                            "cs-CZ",
                            "da-DK",
                            "nl-BE",
                            "nl-NL",
                            "en-AU",
                            "en-CA",
                            "en-GH",
                            "en-HK",
                            "en-IN",
                            "en-IE",
                            "en-KE",
                            "en-NZ",
                            "en-NG",
                            "en-PK",
                            "en-PH",
                            "en-SG",
                            "en-ZA",
                            "en-TZ",
                            "en-GB",
                            "en-US",
                            "et-EE",
                            "fil-PH",
                            "fi-FI",
                            "fr-BE",
                            "fr-CA",
                            "fr-FR",
                            "fr-CH",
                            "gl-ES",
                            "ka-GE",
                            "de-AT",
                            "de-DE",
                            "de-CH",
                            "el-GR",
                            "gu-IN",
                            "iw-IL",
                            "hi-IN",
                            "hu-HU",
                            "is-IS",
                            "id-ID",
                            "it-IT",
                            "it-CH",
                            "ja-JP",
                            "jv-ID",
                            "kn-IN",
                            "kk-KZ",
                            "km-KH",
                            "ko-KR",
                            "lo-LA",
                            "lv-LV",
                            "lt-LT",
                            "mk-MK",
                            "ms-MY",
                            "ml-IN",
                            "mr-IN",
                            "mn-MN",
                            "ne-NP",
                            "no-NO",
                            "fa-IR",
                            "pl-PL",
                            "pt-BR",
                            "pt-PT",
                            "pa-Guru-IN",
                            "ro-RO",
                            "ru-RU",
                            "sr-RS",
                            "si-LK",
                            "sk-SK",
                            "sl-SI",
                            "es-AR",
                            "es-BO",
                            "es-CL",
                            "es-CO",
                            "es-CR",
                            "es-DO",
                            "es-EC",
                            "es-SV",
                            "es-GT",
                            "es-HN",
                            "es-MX",
                            "es-NI",
                            "es-PA",
                            "es-PY",
                            "es-PE",
                            "es-PR",
                            "es-ES",
                            "es-US",
                            "es-UY",
                            "es-VE",
                            "su-ID",
                            "sw-KE",
                            "sw-TZ",
                            "sv-SE",
                            "ta-IN",
                            "ta-MY",
                            "ta-SG",
                            "ta-LK",
                            "te-IN",
                            "th-TH",
                            "tr-TR",
                            "uk-UA",
                            "ur-IN",
                            "ur-PK",
                            "uz-UZ",
                            "vi-VN",
                            "zu-ZA"] ;

    let supportedLocales= [] ;
    try {
        for (let key in localeIdentifiers) {
            let localeIdentifier = localeIdentifiers[key] ;
            let languageDisplayNames = new Intl.DisplayNames(getDefaultLanguage(), { type: 'language' });
            let regionDisplayNames = new Intl.DisplayNames(getDefaultLanguage(), { type: 'region' });
            
            let supportedLocale = {} ;

            try {
                supportedLocale['language'] = localeIdentifier ;

                let tempLocaleIdentifier = '' ;

                if (localeIdentifier == "yue-Hant-HK") {
                    tempLocaleIdentifier = "zh-HK" ;
                } else if (localeIdentifier == "cmn-Hans-CN") {
                    tempLocaleIdentifier = "zh-CN" ;
                } else if (localeIdentifier == "cmn-Hant-TW") {
                    tempLocaleIdentifier = "zh-TW" ;
                } else if (localeIdentifier == "pa-Guru-IN") {
                    continue ;
                } else {
                    tempLocaleIdentifier = localeIdentifier ;
                }
                
                let language = tempLocaleIdentifier.split('-')[0] ;
                let region = tempLocaleIdentifier.split('-')[1] ;

                supportedLocale['name'] = languageDisplayNames.of(language) + '(' + regionDisplayNames.of(region) + ')' ;
            } catch(e) {
                supportedLocale['language'] = localeIdentifier ;
                supportedLocale['name'] = localeIdentifier ;
            }

            supportedLocales.push(supportedLocale) ;
        }

        supportedLocales = supportedLocales.sort((a, b) => {
            if (a.name > b.name) {
                return 1 ;
            } else if (a.name < b.name) {
                return -1 ;
            } else {
                return 0 ;
            }
        }) ;

        return supportedLocales ;
    } catch (e) {
        return [] ;
    }
}

