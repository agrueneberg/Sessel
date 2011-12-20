Sessel
======

Sessel is a CouchApp for [CouchDB](http://couchdb.apache.org) that generates RDF triples from JSON documents, which then in turn can be exported to various serialization formats, or queried through a SPARQL endpoint.


Installation
------------

Sessel is designed to be replicated or pushed into any existing CouchDB database. Therefore, there is more than one way to install it.

### Install Sessel using replication

Replicate [an existing deployment of Sessel](http://agrueneberg.iriscouch.com/sessel/) to `<your_host>/<your_db`:

    curl \
      -X POST \
      -H "Content-Type:application/json" \
      -d "{\"source\":\"http://agrueneberg.iriscouch.com/sessel\", \
           \"target\":\"http://<your_host>/<your_db>\", \
           \"filter\":\"vacuum/rw\"}" \
      http://<your_host>/_replicate

### Install Sessel using [CouchApp](http://couchapp.org)

Clone this repository and use [CouchApp](http://couchapp.org) to push Sessel to `<your_host>/<your_db>`:

    git clone git://github.com/agrueneberg/Sessel.git
    couchapp push Sessel/ http://<your_host>/<your_db>


Export
------

The generated triples can be exported to various RDF serialization formats by calling the export interface `http://<your_host>/<your_db>/_design/sessel/_rewrite/` with one of the following strings added:

* `export.nt` – Export as [N-Triples](http://www.w3.org/TR/rdf-testcases/#ntriples)
* `export.ttl` – Export as [Turtle](http://www.w3.org/TeamSubmission/turtle/)
* `export.rdf` – Export as [RDF/XML](http://www.w3.org/TR/rdf-syntax-grammar/)


SPARQL Endpoint
---------------

A GUI-based SPARQL endpoint that understands the `SELECT` subset of the [SPARQL query language](http://www.w3.org/TR/rdf-sparql-query/) is provided at `http://<your_host>/<your_db>/_design/sessel/sparql.html`. At the moment, it is GUI-based only because CouchDB does not allow web services to be described as JavaScript in replicable design documents yet. As a workaround, a [companion tool based on Node](https://github.com/agrueneberg/Sessel/tree/node) can be put in front of Sessel to expose its SPARQL endpoint on the web, or a standalone SPARQL processors such as [ARQ](http://jena.sourceforge.net/ARQ/) can be used to refer to the generated triples:

    SELECT *
    FROM <http://<your_host>/<your_db>/_design/sessel/_rewrite/export.ttl>
    WHERE {
        ?s ?p ?o .
    }


Document Conversion
-------------------

Each JSON document is broken down to key-value pairs. Each key-value pair represents a triple, key and value being predicate and object, respectively. The value of the special key-value pair with the key `_id` ensuring the uniqueness of a document serves as the subject of the generated triple.

### Data type mapping

The data types of JSON are mapped to the data types of XML as specified in [XML Schema Part 2: Datatypes Second Edition](http://www.w3.org/TR/xmlschema-2/).

* `string` → `xsd:string`
* `array` → `xsd:string`
* `object` → `xsd:string`
* `null` → `xsd:string`
* `number` → `xsd:integer` or `xsd:double`
* `boolean` → `xsd:boolean`
