# -*- coding: utf-8 -*-
"""
Global configuration file for TG2-specific settings in redrugs.

This file complements development/deployment.ini.

Please note that **all the argument values are strings**. If you want to
convert them into boolean, for example, you should use the
:func:`paste.deploy.converters.asbool` function, as in::
    
    from paste.deploy.converters import asbool
    setting = asbool(global_conf.get('the_setting'))
 
"""

from tg.configuration import AppConfig

import redrugs
from redrugs import model
from redrugs.lib import app_globals, helpers 

base_config = AppConfig()
base_config.renderers = []
base_config.prefer_toscawidgets2 = True

base_config.package = redrugs

#Enable json in expose
base_config.renderers.append('json')

#Enable genshi in expose to have a lingua franca for extensions and pluggable apps
#you can remove this if you don't plan to use it.
base_config.renderers.append('genshi')

#Set the default renderer
base_config.default_renderer = 'genshi'
# if you want raw speed and have installed chameleon.genshi
# you should try to use this renderer instead.
# warning: for the moment chameleon does not handle i18n translations
#base_config.renderers.append('chameleon_genshi')
#Configure the base SQLALchemy Setup
base_config.use_sqlalchemy = False
base_config.model = redrugs.model
#base_config.DBSession = redrugs.model.DBSession
