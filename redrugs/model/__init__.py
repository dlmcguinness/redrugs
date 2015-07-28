# -*- coding: utf-8 -*-
"""The application's model objects"""

import rdflib
import rdflib.graph

#endpoints = [
#endpoint = "http://redrugs.tw.rpi.edu/bigdata/sparql"
#endpoint = "http://drugbank.bio2rdf.org/sparql"
endpoint = "http://localhost:9999/bigdata/sparql"
#    ]
#graphs = []
#for endpoint in endpoints:
graph = rdflib.ConjunctiveGraph('SPARQLStore')
graph.open(endpoint)

def init_model(engine):
    """Call me before using any of the tables or classes in the model."""
    #DBSession.configure(bind=engine)

    # If you are using reflection to introspect your database and create
    # table objects for you, your tables must be defined and mapped inside
    # the init_model function, so that the engine is available if you
    # use the model outside tg2, you need to make sure this is called before
    # you use the model.

    #
    # See the following example:

    #global t_reflected

    #t_reflected = Table("Reflected", metadata,
    #    autoload=True, autoload_with=engine)

    #mapper(Reflected, t_reflected)

# Import your model modules here.
