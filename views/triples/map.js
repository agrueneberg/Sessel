function (doc) {
    var toType, keys, attachments;
    // toType was written by Angus Croll:
    // http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
    toType = function (obj) {
        return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    };
    keys = Object.keys(doc);
    keys.forEach(function (key, idx) {
        var value, type, subject, predicate, object, attachments;
        value = doc[key];
        if (key.charAt(0) !== "_") {
            // Ignore CouchDB-specific properties that start with "_".
            type = toType(value);
            // URL encode key and property.
            subject = encodeURIComponent(doc._id);
            predicate = encodeURIComponent(key);
            // Stringify value.
            object = JSON.stringify(value);
            emit([subject, predicate, object], {
                objectType: type
            });
        } else if (key === "_attachments") {
            // Special treatment for attachments.
            attachments = Object.keys(doc["_attachments"]);
            attachments.forEach(function (attachment) {
                emit([doc._id, "attachment", attachment], {
                    objectType: "_attachment"
                });
            });
        }
    });
}
