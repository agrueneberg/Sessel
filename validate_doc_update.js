function(newDoc, savedDoc, userCtx) {

  // Handle deletion of existing documents.
  if (newDoc._deleted === true) {
    return true;
  }

  // Regular expression for URI validation (see http://snipplr.com/view/6889/regular-expressions-for-uri-validationparsing for more information).
  var uriRegExp = /^(?:([a-z0-9+.-]+:\/\/)((?:(?:[a-z0-9-._~!$&'()*+,;=:]|%[0-9A-F]{2})*)@)?((?:[a-z0-9-._~!$&'()*+,;=]|%[0-9A-F]{2})*)(:(?:\d*))?(\/(?:[a-z0-9-._~!$&'()*+,;=:@\/]|%[0-9A-F]{2})*)?|([a-z0-9+.-]+:)(\/?(?:[a-z0-9-._~!$&'()*+,;=:@]|%[0-9A-F]{2})+(?:[a-z0-9-._~!$&'()*+,;=:@\/]|%[0-9A-F]{2})*)?)(\?(?:[a-z0-9-._~!$&'()*+,;=:\/?@]|%[0-9A-F]{2})*)?(#(?:[a-z0-9-._~!$&'()*+,;=:\/?@]|%[0-9A-F]{2})*)?$/i;

  // Handle creation and updates of documents.
  if (!newDoc.subject) {
    throw {
      forbidden: 'subject is required'
    }
  }
  if (!newDoc.subject.match(uriRegExp)) {
    throw {
      forbidden: 'subject has to be a URI'
    }
  }

  if (!newDoc.predicate) {
    throw {
      forbidden: 'predicate is required'
    }
  }
  if (!newDoc.predicate.match(uriRegExp)) {
    throw {
      forbidden: 'predicate has to be a URI'
    }
  }

  if (!newDoc.object) {
    throw {
      forbidden: 'object is required'
    }
  }
  if (!newDoc.object_type) {
    throw {
      forbidden: 'object has to have a type'
    }
  }
  if (newDoc.object_type !== 'URI' && newDoc.object_type !== 'Literal') {
    throw {
      forbidden: 'type of the object has to be either "URI" or "Literal"' + " not " + newDoc.object.type
    }
  }
  if (newDoc.object_type === 'URI' && !newDoc.object.match(uriRegExp)) {
    throw {
      forbidden: 'object is not a valid URI'
    }
  }
  if (newDoc.object_type === 'Literal' && !newDoc.object) {
    throw {
      forbidden: 'object is not a valid literal'
    }
  }

  if (!newDoc.permission) {
    throw {
      forbidden: 'permission is required'
    }
  }
  if (newDoc.permission !== 'public' && newDoc.permission !== 'private') {
    throw {
      forbidden: 'permission has to be either "public" or "private"'
    }
  }

}
