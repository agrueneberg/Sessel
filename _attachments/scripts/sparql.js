/*jslint regexp: true */
var SPARQL = (function () {
    "use strict";
    var parse, query;
    parse = function (text) {
        var pattern, matcher;
        // Parser for SPARQL queries
        // Right now only the SELECT subset is supported.
        //
        // Documentation:
        // ^
        // \s*
        // (?#Query Form)
        //   (SELECT)
        // \s+
        // (?#Variables)
        //   (
        //     (?:\*)
        //   |
        //     (?:\?\w+)(?:\s+\?\w+)*
        //   )
        // \s+
        // WHERE
        // \s+
        // \{
        // \s*
        // (
        //   (?#First Triple Pattern)
        //     (?:
        //       (?:
        //         <[^>]+>
        //       |
        //         \?\w+
        //       )
        //       \s+
        //       (?:
        //         <[^>]+>
        //       |
        //         \?\w+
        //       )
        //       \s+
        //       (?:
        //         <[^>]+>
        //       |
        //         \?\w+
        //       |
        //         "\w+"
        //       )
        //     )
        //   (?#More Triple Patterns)
        //     (?:
        //       \s+
        //       (?#Separated By Period)
        //         \.
        //       \s+
        //       (?:
        //         <[^>]+>
        //       |
        //         \?\w+
        //       )
        //       \s+
        //       (?:
        //         <[^>]+>
        //       |
        //         \?\w+
        //       )
        //       \s+
        //       (?:
        //         <[^>]+>
        //       |
        //         \?\w+
        //       |
        //         "\w+"
        //       )
        //     )*
        // )?
        // (?#Optional Final Period)
        //   (?:\s+\.)?
        // \s*
        // \}
        // \s*
        // $
        pattern = /^\s*(SELECT)\s+((?:\*)|(?:\?\w+)(?:\s+\?\w+)*)\s+WHERE\s+\{\s*((?:(?:<[^>]+>|\?\w+)\s+(?:<[^>]+>|\?\w+)\s+(?:<[^>]+>|\?\w+|"\w+"))(?:\s+\.\s+(?:<[^>]+>|\?\w+)\s+(?:<[^>]+>|\?\w+)\s+(?:<[^>]+>|\?\w+|"\w+"))*)?(?:\s+\.)?\s*\}\s*$/;
        matcher = text.match(pattern);
        if (matcher !== null) {
            return {
                type: matcher[1],
                variables: matcher[2] !== "*" ? matcher[2].split(/\s+/) : matcher[2],
                graphPatterns: matcher[3] !== undefined ? matcher[3].split(/\./).map(function (e) {
                    return e.trim(/\s+/).split(/\s+/);
                }) : []
            };
        } else {
            throw "unrecognized text";
        }
    };
    query = function (queryObject, callback) {
        var graphPatterns, graphPattern, bindings, bindingPositions, hasBindings, query, xhr;
        graphPatterns = queryObject.graphPatterns;
        if (graphPatterns.length > 0) {
            // do one pattern at a time
            graphPattern = graphPatterns.pop();
            // extract variables to bind
            bindings = {};
            bindingPositions = {};
            hasBindings = false;
            graphPattern.forEach(function (node, index) {
                var matcher;
                matcher = node.match(/\?(\w+)/);
                if (matcher !== null) {
                    // store bindings using the variable name without ?
                    bindings[matcher[1]] = [];
                    // store position of the variable
                    bindingPositions[index] = matcher[1];
                    hasBindings = true;
                }
            });
            if (hasBindings) {
                // extract nodes to query
                query = "_rewrite";
                graphPattern.forEach(function (node, index) {
                    var matcher;
                    matcher = node.match(/\?(\w+)/);
                    if (matcher === null) {
                        if (index === 0) {
                            query += "/s/" + encodeURIComponent(node.substring(1, node.length - 1));
                        } else if (index === 1) {
                            query += "/p/" + encodeURIComponent(node.substring(1, node.length - 1));
                        } else if (index === 2) {
                            if (node.match(/\"[^"]+\"/)) {
                                query += "/o/lit/" + encodeURIComponent(node);
                            } else {
                                query += "/o/uri/" + encodeURIComponent(node.substring(1, node.length - 1));
                            }
                        }
                    }
                });
                query += "?format=json";
                xhr = new XMLHttpRequest();
                xhr.onreadystatechange = function () {
                    var triples;
                    if (xhr.readyState === 4) {
                        triples = JSON.parse(xhr.responseText);
                        triples.forEach(function (triple) {
                            var bindingPosition;
                            triple.splice(2, 1);
                            for (bindingPosition in bindingPositions) {
                                // store part of the triple that corresponds with the one stored in bindingPosition in bindings
                                bindings[bindingPositions[bindingPosition]].push(triple[bindingPosition]);
                            }
                        });
                        callback(bindings);
                    }
                };
                xhr.open("GET", query);
                xhr.send(null);
            } else {
                // return {} if there are no bindings
                callback(bindings);
            }
        } else {
            // return {} for empty graph pattern
            callback({});
        }
    };
    return {
        parse: parse,
        query: query
    };
}());
