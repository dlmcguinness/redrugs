from rdflib.term import Literal, URIRef
from rdflib.namespace import Namespace

from rdflib.py3compat import b

test_data = """
#  Definitions of terms describing the n3 model
#

@keywords a.

@prefix n3: <#>.
@prefix log: <log.n3#> .
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix : <#> .

@forAll :s, :p, :x, :y, :z.

n3:Statement    a rdf:Class .
n3:StatementSet a rdf:Class .

n3:includes     a rdfs:Property .   # Cf rdf:li

n3:predicate    a rdf:Property; rdfs:domain n3:statement .
n3:subject      a rdf:Property; rdfs:domain n3:statement .
n3:object       a rdf:Property; rdfs:domain n3:statement .

n3:context      a rdf:Property; rdfs:domain n3:statement;
                rdfs:range n3:StatementSet .



########### Rules

{ :x :p :y . } log:means { [
                n3:subject :x;
                n3:predicate :p;
                n3:object :y ] a log:Truth}.

# Needs more thought ... ideally, we have the implcit AND rules of
# juxtaposition (introduction and elimination)

{
    {
        {  :x n3:includes :s. } log:implies { :y n3:includes :s. } .
    } forall :s1 .
} log:implies { :x log:implies :y } .

{
    {
        {  :x n3:includes :s. } log:implies { :y n3:includes :s. } .
    } forall :s1
} log:implies { :x log:implies :y } .

# I think n3:includes has to be axiomatic builtin. - unless you go to syntax description.
# syntax.n3?
"""


import unittest
from urllib2 import URLError

from rdflib.graph import Graph, ConjunctiveGraph


class TestN3Case(unittest.TestCase):

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def testFileName(self):
        """
        Test that the n3 parser throws an Exception when using the identifier
        ":foo.txt", as this is not valid as per the rdf spec.
        """
        test_data = """
@prefix : <http://www.example.com/> .

:foo.txt :p :q .
"""
        g = Graph()
        # TODO: determine what's correct here, either:
        # seeAlso <http://www.w3.org/TeamSubmission/turtle/#name>
        self.assertRaises(Exception, g.parse, data=test_data, format="n3")
        # or.. (challenging comment below):
        # This isn't the expected result based on my reading of n3 bits
        # g.parse(data=test_data, format="n3")
        # s = g.value(predicate=URIRef("http://www.example.com/p"), object=URIRef("http://www.example.com/q"))
        # self.assertEquals(s, URIRef("http://www.example.org/foo.txt"))

    def testBaseCumulative(self):
        """
        Test that the n3 parser supports base declarations
        This is issue #22
        """

        input = """
@prefix : <http://example.com/> .
# default base
<foo> :name "Foo" .
# change it
@base <http://example.com/doc/> .
<bar> :name "Bar" .
# and change it more - they are cumulative
@base <doc2/> .
<bing> :name "Bing" .
# unless abosulute
@base <http://test.com/> .
<bong> :name "Bong" .

"""
        g = Graph()
        g.parse(data=input, format="n3")
        print list(g)
        self.assertTrue((None, None, Literal('Foo')) in g)
        self.assertTrue(
            (URIRef('http://example.com/doc/bar'), None, None) in g)
        self.assertTrue(
            (URIRef('http://example.com/doc/doc2/bing'), None, None) in g)
        self.assertTrue((URIRef('http://test.com/bong'), None, None) in g)

    def testBaseExplicit(self):
        """
        Test that the n3 parser supports resolving relative URIs
        and that base will override
        """

        input = """
@prefix : <http://example.com/> .
# default base
<foo> :name "Foo" .
# change it
@base <http://example.com/doc/> .
<bar> :name "Bar" .
"""
        g = Graph()
        g.parse(data=input, publicID='http://blah.com/', format="n3")
        print list(g)
        self.assertTrue(
            (URIRef('http://blah.com/foo'), None, Literal('Foo')) in g)
        self.assertTrue(
            (URIRef('http://example.com/doc/bar'), None, None) in g)

    def testBaseSerialize(self):
        g = Graph()
        g.add((URIRef('http://example.com/people/Bob'), URIRef(
            'urn:knows'), URIRef('http://example.com/people/Linda')))
        s = g.serialize(base='http://example.com/', format='n3')
        self.assertTrue(b('<people/Bob>') in s)
        g2 = ConjunctiveGraph()
        g2.parse(data=s, publicID='http://example.com/', format='n3')
        self.assertEqual(list(g), list(g2))

    def testIssue23(self):
        input = """<http://example.com/article1> <http://example.com/title> "this word is in \u201Cquotes\u201D"."""

        g = Graph()
        g.parse(data=input, format="n3")

        # Note difference in case of hex code, cwm allows lower-case
        input = """<http://example.com/article1> <http://example.com/title> "this word is in \u201cquotes\u201d"."""

        g.parse(data=input, format="n3")

    def testIssue29(self):
        input = """@prefix foo-bar: <http://example.org/> .

foo-bar:Ex foo-bar:name "Test" . """

        g = Graph()
        g.parse(data=input, format="n3")

    def testIssue68(self):
        input = """@prefix : <http://some.url/pome#>.\n\n:Brecon a :Place;\n\t:hasLord\n\t\t:Bernard_of_Neufmarch\xc3\xa9 .\n """

        g = Graph()
        g.parse(data=input, format="n3")

    def testIssue156(self):
        """
        Make sure n3 parser does not choke on UTF-8 BOM
        """
        g = Graph()
        g.parse("test/n3/issue156.n3", format="n3")

    def testDotInPrefix(self):
        g = Graph()
        g.parse(
            data="@prefix a.1: <http://example.org/> .\n a.1:cake <urn:x> <urn:y> . \n",
            format='n3')

    def testModel(self):
        g = ConjunctiveGraph()
        g.parse(data=test_data, format="n3")
        i = 0
        for s, p, o in g:
            if isinstance(s, Graph):
                i += 1
        self.assertEquals(i, 3)
        self.assertEquals(len(list(g.contexts())), 13)

        g.close()

    def testQuotedSerialization(self):
        g = ConjunctiveGraph()
        g.parse(data=test_data, format="n3")
        g.serialize(format="n3")

    def testParse(self):
        g = ConjunctiveGraph()
        try:
            g.parse(
                "http://groups.csail.mit.edu/dig/2005/09/rein/examples/troop42-policy.n3", format="n3")
        except URLError:
            from nose import SkipTest
            raise SkipTest(
                'No network to retrieve the information, skipping test')


if __name__ == '__main__':
    unittest.main()
