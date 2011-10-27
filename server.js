var requirejs;
requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require
});

requirejs(["http", "sparql"], function (http, sparql) {
    console.log("Alive and kicking!");
});
