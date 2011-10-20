/*jslint regexp: true */
var SPARQL = (function () {
    "use strict";
    var parse, query, graphPatternResolver;
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
        var graphPatterns, initialBindings;
        graphPatterns = queryObject.graphPatterns;
        initialBindings = [];
        graphPatternResolver(graphPatterns, initialBindings, callback);
    };
    graphPatternResolver = function (graphPatterns, lastBindings, callback) {
        var graphPatterns, graphPattern, binding, bindingPositions, hasBindings, query, xhr;
        if (graphPatterns.length > 0) {
            // Process only one pattern at a time.
            graphPattern = graphPatterns.pop();
            binding = []; // The binding serves as a template for creating concrete bindings once the triples are retrieved.
            bindingPositions = {}; // Save the position of the variable in the triple (subject: 0, predicate: 1, object: 2) for easy retrieval later.
            hasBindings = false; // There is no point in doing another recursion for an empty graph pattern.
            graphPattern.forEach(function (node, index) {
                var matcher;
                matcher = node.match(/\?(\w+)/);
                if (matcher !== null) {
                    // Store variable names meant for binding without initial "?".
                    binding.push(matcher[1]);
                    bindingPositions[matcher[1]] = index;
                    hasBindings = true;
                }
            });
            // There has to be at least one binding, otherwise the operation is pointless.
            if (hasBindings) {
                // Create Sessel query string.
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
                    var triples, newBindings;
                    if (xhr.readyState === 4) {
                        newBindings = [];
                        triples = JSON.parse(xhr.responseText);
                        // Bind triples to binding.
                        console.log('binding', binding);
                        triples.forEach(function (triple) {
                            console.log('triple', triple);
                            var newBinding, bindingPosition;
                            newBinding = {};
                            triple.splice(2, 1);
                            // If there are no old bindings, just keep the new ones.
                            if (lastBindings.length === 0) {
                                console.log('no old bindings found');
                                // Populate bindings based on triple.
                                binding.forEach(function (bindingVariable) {
                                    newBinding[bindingVariable] = triple[bindingPositions[bindingVariable]];
                                });
                            } else {
                                console.log('old bindings found', lastBindings);
                                lastBindings.forEach(function (lastBinding) {
                                    var merge, lastBindingVariable;
                                    // If a binding is present in both bindings, they have to match.
                                    merge = true;
                                    binding.forEach(function (bindingVariable) {
                                        if (binding.hasOwnProperty(bindingVariable)) {
                                            if (lastBinding.hasOwnProperty(bindingVariable)) {
                                                if (lastBinding[bindingVariable] !== triple[bindingPositions[bindingVariable]]) {
                                                    merge = false;
                                                } else {
                                                    newBinding[bindingVariable] = triple[bindingPositions[bindingVariable]];
                                                }
                                            }
                                        }
                                    });
                                    // Merge old and new bindings.
                                    if (merge) {
                                        console.log('merge...', newBinding, lastBinding);
                                        for (lastBindingVariable in lastBinding) {
                                            if (lastBinding.hasOwnProperty(lastBindingVariable)) {
                                                // Only copy if it's not already in newBinding.
                                                if (!newBinding.hasOwnProperty(lastBindingVariable)) {
                                                    newBinding[lastBindingVariable] = lastBinding[lastBindingVariable];
                                                }
                                            }
                                        }
                                    }
                                });
                            }
                            newBindings.push(newBinding);
                        });
                        // Carry over the graphPatterns that are left and newBindings over to the next step.
                        graphPatternResolver(graphPatterns, newBindings, callback);
                    }
                };
                xhr.open("GET", query);
                xhr.send(null);
            } else {
                // Return the bindings from the last step if there are no bindings.
                callback(lastBindings);
            }
        } else {
            // Return the bindings from the last step if there are no graph patterns (left).
            callback(lastBindings);
        }
    };
    return {
        parse: parse,
        query: query
    };
}());
