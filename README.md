Sessel
======

Sessel is a cross-indexed RDF store for [CouchDB](http://couchdb.apache.org) featuring an RDF query engine, import of and export to various RDF serialization formats, and a simple permission management.

Installation
------------

Use [CouchApp](http://couchapp.org) to push Sessel to CouchDB.


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

* `/` – Queries all triples in the triple store
* `/s/{URI}` – Queries a subject URI
* `/p/{URI}` – Queries a predicate URI
* `/o/uri/{URI}` – Queries an object URI **OR** `/o/lit/{LITERAL_VALUE}` – Queries an object literal

URIs have to be **URI encoded** (in JavaScript `encodeURIComponent` can be used).

There is graphical query interface in the browser for testing purposes that takes care of URI encoding: `_design/sessel/query.html`

### Examples

* Query all triples having the subject `http://example.com/rdf/testSubject`: `_design/sessel/_rewrite/s/http%3A%2F%2Fexample.com%2Frdf%2FtestSubject`


Import
------

A graphical import interface enables the import of existing RDF graphs stored in the N-Triples (`.nt`) format: `_design/sessel/import.html`
`tcga.nt` (Deus, H.F. et al. 2010. Exposing the cancer genome atlas as a SPARQL endpoint. Journal of Biomedical Informatics 43, 998-1008) in the `resources` directory serves as an example dataset.


Export
------

Query results can be exported in different formats by appending the URL parameter `format` and one of the following values:

* `rdf` – RDF/XML
* `n3` – N3
* `html` – HTML


Permission Management
---------------------

Sessel features a simple permission management: If the permission of an individual triple is set to `private` instead of `public` only authenticated users will be able to see it. In order to prevent unauthorized users from accessing the private data, it is highly recommended to set up a CouchDB Virtual Host pointing to `_design/sessel/_rewrite/` and to prevent access to Futon, the documents and the views. [The CouchDB Wiki](http://wiki.apache.org/couchdb/Virtual_Hosts) gives a detailed explanation of how to do it.


SPARQL Endpoint
---------------

Sessel does not feature a SPARQL endpoint at the moment, but tools like [SWObjects](http://sourceforge.net/apps/mediawiki/swobjects) can make up for that. SWObjects can import triples directly from Sessel by using a query like this:

    SELECT *
    FROM <{DB_URL}/_design/sessel/_rewrite/?format=rdf>
    WHERE {
        ?a ?b ?c .
    }

However, it will not notice if new triples are added to Sessel after the import.
