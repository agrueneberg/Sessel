var requirejs;
requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require
});

requirejs(["http", "url", "sparql"], function (http, url, sparql) {
    http.createServer(function (req, res) {
        var parsedUrl, queryObject;
        // Parse URL including query parameters
        parsedUrl = url.parse(req.url, true);
        // Ignore favicon.ico requests
        if (parsedUrl.pathname === "/favicon.ico") {
            res.writeHead(404, "text/plain");
            res.end();
        } else {
            // Ignore requests without a query parameter
            if (parsedUrl.query.query === undefined) {
                res.writeHead(400, "text/plain");
                res.end("query parameter needed.");
            } else {
                try {
                    queryObject = sparql.parse(parsedUrl.query.query);
                    sparql.query(queryObject, function (query, callback) {
                        // The graph pattern resolver
                        http.get({
                            host: "agrueneberg.iriscouch.com",
                            port: 80,
                            path: "/sessel/_design/sessel/" + query
                        }, function(res) {
                            var body;
                            body = [];
                            res.setEncoding('utf8');
                            res.on('data', function (chunk) {
                                body.push(chunk);
                            });
                            res.on('end', function () {
                                callback(JSON.parse(body.join("")));
                            });
                        });
                    }, function (bindings) {
                        // The callback
                        res.writeHead(200, {"Content-Type": "application/json"});
                        res.end(JSON.stringify(bindings));
                    });
                } catch (e) {
                    res.writeHead(400, "text/plain");
                    res.end(e.message);
                }
            }
        }
    }).listen(80);
    console.log("Running...");
});
