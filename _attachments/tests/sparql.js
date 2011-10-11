describe('SPARQL', function() {
    // set up demo database
    it('should return "{}" for "SELECT * WHERE {}"', function() {
        var parsed = SPARQL.parse("SELECT * WHERE {}");
        SPARQL.query(parsed, function(result) {
            expect(result).toEqual({});
        });
    });
});
