# -*- coding: utf-8 -*-
"""Setup the redrugs application"""

import logging
from tg import config
from redrugs import model
import transaction

def bootstrap(command, conf, vars):
    """Place any commands to setup redrugs here"""

    # <websetup.bootstrap.before.auth

    # <websetup.bootstrap.after.auth>
