# repoze TransactionManager WSGI middleware
import sys
import transaction

ekey = 'repoze.tm.active'

PY3 = sys.version_info[0] >= 3

if PY3: #pragma NO COVER Py3k
    def reraise(tp, value, tb=None):
        if value.__traceback__ is not tb:
            raise value.with_traceback(tb)
        raise value
else:   #pragma NO COVER Python2
    def exec_(_code_, _globs_=None, _locs_=None):
        """Execute code in a namespace."""
        if _globs_ is None:
            frame = sys._getframe(1)
            _globs_ = frame.f_globals
            if _locs_ is None:
                _locs_ = frame.f_locals
            del frame
        elif _locs_ is None: #pragma NO COVER
            _locs_ = _globs_
        exec("""exec _code_ in _globs_, _locs_""")

    exec_("""def reraise(tp, value, tb=None):
    raise tp, value, tb
""")
    del exec_


class TM:
    """ Transaction management WSGI middleware """
    def __init__(self, application, commit_veto=None):
        self.application = application
        self.commit_veto = commit_veto
        self.transaction = transaction # for testing
        
    def __call__(self, environ, start_response):
        transaction = self.transaction
        environ[ekey] = True
        transaction.begin()
        ctx = {}

        def save_status_and_headers(status, headers, exc_info=None):
            ctx.update(status=status, headers=headers)
            return start_response(status, headers, exc_info)

        try:
            for chunk in self.application(environ, save_status_and_headers):
                yield chunk
        except Exception:
            """Saving the exception"""
            try:
                type_, value, tb = sys.exc_info()
                self.abort()
                reraise(type_, value, tb)
            finally:
                del type_, value, tb

        # ZODB 3.8 + has isDoomed
        if hasattr(transaction, 'isDoomed') and transaction.isDoomed():
            self.abort()
        else:
            if self.commit_veto is not None:
                try:
                    status, headers = ctx['status'], ctx['headers']
                    veto = self.commit_veto(environ, status, headers)
                except:
                    self.abort()
                    raise

                if veto:
                    self.abort()
                else:
                    self.commit()

            else:
                self.commit()

    def commit(self):
        t = self.transaction.get()
        t.commit()
        after_end.cleanup(t)

    def abort(self):
        t = self.transaction.get()
        t.abort()
        after_end.cleanup(t)

def isActive(environ):
    """ Return True if the ``repoze.tm.active`` key is in the WSGI
    environment passed as ``environ``, otherwise return ``False``."""
    if ekey in environ:
        return True
    return False

# Callback registry API helper class
class AfterEnd:
    """ Callback registry API helper class.  Use the singleton instance
    ``repoze.tm.after_end`` when possible."""
    key = '_repoze_tm_afterend'
    def register(self, func, txn):
        funcs = getattr(txn, self.key, None)
        if funcs is None:
            funcs = []
            setattr(txn, self.key, funcs)
        funcs.append(func)

    def unregister(self, func, txn):
        funcs = getattr(txn, self.key, None)
        if funcs is None:
            return
        new = []
        for f in funcs:
            if f is func:
                continue
            new.append(f)
        if new:
            setattr(txn, self.key, new)
        else:
            delattr(txn, self.key)

    def cleanup(self, txn):
        funcs = getattr(txn, self.key, None)
        if funcs is not None:
            for func in funcs:
                func()
            delattr(txn, self.key)

# singleton, importable by other modules
after_end = AfterEnd()

def default_commit_veto(environ, status, headers):
    """
    When used as a commit veto, the logic in this function will cause the
    transaction to be committed if:

    - An ``X-Tm`` header with the value ``commit`` exists.

    If an ``X-Tm`` header with the value ``commit`` does not exist, the
    transaction will be aborted, if:

    - An ``X-Tm`` header with the value ``abort`` (or any value other than
      ``commit``) exists.

    - An ``X-Tm-Abort`` header exists with any value (for backwards
      compatibility; prefer ``X-Tm=abort`` in new code).

    - The status code starts with ``4`` or ``5``.

    Otherwise the transaction will be committed by default.
    """
    abort_compat = False
    for header_name, header_value in headers:
        header_name = header_name.lower()
        if header_name == 'x-tm':
            header_value = header_value.lower()
            if header_value == 'commit':
                return False
            return True
        # x-tm always honored before x-tm-abort 1.0b1 compatibility
        if header_name == 'x-tm-abort':
            abort_compat = True
    if abort_compat:
        return True
    for bad in ('4', '5'):
        if status.startswith(bad):
            return True
    return False

def make_tm(app, global_conf, commit_veto=None):
    """ Paste filter_app_factory entry point for creation of a TM middleware."""
    from pkg_resources import EntryPoint
    if commit_veto is not None:
        commit_veto = EntryPoint.parse('x=%s' % commit_veto).load(False)
    return TM(app, commit_veto)

