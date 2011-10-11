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
        //       <[^>]+>
        //       \s+
        //       <[^>]+>
        //       \s+
        //       (?:
        //         <[^>]+>
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
        //       <[^>]+>
        //       \s+
        //       <[^>]+>
        //       \s+
        //       (?:
        //         <[^>]+>
        //       |
        //         "\w+"
        //       )
        //     )*
        // )?
        // (?#Optional Final Period)
        //   (?:\s+.)?
        // \s*
        // \}
        // \s*
        // $
        pattern = /^\s*(SELECT)\s+((?:\*)|(?:\?\w+)(?:\s+\?\w+)*)\s+WHERE\s+\{\s*((?:(?:<[^>]+>|\?\w+)\s+(?:<[^>]+>|\?\w+)\s+(?:<[^>]+>|\?\w+|"\w+"))(?:\s+\.\s+<[^>]+>\s+<[^>]+>\s+(?:<[^>]+>|"\w+"))*)?(?:\s+.)?\s*\}\s*$/;
        matcher = text.match(pattern);
        console.log(matcher);
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
        console.log(queryObject);
        var graphPattern;
        if (queryObject.graphPatterns.length === 0) {
            callback({});
        } else {
            throw "unsupported SPARQL query";
        }
    };
    return {
        parse: parse,
        query: query
    };
}());
