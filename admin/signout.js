/**
 * 3C Word Search — Sign out
 * Built by Claude (Anthropic) × Chef Anica · 3C Thread To Success
 */
async function signOut() {
  try {
    if (window.authHelpers?.logout) { window.authHelpers.logout(); return; }
    localStorage.removeItem('github-user');
    localStorage.removeItem('session-expiry');
    window.location.href = './login.html';
  } catch {
    window.location.href = './login.html';
  }
}
