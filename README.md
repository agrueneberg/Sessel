Sessel
======

Sessel is a CouchApp for [CouchDB](http://couchdb.apache.org) that generates RDF triples from JSON documents, which then in turn can be exported to various serialization formats, or queried through a SPARQL endpoint.


Installation
------------

Sessel is designed to be replicated or pushed into any existing CouchDB database that stores data that you want to export as RDF. There is more than one way to install it.

### Install Sessel using [CouchApp](http://couchapp.org) or similar tools

Clone this repository and use [CouchApp](http://couchapp.org) to push Sessel to `<your_host>/<your_db>`:

    git clone git://github.com/agrueneberg/Sessel.git
    couchapp push Sessel/ http://<your_host>/<your_db>

### Install Sessel using replication

Replicate an existing deployment of Sessel to `<your_host>/<your_db`.


Export
------

The generated triples can be exported to various RDF serialization formats by calling the export interface `http://<your_host>/<your_db>/_design/sessel/_rewrite/` with one of the following strings added:

* `export.nt` – Export as [N-Triples](http://www.w3.org/TR/rdf-testcases/#ntriples)
* `export.ttl` – Export as [Turtle](http://www.w3.org/TeamSubmission/turtle/)
* `export.rdf` – Export as [RDF/XML](http://www.w3.org/TR/rdf-syntax-grammar/)

A graphical export interface can be accessed at `http://<your_host>/<your_db>/_design/sessel/export.html`.

### Changing the base URI

The default base URI is `http://host/db_name/`. If you prefer a different URI, add a `base_uri` parameter to the export URL and provide a percent-encoded value, e.g. `http://<your_host>/<your_db>/_design/sessel/_rewrite/export.ttl?base_uri=http%3A%2F%2Fexample.com%2Frdf%23`.

### Changing the prefix

The default prefix of the base URI is `sessel`. If you prefer a different prefix, add a `prefix` parameter to the export URL and provide a value, e.g. `http://<your_host>/<your_db>/_design/sessel/_rewrite/export.ttl?base_uri=http%3A%2F%2Fexample.com%2Frdf%23&prefix=example`.

### Data type mapping

The data types of JSON are mapped to the data types of XML as specified in [XML Schema Part 2: Datatypes Second Edition](http://www.w3.org/TR/xmlschema-2/).

* `string` → `xsd:string`
* `array` → `xsd:string`
* `object` → `xsd:string`
* `null` → `xsd:string`
* `number` → `xsd:integer` or `xsd:double`
* `boolean` → `xsd:boolean`

To activate data type mapping, add a `type_literals` parameter to the export URL and provide a string value `true`.


SPARQL Endpoint
---------------

Sessel bundles Antonio Garrote's fantastic [rdfstore-js](https://github.com/antoniogarrote/rdfstore-js), an RDF store with SPARQL support written entirely in JavaScript. A graphical query interface can be accessed at `http://<your_host>/<your_db>/_design/sessel/sparql.html`.
Unfortunately, modern browsers only let [rdfstore-js](https://github.com/antoniogarrote/rdfstore-js) store 5 MB worth of triples. If your data set is large it is recommended to use a standalone SPARQL processor such as [ARQ](http://jena.sourceforge.net/ARQ/) to import the generated triples by pointing it to the export interface:

    SELECT *
    FROM <http://<your_host>/<your_db>/_design/sessel/_rewrite/export.ttl>
    WHERE {
        ?s ?p ?o .
    }


Document Conversion
-------------------

Each JSON document is broken down to key-value pairs. Each key-value pair represents a triple, key and value being predicate and object, respectively. The value of the special key-value pair with the key `_id` ensuring the uniqueness of a document serves as the subject of the generated triple.
