# -*- coding: utf-8 -*-
#quickstarted Options:
#
# sqlalchemy: True
# auth:       None
# mako:       None
#
#

#This is just a work-around for a Python2.7 issue causing
#interpreter crash at exit when trying to log an info message.
try:
    import logging
    import multiprocessing
except:
    pass

import sys

try:
    from setuptools import setup, find_packages
except ImportError:
    from ez_setup import use_setuptools
    use_setuptools()
    from setuptools import setup, find_packages

testpkgs=['WebTest >= 1.2.3',
               'nose',
               'coverage',
               'wsgiref',
               ]
install_requires=[
    "TurboGears2 >= 2.2.2",
    "Genshi",
#    "zope.sqlalchemy >= 0.4",
    "repoze.tm2 >= 1.0a5",
#    "sqlalchemy<0.8b1",
#    "sqlalchemy-migrate",
#    "pylons",
#    "webhelpers",
#    "gearbox",
#    "Werkzeug",
    "tw2.forms",
    "rdflib",

    "sadi",
    ]

setup(
    name='redrugs',
    version='0.1',
    description='',
    author='',
    author_email='',
    #url='',
    setup_requires=["PasteScript >= 1.7"],
    paster_plugins=['PasteScript', 'Pylons', 'TurboGears2', 'tg.devtools'],
    packages=find_packages(exclude=['ez_setup']),
    install_requires=install_requires,
    include_package_data=True,
    test_suite='nose.collector',
    tests_require=testpkgs,
    package_data={'redrugs': ['i18n/*/LC_MESSAGES/*.mo',
                                 'templates/*/*',
                                 'public/*/*']},
    message_extractors={'redrugs': [
            ('**.py', 'python', None),
            ('templates/**.html', 'genshi', None),
            ('public/**', 'ignore', None)]},

    entry_points="""
    [paste.app_factory]
    main = redrugs.config.middleware:make_app

    [paste.app_install]
    main = pylons.util:PylonsInstaller
    """,
    dependency_links=[
        "http://tg.gy/222",

        ],
    zip_safe=False
)
