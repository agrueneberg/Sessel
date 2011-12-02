exports.escape = function (doc) {
    doc = doc.replace(/&/g, "&amp;");
    doc = doc.replace(/</g, "&lt;");
    doc = doc.replace(/>/g, "&gt;");
    doc = doc.replace(/"/g, "&quot;");
    doc = doc.replace(/'/g, "&apos;");
    return doc;
};
