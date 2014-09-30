# -*- coding: utf-8 -*-

"""WebHelpers used in redrugs."""

from webhelpers import date, feedgenerator, html, number, misc, text
from datetime import datetime

def current_year():
  now = datetime.now()
  return now.strftime('%Y')

def icon(icon_name, white=False):
    if (white):
        return html.literal('<i class="icon-%s icon-white"></i>' % icon_name)
    else:
        return html.literal('<i class="icon-%s"></i>' % icon_name)
