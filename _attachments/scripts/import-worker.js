onmessage = function(message) {
    var docs = [];
    var ntRegex = /(<[^>]+>) (<[^>]+>) ((?:<[^>]+>)|(?:\"[^\"]+\")) ./;
    var rows = message.data.split('\n').filter(function(field) {
        // Skip empty rows
        if (field.length > 0) {
            return field;
        }
    });
    rows.forEach(function(row) {
        var doc = {};
        var matcher = row.match(ntRegex);
        if (matcher !== null) {
            doc['subject'] = matcher[1].substring(1, matcher[1].length - 1)
            doc['predicate'] = matcher[2].substring(1, matcher[2].length - 1)
            if (matcher[3].indexOf('<') === 0) {
                doc['object_type'] = 'URI';
            } else {
                doc['object_type'] = 'Literal';
            }
            doc['object'] = matcher[3].substring(1, matcher[3].length - 1);
            doc['permission'] = 'public';
            docs.push(doc);
        }
    });
    if (docs.length > 0) {
        var req = new XMLHttpRequest();
        var url = location.protocol + '//' + location.host + '/' + location.pathname.split('/')[1] + '/';
        var body = {'docs' : docs};
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                postMessage({
                    code: 0,
                    msg: 'Imported ' + docs.length + ' triples.'
                });
            }
        };
        req.open('POST', url + '_bulk_docs');
        req.setRequestHeader('Content-Type', 'application/json');
        req.send(JSON.stringify(body));
    } else {
        postMessage({
            code: 1
        });
    }
};
