onmessage = function (message) {
    var docs, nTriplesPattern, rows, req, url, body;
    docs = [];
    // Parser for N-Triples (http://www.w3.org/2001/sw/RDFCore/ntriples)
    // Blank nodes are not covered because Sessel does not support them yet.
    // RFC 2396 does not mention how to deal with ">" characters in URIs,
    // therefore we will take what we get and do the validation in the next step.
    //
    // Documentation:
    // ^
    // \s*
    // (?:
    //   (?#Comment in the range of printable characters)
    //     #
    //     [\x20-\x7E]*
    // |
    //   (?#Subject URI)
    //     (<[^>]+>)
    //   \s+
    //   (?#Predicate URI)
    //     (<[^>]+>)
    //   \s+
    //   (
    //     (?#Object URI)
    //       <[^>]+>
    //   |
    //     (?#Object literal in the range of printable characters)
    //       "[\x20-\x7E]*"
    //   )
    //   \s*
    //   \.
    //   \s*
    // )?
    // $
    nTriplesPattern = /^\s*(?:#[\x20-\x7E]*|(<[^>]+>)\s+(<[^>]+>)\s+(<[^>]+>|"[\x20-\x7E]*")\s*\.\s*)?$/;
    rows = message.data.split('\n');
    rows.forEach(function (row) {
        var doc, matcher;
        doc = {};
        matcher = row.match(nTriplesPattern);
        // Skip comments and empty lines
        if (matcher !== null && !(matcher[1] === undefined && matcher[2] === undefined && matcher[3] === undefined)) {
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
        req = new XMLHttpRequest();
        url = location.protocol + '//' + location.host + '/' + location.pathname.split('/')[1] + '/';
        body = {'docs' : docs};
        req.onreadystatechange = function () {
            var responseObject, insertedDocuments;
            if (req.readyState == 4) {
                responseObject = JSON.parse(req.responseText);
                insertedDocuments = 0;
                responseObject.forEach(function (doc) {
                    // If there is a rev attribute, the document was inserted successfully.
                    if (doc.rev) {
                        insertedDocuments++;
                    }
                });
                postMessage({
                    code: 0,
                    msg: 'Imported ' + insertedDocuments + ' of ' + docs.length + ' triples.'
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
