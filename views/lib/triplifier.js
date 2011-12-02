var toType;

// Load dependencies.
toType = require("views/lib/toType").toType;

exports.triplify = function triplify(doc, callback) {
    var keys, attachments;
    keys = Object.keys(doc);
    keys.forEach(function (key, idx) {
        var value, type, attachments;
        value = doc[key];
        if (key.charAt(0) !== "_") {
            // Ignore CouchDB-specific properties that start with "_".
            type = toType(value);
            callback([doc._id, key, JSON.stringify(value)], {
                objectType: type
            });
        } else if (key === "_attachments") {
            // Special treatment for attachments.
            attachments = Object.keys(doc["_attachments"]);
            attachments.forEach(function (attachment) {
                callback([doc._id, "attachment", attachment], {
                    objectType: "_attachment"
                });
            });
        }
    });
};
