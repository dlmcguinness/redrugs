# -*- coding: utf-8 -*-
"""
Functional test suite for the root controller.

This is an example of how functional tests can be written for controllers.

As opposed to a unit-test, which test a small unit of functionality,
functional tests exercise the whole application and its WSGI stack.

Please read http://pythonpaste.org/webtest/ for more information.

"""
from nose.tools import assert_true

from redrugs.tests import TestController


class TestRootController(TestController):
    """Tests for the method in the root controller."""

    def test_index(self):
        """The front page is working properly"""
        response = self.app.get('/')
        msg = 'TurboGears 2 is rapid web application development toolkit '\
              'designed to make your life easier.'
        # You can look for specific strings:
        assert_true(msg in response)

        # You can also access a BeautifulSoup'ed response in your tests
        # (First run $ easy_install BeautifulSoup
        # and then uncomment the next two lines)

        #links = response.html.findAll('a')
        #print links
        #assert_true(links, "Mummy, there are no links here!")

    def test_environ(self):
        """Displaying the wsgi environ works"""
        response = self.app.get('/environ.html')
        assert_true('The keys in the environment are: ' in response)

    def test_data(self):
        """The data display demo works with HTML"""
        response = self.app.get('/data.html?a=1&b=2')
        expected1 = """<td>a</td>
                <td>1</td>"""
        expected2 = """<td>b</td>
                <td>2</td>"""

        assert expected1 in response, response
        assert expected2 in response, response

    def test_data_json(self):
        """The data display demo works with JSON"""
        resp = self.app.get('/data.json?a=1&b=2')
        assert '"a": "1", "b": "2"' in resp, resp

