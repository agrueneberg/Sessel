function (doc) {
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
    Object.keys(doc).forEach(function (key) {
     // Ignore CouchDB-specific properties that start with "_".
        if (key.charAt(0) !== "_") {
            emit(key, 1);
        }
    });
}
