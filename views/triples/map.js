function (doc) {
    var toType, keys, attachments;
 // toType was written by Angus Croll:
 // http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
    toType = function (obj) {
        return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
    };
 // Object.keys support in older environments:
 // https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/keys#Compatibility
    if (!Object.keys) {
        Object.keys = (function () {
            var hasOwnProperty, hasDontEnumBug, dontEnums, dontEnumsLength;
            hasOwnProperty = Object.prototype.hasOwnProperty;
            hasDontEnumBug = !({toString: null}).propertyIsEnumerable("toString");
            dontEnums = [
                "toString",
                "toLocaleString",
                "valueOf",
                "hasOwnProperty",
                "isPrototypeOf",
                "propertyIsEnumerable",
                "constructor"
            ];
            dontEnumsLength = dontEnums.length;
            return function (obj) {
                var result, prop, i;
                if (typeof obj !== "object" && typeof obj !== "function" || obj === null) {
                    throw new TypeError("Object.keys called on non-object");
                }
                result = [];
                for (prop in obj) {
                    if (hasOwnProperty.call(obj, prop)) {
                        result.push(prop);
                    }
                }
                if (hasDontEnumBug) {
                    for (i = 0; i < dontEnumsLength; i++) {
                        if (hasOwnProperty.call(obj, dontEnums[i])) {
                            result.push(dontEnums[i]);
                        }
                    }
                }
                return result;
            };
        }());
    }
    keys = Object.keys(doc);
    keys.forEach(function (key, idx) {
        var value, type, subject, predicate, object, attachments;
        value = doc[key];
     // Ignore CouchDB-specific properties that start with "_".
        if (key.charAt(0) !== "_") {
            type = toType(value);
         // URL encode key and property.
            subject = encodeURIComponent(doc._id);
            predicate = encodeURIComponent(key);
         // Stringify value.
            object = JSON.stringify(value);
            emit([subject, predicate, object], {
                objectType: type
            });
        } else {
         // Special treatment for attachments.
            if (key === "_attachments") {
                attachments = Object.keys(doc["_attachments"]);
                attachments.forEach(function (attachment) {
                    emit([doc._id, "attachment", attachment], {
                        objectType: "_attachment"
                    });
                });
            }
        }
    });
}
