function(doc) {
  emit([doc.subject, doc.predicate, doc.object_type, doc.object], doc.permission);
}
