function(doc) {
  emit([doc.object_type, doc.object, doc.subject, doc.predicate], doc.permission);
}
