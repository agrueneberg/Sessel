define(function () {
    "use strict";
    var parse, query, graphPatternRecurser, graphPatternFilter, graphPatternLimiter;
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
        //   (?<graphPatternPattern>)       # First graph pattern
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
        graphPatternListPattern = "(" + graphPatternPattern.replace(/\(([^?][^:])/g, "(?:$1") + "(?:\\s+\\.\\s+" + graphPatternPattern.replace(/\(([^?][^:])/g, "(?:$1") + ")*(?:\\s+\\.)?)?";
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
        // (?:                              # Optional LIMIT clause
        //   \s+
        //   LIMIT
        //   \s+
        //   \d+
        // )?
        sparqlPattern = "(SELECT)\\s+((?:\\*)|(?:\\?\\w+)(?:\\s+\\?\\w+)*)\\s+WHERE\\s+\\{\\s*" + graphPatternListPattern + "\\s*\\}(?:\\s+LIMIT\\s+(\\d+))?";
        // Add some anchors for exact matches.
        sparqlRegExp = new RegExp("^\\s*" + sparqlPattern + "\\s*$");
        sparqlMatcher = text.match(sparqlRegExp);
        if (sparqlMatcher !== null) {
            queryObject = {
                graphPatterns: []
            };
            // Extract type.
            queryObject.type = sparqlMatcher[1];
            // Extract variables.
            if (sparqlMatcher[2] === "*") {
                queryObject.variables = sparqlMatcher[2];
            } else {
                queryObject.variables = sparqlMatcher[2].split(/\s+/);
            }
            // Extract graph patterns.
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
            // Extract limit.
            if (sparqlMatcher[4] !== undefined) {
                queryObject.limit = sparqlMatcher[4];
            }
            return queryObject;
        } else {
            throw {
                message: "unrecognized text"
            };
        }
    };
    query = function (queryObject, graphPatternResolver, callback) {
        var variables, graphPatterns, limit, initialBindings;
        variables = queryObject.variables;
        graphPatterns = queryObject.graphPatterns;
        limit = queryObject.limit;
        initialBindings = [];
        graphPatternRecurser(graphPatterns, initialBindings, graphPatternResolver, function (bindings) {
            // Filter unrequested variables.
            graphPatternFilter(variables, bindings, function (filteredBindings) {
                // Restrict number of triples to output.
                if (limit) {
                    graphPatternLimiter(limit, filteredBindings, callback);
                } else {
                    callback(filteredBindings);
                }
            });
        });
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
                // Resolve query.
                graphPatternResolver(graphPattern, function (triples) {
                    var newBindings, newBinding;
                    // Bind triples to binding.
                    newBindings = [];
                    if (triples.length === 0) {
                        newBinding = {};
                        // If there are no triples, at least keep the bindings.
                        binding.forEach(function (bindingVariable) {
                            newBinding[bindingVariable] = null;
                        });
                        newBindings.push(newBinding);
                    } else {
                        triples.forEach(function (triple) {
                            var bindingPosition;
                            newBinding = {};
                            // If there are no old bindings, just keep the new ones.
                            if (lastBindings.length === 0) {
                                // Populate bindings based on triple.
                                binding.forEach(function (bindingVariable) {
                                    newBinding[bindingVariable] = triple[bindingPositions[bindingVariable]];
                                });
                                newBindings.push(newBinding);
                            } else {
                                lastBindings.forEach(function (lastBinding) {
                                    var merge, isDuplicate, lastBindingVariable;
                                    merge = true;
                                    // Check if all bindings that are also in the last binding match.
                                    binding.forEach(function (bindingVariable) {
                                        // null is a wildcard and can happen if no triples for a pattern were found yet.
                                        if (lastBinding.hasOwnProperty(bindingVariable) && (lastBinding[bindingVariable] !== triple[bindingPositions[bindingVariable]] && lastBinding[bindingVariable] !== null)) {
                                            // Discard binding if the values do not match.
                                            merge = false;
                                        }
                                    });
                                    // Merge new and last binding.
                                    if (merge) {
                                        // Copy last bindings.
                                        for (lastBindingVariable in lastBinding) {
                                            if (lastBinding.hasOwnProperty(lastBindingVariable)) {
                                                // If a null wildcard is used, which can happen if no triples for a binding
                                                // were found yet, and there happens to be one, use it!
                                                if (lastBinding[lastBindingVariable] === null && triple[bindingPositions[lastBindingVariable]] !== undefined) {
                                                    newBinding[lastBindingVariable] = triple[bindingPositions[lastBindingVariable]];
                                                } else {
                                                    newBinding[lastBindingVariable] = lastBinding[lastBindingVariable];
                                                }
                                            }
                                        }
                                        // Add new bindings that are not already in there.
                                        binding.forEach(function (bindingVariable) {
                                            if (!newBinding.hasOwnProperty(bindingVariable)) {
                                                newBinding[bindingVariable] = triple[bindingPositions[bindingVariable]];
                                            }
                                        });
                                        // Check if a similar binding already exists before pushing it into the array.
                                        // The variable bindings of some SPARQL queries are disjunct in the beginning, but
                                        // happen to share some of them later. The current test works on matching variables;
                                        // if there are none of them, it will accept everything, even duplicates.
                                        // Of course it cannot be a duplicate if the original list is empty.
                                        if (newBindings.length === 0) {
                                            newBindings.push(newBinding);
                                        } else {
                                            isDuplicate = false;
                                            newBindings.forEach(function (duplicateBinding) {
                                                // It's not a duplicate if there is at least one different value.
                                                var duplicateBindingVariable, numberOfBindings, numberOfDuplicateValues;
                                                numberOfBindings = 0;
                                                numberOfDuplicateValues = 0;
                                                for (duplicateBindingVariable in duplicateBinding) {
                                                    if (duplicateBinding.hasOwnProperty(duplicateBindingVariable)) {
                                                        if (newBinding[duplicateBindingVariable] === duplicateBinding[duplicateBindingVariable]) {
                                                            numberOfDuplicateValues++;
                                                        }
                                                        numberOfBindings++;
                                                    }
                                                }
                                                if (numberOfDuplicateValues === numberOfBindings) {
                                                    isDuplicate = true;
                                                }
                                            });
                                            if (!isDuplicate) {
                                                newBindings.push(newBinding);
                                            }
                                        }
                                    }
                                });
                            }
                        });
                    }
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
    graphPatternLimiter = function (limit, bindings, callback) {
        var limitedBindings;
        // slice takes care of all situations needed.
        limitedBindings = bindings.slice(0, limit);
        callback(limitedBindings);
    },
    graphPatternFilter = function (variables, bindings, callback) {
        var newBindings = [];
        if (variables === "*") {
            callback(bindings);
        } else {
            bindings.forEach(function (binding) {
                var newBinding;
                newBinding = {};
                variables.forEach(function (variable) {
                    // Strip off question mark.
                    var variableName = variable.substring(1);
                    if (binding.hasOwnProperty(variableName)) {
                        newBinding[variableName] = binding[variableName];
                    } else {
                        newBinding[variableName] = null;
                    }
                });
                newBindings.push(newBinding);
            });
            callback(newBindings);
        }
    };
    return {
        parse: parse,
        query: query
    };
});
