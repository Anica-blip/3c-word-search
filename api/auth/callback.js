// api/auth/callback.js — 3C Word Search
// Vercel serverless — handles GitHub OAuth callback
// After success redirects to GitHub Pages /admin/ (not Vercel)

const AUTHORIZED_USER = 'Anica-blip';
const ADMIN_URL       = 'https://anica-blip.github.io/3c-word-search/admin/';

export default async function handler(req, res) {
  const { code, error: oauthError } = req.query;

  const clientId     = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('CALLBACK: Missing env vars');
    return res.redirect(`${ADMIN_URL}login.html?error=server_config`);
  }

  if (oauthError || !code) {
    console.error('CALLBACK: No code. Error:', oauthError);
    return res.redirect(`${ADMIN_URL}login.html?error=access_denied`);
  }

  try {
    // Step 1 — Exchange code for token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error('CALLBACK: Token error:', tokenData.error);
      return res.redirect(`${ADMIN_URL}login.html?error=token_failed`);
    }

    // Step 2 — Fetch GitHub user
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept':        'application/vnd.github.v3+json',
      },
    });

    const user = await userRes.json();
    console.log('CALLBACK: GitHub user:', user.login);

    // Step 3 — Validate authorised user
    if (user.login !== AUTHORIZED_USER) {
      console.warn('CALLBACK: Unauthorized:', user.login);
      return res.redirect(`${ADMIN_URL}login.html?error=unauthorized`);
    }

    // Step 4 — Build session, redirect to GitHub Pages admin
    const session = encodeURIComponent(JSON.stringify({
      login:      user.login,
      name:       user.name       || user.login,
      email:      user.email      || '',
      avatar_url: user.avatar_url || '',
      lastLogin:  new Date().toISOString(),
      expiry:     new Date(Date.now() + 3600000).toISOString(),
    }));

    console.log('CALLBACK: Login success for', user.login);
    res.redirect(`${ADMIN_URL}?session=${session}`);

  } catch (err) {
    console.error('CALLBACK EXCEPTION:', err.message);
    res.redirect(`${ADMIN_URL}login.html?error=callback_failed`);
  }
}
