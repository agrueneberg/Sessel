function (doc) {
    emit([doc.predicate, doc.object_type, doc.object, doc.subject], doc.permission);
}
