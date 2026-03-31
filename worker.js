/**
 * 3C Word Search — Cloudflare Worker
 * ─────────────────────────────────────────────────────────────
 * Built by Claude (Anthropic) × Chef Anica · 3C Thread To Success
 *
 * Binding : WORDSEARCH_BUCKET → 3c-library-files (R2)
 * Folder  : WordSearch/
 *
 * Routes:
 *   GET    /puzzle/:slug            → fetch WordSearch/{slug}.json
 *   PUT    /puzzle/:slug            → save  WordSearch/{slug}.json
 *   DELETE /puzzle/:slug            → delete WordSearch/{slug}.json
 *   PUT    /media/:slug/:filename   → save binary media (bg, intro, finale)
 */

const ALLOWED_ORIGINS = [
  'https://anica-blip.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
];

const MIME = {
  png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg',
  gif:'image/gif', webp:'image/webp',
  mp4:'video/mp4', webm:'video/webm', mov:'video/quicktime',
};

function cors(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-file-extension',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const method = req.method.toUpperCase();
    const url    = new URL(req.url);
    const path   = url.pathname;

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    /* ── /puzzle/:slug ──────────────────────────────────────── */
    const puzzleMatch = path.match(/^\/puzzle\/([a-z0-9.\-]+)$/i);
    if (puzzleMatch) {
      const slug  = puzzleMatch[1];
      const r2Key = `WordSearch/${slug}.json`;

      if (method === 'GET') {
        const obj = await env.WORDSEARCH_BUCKET.get(r2Key);
        if (!obj) return json({ error: `Puzzle not found: ${slug}` }, 404, origin);
        const text = await obj.text();
        return new Response(text, {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...cors(origin) },
        });
      }

      if (method === 'PUT') {
        const body = await req.text();
        try { JSON.parse(body); } catch { return json({ error: 'Invalid JSON' }, 400, origin); }
        await env.WORDSEARCH_BUCKET.put(r2Key, body, {
          httpMetadata: { contentType: 'application/json' },
        });
        return json({ ok: true, r2_key: r2Key }, 200, origin);
      }

      if (method === 'DELETE') {
        await env.WORDSEARCH_BUCKET.delete(r2Key);
        return json({ ok: true, deleted: r2Key }, 200, origin);
      }

      return json({ error: 'Method not allowed' }, 405, origin);
    }

    /* ── /media/:slug/:filename ─────────────────────────────── */
    const mediaMatch = path.match(/^\/media\/([a-z0-9.\-]+)\/(.+)$/i);
    if (mediaMatch) {
      const slug     = mediaMatch[1];
      const filename = decodeURIComponent(mediaMatch[2]);

      if (method !== 'PUT') return json({ error: 'PUT only on /media' }, 405, origin);

      const ext       = filename.split('.').pop().toLowerCase();
      const mime      = MIME[ext] || 'application/octet-stream';
      const r2Key     = `WordSearch/${slug}/${filename}`;
      const publicUrl = `https://files.3c-public-library.org/${r2Key}`;

      const buf = await req.arrayBuffer();
      if (!buf.byteLength) return json({ error: 'Empty file' }, 400, origin);

      await env.WORDSEARCH_BUCKET.put(r2Key, buf, { httpMetadata: { contentType: mime } });
      return json({ ok: true, r2_key: r2Key, public_url: publicUrl }, 200, origin);
    }

    /* ── No route matched ───────────────────────────────────── */
    return json({
      error: 'Not found',
      routes: ['GET/PUT/DELETE /puzzle/:slug', 'PUT /media/:slug/:filename'],
    }, 404, origin);
  },
};
