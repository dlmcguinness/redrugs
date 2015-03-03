# -*- coding: utf-8 -*-
"""Main Controller"""

from tg import expose, flash, require, url, lurl, request, response, redirect, tmpl_context, config
from tg.i18n import ugettext as _, lazy_ugettext as l_
from redrugs.model import graph
from redrugs import model
import rdflib
from rdflib.query import Result

from redrugs.lib.base import BaseController
from redrugs.controllers.error import ErrorController
from tg.controllers import RestController
from genshi.template import NewTextTemplate
from genshi.template.base import Context
from pylons.controllers.core import WSGIController
import collections, math
import sadi

from SPARQLWrapper import SPARQLWrapper, JSON

__all__ = ['RootController']

def lru(original_function, maxsize=1000):
    mapping = {}

    PREV, NEXT, KEY, VALUE = 0, 1, 2, 3         # link fields
    head = [None, None, None, None]        # oldest
    tail = [head, None, None, None]   # newest
    head[NEXT] = tail

    def fn(*key):
        PREV, NEXT = 0, 1

        link = mapping.get(key, head)
        if link is head:
            value = original_function(*key)
            if len(mapping) >= maxsize:
                old_prev, old_next, old_key, old_value = head[NEXT]
                head[NEXT] = old_next
                old_next[PREV] = head
                del mapping[old_key]
            last = tail[PREV]
            link = [last, tail, key, value]
            mapping[key] = last[NEXT] = tail[PREV] = link
        else:
            link_prev, link_next, key, value = link
            link_prev[NEXT] = link_next
            link_next[PREV] = link_prev
            last = tail[PREV]
            last[NEXT] = tail[PREV] = link
            link[PREV] = last
            link[NEXT] = tail
        return value
    return fn


def geomean(nums):
    return float(reduce(lambda x, y: x*y, nums))**(1.0/len(nums))

def logLikelihood(p):
    return math.atanh(2*p-1)

def confidenceVote(nums):
    return (math.tanh(sum([math.atanh(2*x-1) for x in nums])) +1)/2

downstreamQueryTemplate = NewTextTemplate('''
PREFIX sio: <http://semanticscience.org/resource/>
PREFIX prov: <http://www.w3.org/ns/prov#>
prefix go: <http://purl.org/obo/owl/GO#GO_>

SELECT distinct ?participant ?participantLabel ?participantType ?target ?targetType ?targetLabel ?interaction ?interactionType ?typeLabel ?probability ?searchEntity ?searchTerm where {
  { let ( ?searchEntity := <${search}>)
    let ( ?participant := <${search}> ) }
  <${search}> rdfs:label ?searchTerm.
  graph ?assertion {
    ?interaction sio:has-participant <${search}>.
    ?interaction sio:has-target ?target.
    ?interaction a ?interactionType.
  }
  OPTIONAL { ?interactionType rdfs:label ?typeLabel. }
  OPTIONAL {
    ?assertion sio:SIO_000008 [
      a sio:SIO_000765;
      sio:SIO_000300 ?probability;
    ].
  }
  OPTIONAL { <${search}> a ?participantType. }
  OPTIONAL { ?target a ?targetType. }
  
  ?target rdfs:label ?targetLabel.
  <${search}> rdfs:label ?participantLabel.
} LIMIT 10000''')

upstreamQueryTemplate = NewTextTemplate('''
PREFIX sio: <http://semanticscience.org/resource/>
PREFIX prov: <http://www.w3.org/ns/prov#>
prefix go: <http://purl.org/obo/owl/GO#GO_>

SELECT distinct ?participant ?participantLabel ?participantType ?target ?targetType ?targetLabel ?interaction ?interactionType ?typeLabel ?probability ?searchEntity ?searchTerm where {
  { let ( ?searchEntity := <${search}>)
    let ( ?target := <${search}> ) }
{% end %}\
  <${search}> rdfs:label ?searchTerm.
  graph ?assertion {
    ?interaction sio:has-participant ?participant.
    ?interaction sio:has-target <${search}>.
    ?interaction a ?interactionType.
  }
  OPTIONAL { ?interactionType rdfs:label ?typeLabel. }
  OPTIONAL {
    ?assertion sio:SIO_000008 [
      a sio:SIO_000765;
      sio:SIO_000300 ?probability;
    ].
  }
  OPTIONAL { ?participant a ?participantType. }
  OPTIONAL { <${search}> a ?targetType. }
  
  <${search}> rdfs:label ?targetLabel.
  ?participant rdfs:label ?participantLabel.
} LIMIT 10000''')

