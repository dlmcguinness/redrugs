# -*- coding: utf-8 -*-

"""The base Controller API."""

from tg import TGController, tmpl_context
from tg.render import render
from tg.i18n import ugettext as _, ungettext
import redrugs.model as model

__all__ = ['BaseController']


class BaseController(TGController):
    """
    Base class for the controllers in the application.

    Your web application should have one of these. The root of
    your application is used to compute URLs used by your app.

    """

    def __call__(self, environ, start_response):
        environ['request_body'] = start_response.request.body
        """Invoke the Controller"""
        # TGController.__call__ dispatches to the Controller method
        # the request is routed to. This routing information is
        # available in environ['pylons.routes_dict']

        return TGController.__call__(self, environ, start_response)
