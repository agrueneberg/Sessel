function (doc) {
    var triplify;
    triplify = require("views/lib/triplifier").triplify;
    triplify(doc, function (triple, annotations) {
        emit([triple[1], triple[2], triple[0]], annotations);
    });
}
