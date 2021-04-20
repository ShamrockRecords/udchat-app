function getDateString(timestamp) {
    let date = new Date(timestamp) ;
    return date.toLocaleString('ja-JP') ;
}

function escapeHTML(string){
    return string.replace(/\&/g, '&amp;')
    .replace(/\</g, '&lt;')
    .replace(/\>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/\'/g, '&#x27');
}

function unescapeHTML(escapedHtml) {
    const doc = new DOMParser().parseFromString(escapedHtml, 'text/html');
    return doc.documentElement.textContent;
}