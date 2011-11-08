function (doc) {
    var triplify;
    triplify = require("views/lib/triplifier").triplify;
    triplify(doc, { "id" : doc._id }, function (triple, annotations) {
        emit([triple[2], triple[0], triple[1]], annotations);
    });
}
