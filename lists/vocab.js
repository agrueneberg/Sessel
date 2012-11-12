function (head, req) {
    var row;
    provides("html", function () {
        send("<h1>Vocabulary</h1>");
        send("<ul>");
        while (row = getRow()) {
            send("<li><a name=\"" + row.key + "\">" + row.key + "</a></li>");
        }
        send("</ul>");
    });
}
