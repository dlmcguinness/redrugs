# -*- coding: utf-8 -*-
"""Main Controller"""

from tg import expose, flash, require, url, lurl, request, redirect, tmpl_context, config
from tg.i18n import ugettext as _, lazy_ugettext as l_
from redrugs.model import graph
from redrugs import model
import rdflib

from redrugs.lib.base import BaseController
from redrugs.controllers.error import ErrorController
from redrugs.controllers.api import ApiController
from tg.controllers import RestController

__all__ = ['RootController']

class NetworkController(BaseController):

    @expose("json")
    def load_graph(self,*args, **kwargs):
        pass
        
class ResourceController(RestController):
    uri_prefix = config.get("uri_prefix","")

    def load_resource(self, uri):
        queries = ['''
        SELECT distinct ?s ?p ?o ?g ?sLabel ?pLabel ?oLabel ?gLabel where {{ 
          graph ?g {{
            BIND(<{0}> as ?s) ?s ?p ?o .
          }}
          OPTIONAL {{?s rdfs:label ?sLabel}}
          OPTIONAL {{?p rdfs:label ?pLabel}}
          OPTIONAL {{?g rdfs:label ?gLabel}}
          OPTIONAL {{?o rdfs:label ?oLabel}}
        }}'''.format(uri),'''
        SELECT distinct ?s ?p ?o ?g ?sLabel ?pLabel ?oLabel ?gLabel where {{ 
          graph ?g {{
            BIND(<{0}> as ?o) ?s ?p ?o .
          }}
          OPTIONAL {{?s rdfs:label ?sLabel}}
          OPTIONAL {{?p rdfs:label ?pLabel}}
          OPTIONAL {{?g rdfs:label ?gLabel}}
          OPTIONAL {{?o rdfs:label ?oLabel}}
        }}'''.format(uri)
        ]
        
        # query = '''
        # prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>

        # SELECT distinct ?p ?o ?g ?pLabel ?oLabel ?gLabel where {{ 
        #   graph ?g {{
        #     <{0}> ?p ?o .
        #   }}
        #   OPTIONAL {{?p rdfs:label ?pLabel}}
        #   OPTIONAL {{?g rdfs:label ?gLabel}}
        #   OPTIONAL {{?o rdfs:label ?oLabel}}
        # }}'''.format(uri)
        result = rdflib.ConjunctiveGraph()
        quads = []
        #for g in model.graphs:
        for query in queries:
            try:
                resultSet = model.graph.query(query)
                quads.extend(resultSet)
            except Exception as e:
                print e
                print query
        for row in quads:
            s, p, o, g, sLabel, pLabel, oLabel, gLabel = row
            result.get_context(g).add((s, p, o))
            if sLabel != None:
                result.add((s, rdflib.RDFS.label, sLabel))
            if pLabel != None:
                result.add((p, rdflib.RDFS.label, pLabel))
            if gLabel != None:
                result.add((g, rdflib.RDFS.label, gLabel))
            if oLabel != None:
                result.add((o, rdflib.RDFS.label, oLabel))
        return result
    
    @expose('redrugs.templates.resource')
    def get(self, *args, **kw):
        print dir(request)
        if 'uri' in kw:
            uri = kw['uri']
        else:
            uri = self.uri_prefix + "/".join(args)
        uri = rdflib.URIRef(uri)
        g = self.load_resource(uri)
        resource = g.resource(uri)
        return dict(subject=uri,
                    resource=resource,
                    params=kw, 
                    mount=self.mount_point,
                    graph=g, 
                    load=self.load_resource)


class ReDrugSController(BaseController):
    @expose("redrugs.templates.redrugs")
    def index(self, *args, **kw):
        return dict(params=kw, 
                    mount=self.mount_point)

class ReDrugSControllerU2(BaseController):
    @expose("redrugs.templates.redrugsU2")
    def index(self, *args, **kw):
        return dict(params=kw, 
                    mount=self.mount_point)

class RootController(BaseController):
    """
    The root controller for the redrugs application.

    All the other controllers and WSGI applications should be mounted on this
    controller. For example::

        panel = ControlPanelController()
        another_app = AnotherWSGIApplication()

    Keep in mind that WSGI applications shouldn't be mounted directly: They
    must be wrapped around with :class:`tg.controllers.WSGIAppController`.

    """

    error = ErrorController()

    def _before(self, *args, **kw):
        tmpl_context.project_name = "redrugs"

    redrugs = ReDrugSController()
    
    #@expose('redrugs.templates.resource')
    #def _default(self,*args, **kw):
    #    print kw
    #    """Handle the front-page."""
    #    return self.resource.get(*args, **kw)

    @expose('redrugs.templates.about')
    def about(self):
        """Handle the 'about' page."""
        return dict(page='about')

    @expose('redrugs.templates.environ')
    def environ(self):
        """This method showcases TG's access to the wsgi environment."""
        return dict(page='environ', environment=request.environ)

    #resource = ResourceController()
    api = ApiController()

    @expose('redrugs.templates.data')
    @expose('json')
    def data(self, **kw):
        """This method showcases how you can use the same controller for a data page and a display page"""
        return dict(page='data', params=kw)
