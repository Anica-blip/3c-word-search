/**
 * auth-guard.js — 3C Word Search page guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Protects the admin pages. A visitor gets in only if they are signed in with
 * GitHub (through Supabase, project "Aurion 3C Mascot") AND Supabase's
 * is_owner() function says they are the owner. Signing in alone is not enough.
 * The Worker and the database repeat the same check, so this guard only decides
 * what the page shows.
 *
 * This app keeps its own session name (storageKey): all of Chef's GitHub Pages
 * apps share one address (anica-blip.github.io), so each app has its own.
 * login.html and admin/supabaseAPI.js use the same name.
 *
 * HOW TO ADD TO A PROTECTED PAGE — at the very top of <head>, before all other
 * scripts (pages inside /admin/ use ../auth-guard.js):
 *
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="../auth-guard.js"></script>
 * ─────────────────────────────────────────────────────────────────────────────
 * Designed and Built with ❤️ by Claude (Anthropic) × Chef Anica
 * 3C Thread To Success™ Cooking Lab 🧪👨‍🍳
 */

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const AUTH_CONFIG = {
  supabaseUrl: 'https://cgxjqsbrditbteqhdyus.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4',   // public anon key
  loginPage:   'https://anica-blip.github.io/3c-word-search/login.html',
  storageKey:  'sb-3c-word-search-login'
};
// ─────────────────────────────────────────────────────────────────────────────

// Immediately hide page to prevent flash of protected content
document.documentElement.style.visibility = 'hidden';

(async function guardPage() {
  try {
    const client = supabase.createClient(AUTH_CONFIG.supabaseUrl, AUTH_CONFIG.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: AUTH_CONFIG.storageKey
      }
    });
    const { data: { session } } = await client.auth.getSession();

    // No session — send to login
    if (!session) { redirectToLogin(); return; }

    // Signed in — but only the owner gets in. If the owner check cannot be
    // made (for example no network) nobody is signed out; the Worker and the
    // database rules are the real gate.
    const { data: isOwner, error } = await client.rpc('is_owner');
    if (!error && isOwner !== true) {
      await client.auth.signOut();
      redirectToLogin('notowner');
      return;
    }

    // ✅ Owner — reveal the page
    document.documentElement.style.visibility = 'visible';

  } catch (err) {
    console.error('[auth-guard] Error:', err);
    redirectToLogin();
  }

  function redirectToLogin(reason) {
    const next = encodeURIComponent(window.location.href);
    const sep  = AUTH_CONFIG.loginPage.includes('?') ? '&' : '?';
    window.location.replace(
      `${AUTH_CONFIG.loginPage}${sep}next=${next}${reason ? '&reason=' + reason : ''}`
    );
  }
})();
