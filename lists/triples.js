function (head, req) {

    var extractTriple, permissionFilter;

    /**
     * Extract subject, predicate, and object from key.
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

    // Outputs JSON.
    provides("json", function () {
        var row, triple, first;
        first = true;
        send("[");
        while (row = getRow()) {
            triple = extractTriple(row, req);
            if (first) {
                first = false;
            } else {
                send(",");
            }
            send(JSON.stringify(triple));
        }
        send("]");
    });

    // Outputs HTML.
    provides("html", function () {
        var row, triple;
        while (row = getRow()) {
            triple = extractTriple(row, req);
            triple = triple.join(" ")
            triple = triple.replace(/<([^>]+)>/g, "&lt;$1&gt;");
            triple = triple + " .<br />";
            send(triple);
        }
    });

    // Outputs N3.
    registerType("n3", "text/n3");
    provides("n3", function () {
        var row, triple;
        while (row = getRow()) {
            triple = extractTriple(row, req);
            triple = triple.join(" ");
            triple = triple + " .\n";
            send(triple);
        }
    });

    // Outputs RDF/XML.
    registerType("rdfxml", "application/rdf+xml");
    provides("rdfxml", function () {
        var namespaceRegex, namespaceLookup, row, triple, namespaceMatcher, namespace, namespaceIndex, subject, predicate, object, objectType, identifier, description;
        namespaceRegex = /^(.*[/#])(.*)$/;
        namespaceLookup = [];
        send("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        send("<rdf:RDF xmlns:rdf=\"http://www.w3.org/1999/02/22-rdf-syntax-ns#\">\n");
        while (row = getRow()) {
            triple = extractTriple(row, req);
            // Strip leading "<" or "\"", and trailing ">" or "\"".
            subject = triple[0].replace(/<([^>]+)>/, "$1");
            predicate = triple[1].replace(/<([^>]+)>/, "$1");
            object = triple[2];
            // Determine object type based on brackets or quotation marks.
            if (object.charAt(0) === "<") {
                object = triple[2].replace(/<([^>]+)>/, "$1");
                objectType = "URI";
            } else {
                object = triple[2].replace(/"([^"]+)"/, "$1");
                objectType = "Literal";
            }
            // Extract namespace of the predicate by only using the part before the last slash or hash.
            namespaceMatcher = predicate.match(namespaceRegex);
            namespace = namespaceMatcher[1];
            namespaceIndex = namespaceLookup.indexOf(namespace);
            if (namespaceIndex === -1) {
                namespaceLookup.push(namespace);
                namespaceIndex = namespaceLookup.length - 1;
            }
            identifier = namespaceMatcher[2];
            // Generate description.
            description = "  ";
            description += "<rdf:Description rdf:about=\"" + subject + "\">";
            description += "\n";
            if (objectType === "URI") {
                description += "    ";
                // Reuse RDF namespace.
                if (namespace === "http://www.w3.org/1999/02/22-rdf-syntax-ns#") {
                    description += "<rdf:" + identifier + " rdf:resource=\"" + object + "\" />";
                } else {
                    description += "<ns" + namespaceIndex + ":" + identifier + " xmlns:ns" + namespaceIndex + "=\"" + namespace + "\" rdf:resource=\"" + object + "\" />";
                }
                description += "\n";
            } else if (objectType === "Literal") {
                description += "    ";
                if (namespace === "http://www.w3.org/1999/02/22-rdf-syntax-ns#") {
                    description += "<rdf:" + identifier + ">";
                    // Escape object literals.
                    description += escape(object);
                    description += "</rdf:" + identifier + ">";
                } else {
                    description += "<ns" + namespaceIndex + ":" + identifier + " xmlns:ns" + namespaceIndex + "=\"" + namespace + "\">";
                    // Escape object literals.
                    description += escape(object);
                    description += "</ns" + namespaceIndex + ":" + identifier + ">";
                }
                description += "\n";
            }
            description += "  ";
            description += "</rdf:Description>";
            // Pretty print.
            description += "\n";
            send(description);
        }
        send("</rdf:RDF>");
    });

}
