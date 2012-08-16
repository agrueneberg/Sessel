$(function () {
    var loc, baseUri, store;
 // Initiate loading state for submit button.
    $("#submit").button("loading");
 // Load triples.
    loc = window.location;
    baseUri = loc.protocol + "//" + loc.host + "/" + loc.pathname.split("/")[1] + "/_design/sessel/_rewrite/export.ttl";
    store = rdfstore.create();
    store.load("remote", baseUri, function (success, results) {
     // Reset loading state for submit button.
        $("#submit").button("reset");
        console.log("*** Imported %d triples from Sessel", results);
    });
    $("#submit").click(function () {
        var query;
        query = $("#query").val();
        try {
            store.execute(query, function (success, results) {
                var table, keys, row;
                table = $("#results");
                table.empty();
                if (results.length > 0) {
                 // Create table header row.
                    keys = Object.keys(results[0]);
                    row = $("<tr></tr>");
                    keys.forEach(function (key) {
                        row.append("<th>" + key + "</th>");
                    });
                    table.append(row);
                 // Create table body rows.
                    results.forEach(function (result) {
                        row = $("<tr></tr>");
                        keys.forEach(function (key) {
                            row.append("<td>" + result[key].value + "</td>");
                        });
                        table.append(row);
                    });
                }
                $("#result-pane").show(100);
            });
        } catch (e) {
            console.error(e.name, e.message);
        }
        return false;
    });
    $("#reset").click(function () {
        $("#result-pane").hide(100);
    });
});
