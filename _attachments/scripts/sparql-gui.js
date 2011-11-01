require(["jquery", "sparql"], function ($, sparql) {
    $(function () {
        $("#query").click(function () {
            $("#spinner").show();
            var sparqlQuery, queryObject;
            sparqlQuery = $("#sparql-query").val();
            try {
                queryObject = sparql.parse(sparqlQuery);
                sparql.query(queryObject, function (query, callback) {
                    xhr = new XMLHttpRequest();
                    xhr.onreadystatechange = function () {
                        if (xhr.readyState === 4) {
                            triples = JSON.parse(xhr.responseText);
                            callback(triples);
                        }
                    };
                    xhr.open("GET", query);
                    xhr.send(null);
                }, function (bindings) {
                    var resultDiv, resultTable, resultRow, bindingVariables, bindingVariable;
                    resultDiv = $("#result");
                    resultDiv.empty();
                    resultDiv.html("<h3>Result</h3>");
                    if (bindings.length === 0) {
                        resultDiv.append("No result.");
                    } else {
                        resultTable = $("<table></table>")
                        resultRow = $("<tr></tr>");
                        // Get binding variables of the first binding for ordering purposes.
                        bindingVariables = [];
                        for (bindingVariable in bindings[0]) {
                            if (bindings[0].hasOwnProperty(bindingVariable)) {
                                bindingVariables.push(bindingVariable);
                                resultRow.append("<th>" + bindingVariable + "</th>");
                            }
                        }
                        resultTable.append(resultRow);
                        bindings.forEach(function (binding) {
                            var resultCell;
                            resultRow = $("<tr></tr>");
                            bindingVariables.forEach (function (bindingVariable) {
                                // Ignore empty binding values for variables that do not show up
                                // in the SELECT statement.
                                if (binding[bindingVariable] === null) {
                                    resultCell = $("<td></td>");
                                } else {
                                    resultCell = $("<td>" + binding[bindingVariable] + "</td>");
                                }
                                resultRow.append(resultCell);
                            });
                            resultTable.append(resultRow);
                        });
                        resultDiv.append(resultTable);
                    }
                    $("#spinner").hide();
                });
            } catch (e) {
                alert("Something failed: " + e.message);
                $("#spinner").hide();
            }
            return false;
        });
    });
});
