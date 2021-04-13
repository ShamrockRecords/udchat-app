function getDateString(timestamp) {
    let date = new Date(timestamp) ;
    return date.toLocaleString('ja-JP') ;
}

function autoLink(str) {
    var regexp_url = /((h?)(ttps?:\/\/[a-zA-Z0-9.\-_@:/~?%&;=+#',()*!]+))/g; // ']))/;
    var regexp_makeLink = function(all, url, h, href) {
        return '<a href="h' + href + '">' + url + '</a>';
    }
 
    return str.replace(regexp_url, regexp_makeLink);
}