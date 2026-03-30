// api/auth/login.js — 3C Word Search
// Redirects to GitHub OAuth authorization

export default function handler(req, res) {
  const params = new URLSearchParams({
    client_id:    process.env.GITHUB_CLIENT_ID,
    redirect_uri: 'https://3c-word-search.vercel.app/api/auth/callback',
    scope:        'read:user user:email',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
