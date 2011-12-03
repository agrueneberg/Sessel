Sessel
======

Sessel bridges between semi-structured and assertive data by mapping JSON documents to RDF triples. The generated triples are then exposed as a SPARQL endpoint. Sessel is designed to be replicated into any existing [CouchDB](http://couchdb.apache.org) database.


Installation
------------

Clone this repository and use [CouchApp](http://couchapp.org) to push Sessel to CouchDB, or replicate [an existing deployment of Sessel](http://agrueneberg.iriscouch.com/sessel/), e.g. using curl:

    curl\
      -X POST\
      -H "Content-Type:application/json"\
      -d "{\"source\":\"http://agrueneberg.iriscouch.com/sessel\",\
           \"target\":\"http://localhost:5984/<your_db>\",\
           \"filter\":\"vacuum/rw\"}"\
      http://localhost:5984/_replicate


Document Conversion
-------------------

The `_id` value of each JSON document serves as the subject of a generated triple. The predicates and objects are populated from the rest of the key-value pairs.


SPARQL Endpoint
---------------

`_design/sessel/sparql.html` provides a GUI-based SPARQL endpoint that understands the `SELECT` subset of the SPARQL query language.
At the moment, the SPARQL endpoint can only be made available as a web service in a restricted manner. This is because CouchDB does not offer a way to store additional server-side logic in replicable design documents yet. As a workaround, a [companion tool based on Node](https://github.com/agrueneberg/Sessel/tree/node) can be put in front of Sessel to expose its SPARQL endpoint on the web.


Export
------

`_design/sessel/_rewrite/` allows for exporting all generated triples to various RDF serialization formats. The format is selected by adding the URL parameter `format` to the web service call, or by sending an `Accept` header to the web service.
The following formats are supported:

* `html` (`text/html`) – HTML (default)
* `ntriples` (`text/plain`) – N-Triples
* `turtle` (`text/turtle`) – Turtle
* `rdfxml` (`application/rdf+xml`) – RDF/XML
* `json` (`application/json`) – JSON (mainly for the SPARQL endpoint)


Notes
-----

Some aspects of the original RDF model such as blank nodes, typed literals, and literals with language tags are not supported yet. The SPARQL implementation only understands the SELECT subset of the query language, and on the protocol side, JSON is used instead of XML.