processAppendQueryTemplate = NewTextTemplate('''
PREFIX sio: <http://semanticscience.org/resource/>
PREFIX prov: <http://www.w3.org/ns/prov#>
prefix go: <http://purl.org/obo/owl/GO#GO_>

SELECT distinct ?participant ?participantLabel ?participantType ?target ?targetType ?targetLabel ?targetType ?interaction ?interactionType ?typeLabel ?probability ?searchEntity ?searchTerm where {
  let ( 
    ?searchEntity :=
    <${search}>
  )
  <${search}> rdfs:label ?searchTerm.
  <${search}> sio:has-participant ?participant.
  
  graph ?assertion {
    ?interaction sio:has-participant ?participant.
    ?interaction sio:has-target ?target.
    ?interaction a ?interactionType.
  }
  OPTIONAL { ?interactionType rdfs:label ?typeLabel. }
  OPTIONAL { ?participant a ?participantType. }
  OPTIONAL { ?target a ?targetType. }
  OPTIONAL {
    ?assertion sio:SIO_000008 [
      a sio:SIO_000765;
      sio:SIO_000300 ?probability;
    ].
  }
  
  ?target rdfs:label ?targetLabel.
  ?participant rdfs:label ?participantLabel.
} LIMIT 10000''')

def mergeByInteraction(edges):
    def mergeInteractions(interactions):
        #print "start: "
        result = interactions[0]
        result['provenance'] = []
        for i in interactions:
            #print "i: "
            #print i
            if i['probability'] == None:
                #print i
                i['probability'] = rdflib.Literal(0.99)     #Drugbank, OMIM
            result['provenance'].append((i['interaction'], i['interactionType'], i['probability']))
        result['probability'] = geomean([i['probability'].value for i in interactions])
        #print "end: "
        return result
    
    byInteraction = collections.defaultdict(list)
    for edge in edges:
        byInteraction[(edge['participant'],edge['interaction'],edge['target'])].append(edge)
    result = map(mergeInteractions, byInteraction.values())
    return result

def mergeByInteractionType(edges):
    def mergeInteractions(interactions):
        result = interactions[0]
        result['interactions'] = [i['interaction'] for i in interactions]
        result['likelihood'] = logLikelihood(result['probability'])
        return result
    
    byInteraction = collections.defaultdict(list)
    for edge in edges:
        byInteraction[(edge['participant'],edge['interactionType'],edge['target'])].append(edge)
    result = map(mergeInteractions, byInteraction.values())
    return result

sio = rdflib.Namespace("http://semanticscience.org/resource/")
prov = rdflib.Namespace("http://www.w3.org/ns/prov#")
void = rdflib.Namespace("http://rdfs.org/ns/void#")
pml = rdflib.Namespace("http://provenanceweb.org/ns/pml#")

class InteractionsService(sadi.Service):
    
    def process(self,i,o):
        edges = self.get_interactions(str(i.identifier))
        for i in edges:
            interaction = o.graph.resource(rdflib.BNode())
            if 'interactionType' in i and i['interactionType']:
                interaction.add(rdflib.RDF.type, rdflib.URIRef(i['interactionType']))
            for d in i['interactions']:
                interaction.add(prov.wasDerivedFrom,rdflib.URIRef(d))
            target = o.graph.resource(i['target'])
            if 'targetType' in i and i['targetType']:
                target.add(rdflib.RDF.type, rdflib.URIRef(i['targetType']))
            target.add(rdflib.RDFS.label, rdflib.Literal(i['targetLabel']))
            interaction.add(sio['has-target'],target.identifier)
            participant = o.graph.resource(i['participant'])
            if 'participantType' in i and i['participantType']:
                participant.add(rdflib.RDF.type, rdflib.URIRef(i['participantType']))
            participant.add(rdflib.RDFS.label, rdflib.Literal(i['participantLabel']))
            interaction.add(sio['has-participant'],participant.identifier)
            interaction.add(sio['probability-value'], rdflib.Literal(i['probability']))
            interaction.add(sio.likelihood, rdflib.Literal(i['likelihood']))
            for t in i['provenance']:
                interaction.add(prov.data, rdflib.Literal(t))

    def getOrganization(self):
        result = self.Organization()
        result.add(rdflib.RDFS.label,rdflib.Literal("Tetherless World Constellation, RPI"))
        result.add(sadi.mygrid.authoritative, rdflib.Literal(False))
        result.add(sadi.dc.creator, rdflib.URIRef('mailto:mccusj@rpi.edu'))
        return result

    #@lru
    def get_interactions(self,search):
        q = self.create_query(search)
        edges = []
        #print q
        resultSet = model.graph.query(q)
        variables = [x.replace("?","") for x in resultSet.vars]
        edges.extend([dict([(variables[i],x[i]) for i  in range(len(x))]) for x in resultSet])
        #print len(edges)
        edges = mergeByInteraction(edges)
        edges = mergeByInteractionType(edges)
        return edges

            
