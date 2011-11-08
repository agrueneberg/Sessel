var config, toType;

// Load dependencies.
config = require("views/lib/config");
toType = require("views/lib/toType").toType;

exports.triplify = function triplify(obj, opts, emit) {
    var keys;
    keys = Object.keys(obj);
    keys.forEach(function (key, idx) {
        var value;
        value = obj[key];
        if (key === "_attachments") {
            triplify(value, {
                "mode" : "attachment",
                "id" : opts.id
            }, emit);
        }
        if (key.charAt(0) !== "_") {
            var type, ref;
            type = toType(value);
            switch (type) {
                case "object":
                case "array":
                    // "attachment" mode creates triples that link to attachments.
                    if (opts.mode && opts.mode === "attachment") {
                        emit([
                            "<" + config.baseUri + opts.id + ">",
                            "<" + config.baseUri + config.verbPrefix + "hasAttachment>",
                            "<" + config.couchDbUri + opts.id + "/" + key + ">"
                        ], {});
                    } else {
                        // Dont allow more than one fragment.
                        ref = (opts.id.indexOf("#") === -1) ? (opts.id + "#" + key) : (opts.id + "/" + key);
                        emit([
                            "<" + config.baseUri + opts.id + ">",
                            "<" + config.baseUri + config.verbPrefix + key + ">",
                            // Append first index for an array.
                            "<" + config.baseUri + ((type === "array") ? (ref + "/0") : (ref)) + ">"
                        ], {});
                        triplify(value, {
                            "mode" : type,
                            "id" : ref
                        }, emit);
                    }
                    break;
                case "string":
                case "number":
                case "boolean":
                    // "array" mode uses RDF lists.
                    if (opts.mode && opts.mode === "array") {
                        emit([
                            "<" + config.baseUri + opts.id + "/" + idx + ">",
                            "<http://www.w3.org/1999/02/22-rdf-syntax-ns#first>",
                            "\"" + value + "\""
                        ], {
                            "objectType" : type
                        });
                        // Emit rdf:nil on last element.
                        if (idx === (keys.length - 1)) {
                            emit([
                                "<" + config.baseUri + opts.id + "/" + idx + ">",
                                "<http://www.w3.org/1999/02/22-rdf-syntax-ns#rest>",
                                "<http://www.w3.org/1999/02/22-rdf-syntax-ns#nil>"
                            ], {});
                        } else {
                            emit([
                                "<" + config.baseUri + opts.id + "/" + idx + ">",
                                "<http://www.w3.org/1999/02/22-rdf-syntax-ns#rest>",
                                "<" + config.baseUri + opts.id + "/" + (idx + 1) + ">"
                            ], {});
                        }
                    } else {
                        emit([
                            "<" + config.baseUri + opts.id + ">",
                            "<" + config.baseUri + config.verbPrefix + key + ">",
                            "\"" + value + "\""
                        ], {
                            "objectType" : type
                        });
                    }
                    break;
            }
        }
    });
};
