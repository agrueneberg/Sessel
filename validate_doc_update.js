function(newDoc, savedDoc, userCtx) {

  // Handle deletion of existing documents.
  if (newDoc._deleted === true) {
    return true;
  }

  // Regular expression to validate URIs based on the BNF in Appendix A of RFC 2396 (the one given in Appendix B of RFC 2396 is a joke).
  // Thanks to Tim Myer for converting the BNF into a regular expression: http://timezra.blogspot.com/2010/05/regex-to-validate-uris.html
  // The support for relative URIs was removed to conform with "RDF: Concepts and Abstract Syntax" and forward slashes were escaped.
  var uriRegEx = /([a-zA-Z][a-zA-Z0-9\+\-\.]*:((((\/\/((((([a-zA-Z0-9\-_\.!\~\*'\(\);:\&=\+$,]|(%[a-fA-F0-9]{2}))*)\@)?((((([a-zA-Z0-9](([a-zA-Z0-9\-])*[a-zA-Z0-9])?)\.)*([a-zA-Z](([a-zA-Z0-9\-])*[a-zA-Z0-9])?)(\.)?)|([0-9]+((\.[0-9]+){3})))(:[0-9]*)?))?|([a-zA-Z0-9\-_\.!\~\*'\(\)$,;:\@\&=\+]|(%[a-fA-F0-9]{2}))+)(\/(([a-zA-Z0-9\-_\.!\~\*'\(\):\@\&=\+$,]|(%[a-fA-F0-9]{2}))*(;([a-zA-Z0-9\-_\.!\~\*'\(\):\@\&=\+$,]|(%[a-fA-F0-9]{2}))*)*)(\/(([a-zA-Z0-9\-_\.!\~\*'\(\):\@\&=\+$,]|(%[a-fA-F0-9]{2}))*(;([a-zA-Z0-9\-_\.!\~\*'\(\):\@\&=\+$,]|(%[a-fA-F0-9]{2}))*)*))*)?)|(\/(([a-zA-Z0-9\-_\.!\~\*'\(\):\@\&=\+$,]|(%[a-fA-F0-9]{2}))*(;([a-zA-Z0-9\-_\.!\~\*'\(\):\@\&=\+$,]|(%[a-fA-F0-9]{2}))*)*)(\/(([a-zA-Z0-9\-_\.!\~\*'\(\):\@\&=\+$,]|(%[a-fA-F0-9]{2}))*(;([a-zA-Z0-9\-_\.!\~\*'\(\):\@\&=\+$,]|(%[a-fA-F0-9]{2}))*)*))*))(\?([a-zA-Z0-9\-_\.!\~\*'\(\);/\?:\@\&=\+$,]|(%[a-fA-F0-9]{2}))*)?)|(([a-zA-Z0-9\-_\.!\~\*'\(\);\?:\@\&=\+$,]|(%[a-fA-F0-9]{2}))([a-zA-Z0-9\-_\.!\~\*'\(\);/\?:\@\&=\+$,]|(%[a-fA-F0-9]{2}))*)))?(\#([a-zA-Z0-9\-_\.!\~\*'\(\);/\?:\@\&=\+$,]|(%[a-fA-F0-9]{2}))*)?/

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
