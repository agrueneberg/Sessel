function (head, req) {

    var baseUri, extractTriple, tripleIterator, formatTriples, xmlTools;

    /**
     * The base URI for all triples generated by Sessel.
     * "Host" is a mandatory header since HTTP/1.1.
     */
    baseUri = "http://" + req.headers["Host"] + "/" + req.info.db_name + "/";

    /**
     * Extract subject, predicate, and object from row.key based on index.
     * @param row getRow() result
     * @param req req object
     * @return [subject, predicate, object]
     */
    extractTriple = function (row, req) {
        if (req.path[5] === "spo") {
            return [row.key[0], row.key[1], row.key[2]];
        } else if (req.path[5] === "pos") {
            return [row.key[2], row.key[0], row.key[1]];
        } else if (req.path[5] === "osp") {
            return [row.key[1], row.key[2], row.key[0]];
        }
    };

    /**
     * Iterate over triples.
     * @param callback
     * @return triple, annotations
     */
    tripleIterator = function (callback) {
        var row;
        while (row = getRow()) {
            callback(extractTriple(row, req), row.value);
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
                formattedTriple[1] = prefixes[baseUri + "verb/"] + ":" + triple[1];
            } else {
                // Use a URI if no suitable prefix can be found.
                formattedTriple[0] = "<" + baseUri + triple[0] + ">";
                formattedTriple[1] = "<" + baseUri + "verb/" + triple[1] + ">";
            }
            switch (annotations.objectType) {
                case "object":
                case "array":
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
    xmlTools = require("lib/xmlTools");

    /**
     * Output N-Triples.
     * "The Internet media type / MIME type of N-Triples is text/plain." (doh)
     * TODO: "Character encoding is 7-bit US-ASCII."
     */
    registerType("ntriples", "text/plain");
    provides("ntriples", function () {
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
    registerType("turtle", "text/turtle");
    provides("turtle", function () {
        var prefixes, firstSubject, currentSubject;
        start({
            "headers": {
                "Content-Disposition": "attachment; filename=" + req.info.db_name + ".ttl"
            }
        });
        prefixes = {};
        prefixes[baseUri] = "sessel";
        prefixes[baseUri + "verb/"] = "sesselVerb";
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
    registerType("rdfxml", "application/rdf+xml");
    provides("rdfxml", function () {
        start({
            "headers": {
                "Content-Disposition": "attachment; filename=" + req.info.db_name + ".rdf"
            }
        });
        send("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        send("<rdf:RDF\n");
        send("  xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\"\n");
        send("  xmlns:xsd=\"http://www.w3.org/2001/XMLSchema#\"\n");
        send("  xmlns:sessel=\"" + baseUri + "\"\n");
        send("  xmlns:sesselVerb=\"" + baseUri + "verb/\"");
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
                "    <sesselVerb:" + triple[1] + ((type !== null) ? " rdf:datatype=\"" + type + "\">" : ">") + xmlTools.escape(object) + "</sesselVerb:" + triple[1] + ">",
                "  </rdf:Description>"
            ].join("\n");
            send(description + "\n");
        });
        send("</rdf:RDF>");
    });

    /**
     * Output JSON (mainly for the SPARQL endpoint).
     */
    provides("json", function () {
        var firstRow;
        firstRow = true;
        send("[\n");
        formatTriples(function (triple) {
            if (firstRow === true) {
                firstRow = false;
            } else {
                send(",\n");
            }
            send("  " + JSON.stringify(triple));
        });
        send("\n]");
    });

}
