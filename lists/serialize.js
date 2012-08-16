function (head, req) {

    var baseUri, prefix, tripleIterator, formatTriples, xmlEscape;

    /**
     * The base URI.
     */
    if (req.query.hasOwnProperty("base_uri") === true) {
        baseUri = req.query["base_uri"];
    } else {
     // "Host" is a mandatory header since HTTP/1.1.
        baseUri = "http://" + req.headers["Host"] + "/" + req.info.db_name + "/";
    }

    /**
     * The prefix of the base URI.
     */
     if (req.query.hasOwnProperty("prefix") === true) {
        prefix = req.query["prefix"];
     } else {
        prefix = "sessel";
     }

    /**
     * Iterate over triples.
     * @param callback
     * @return triple, annotations
     */
    tripleIterator = function (callback) {
        var row;
        while (row = getRow()) {
            callback(row.key, row.value);
        }
    };

    /**
     * Format triples and return each one separately.
     * @param callback
     * @param [opts]
     *        - prefixes Table of prefixes to build qnames.
     *        - typeLiterals True if literals should be typed.
     * @return Formatted triple
     */
    formatTriples = function (callback, opts) {
        tripleIterator(function (triple, annotations) {
            var prefixes, typeLiterals, formattedTriple;
            opts = opts || {};
            prefixes = opts.prefixes || null;
            typeLiterals = opts.typeLiterals || false;
            formattedTriple = [];
            if (prefixes !== null && prefixes[baseUri] !== undefined) {
             // Use qnames if the URI can be resolved to a prefix.
                formattedTriple[0] = prefixes[baseUri] + ":" + triple[0];
                formattedTriple[1] = prefixes[baseUri + "property/"] + ":" + triple[1];
            } else {
             // Use a URI if no suitable prefix can be found.
                formattedTriple[0] = "<" + baseUri + triple[0] + ">";
                formattedTriple[1] = "<" + baseUri + "property/" + triple[1] + ">";
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
            callback(formattedTriple, annotations);
        });
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
        formatTriples(function (triple) {
            send(triple.join(" ") + " .\n");
        }, {
            typeLiterals: true
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
        prefixes[baseUri + "property/"] = prefix + "Prop";
        Object.keys(prefixes).forEach(function (uri) {
            send("@prefix " + prefixes[uri] + ": <" + uri + "> .\n");
        });
        firstSubject = true;
        formatTriples(function (triple, annotations) {
         // Abbreviate Turtle.
            if (firstSubject === true || currentSubject !== triple[0]) {
             // Skip first period.
                if (firstSubject === true) {
                    firstSubject = false;
                } else {
                    send(" .\n");
                }
             // Send the full triple.
                send(triple.join(" "));
            } else {
             // Send the abbreviated triple.
                send(" ;\n    " + triple[1] + " " + triple[2]);
            }
            currentSubject = triple[0];
        }, {
            prefixes: prefixes
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
        send("  xmlns:" + prefix + "Prop=\"" + baseUri + "property/\"");
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
                "    <" + prefix + "Prop:" + triple[1] + ((type !== null) ? " rdf:datatype=\"" + type + "\">" : ">") + xmlEscape(object) + "</" + prefix + "Prop:" + triple[1] + ">",
                "  </rdf:Description>"
            ].join("\n");
            send(description + "\n");
        });
        send("</rdf:RDF>");
    });

}