function (head, req) {

    var baseUri, prefix, typeLiterals, tripleIterator, formatTriple, xmlEscape;

 // Object.keys support in older environments:
 // https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/keys#Compatibility
    if (!Object.keys) {
        Object.keys = (function () {
            var hasOwnProperty, hasDontEnumBug, dontEnums, dontEnumsLength;
            hasOwnProperty = Object.prototype.hasOwnProperty;
            hasDontEnumBug = !({toString: null}).propertyIsEnumerable("toString");
            dontEnums = [
                "toString",
                "toLocaleString",
                "valueOf",
                "hasOwnProperty",
                "isPrototypeOf",
                "propertyIsEnumerable",
                "constructor"
            ];
            dontEnumsLength = dontEnums.length;
            return function (obj) {
                var result, prop, i;
                if (typeof obj !== "object" && typeof obj !== "function" || obj === null) {
                    throw new TypeError("Object.keys called on non-object");
                }
                result = [];
                for (prop in obj) {
                    if (hasOwnProperty.call(obj, prop)) {
                        result.push(prop);
                    }
                }
                if (hasDontEnumBug) {
                    for (i = 0; i < dontEnumsLength; i++) {
                        if (hasOwnProperty.call(obj, dontEnums[i])) {
                            result.push(dontEnums[i]);
                        }
                    }
                }
                return result;
            };
        }());
    }

    /**
     * The base URI.
     */
    if (req.query.hasOwnProperty("base_uri") === true && req.query["base_uri"] !== "") {
        baseUri = req.query["base_uri"];
    } else {
     // "Host" is a mandatory header since HTTP/1.1.
        baseUri = "http://" + req.headers["Host"] + "/" + req.info.db_name + "/_design/sessel/_rewrite/";
    }

    /**
     * The prefix of the base URI.
     */
     if (req.query.hasOwnProperty("prefix") === true && req.query.prefix !== "") {
        prefix = req.query["prefix"];
     } else {
        prefix = "sessel";
     }

    /**
     * Flag to type literals.
     */
     if (req.query.hasOwnProperty("type_literals") === true && req.query["type_literals"] === "true") {
        typeLiterals = true;
     } else {
        typeLiterals = false;
     }

    /**
     * Iterate over triples.
     * @param callback Function to apply to each triple.
     */
    tripleIterator = function (callback) {
        var row;
        while (row = getRow()) {
            callback(row.key, row.value);
        }
    };

    /**
     * Format triple.
     * @param triple
     * @param annotations
     * @param [opts]
     *        - prefixes Table of prefixes to build QNames.
     *        - typeLiterals True if literals should be typed.
     * @return Formatted triple
     */
    formatTriple = function (triple, annotations, opts) {
        var prefixes, typeLiterals, formattedTriple;
        opts = opts || {};
        prefixes = opts.prefixes || null;
        typeLiterals = opts.typeLiterals || false;
        formattedTriple = [];
        if (prefixes !== null && prefixes[baseUri] !== undefined) {
         // Use QNames if the URI can be resolved to a prefix.
            formattedTriple[0] = prefixes[baseUri] + ":" + triple[0];
            formattedTriple[1] = prefixes[baseUri + "vocab/#"] + ":" + triple[1];
        } else {
         // Use a URI if no suitable prefix can be found.
            formattedTriple[0] = "<" + baseUri + triple[0] + ">";
            formattedTriple[1] = "<" + baseUri + "vocab/#" + triple[1] + ">";
        }
        switch (annotations.objectType) {
            case "object":
            case "array":
            case "null":
             // Escape quotation marks.
                formattedTriple[2] = "\"" + triple[2].replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\"";
                break;
            case "_attachment":
             // Expand URLs to attachments.
                formattedTriple[2] = "\"" + baseUri + triple[0] + "/" + triple[2] + "\"";
                break;
            default:
                formattedTriple[2] = triple[2];
                break;
        }
     // Type literals.
        if (typeLiterals === true) {
            switch (annotations.objectType) {
                case "string":
                case "object":
                case "array":
                case "null":
                case "_attachment":
                    formattedTriple[2] += "^^<http://www.w3.org/2001/XMLSchema#string>";
                    break;
                case "number":
                 // Wrap number into quotation marks first.
                    formattedTriple[2] = "\"" + formattedTriple[2] + "\"";
                    if (triple[2] % 1 === 0) {
                        formattedTriple[2] += "^^<http://www.w3.org/2001/XMLSchema#integer>";
                    } else {
                        formattedTriple[2] += "^^<http://www.w3.org/2001/XMLSchema#double>";
                    }
                    break;
                case "boolean":
                    formattedTriple[2] = "\"" + formattedTriple[2] + "\"";
                    formattedTriple[2] += "^^<http://www.w3.org/2001/XMLSchema#boolean>";
                    break;
            }
        }
        return formattedTriple;
    };

    /**
     * Needed to generate RDF/XML.
     */
    xmlEscape = function (doc) {
        doc = doc.replace(/&/g, "&amp;");
        doc = doc.replace(/</g, "&lt;");
        doc = doc.replace(/>/g, "&gt;");
        doc = doc.replace(/"/g, "&quot;");
        doc = doc.replace(/'/g, "&apos;");
        return doc;
    };

    /**
     * Output N-Triples.
     * "The Internet media type / MIME type of N-Triples is text/plain." (doh)
     * TODO: "Character encoding is 7-bit US-ASCII."
     */
    registerType("nt", "text/plain");
    provides("nt", function () {
        start({
            "headers": {
                "Content-Disposition": "attachment; filename=" + req.info.db_name + ".nt"
            }
        });
        tripleIterator(function (triple, annotations) {
            var formattedTriple;
            formattedTriple = formatTriple(triple, annotations, {
                typeLiterals: typeLiterals
            });
            if (typeLiterals === false) {
                switch (annotations.objectType) {
                    case "number":
                    case "boolean":
                        formattedTriple[2] = "\"" + formattedTriple[2] + "\"";
                        break;
                }
            }
            send(formattedTriple.join(" ") + " .\n");
        });
    });

    /**
     * Output Turtle (Terse RDF Triple Language).
     */
    registerType("ttl", "text/turtle");
    provides("ttl", function () {
        var prefixes, firstSubject, currentSubject;
        start({
            "headers": {
                "Content-Disposition": "attachment; filename=" + req.info.db_name + ".ttl"
            }
        });
        prefixes = {};
        prefixes[baseUri] = prefix;
        prefixes[baseUri + "vocab/#"] = prefix + "Vocab";
        Object.keys(prefixes).forEach(function (uri) {
            send("@prefix " + prefixes[uri] + ": <" + uri + "> .\n");
        });
        firstSubject = true;
        tripleIterator(function (triple, annotations) {
            var formattedTriple;
            formattedTriple = formatTriple(triple, annotations, {
                prefixes: prefixes,
                typeLiterals: typeLiterals
            });
         // Abbreviate Turtle.
            if (firstSubject === true || currentSubject !== formattedTriple[0]) {
             // Skip first period.
                if (firstSubject === true) {
                    firstSubject = false;
                } else {
                    send(" .\n");
                }
             // Send the full triple.
                send(formattedTriple.join(" "));
            } else {
             // Send the abbreviated triple.
                send(" ;\n    " + formattedTriple[1] + " " + formattedTriple[2]);
            }
            currentSubject = formattedTriple[0];
        });
     // Send the final period.
        send(" .");
    });

    /**
     * Output RDF/XML.
     */
    registerType("rdf", "application/rdf+xml");
    provides("rdf", function () {
        start({
            "headers": {
                "Content-Disposition": "attachment; filename=" + req.info.db_name + ".rdf"
            }
        });
        send("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        send("<rdf:RDF\n");
        send("  xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"\n");
        send("  xmlns:xsd=\"http://www.w3.org/2001/XMLSchema#\"\n");
        send("  xmlns:" + prefix + "=\"" + baseUri + "\"\n");
        send("  xmlns:" + prefix + "Vocab=\"" + baseUri + "vocab/#\"");
        send(">\n");
        tripleIterator(function (triple, annotations) {
            var description, object, type;
         // Remove quotation marks from string object literals
            switch (annotations.objectType) {
                case "string":
                    object = triple[2].replace(/"([^"]*)"/, "$1");
                    break;
                case "_attachment":
                    object = baseUri + triple[0] + "/" + triple[2].replace(/"([^"]*)"/, "$1");
                    break;
                default:
                    object = triple[2];
                    break;
            }
         // Type literal.
            switch (annotations.objectType) {
                case "string":
                case "object":
                case "array":
                case "null":
                case "_attachment":
                    type = "xsd:string";
                    break;
                case "number":
                    if (triple[2] % 1 === 0) {
                        type = "xsd:integer";
                    } else {
                        type = "xsd:double";
                    }
                    break;
                case "boolean":
                    type = "xsd:boolean";
                    break;
                default:
                    type = null;
                    break;
            }
         // Escape object literals.
            description = [
                "  <rdf:Description rdf:about=\"" + baseUri + triple[0] + "\">",
                "    <" + prefix + "Vocab:" + triple[1] + ((type !== null) ? " rdf:datatype=\"" + type + "\">" : ">") + xmlEscape(object) + "</" + prefix + "Vocab:" + triple[1] + ">",
                "  </rdf:Description>"
            ].join("\n");
            send(description + "\n");
        });
        send("</rdf:RDF>");
    });

    /**
     * Output HTML.
     */
    provides("html", function () {
        var firstSubject, currentSubject;
        firstSubject = true;
        send("<DOCTYPE html>\n");
        send("<meta charset=\"UTF-8\" />\n");
        send("<title>" + req.info.db_name + " &ndash; Sessel</title>\n");
        tripleIterator(function (triple, annotations) {
            var subject, predicate, object;
            subject = baseUri + triple[0];
            predicate = baseUri + "vocab/#" + triple[1];
            object = triple[2];
            if (firstSubject === true || currentSubject !== triple[0]) {
             // Skip first period.
                if (firstSubject === true) {
                    firstSubject = false;
                } else {
                    send("</ul>\n");
                }
                send("<h2><a href=\"" + subject + "\">&lt;" + subject + "&gt;</a></h2>\n");
                send("<ul>\n");
            }
            send("  <li><a href=\"" + predicate + "\">&lt;" + predicate + "&gt;</a>: " + object + "</li>\n");
            currentSubject = triple[0];
        });
        send("</ul>\n");
    });

}
