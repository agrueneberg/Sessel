function (doc, head) {
    var html;
    html = "<h1>" + doc._id + "</h1>";
    html += "<h2>Properties</h2>";
    html += "<ul>";
    Object.keys(doc).forEach(function (key) {
     // Ignore CouchDB-specific properties that start with "_".
        if (key.charAt(0) !== "_") {
            html += "<li>" + key + ": " + doc[key] + "</li>";
        }
    });
    html += "</ul>";
    return html;
}
