define(function () {
    "use strict";
    var parse, query, graphPatternRecurser;
    parse = function (text) {
        var graphPatternPattern, graphPatternRegExp, graphPatternMatcher, graphPatternListPattern, sparqlPattern, sparqlRegExp, sparqlMatcher, graphPatternGroup, queryObject;
        // Pattern for graph patterns.
        // Catches subject, predicate, and object of a graph pattern.
        //
        // Documentation:
        // (                                # Subject
        //   <[^>]+>                        #   URI (sloppy!)
        // |
        //   \?\w+                          #   Variable
        // )
        // \s+
        // (                                # Predicate
        //   <[^>]+>                        #   URI (sloppy!)
        // |
        //   \?\w+                          #   Variable
        // )
        // \s+
        // (                                # Object
        //   <[^>]+>                        #   URI (sloppy!)
        // |
        //   "[^"]+"                        #   Literal
        // |
        //   \?\w+                          #   Variable
        // )
        graphPatternPattern = "(<[^>]+>|\\?\\w+)\\s+(<[^>]+>|\\?\\w+)\\s+(<[^>]+>|\"[^\"]+\"|\\?\\w+)";
        graphPatternRegExp = new RegExp("\\s*" + graphPatternPattern + "(?:\\s+\\.)?\\s*");
        // Pattern for lists of graph patterns.
        // Uses the graphPatternPattern defined above, but converts groups to non-catching ones.
        // Catches the whole list of graph patterns.
        //
        // Documentation:
        // (                                # Graph patterns are optional
        //   (?<graphPatternPattern>)             # First graph pattern
        //   (?:                            # More graph patterns
        //     \s+
        //     \.                           # Separated by period
        //     \s+
        //     (?<graphPatternPattern>)
        //   )*
        //   (?:                            # Optional final period
        //     \s+
        //     \.
        //   )?
        // )?
        graphPatternListPattern = "(" + graphPatternPattern.replace("(", "(?:") + "(?:\\s+\\.\\s+" + graphPatternPattern.replace("(", "(?:") + ")*(?:\\s+\\.)?)?";
        // Pattern for SPARQL queries.
        // Right now only the SELECT subset is supported.
        // Uses the graphPatternListPattern defined above.
        // Catches query form, variables, and list of graph patterns.
        //
        // Documentation:
        // (SELECT)                         # Query form
        // \s+
        // (                                # Variables
        //   (?:
        //     \*                           #   Either '*'
        //   )
        // |
        //   (?:                            #   Or a single variable
        //     \?\w+
        //   )
        //   (?:                            #   Or a list of named variables
        //     \s+
        //     \?
        //     \w+
        //   )*
        // )
        // \s+
        // WHERE                            # WHERE clause
        // \s+
        // \{
        // \s*
        // (?<graphPatternListPattern>)
        // \s*
        // \}
        sparqlPattern = "(SELECT)\\s+((?:\\*)|(?:\\?\\w+)(?:\\s+\\?\\w+)*)\\s+WHERE\\s+\\{\\s*" + graphPatternListPattern + "\\s*\\}";
        // Add some anchors for exact matches.
        sparqlRegExp = new RegExp("^\\s*" + sparqlPattern + "\\s*$");
        sparqlMatcher = text.match(sparqlRegExp);
        if (sparqlMatcher !== null) {
            queryObject = {
                type: sparqlMatcher[1],
                graphPatterns: []
            };
            if (sparqlMatcher[2] === "*") {
                queryObject.variables = sparqlMatcher[2];
            } else {
                queryObject.variables = sparqlMatcher[2].split(/\s+/);
            }
            if (sparqlMatcher[3] !== undefined) {
                // It is hard to separate graph patterns by period, because URIs and
                // literals can also contain them. Instead, one pattern is matched at
                // a time and iteratively removed from the original patterns string
                // until there are no patterns left.
                graphPatternGroup = sparqlMatcher[3];
                while (graphPatternGroup !== "") {
                    graphPatternMatcher = graphPatternGroup.match(graphPatternRegExp);
                    queryObject.graphPatterns.push([graphPatternMatcher[1], graphPatternMatcher[2], graphPatternMatcher[3]]);
                    graphPatternGroup = graphPatternGroup.replace(graphPatternMatcher[0], "");
                }
            }
            return queryObject;
        } else {
            throw "unrecognized text";
        }
    };
    query = function (queryObject, graphPatternResolver, callback) {
        var graphPatterns, initialBindings;
        graphPatterns = queryObject.graphPatterns;
        initialBindings = [];
        graphPatternRecurser(graphPatterns, initialBindings, graphPatternResolver, callback);
    };
    graphPatternRecurser = function (graphPatterns, lastBindings, graphPatternResolver, callback) {
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
                                query += "/o/lit/" + encodeURIComponent(node.substring(1, node.length - 1));
                            } else {
                                query += "/o/uri/" + encodeURIComponent(node.substring(1, node.length - 1));
                            }
                        }
                    }
                });
                query += "?format=json";
                // Resolve query using some mechanism, be it XHR, http.request, or something else.
                graphPatternResolver(query, function (triples) {
                    var newBindings;
                    // Bind triples to binding.
                    newBindings = [];
                    triples.forEach(function (triple) {
                        var newBinding, bindingPosition;
                        newBinding = {};
                        triple.splice(2, 1);
                        // If there are no old bindings, just keep the new ones.
                        if (lastBindings.length === 0) {
                            // Populate bindings based on triple.
                            binding.forEach(function (bindingVariable) {
                                newBinding[bindingVariable] = triple[bindingPositions[bindingVariable]];
                            });
                        } else {
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
                    graphPatternRecurser(graphPatterns, newBindings, graphPatternResolver, callback);
                });
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
});
