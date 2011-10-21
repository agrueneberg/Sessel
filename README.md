Sessel
======

Sessel is a cross-indexed RDF triple store for [CouchDB](http://couchdb.apache.org) featuring an RDF query engine, a SPARQL endpoint, import of and export to various RDF serialization formats, and a simple permission management.

Some simplifications of the original RDF model were made to support this functionality: blank nodes, typed literals, and literals with language tags are deliberately not supported. The implementation of SPARQL only understands the SELECT subset of the query language, and on the protocol side, JSON is used instead of XML.


Installation
------------

Use [CouchApp](http://couchapp.org) to push Sessel to CouchDB or replicate [an existing deployment of Sessel](http://agrueneberg.iriscouch.com/sessel/).


Document Format
---------------

Triples are stored as documents in the following format:

    {
        "subject": "{URI}",
        "predicate": "{URI}",
        "object_type": "URI" | "Literal",
        "object": "{URI}" | "{Literal Value}",
        "permission": "public" | "private"
    }

Curly braces indicate placeholders.


Query Language
--------------

Sessel uses the URL rewriting system of CouchDB to provide a basic query language. The base URL of the service is `_design/sessel/_rewrite/`.
Each of the following elements can be appended to the URL once in any order to form a query:

* `/s/{URI}` – Queries a subject URI
* `/p/{URI}` – Queries a predicate URI
* `/o/uri/{URI}` – Queries an object URI **OR** `/o/lit/{LITERAL_VALUE}` – Queries an object literal

`/` queries all triples in the triple store.

URIs have to be **URI encoded** (in JavaScript `encodeURIComponent` can be used).

There is GUI-based query interface for testing purposes that takes care of URI encoding: `_design/sessel/query.html`

### Examples

* Query all triples having the subject `http://example.com/rdf/testSubject`: `_design/sessel/_rewrite/s/http%3A%2F%2Fexample.com%2Frdf%2FtestSubject`


SPARQL Endpoint
---------------

Sessel exposes a rudimentary GUI-based SPARQL endpoint that understands the SELECT subset of the query language: `_design/sessel/sparql.html`.
At the moment, CouchDB does not offer a way to make web services written in JavaScript and stored as documents available as external processes.


Import
------

A graphical import interface enables the import of existing RDF graphs stored in the N-Triples (`.nt`) format: `_design/sessel/import.html`. [`tcga.nt`](http://www.ncbi.nlm.nih.gov/pubmed/20851208) in the `resources` directory serves as an example dataset.


Export
------

Query results can be exported in different formats by appending the URL parameter `format` and one of the following values:

* `rdf` – RDF/XML
* `n3` – N3
* `html` – HTML


Permission Management
---------------------

Sessel features a simple permission management: if the permission of an individual triple is set to `private` instead of `public` only authenticated users will be able to see it.
In order to prevent unauthorized users from accessing private data, it is highly recommended to set up a CouchDB Virtual Host pointing to `_design/sessel/_rewrite/` and to prevent access to Futon, the documents and the views. [The CouchDB Wiki](http://wiki.apache.org/couchdb/Virtual_Hosts) gives a detailed explanation of how to do it.
