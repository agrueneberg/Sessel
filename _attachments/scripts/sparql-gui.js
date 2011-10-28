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
                        // Get bindings once.
                        bindingVariables = [];
                        resultRow = $("<tr></tr>");
                        for (bindingVariable in bindings[0]) {
                            bindingVariables.push(bindingVariable);
                            resultRow.append("<th>" + bindingVariable + "</th>");
                        }
                        resultTable.append(resultRow);
                        bindings.forEach(function (binding) {
                            var resultCell;
                            resultRow = $("<tr></tr>");
                            bindingVariables.forEach (function (bindingVariable) {
                                resultCell = $("<td>" + binding[bindingVariable] + "</td>");
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
