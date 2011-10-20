describe("SPARQL", function() {
    // TODO: Set up demo database
    // <http://i/mySwift> <http://p/name> "Swift" .
    // <http://i/mySwift> <http://p/type> <http://c/car> .
    it("should return '[]' for 'SELECT * WHERE {}'", function() {
        var parsed, callback;
        callback = jasmine.createSpy();
        parsed = SPARQL.parse("SELECT * WHERE {}");
        SPARQL.query(parsed, callback);
        waitsFor(function () {
            return callback.callCount > 0;
        });
        runs(function () {
            // TODO: [] and {} are the same?
            expect(callback).toHaveBeenCalledWith([]);
        });
    });
    it("should return '[]' for 'SELECT * WHERE {<http://i/mySwift> <http://p/type> <http://c/car>}'", function() {
        var parsed, callback;
        callback = jasmine.createSpy();
        parsed = SPARQL.parse("SELECT * WHERE {<http://i/mySwift> <http://p/type> <http://c/car>}");
        SPARQL.query(parsed, callback);
        waitsFor(function () {
            return callback.callCount > 0;
        });
        runs(function () {
            // TODO: [] and {} are the same?
            expect(callback).toHaveBeenCalledWith([]);
        });
    });
    // One graph pattern
    it("should return '[{\"a\" : \"http://c/car\"}]' for 'SELECT * WHERE {<http://i/mySwift> <http://p/type> ?a}'", function() {
        var parsed, callback;
        callback = jasmine.createSpy();
        parsed = SPARQL.parse("SELECT * WHERE {<http://i/mySwift> <http://p/type> ?a}");
        SPARQL.query(parsed, callback);
        waitsFor(function () {
            return callback.callCount > 0;
        });
        runs(function () {
            expect(callback).toHaveBeenCalledWith([{"a" : "http://c/car"}]);
        });
    });
    // Two graph patterns
    it("should return '[{\"s\" : \"http://i/mySwift\", \"o\" : \"Swift\"}]' for 'SELECT * WHERE {?s <http://p/type> <http://c/car> . ?s <http://p/name> ?o .}'", function() {
        var parsed, callback;
        callback = jasmine.createSpy();
        parsed = SPARQL.parse("SELECT * WHERE {?s <http://p/type> <http://c/car> . ?s <http://p/name> ?o .}");
        SPARQL.query(parsed, callback);
        waitsFor(function () {
            return callback.callCount > 0;
        });
        runs(function () {
            expect(callback).toHaveBeenCalledWith([{"s" : "http://i/mySwift", "o" : "Swift"}]);
        });
    });
    // Fail for one variable used twice in a graph pattern.
});
