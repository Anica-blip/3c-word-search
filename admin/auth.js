// admin/auth.js — 3C Word Search
// GitHub OAuth session guard — same pattern as 3C Control Center
// GitHub OAuth is handled server-side via /api/auth/login + /api/auth/callback

(() => {
  if (window.__AUTH_LOADED__) return;
  window.__AUTH_LOADED__ = true;

  const AUTHORIZED_USER = 'Anica-blip';
  const SESSION_KEY     = 'github-user';
  const EXPIRY_KEY      = 'session-expiry';

  const path        = location.pathname.toLowerCase();
  const isLoginPage = path.endsWith('/login.html');
  const isAdminApp  = path.endsWith('/admin/index.html') || path.endsWith('/admin/');

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw);
      if (user.login !== AUTHORIZED_USER) { clearSession(); return null; }
      return user;
    } catch { clearSession(); return null; }
  }

  function isSessionValid() {
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (!expiry) return false;
    return new Date(expiry) > new Date();
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(EXPIRY_KEY);
  }

  function refreshExpiry() {
    localStorage.setItem(EXPIRY_KEY, new Date(Date.now() + 3600000).toISOString());
  }

  window.authHelpers = {
    logout: function() { clearSession(); location.href = './login.html'; }
  };

  function consumeCallbackSession() {
    const params = new URLSearchParams(location.search);
    const raw    = params.get('session');
    const err    = params.get('auth_error') || params.get('error');

    if (err) {
      history.replaceState({}, '', location.pathname);
      if (isLoginPage) {
        const el = document.getElementById('error-message');
        if (el) {
          const msgs = {
            unauthorized:    'Access denied — authorised users only.',
            server_config:   'Server configuration error.',
            token_failed:    'GitHub token exchange failed.',
            no_token:        'No token received from GitHub.',
            callback_failed: 'Callback error — check Vercel logs.',
          };
          el.textContent = msgs[err] || `Login failed (${err}).`;
          el.classList.add('show');
        }
      }
      return false;
    }

    if (raw) {
      try {
        const user = JSON.parse(decodeURIComponent(raw));
        if (user.login !== AUTHORIZED_USER) {
          clearSession();
          location.href = '/admin/login.html?error=unauthorized';
          return false;
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        localStorage.setItem(EXPIRY_KEY, user.expiry);
        history.replaceState({}, '', location.pathname);
        return true;
      } catch {
        clearSession();
        location.href = '/admin/login.html?error=callback_failed';
        return false;
      }
    }
    return false;
  }

  function guardRoutes() {
    const justSet    = consumeCallbackSession();
    const user       = getSession();
    const hasSession = !!user && (justSet || isSessionValid());

    if (hasSession) refreshExpiry();

    if (isLoginPage && hasSession)  { location.href = './index.html'; return; }
    if (isAdminApp  && !hasSession) { location.href = './login.html'; return; }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', guardRoutes);
  } else {
    guardRoutes();
  }
})();
