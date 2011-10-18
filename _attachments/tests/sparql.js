describe("SPARQL", function() {
    // TODO: set up demo database
    // <http://i/mySwift> <http://p/name> "Swift" .
    // <http://i/mySwift> <http://p/type> <http://c/car> .
    it("should return '{}' for 'SELECT * WHERE {}'", function() {
        var parsed;
        parsed = SPARQL.parse("SELECT * WHERE {}");
        SPARQL.query(parsed, function(bindings) {
            expect(bindings).toEqual({});
        });
    });
    it("should return '{}' for 'SELECT * WHERE {<http://i/mySwift> <http://p/type> <http://c/car>}'", function() {
        var parsed;
        parsed = SPARQL.parse("SELECT * WHERE {<http://i/mySwift> <http://p/type> <http://c/car>}");
        SPARQL.query(parsed, function(bindings) {
            expect(bindings).toEqual({});
        });
    });
    it("should return '{\"a\" : [\"http://c/car\"]}' for 'SELECT * WHERE {<http://i/mySwift> <http://p/type> ?a}'", function() {
        var parsed, callback;
        callback = jasmine.createSpy();
        parsed = SPARQL.parse("SELECT * WHERE {<http://i/mySwift> <http://p/type> ?a}");
        SPARQL.query(parsed, callback);
        waitsFor(function () {
            return callback.callCount > 0;
        });
        runs(function () {
            expect(callback).toHaveBeenCalledWith({"a" : ["http://c/car"]});
        });
    });
    // fail for one variable used twice in a graph pattern
});