class InteractionsInBiologicalProcessService(InteractionsService):
    label = "Find Interactions in a Biological Process"
    serviceDescriptionText = 'Find interactions whose participants or targets also participate in the input process.'
    comment = 'Find interactions whose participants or targets also participate in the input process.'
    serviceNameText = "Find Interactions in a Biological Process"
    name = "process"

    def create_query(self, search):
        q = processAppendQueryTemplate.generate(Context(search=search)).render()
        return q

    def getInputClass(self):
        return sio.process

    def getOutputClass(self):
        return sio.process

class FindUpstreamAgentsService(InteractionsService):
    label = "Find Upstream Participants"
    serviceDescriptionText = 'Find interactions that the input entity is a target of in and have explicit participants.'
    comment = 'Find interactions that the input entity is a target of in and have explicit participants.'
    serviceNameText = "Find Upstream Targets"
    name = "upstream"

    def create_query(self,search):
        q = upstreamQueryTemplate.generate(Context(search=search)).render() 
        return q

    def getInputClass(self):
        return sio['material-entity']

    def getOutputClass(self):
        return sio.agent

class FindDownstreamTargetsService(InteractionsService):
    label = "Find Downstream Targets"
    serviceDescriptionText = 'Find interactions that the input entity participates in and have explicit targets.'
    comment = 'Find interactions that the input entity participates in and have explicit targets.'
    serviceNameText = "Find Downstream Targets"
    name = "downstream"

    def create_query(self,search):
        q = downstreamQueryTemplate.generate(Context(search=search)).render() 
        return q

    def getInputClass(self):
        return sio['material-entity']

    def getOutputClass(self):
        return sio.target

class TextSearchService(sadi.Service):
    label = "Resource Text Search"
    serviceDescriptionText = 'Look up resources using free text search against their RDFS labels. This service is optimized for typeahead user interfaces.'
    comment = 'Look up resources using free text search. This service is optimized for typeahead user interfaces.'
    serviceNameText = "Resource Text Search"
    name = "search"

    def getOrganization(self):
        result = self.Organization()
        result.add(rdflib.RDFS.label,rdflib.Literal("Tetherless World Constellation, RPI"))
        result.add(sadi.mygrid.authoritative, rdflib.Literal(False))
        result.add(sadi.dc.creator, rdflib.URIRef('mailto:mccusj@rpi.edu'))
        return result
    
    def getInputClass(self):
        return pml.Query

    def getOutputClass(self):
        return pml.AnsweredQuery

    def process(self,i,o):
        answers = self.get_matches(i.value(prov.value))
        for a in answers:
            answer = o.graph.resource(a[1])
            answer.add(rdflib.RDFS.label, rdflib.Literal(rdflib.Literal(a[0])))
            answer.add(pml.answers,o.identifier)

    #@lru
    def get_matches(self,search):
        query = '''prefix bd: <http://www.bigdata.com/rdf/search#>
          select distinct ?o ?s  where {{
            ?o bd:search """{0}.*""" .
            ?s rdfs:label ?o.
            ?o bd:relevance ?cosine .
            FILTER(isURI(?s))
          }} order by desc(?cosine) limit 20'''.format(search)
        resultSet = model.graph.query(query)
        #print query
        result = [[y for y in x] for x in resultSet]
        return result

def wsgi_wrap(fn):
    def call(self):
        tglocals = request.environ['tg.locals']
        def start_response(status, headers, exc_info=None):
            response.status = status
            response.headers.update(headers)
            if exc_info:
                response.headerlist = exc_info
        tglocals.request.body = request.environ['request_body']
        return fn(self,tglocals.request.environ, start_response)
    return call

exp = expose()
class ApiController(BaseController):
    @expose('json')
    def index(self):
        return {"greeting":"Hello."}
    
    _process = FindUpstreamAgentsService()
    _upstream = FindUpstreamAgentsService()
    _downstream = FindDownstreamTargetsService()
    _search = TextSearchService()

    @expose()
    @wsgi_wrap
    def process(self,environ, start_response):
        return self._process(environ, start_response)

    @expose()
    @wsgi_wrap
    def upstream(self,environ, start_response):
        return self._upstream(environ, start_response)

    @expose()
    @wsgi_wrap
    def downstream(self,environ, start_response):
        return self._downstream(environ, start_response)

    @expose()
    @wsgi_wrap
    def search(self,environ, start_response):
        return self._search(environ, start_response)
