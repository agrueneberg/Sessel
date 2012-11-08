function (doc) {
    Object.keys(doc).forEach(function (key) {
     // Ignore CouchDB-specific properties that start with "_".
        if (key.charAt(0) !== "_") {
            emit(key, 1);
        }
    });
}
